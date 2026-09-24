import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionFromRequest,
  registrarAuditoriaAdmin,
} from "@/lib/admin-session";

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    if (admin) {
      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "logout",
        entidad: "administradores",
        entidadId: admin.id,
        detalle: { correo: admin.correo },
        ip,
      });
    }

    const response = NextResponse.json({ ok: true, redirectTo: "/admin/login" });
    response.cookies.delete(ADMIN_SESSION_COOKIE);
    return response;
  } catch (error) {
    console.error("[Admin Logout Error]:", error);
    const response = NextResponse.json({ ok: true, redirectTo: "/admin/login" });
    response.cookies.delete(ADMIN_SESSION_COOKIE);
    return response;
  }
}

export async function GET(req: NextRequest) {
  // Redirección directa al cerrar sesión por enlace
  const url = new URL("/admin/login", req.url);
  const response = NextResponse.redirect(url);
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
