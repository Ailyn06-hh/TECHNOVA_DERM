import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDbPool } from "@/lib/db";
import { decodePendingUser, PENDING_COOKIE_NAME } from "@/lib/auth-verification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { codigo } = body;

    // 1. Validar formato del código (exactamente 6 dígitos numéricos)
    if (!codigo || typeof codigo !== "string" || !/^\d{6}$/.test(codigo.trim())) {
      return NextResponse.json(
        { error: "El código debe tener exactamente 6 dígitos numéricos." },
        { status: 400 }
      );
    }

    const cleanCode = codigo.trim();

    // 2. Obtener el usuario pendiente desde la cookie httpOnly del servidor
    const cookie = req.cookies.get(PENDING_COOKIE_NAME);
    const pendingUser = decodePendingUser(cookie?.value);

    if (!pendingUser) {
      return NextResponse.json(
        {
          error: "No se encontró una sesión de verificación activa. Por favor regístrate o inicia sesión.",
          sessionExpired: true,
        },
        { status: 401 }
      );
    }

    const pool = getDbPool();

    // 3. Buscar el último código emitido para este usuario que aún no haya sido marcado como usado
    const [rows]: any = await pool.execute(
      `SELECT id, codigo_hash, expira_en, intentos, usado 
       FROM codigos_verificacion 
       WHERE usuario_id = ? AND usado = 0 
       ORDER BY id DESC LIMIT 1`,
      [pendingUser.userId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        {
          error: "No hay ningún código de verificación activo. Por favor solicita uno nuevo.",
          needsResend: true,
        },
        { status: 400 }
      );
    }

    const record = rows[0];

    // 4. Verificar si ya superó 5 intentos
    if (record.intentos >= 5) {
      // Invalida el código agotado
      await pool.execute(
        "UPDATE codigos_verificacion SET usado = 1 WHERE id = ?",
        [record.id]
      );
      return NextResponse.json(
        {
          error: "Has superado el máximo de 5 intentos permitidos. Por favor solicita un nuevo código.",
          needsResend: true,
        },
        { status: 429 }
      );
    }

    // 5. Verificar si el código ya expiró (10 minutos)
    const now = new Date();
    const expiresAt = new Date(record.expira_en);
    if (now > expiresAt) {
      await pool.execute(
        "UPDATE codigos_verificacion SET usado = 1 WHERE id = ?",
        [record.id]
      );
      return NextResponse.json(
        {
          error: "El código ha expirado (vigencia de 10 minutos). Solicita uno nuevo.",
          needsResend: true,
        },
        { status: 400 }
      );
    }

    // 6. Comparar el hash bcrypt con el código ingresado
    const isMatch = await bcrypt.compare(cleanCode, record.codigo_hash);

    if (!isMatch) {
      // Incrementar contador de intentos fallidos
      const newAttempts = record.intentos + 1;
      await pool.execute(
        "UPDATE codigos_verificacion SET intentos = ? WHERE id = ?",
        [newAttempts, record.id]
      );

      const remaining = 5 - newAttempts;
      if (remaining <= 0) {
        await pool.execute(
          "UPDATE codigos_verificacion SET usado = 1 WHERE id = ?",
          [record.id]
        );
        return NextResponse.json(
          {
            error: "Código incorrecto. Has alcanzado el límite de 5 intentos. Solicita un nuevo código.",
            needsResend: true,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: `El código ingresado es incorrecto. Te quedan ${remaining} ${
            remaining === 1 ? "intento" : "intentos"
          }.`,
          remainingAttempts: remaining,
        },
        { status: 400 }
      );
    }

    // 7. Código correcto: marcar código como usado y cuenta como verificada
    await pool.execute(
      "UPDATE codigos_verificacion SET usado = 1 WHERE id = ?",
      [record.id]
    );

    await pool.execute(
      "UPDATE usuarios SET verificado = 1 WHERE id = ?",
      [pendingUser.userId]
    );

    // 8. Crear respuesta exitosa y limpiar la cookie de verificación pendiente
    const response = NextResponse.json(
      {
        success: true,
        message: "¡Cuenta verificada exitosamente!",
        redirectUrl: "/login?verified=true",
      },
      { status: 200 }
    );

    // Remover la cookie temporal de verificación
    response.cookies.set({
      name: PENDING_COOKIE_NAME,
      value: "",
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("[API VERIFICAR ERROR]:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor al verificar el código. Intenta de nuevo.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
