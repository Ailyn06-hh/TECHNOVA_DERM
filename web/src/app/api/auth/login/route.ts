import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDbPool } from "@/lib/db";
import { encodePendingUser, PENDING_COOKIE_NAME } from "@/lib/auth-verification";
import { setAuthSessionCookie } from "@/lib/session";
import { normalizarIdentificador, MENSAJES_VALIDACION } from "@/lib/validaciones";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Por favor ingresa tu correo/celular y contraseña." },
        { status: 400 }
      );
    }

    const norm = normalizarIdentificador(identifier);
    if (!norm.esValido && !identifier.trim()) {
      return NextResponse.json(
        { error: MENSAJES_VALIDACION.IDENTIFICADOR_REQUERIDO },
        { status: 400 }
      );
    }

    const pool = getDbPool();

    // 1. Buscar usuario por correo o teléfono normalizado (10 dígitos o correo limpio)
    const [rows]: any = await pool.execute(
      `SELECT id, nombre, apellido, correo, celular, password_hash, verificado, onboarding_omitido 
       FROM usuarios 
       WHERE correo = ? OR (celular = ? AND ? != '') 
       LIMIT 1`,
      [norm.valor, norm.valor, norm.valor]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Correo, celular o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const user = rows[0];

    // 2. Verificar contraseña con bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Correo, celular o contraseña incorrectos." },
        { status: 401 }
      );
    }

    // 3. Verificar si la cuenta ya completó la verificación
    if (user.verificado === 0) {
      // Configurar la cookie de verificación para que el usuario pueda entrar directamente a /verificar
      const response = NextResponse.json(
        {
          error: "Tu cuenta aún no ha sido verificada. Te enviamos un código a tu correo.",
          unverified: true,
          correo: user.correo,
        },
        { status: 403 }
      );

      response.cookies.set({
        name: PENDING_COOKIE_NAME,
        value: encodePendingUser({
          userId: user.id,
          correo: user.correo,
          nombre: user.nombre,
          apellido: user.apellido,
          celular: user.celular,
          lastSentAt: Date.now(),
        }),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      });

      return response;
    }

    // 4. Usuario verificado y credenciales correctas: verificar estado del onboarding
    const [profileRows]: any = await pool.execute(
      "SELECT id FROM perfiles_piel WHERE usuario_id = ? LIMIT 1",
      [user.id]
    );

    const hasProfile = Boolean(profileRows && profileRows.length > 0);
    const onboardingSkipped = Boolean(user.onboarding_omitido);

    // Si no tiene perfil y no lo ha omitido, redirigir a /onboarding/perfil
    const redirectUrl = !hasProfile && !onboardingSkipped ? "/onboarding/perfil" : "/";

    const response = NextResponse.json(
      {
        success: true,
        message: "Inicio de sesión exitoso.",
        redirectUrl,
        user: {
          id: user.id,
          nombre: user.nombre,
          apellido: user.apellido,
          correo: user.correo,
        },
      },
      { status: 200 }
    );

    // Establecer la cookie httpOnly de sesión autenticada
    setAuthSessionCookie(response, {
      userId: user.id,
      correo: user.correo,
      nombre: user.nombre,
      verificado: true,
    });

    return response;
  } catch (error: any) {
    console.error("[API LOGIN ERROR]:", error);
    return NextResponse.json(
      {
        error: "Error interno al procesar el inicio de sesión.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
