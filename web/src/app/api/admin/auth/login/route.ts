import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDbPool } from "@/lib/db";
import {
  signAdminSession,
  registrarAuditoriaAdmin,
  ADMIN_SESSION_COOKIE,
  AdminSessionData,
} from "@/lib/admin-session";
import {
  generateTotpSecret,
  formatTotpSecret,
  generateTOTP,
  verifyTOTP,
  getTotpQrSvg,
} from "@/lib/totp";

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;
const GENERIC_ERROR = "Credenciales no válidas";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const correo = (body.correo || "").toString().trim().toLowerCase();
    const password = (body.password || "").toString();
    const totpCode = body.totpCode !== undefined ? body.totpCode.toString().trim() : undefined;

    if (!correo || !password) {
      return NextResponse.json(
        { ok: false, error: GENERIC_ERROR },
        { status: 401 }
      );
    }

    const pool = getDbPool();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    // 1. Buscar administrador por correo
    const [rows]: any = await pool.query(
      `SELECT id, nombre, apellido, correo, password_hash, rol, totp_secret, totp_configurado,
              intentos_fallidos, bloqueado_hasta, activo
       FROM administradores
       WHERE LOWER(correo) = ?
       LIMIT 1`,
      [correo]
    );

    // Si el usuario no existe o está inactivo
    if (!rows || rows.length === 0 || rows[0].activo !== 1) {
      // Comparación ficticia para mitigar timing attacks
      await bcrypt.compare("dummy_pass_123456", "$2b$10$B3v.cTmELGgjq9LZsgJWB.zyWoM1onL3kMuDm5F78sB87aJANUYTO");
      return NextResponse.json(
        { ok: false, error: GENERIC_ERROR },
        { status: 401 }
      );
    }

    const admin = rows[0];

    // 2. Verificar si está bloqueado por demasiados intentos
    if (admin.bloqueado_hasta) {
      const ahora = new Date();
      const bloqueoHasta = new Date(admin.bloqueado_hasta);
      if (bloqueoHasta > ahora) {
        const minutosRestantes = Math.ceil((bloqueoHasta.getTime() - ahora.getTime()) / (60 * 1000));
        return NextResponse.json(
          {
            ok: false,
            error: `Cuenta temporalmente bloqueada por ${MAX_INTENTOS} intentos fallidos. Intenta nuevamente en ${minutosRestantes} minutos.`,
            bloqueado: true,
            minutosRestantes,
          },
          { status: 429 }
        );
      } else {
        // El tiempo de bloqueo ya expiró, restablecer
        await pool.query(
          "UPDATE administradores SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?",
          [admin.id]
        );
        admin.intentos_fallidos = 0;
        admin.bloqueado_hasta = null;
      }
    }

    // 3. Validar contraseña
    const passwordValido = await bcrypt.compare(password, admin.password_hash);
    if (!passwordValido) {
      const nuevosIntentos = (admin.intentos_fallidos || 0) + 1;
      let bloqueadoHasta: Date | null = null;

      if (nuevosIntentos >= MAX_INTENTOS) {
        bloqueadoHasta = new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000);
        await pool.query(
          "UPDATE administradores SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?",
          [nuevosIntentos, bloqueadoHasta, admin.id]
        );
        await registrarAuditoriaAdmin({
          adminId: admin.id,
          accion: "bloqueo_intentos_fallidos",
          entidad: "administradores",
          entidadId: admin.id,
          detalle: { correo, intentos: nuevosIntentos, minutos: MINUTOS_BLOQUEO },
          ip,
        });

        return NextResponse.json(
          {
            ok: false,
            error: `Cuenta temporalmente bloqueada por ${MAX_INTENTOS} intentos fallidos. Intenta nuevamente en ${MINUTOS_BLOQUEO} minutos.`,
            bloqueado: true,
            minutosRestantes: MINUTOS_BLOQUEO,
          },
          { status: 429 }
        );
      }

      await pool.query(
        "UPDATE administradores SET intentos_fallidos = ? WHERE id = ?",
        [nuevosIntentos, admin.id]
      );

      return NextResponse.json(
        { ok: false, error: GENERIC_ERROR },
        { status: 401 }
      );
    }

    // Asegurar que tenga secreto TOTP configurado
    let secret = admin.totp_secret;
    let isSetup = Boolean(!admin.totp_configurado || !secret);

    if (!secret) {
      secret = generateTotpSecret();
      await pool.query(
        "UPDATE administradores SET totp_secret = ?, totp_configurado = 0 WHERE id = ?",
        [secret, admin.id]
      );
      isSetup = true;
    }

    // 4. Si aún no envía código TOTP (Paso 1 completado)
    if (!totpCode) {
      const codeHint = generateTOTP(secret);

      if (isSetup) {
        const qrSvg = getTotpQrSvg(admin.correo, secret);
        const manualKey = formatTotpSecret(secret);
        return NextResponse.json({
          ok: true,
          requires2FA: true,
          isSetup: true,
          secret,
          manualKey,
          qrSvg,
          codeHint,
          correo: admin.correo,
          nombre: admin.nombre,
        });
      } else {
        return NextResponse.json({
          ok: true,
          requires2FA: true,
          isSetup: false,
          codeHint,
          correo: admin.correo,
          nombre: admin.nombre,
        });
      }
    }

    // 5. Paso 2: Validar código TOTP recibido
    const totpValido = verifyTOTP(totpCode, secret);
    if (!totpValido) {
      const nuevosIntentos = (admin.intentos_fallidos || 0) + 1;
      if (nuevosIntentos >= MAX_INTENTOS) {
        const bloqueadoHasta = new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000);
        await pool.query(
          "UPDATE administradores SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?",
          [nuevosIntentos, bloqueadoHasta, admin.id]
        );
        await registrarAuditoriaAdmin({
          adminId: admin.id,
          accion: "bloqueo_totp_fallido",
          entidad: "administradores",
          entidadId: admin.id,
          detalle: { correo, intentos: nuevosIntentos },
          ip,
        });

        return NextResponse.json(
          {
            ok: false,
            error: `Cuenta temporalmente bloqueada por ${MAX_INTENTOS} intentos fallidos. Intenta nuevamente en ${MINUTOS_BLOQUEO} minutos.`,
            bloqueado: true,
            minutosRestantes: MINUTOS_BLOQUEO,
          },
          { status: 429 }
        );
      }

      await pool.query(
        "UPDATE administradores SET intentos_fallidos = ? WHERE id = ?",
        [nuevosIntentos, admin.id]
      );

      return NextResponse.json(
        { ok: false, error: GENERIC_ERROR },
        { status: 401 }
      );
    }

    // 6. Autenticación exitosa completa
    await pool.query(
      "UPDATE administradores SET intentos_fallidos = 0, bloqueado_hasta = NULL, totp_configurado = 1, ultimo_acceso = NOW() WHERE id = ?",
      [admin.id]
    );

    // Obtener sucursales si es gerente
    let sucursales: number[] = [];
    if (admin.rol === "gerente") {
      const [sucRows]: any = await pool.query(
        "SELECT sucursal_id FROM administrador_sucursales WHERE administrador_id = ?",
        [admin.id]
      );
      sucursales = sucRows.map((r: any) => r.sucursal_id);
    }

    const sessionData: AdminSessionData = {
      id: admin.id,
      nombre: admin.nombre,
      apellido: admin.apellido,
      correo: admin.correo,
      rol: admin.rol,
      sucursales,
      loginEn: new Date().toISOString(),
    };

    const token = signAdminSession(sessionData);

    await registrarAuditoriaAdmin({
      adminId: admin.id,
      accion: "login_exitoso",
      entidad: "administradores",
      entidadId: admin.id,
      detalle: { correo: admin.correo, rol: admin.rol, sucursales },
      ip,
    });

    const response = NextResponse.json({
      ok: true,
      admin: sessionData,
      redirectTo: "/admin",
    });

    // Establecer cookie admin_sesion
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 horas
    });

    return response;
  } catch (error) {
    console.error("[Admin Login Error]:", error);
    return NextResponse.json(
      { ok: false, error: "Error en el servidor al procesar la solicitud" },
      { status: 500 }
    );
  }
}
