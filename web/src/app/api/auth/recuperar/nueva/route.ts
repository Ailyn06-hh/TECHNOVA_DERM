import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDbPool } from "@/lib/db";
import {
  validarContrasena,
  validarConfirmacion,
  MENSAJES_VALIDACION,
} from "@/lib/validaciones";
import { sendPasswordChangedConfirmationEmail } from "@/lib/mailer";
import { setAuthSessionCookie } from "@/lib/session";

const TOKEN_HEX_REGEX = /^[0-9a-fA-F]{64}$/;
const MENSAJE_TOKEN_INVALIDO = "Este enlace ya no es válido. Solicita uno nuevo.";

export async function POST(req: NextRequest) {
  const pool = getDbPool();

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Cuerpo de solicitud JSON malformado." },
        { status: 400 }
      );
    }

    const { token, password, confirmPassword } = body;

    // 1. Validar formato de token antes de consultar BD: exactamente 64 caracteres hexadecimales
    if (!token || typeof token !== "string" || !TOKEN_HEX_REGEX.test(token)) {
      return NextResponse.json(
        { error: MENSAJE_TOKEN_INVALIDO, invalidToken: true },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // 2. Buscar registro del token y datos del usuario dueño del token
    const [tokenRows]: any = await pool.execute(
      `SELECT r.id, r.usuario_id, r.expira_en, r.usado, u.nombre, u.apellido, u.correo, u.celular, u.password_hash 
       FROM restablecimientos_password r
       INNER JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.token_hash = ? AND r.usado = 0 
       ORDER BY r.id DESC LIMIT 1`,
      [tokenHash]
    );

    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json(
        { error: MENSAJE_TOKEN_INVALIDO, invalidToken: true },
        { status: 404 }
      );
    }

    const resetRecord = tokenRows[0];
    const now = new Date();
    const expiresAt = new Date(resetRecord.expira_en);

    if (now > expiresAt) {
      await pool.execute(
        "UPDATE restablecimientos_password SET usado = 1 WHERE id = ?",
        [resetRecord.id]
      );
      return NextResponse.json(
        { error: MENSAJE_TOKEN_INVALIDO, invalidToken: true },
        { status: 410 }
      );
    }

    // 3. Validar contraseña con los datos del usuario dueño del token (nombre, apellido, correo)
    const passValidation = validarContrasena(password, {
      nombre: resetRecord.nombre,
      apellido: resetRecord.apellido,
      correo: resetRecord.correo,
    });

    if (!passValidation.valida) {
      return NextResponse.json(
        {
          error: passValidation.errores[0] || MENSAJES_VALIDACION.CONTRASENA_NO_CUMPLE_REQUISITOS,
          field: "password",
        },
        { status: 400 }
      );
    }

    // 4. Validar confirmación de contraseña
    const matchValidation = validarConfirmacion(password, confirmPassword);
    if (!matchValidation.valida) {
      return NextResponse.json(
        { error: matchValidation.error, field: "confirmPassword" },
        { status: 400 }
      );
    }

    // 5. Verificar que la nueva contraseña no sea idéntica a la actual
    const isSamePassword = await bcrypt.compare(password, resetRecord.password_hash);
    if (isSamePassword) {
      return NextResponse.json(
        {
          error: MENSAJES_VALIDACION.CONTRASENA_IGUAL_ANTERIOR,
          field: "password",
        },
        { status: 400 }
      );
    }

    // 6. Hashear la nueva contraseña con bcrypt
    const newPasswordHash = await bcrypt.hash(password, 10);

    // 7. Ejecución atómica DENTRO DE UNA TRANSACCIÓN en MySQL
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // a) Revalidar que el token siga vigente y no usado dentro de la transacción con FOR UPDATE
      const [recheckRows]: any = await connection.execute(
        "SELECT id, expira_en, usado FROM restablecimientos_password WHERE id = ? FOR UPDATE",
        [resetRecord.id]
      );

      if (
        !recheckRows ||
        recheckRows.length === 0 ||
        recheckRows[0].usado === 1 ||
        new Date() > new Date(recheckRows[0].expira_en)
      ) {
        await connection.rollback();
        return NextResponse.json(
          { error: MENSAJE_TOKEN_INVALIDO, invalidToken: true },
          { status: 400 }
        );
      }

      // b) Actualizar password_hash del usuario y asegurar cuenta verificada
      await connection.execute(
        "UPDATE usuarios SET password_hash = ?, verificado = 1 WHERE id = ?",
        [newPasswordHash, resetRecord.usuario_id]
      );

      // c) Marcar el token como usado e invalidar los demás tokens de este usuario
      await connection.execute(
        "UPDATE restablecimientos_password SET usado = 1 WHERE usuario_id = ?",
        [resetRecord.usuario_id]
      );

      // d) Reiniciar los intentos fallidos de login de ese usuario (correo y celular)
      await connection.execute(
        "DELETE FROM intentos_login WHERE identificador IN (?, ?) AND exitoso = 0",
        [resetRecord.correo, resetRecord.celular]
      );

      // TODO: Cerrar/revocar todas las sesiones abiertas activas en otros dispositivos (e.g. invalidar sesión en Redis o actualizar versión de token del usuario)

      await connection.commit();
    } catch (transError) {
      await connection.rollback();
      throw transError;
    } finally {
      connection.release();
    }

    // 8. Enviar correo de confirmación de cambio con fecha y hora
    const fechaHoraStr = new Intl.DateTimeFormat("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date());

    sendPasswordChangedConfirmationEmail({
      to: resetRecord.correo,
      nombre: resetRecord.nombre,
      fechaHora: fechaHoraStr,
    }).catch((err) => {
      console.error("[MAILER CONFIRMACION ERROR]:", err);
    });

    // 9. Respuesta exitosa con inicio de sesión automático
    const response = NextResponse.json(
      {
        success: true,
        message: "Contraseña actualizada exitosamente. Iniciando sesión...",
        redirectUrl: "/",
        user: {
          id: resetRecord.usuario_id,
          nombre: resetRecord.nombre,
          correo: resetRecord.correo,
        },
      },
      { status: 200 }
    );

    setAuthSessionCookie(response, {
      userId: resetRecord.usuario_id,
      correo: resetRecord.correo,
      nombre: resetRecord.nombre,
      verificado: true,
    });

    return response;
  } catch (error: any) {
    console.error("[API NUEVA PASSWORD ERROR]:", error);
    return NextResponse.json(
      {
        error: "Error interno al actualizar la contraseña.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
