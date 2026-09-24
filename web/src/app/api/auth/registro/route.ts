import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDbPool } from "@/lib/db";
import {
  createAndSendVerificationCode,
  encodePendingUser,
  PENDING_COOKIE_NAME,
} from "@/lib/auth-verification";
import {
  validarRegistro,
  MENSAJES_VALIDACION,
} from "@/lib/validaciones";
import {
  obtenerIpCliente,
  verificarLimiteRegistroIp,
  registrarIntentoRegistroIp,
} from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiter: Máximo 5 registros por IP cada hora
    const ip = obtenerIpCliente(req);
    const estadoRateLimit = verificarLimiteRegistroIp(ip);

    if (!estadoRateLimit.permitido) {
      return NextResponse.json(
        {
          errores: {
            general: MENSAJES_VALIDACION.RATE_LIMIT_REGISTRO,
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(estadoRateLimit.reintentoEnSegundos || 3600),
          },
        }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          errores: {
            general: "Cuerpo de solicitud JSON malformado.",
          },
        },
        { status: 400 }
      );
    }

    // 2. Validación centralizada del servidor:
    // - Rechaza campos desconocidos
    // - Verifica tipos de datos
    // - Aplica reglas de Nombre, Apellido, Correo, Celular y Contraseña
    const validacion = validarRegistro(body, {
      verificarCamposDesconocidos: true,
    });

    if (!validacion.valido) {
      return NextResponse.json(
        { errores: validacion.errores },
        { status: 400 }
      );
    }

    const {
      nombre,
      apellido,
      correo,
      celular,
      password,
      acepta_terminos,
      acepta_promociones,
    } = validacion.datosLimpios;

    const pool = getDbPool();

    // 3. Verificación de unicidad previa en la base de datos
    const [existingRows]: any = await pool.execute(
      "SELECT id, correo, celular FROM usuarios WHERE correo = ? OR celular = ? LIMIT 1",
      [correo, celular]
    );

    if (existingRows && existingRows.length > 0) {
      const match = existingRows[0];
      const errMap: Record<string, string> = {};

      if (match.correo.toLowerCase() === correo.toLowerCase()) {
        errMap.correo = MENSAJES_VALIDACION.CORREO_DUPLICADO;
      }
      if (match.celular === celular) {
        errMap.celular = MENSAJES_VALIDACION.CELULAR_DUPLICADO;
      }

      return NextResponse.json({ errores: errMap }, { status: 409 });
    }

    // 4. Hashear la contraseña con bcrypt (cost factor 10)
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Inserción en base de datos con captura de condición de carrera (ER_DUP_ENTRY)
    let newUserId: number;

    try {
      const [insertResult]: any = await pool.execute(
        `INSERT INTO usuarios 
          (nombre, apellido, correo, celular, password_hash, acepta_terminos, acepta_promociones) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre,
          apellido,
          correo,
          celular,
          passwordHash,
          acepta_terminos ? 1 : 0,
          acepta_promociones ? 1 : 0,
        ]
      );

      newUserId = insertResult.insertId;
    } catch (dbError: any) {
      // Capturar colisión concurrente mediante los índices UNIQUE de MySQL (ER_DUP_ENTRY / 1062)
      if (dbError.code === "ER_DUP_ENTRY" || dbError.errno === 1062) {
        const msg = String(dbError.message || "").toLowerCase();
        const errMap: Record<string, string> = {};

        if (msg.includes("correo") || msg.includes("idx_usuarios_correo") || msg.includes("usuarios.correo")) {
          errMap.correo = MENSAJES_VALIDACION.CORREO_DUPLICADO;
        } else if (msg.includes("celular") || msg.includes("idx_usuarios_celular") || msg.includes("usuarios.celular")) {
          errMap.celular = MENSAJES_VALIDACION.CELULAR_DUPLICADO;
        } else {
          errMap.correo = MENSAJES_VALIDACION.CORREO_DUPLICADO;
        }

        return NextResponse.json({ errores: errMap }, { status: 409 });
      }

      throw dbError;
    }

    // 6. Registrar consumo de cuota de IP en el Rate Limiter
    registrarIntentoRegistroIp(ip);

    // 7. Generar código de verificación criptográfico (6 dígitos) y enviarlo
    const { devCode } = await createAndSendVerificationCode(newUserId, correo, nombre);

    // 8. Configurar cookie temporal httpOnly para la pantalla de verificación
    const response = NextResponse.json(
      {
        success: true,
        message: "Cuenta creada exitosamente. Te enviamos un código de verificación.",
        userId: newUserId,
        redirectUrl: "/verificar",
        devCode,
      },
      { status: 201 }
    );

    response.cookies.set({
      name: PENDING_COOKIE_NAME,
      value: encodePendingUser({
        userId: newUserId,
        correo,
        nombre,
        apellido,
        celular,
        lastSentAt: Date.now(),
        devCode,
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hora
    });

    return response;
  } catch (error: any) {
    console.error("[API REGISTRO ERROR]:", error);
    return NextResponse.json(
      {
        errores: {
          general:
            "Error al conectar con la base de datos MySQL en XAMPP. Asegúrate de que MySQL esté activo en el panel de XAMPP.",
        },
        details: error.message,
      },
      { status: 500 }
    );
  }
}
