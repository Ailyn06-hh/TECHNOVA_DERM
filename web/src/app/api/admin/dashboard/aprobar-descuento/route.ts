import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAdminSessionFromRequest, registrarAuditoriaAdmin } from "@/lib/admin-session";
import { tienePermiso } from "@/lib/permisos";

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "promociones", "aprobar_descuento")) {
      return NextResponse.json(
        { ok: false, error: "No tienes permiso para aprobar descuentos" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { productoId, loteId, precioOferta, descuentoPct } = body;

    if (!productoId || !precioOferta) {
      return NextResponse.json(
        { ok: false, error: "Datos incompletos para aplicar el descuento" },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    // Actualizar producto para aplicar oferta omnicanal al instante
    await pool.query(
      `UPDATE productos
       SET precio_especial = ?
       WHERE id = ?`,
      [precioOferta, productoId]
    );

    // Registrar en auditoría
    await registrarAuditoriaAdmin({
      adminId: admin.id,
      accion: "aprobar_descuento_caducidad",
      entidad: "productos",
      entidadId: productoId,
      detalle: {
        loteId,
        precioOferta,
        descuentoPct,
        aprobadoPor: admin.correo,
      },
      ip,
    });

    return NextResponse.json({
      ok: true,
      mensaje: "Descuento por caducidad aprobado y aplicado instantáneamente en Web, App y POS.",
      productoId,
      precioOferta,
    });
  } catch (error) {
    console.error("[Aprobar Descuento Error]:", error);
    return NextResponse.json(
      { ok: false, error: "Error al procesar la aprobación del descuento" },
      { status: 500 }
    );
  }
}
