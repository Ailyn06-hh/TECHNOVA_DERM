import { NextResponse } from "next/server";
import { clearAuthSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: "Sesión cerrada correctamente", redirectUrl: "/" },
    { status: 200 }
  );

  clearAuthSessionCookie(response);
  return response;
}
