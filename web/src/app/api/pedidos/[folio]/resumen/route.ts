import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { pasosSeguimiento } from "@/lib/pedidos";
import { NOMBRE_MARCA } from "@/lib/marca";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { folio: string } }
) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { folio } = params;
    const pool = getDbPool();

    // Consultar pedido. IMPORTANTE: Si no existe o no pertenece al usuario, responder 404 (no revelar su existencia)
    const [orderRows]: any = await pool.execute(
      `SELECT p.*, 
              s.nombre as sucursal_nombre, s.direccion as sucursal_direccion, 
              s.direccion_corta as sucursal_direccion_corta, s.hora_apertura, s.hora_cierre,
              u.nombre as usuario_nombre, u.correo as usuario_correo
       FROM pedidos p
       JOIN usuarios u ON u.id = p.usuario_id
       LEFT JOIN sucursales s ON s.id = p.sucursal_id
       WHERE p.folio = ? AND p.usuario_id = ?
       LIMIT 1`,
      [folio, session.userId]
    );

    if (!orderRows || orderRows.length === 0) {
      return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    }

    const pedido = orderRows[0];

    // Obtener items del pedido
    const [itemsRows]: any = await pool.execute(
      `SELECT pi.*, pr.nombre, pr.slug, pr.color_fondo, pr.color_frasco
       FROM pedido_items pi
       JOIN productos pr ON pr.id = pi.producto_id
       WHERE pi.pedido_id = ?`,
      [pedido.id]
    );

    // Obtener historial de eventos del pedido
    const [eventosRows]: any = await pool.execute(
      `SELECT id, estado, nota, creado_en 
       FROM pedido_eventos 
       WHERE pedido_id = ? 
       ORDER BY creado_en ASC`,
      [pedido.id]
    );

    const pasos = pasosSeguimiento(pedido, eventosRows || []);

    const sucursalNombreFinal = pedido.sucursal_nombre
      ? pedido.sucursal_nombre.startsWith(NOMBRE_MARCA)
        ? pedido.sucursal_nombre
        : `${NOMBRE_MARCA} ${pedido.sucursal_nombre}`
      : null;

    return NextResponse.json({
      pedido: {
        id: pedido.id,
        folio: pedido.folio,
        canal: pedido.canal === "web" ? "Web" : (pedido.canal || "Web"),
        tipo_entrega: pedido.tipo_entrega,
        sucursal: pedido.sucursal_id
          ? {
              id: pedido.sucursal_id,
              nombre: sucursalNombreFinal,
              direccion: pedido.sucursal_direccion,
              direccion_corta: pedido.sucursal_direccion_corta,
              horario: pedido.hora_apertura && pedido.hora_cierre
                ? `${pedido.hora_apertura.slice(0, 5)} - ${pedido.hora_cierre.slice(0, 5)}`
                : null,
            }
          : null,
        envio: pedido.tipo_entrega === "envio"
          ? {
              calle: pedido.envio_calle,
              numero: pedido.envio_numero,
              colonia: pedido.envio_colonia,
              cp: pedido.envio_cp,
              ciudad: pedido.envio_ciudad,
              estado: pedido.envio_estado,
              referencias: pedido.envio_referencias,
              direccionCompleta: `${pedido.envio_calle} #${pedido.envio_numero}, Col. ${pedido.envio_colonia}, C.P. ${pedido.envio_cp}, ${pedido.envio_ciudad}, ${pedido.envio_estado}`,
            }
          : null,
        totales: {
          subtotal: Number(pedido.subtotal),
          descuento: Number(pedido.descuento),
          costo_envio: Number(pedido.costo_envio),
          total: Number(pedido.total),
        },
        metodo_pago: pedido.metodo_pago,
        estado: pedido.estado,
        codigo_recogida: pedido.codigo_recogida,
        reserva_expira_en: pedido.reserva_expira_en,
        creado_en: pedido.creado_en,
      },
      cliente: {
        nombre: pedido.usuario_nombre,
        correo: pedido.usuario_correo,
      },
      items: (itemsRows || []).map((it: any) => ({
        id: it.id,
        producto_id: it.producto_id,
        nombre: it.nombre,
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario),
        descuento: Number(it.descuento || 0),
        grupo_tipo: it.grupo_tipo,
        slug: it.slug,
        color_fondo: it.color_fondo,
        color_frasco: it.color_frasco,
      })),
      eventos: eventosRows || [],
      pasos,
    });
  } catch (err) {
    console.error("[GET /api/pedidos/[folio]/resumen Error]:", err);
    return NextResponse.json(
      { error: "Error interno al consultar el resumen del pedido." },
      { status: 500 }
    );
  }
}
