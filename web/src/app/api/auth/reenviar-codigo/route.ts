import { NextRequest, NextResponse } from "next/server";
import {
  decodePendingUser,
  encodePendingUser,
  createAndSendVerificationCode,
  PENDING_COOKIE_NAME,
} from "@/lib/auth-verification";

const MIN_RESEND_INTERVAL_MS = 45000; // 45 segundos requeridos entre reenvíos

export async function POST(req: NextRequest) {
  try {
    // 1. Obtener usuario pendiente desde la cookie httpOnly
    const cookie = req.cookies.get(PENDING_COOKIE_NAME);
    const pendingUser = decodePendingUser(cookie?.value);

    if (!pendingUser) {
      return NextResponse.json(
        {
          error: "No se encontró una sesión de verificación activa. Por favor regístrate nuevamente.",
          sessionExpired: true,
        },
        { status: 401 }
      );
    }

    // 2. Comprobar tiempo de espera de 45 segundos en el servidor
    const now = Date.now();
    const elapsed = now - (pendingUser.lastSentAt || 0);

    if (elapsed < MIN_RESEND_INTERVAL_MS) {
      const waitSeconds = Math.ceil((MIN_RESEND_INTERVAL_MS - elapsed) / 1000);
      return NextResponse.json(
        {
          error: `Debes esperar ${waitSeconds} segundos antes de solicitar un nuevo código.`,
          waitSeconds,
        },
        { status: 429 }
      );
    }

    // 3. Invalidar anteriores, generar nuevo código crypto de 6 dígitos, hashearlo y enviarlo
    const { success, devCode } = await createAndSendVerificationCode(
      pendingUser.userId,
      pendingUser.correo,
      pendingUser.nombre
    );

    // 4. Actualizar la cookie con la nueva marca de tiempo del reenvío
    const updatedUser = {
      ...pendingUser,
      lastSentAt: now,
      devCode,
    };

    const response = NextResponse.json(
      {
        success: true,
        message: "Hemos enviado un nuevo código a tu correo electrónico.",
        correo: pendingUser.correo,
        devCode,
      },
      { status: 200 }
    );

    response.cookies.set({
      name: PENDING_COOKIE_NAME,
      value: encodePendingUser(updatedUser),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hora de validez para completar el proceso
    });

    return response;
  } catch (error: any) {
    console.error("[API REENVIAR CODIGO ERROR]:", error);
    return NextResponse.json(
      {
        error: "Error interno al reenviar el código de verificación.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
