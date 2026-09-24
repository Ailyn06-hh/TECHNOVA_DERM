import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Solo aplicar a rutas bajo /pos
  if (pathname.startsWith("/pos")) {
    const deviceCookie = request.cookies.get("pos_dispositivo");
    const sessionCookie = request.cookies.get("pos_sesion");

    const hasDevice = !!deviceCookie?.value;
    const hasSession = !!sessionCookie?.value;

    // Rutas públicas dentro del POS (registro de terminal)
    if (pathname === "/pos/registrar-dispositivo") {
      return NextResponse.next();
    }

    // Rutas operativas de venta: exigen dispositivo y sesión de turno activa
    let response: NextResponse;
    if (pathname.startsWith("/pos/venta")) {
      if (!hasDevice || !hasSession) {
        response = NextResponse.redirect(new URL("/pos", request.url));
      } else {
        response = NextResponse.next();
      }
    } else {
      response = NextResponse.next();
    }

    // Asegurar que las cookies de POS tengan path: '/' para que las peticiones /api/pos/* también las reciban
    if (deviceCookie?.value) {
      response.cookies.set({
        name: "pos_dispositivo",
        value: deviceCookie.value,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
      });
    }

    if (sessionCookie?.value) {
      response.cookies.set({
        name: "pos_sesion",
        value: sessionCookie.value,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 12 * 60 * 60,
      });
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pos/:path*"],
};
