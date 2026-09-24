import { NextRequest, NextResponse } from "next/server";
import { getPosSessionFromRequest, POS_SESSION_COOKIE, registrarAuditoriaPos } from "@/lib/pos-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getPosSessionFromRequest(req);

    if (session) {
      await registrarAuditoriaPos(
        "cierre_sesion_empleado",
        session.sucursalId,
        `Sesión cerrada por ${session.nombre} ${session.apellido}. Turno #${session.turnoId} permanece abierto en ${session.cajaNombre}.`,
        session.empleadoId
      );
    }

    const response = NextResponse.json({
      exito: true,
      mensaje: "Sesión cerrada correctamente. El turno de caja sigue abierto.",
      redirect: "/pos",
    });

    response.cookies.set({
      name: POS_SESSION_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error: any) {
    console.error("[POST /api/pos/auth/logout Error]:", error);
    return NextResponse.json(
      { error: "Error al cerrar sesión", details: error.message },
      { status: 500 }
    );
  }
}
