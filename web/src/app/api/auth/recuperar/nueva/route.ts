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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password, confirmPassword } = body;

    // 1. Validaciones de token
    if (!token || typeof token !== "string" || token.length < 32) {
      return NextResponse.json(
        { error: "Token de recuperación inválido o inexistente." },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // 2. Buscar el registro de token activo y datos del usuario
    const [tokenRows]: any = await pool.execute(
      `SELECT r.id, r.usuario_id, r.expira_en, r.usado, u.nombre, u.apellido, u.correo, u.password_hash 
       FROM restablecimientos_password r
       INNER JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.token_hash = ? AND r.usado = 0 
       ORDER BY r.id DESC LIMIT 1`,
      [tokenHash]
    );

    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json(
        {
          error: "Este enlace de recuperación no es válido o ya ha sido utilizado. Solicita uno nuevo.",
        },
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
        { error: "El enlace de recuperación ha expirado. Solicita uno nuevo." },
        { status: 410 }
      );
    }

    // 3. Validaciones de contraseña compartidas con frontend
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

    const matchValidation = validarConfirmacion(password, confirmPassword);
    if (!matchValidation.valida) {
      return NextResponse.json(
        { error: matchValidation.error, field: "confirmPassword" },
        { status: 400 }
      );
    }

    // 4. Seguridad: verificar que la nueva contraseña no sea igual a la actual
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

    // 5. Hashear la nueva contraseña con bcrypt (cost factor 10)
    const newPasswordHash = await bcrypt.hash(password, 10);

    // 6. Actualizar contraseña del usuario y marcar cuenta como verificada
    await pool.execute(
      "UPDATE usuarios SET password_hash = ?, verificado = 1 WHERE id = ?",
      [newPasswordHash, resetRecord.usuario_id]
    );

    // 7. Marcar token actual como usado e invalidar todos los tokens del usuario
    await pool.execute(
      "UPDATE restablecimientos_password SET usado = 1 WHERE usuario_id = ?",
      [resetRecord.usuario_id]
    );

    // 8. Enviar correo de confirmación de cambio con fecha y hora
    const fechaHoraStr = new Intl.DateTimeFormat("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date());

    await sendPasswordChangedConfirmationEmail({
      to: resetRecord.correo,
      nombre: resetRecord.nombre,
      fechaHora: fechaHoraStr,
    });

    // 9. Respuesta exitosa para iniciar sesión automáticamente y redirigir
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
