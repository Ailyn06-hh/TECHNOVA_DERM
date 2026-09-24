import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDbPool } from "@/lib/db";
import { normalizarIdentificador, MENSAJES_VALIDACION } from "@/lib/validaciones";
import { sendPasswordResetEmail } from "@/lib/mailer";
import {
  obtenerIpCliente,
  verificarLimiteRecuperarIp,
  registrarIntentoRecuperarIp,
} from "@/lib/rate-limiter";

// Respuesta genérica idéntica para cumplir con el estándar de anti-enumeración de usuarios
const GENERIC_SUCCESS_RESPONSE = {
  success: true,
  message: "Listo. El enlace vence en 30 minutos.",
};

const DUMMY_HASH = "$2a$10$7EqJtq98hPqEX7fNZaFWoO0LqgP2Lw5jO8L7vC9GZJ1.M7n0O7A5m";

/**
 * Agrega un retraso uniforme para garantizar tiempos de respuesta similares
 * exista o no la cuenta, o se haya superado algún límite.
 */
function simularRetrasoUniforme(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 200));
}

export async function POST(req: NextRequest) {
  try {
    const ip = obtenerIpCliente(req);
    const ipPermitida = verificarLimiteRecuperarIp(ip);
    registrarIntentoRecuperarIp(ip);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Cuerpo de solicitud JSON malformado." },
        { status: 400 }
      );
    }

    const { identifier } = body;

    // 1. Cliente y Servidor: "Correo o celular" obligatorio con el mismo validador del login
    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json(
        { error: MENSAJES_VALIDACION.IDENTIFICADOR_REQUERIDO, field: "identifier" },
        { status: 400 }
      );
    }

    const norm = normalizarIdentificador(identifier);
    if (!norm.esValido) {
      return NextResponse.json(
        { error: MENSAJES_VALIDACION.IDENTIFICADOR_INVALIDO, field: "identifier" },
        { status: 400 }
      );
    }

    // 2. Si la IP excede el límite de 10 solicitudes por hora: responder igual sin enviar nada
    if (!ipPermitida) {
      await bcrypt.compare("dummy-rate-limit", DUMMY_HASH);
      await simularRetrasoUniforme();
      return NextResponse.json(GENERIC_SUCCESS_RESPONSE, { status: 200 });
    }

    const pool = getDbPool();
    const cleanVal = norm.valor;

    // 3. Buscar usuario por correo o celular según el tipo detectado
    let query = "";
    if (norm.tipo === "correo") {
      query = "SELECT id, nombre, apellido, correo, celular FROM usuarios WHERE correo = ? LIMIT 1";
    } else {
      query = "SELECT id, nombre, apellido, correo, celular FROM usuarios WHERE celular = ? LIMIT 1";
    }

    const [rows]: any = await pool.execute(query, [cleanVal]);

    // 4. Si el usuario no existe: comparar con hash dummy para mitigar timing attacks
    if (!rows || rows.length === 0) {
      await bcrypt.compare("dummy-timing-password", DUMMY_HASH);
      await simularRetrasoUniforme();
      return NextResponse.json(GENERIC_SUCCESS_RESPONSE, { status: 200 });
    }

    const user = rows[0];

    // 5. Rate limiting por cuenta: máximo 3 solicitudes por cuenta cada 15 minutos
    const [rateRows]: any = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM restablecimientos_password 
       WHERE usuario_id = ? AND creado_en >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
      [user.id]
    );

    const totalRecentRequests = rateRows[0]?.total || 0;
    if (totalRecentRequests >= 3) {
      // Excedido: responder exactamente igual sin generar nuevo token ni enviar correo
      await bcrypt.compare("dummy-account-rate", DUMMY_HASH);
      await simularRetrasoUniforme();
      return NextResponse.json(GENERIC_SUCCESS_RESPONSE, { status: 200 });
    }

    // 6. Invalidar tokens anteriores pendientes de este usuario
    await pool.execute(
      "UPDATE restablecimientos_password SET usado = 1 WHERE usuario_id = ? AND usado = 0",
      [user.id]
    );

    // 7. Generar token criptográfico de exactamente 64 caracteres hexadecimales (32 bytes)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // 8. Guardar en base de datos con vigencia de 30 minutos
    await pool.execute(
      `INSERT INTO restablecimientos_password 
        (usuario_id, token_hash, expira_en, usado) 
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE), 0)`,
      [user.id, tokenHash]
    );

    // 9. Construir enlace de recuperación
    const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const resetUrl = `${appUrl}/recuperar/nueva?token=${rawToken}`;

    // 10. Enviar correo en segundo plano para mantener tiempo de respuesta idéntico
    sendPasswordResetEmail({
      to: user.correo,
      resetUrl,
      nombre: user.nombre,
    }).catch((err) => {
      console.error("[MAILER RECUPERAR ERROR]:", err);
    });

    await simularRetrasoUniforme();
    return NextResponse.json(GENERIC_SUCCESS_RESPONSE, { status: 200 });
  } catch (error: any) {
    console.error("[API RECUPERAR ERROR]:", error);
    return NextResponse.json(
      {
        error: "Ocurrió un error al procesar la solicitud. Por favor intenta de nuevo.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
