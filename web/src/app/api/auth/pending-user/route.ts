import { NextRequest, NextResponse } from "next/server";
import { decodePendingUser, PENDING_COOKIE_NAME } from "@/lib/auth-verification";

export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get(PENDING_COOKIE_NAME);
    const pendingUser = decodePendingUser(cookie?.value);

    if (!pendingUser) {
      return NextResponse.json({ pending: false }, { status: 404 });
    }

    return NextResponse.json({
      pending: true,
      correo: pendingUser.correo,
      nombre: pendingUser.nombre,
      apellido: pendingUser.apellido,
      celular: pendingUser.celular,
      lastSentAt: pendingUser.lastSentAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
