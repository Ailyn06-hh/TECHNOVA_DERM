import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAdminSessionFromRequest, registrarAuditoriaAdmin } from "@/lib/admin-session";
import { tienePermiso } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "clientes", "ver")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const tipoPiel = searchParams.get("tipo_piel") || "";
    const sucursalId = searchParams.get("sucursal_id") || "";
    const promociones = searchParams.get("promociones") || "";
    const canal = searchParams.get("canal") || "";
    const clienteIdStr = searchParams.get("cliente_id") || "";

    const pool = getDbPool();

    // 1. Obtener sucursales para el filtro
    const [sucursalesRows]: any = await pool.query(
      "SELECT id, nombre, ciudad FROM sucursales WHERE activa = 1 ORDER BY nombre ASC"
    );

    // 2. Armar consulta de clientes
    let whereClauses: string[] = [];
    let queryParams: any[] = [];

    if (q) {
      whereClauses.push("(u.nombre LIKE ? OR u.apellido LIKE ? OR u.correo LIKE ? OR u.celular LIKE ?)");
      const term = `%${q}%`;
      queryParams.push(term, term, term, term);
    }

    if (tipoPiel) {
      whereClauses.push("pp.tipo_piel = ?");
      queryParams.push(tipoPiel);
    }

    if (sucursalId) {
      whereClauses.push("u.sucursal_preferida_id = ?");
      queryParams.push(sucursalId);
    }

    if (promociones === "si") {
      whereClauses.push("u.acepta_promociones = 1");
    } else if (promociones === "no") {
      whereClauses.push("u.acepta_promociones = 0");
    }

    if (canal) {
      whereClauses.push("EXISTS (SELECT 1 FROM pedidos p2 WHERE p2.usuario_id = u.id AND p2.canal = ?)");
      queryParams.push(canal);
    }

    const whereSql = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

    const sqlClientes = `
      SELECT 
        u.id,
        u.nombre,
        u.apellido,
        u.correo,
        u.celular,
        u.acepta_promociones,
        u.fecha_registro,
        u.sucursal_preferida_id,
        s.nombre as sucursal_nombre,
        pp.id as perfil_id,
        pp.tipo_piel,
        pp.presupuesto,
        COALESCE(ped_stats.total_compras, 0) as total_compras,
        COALESCE(ped_stats.monto_total, 0) as monto_total,
        ped_stats.ultima_compra_fecha,
        ped_stats.canales_usados
      FROM usuarios u
      LEFT JOIN perfiles_piel pp ON pp.usuario_id = u.id
      LEFT JOIN sucursales s ON s.id = u.sucursal_preferida_id
      LEFT JOIN (
        SELECT 
          usuario_id,
          COUNT(id) as total_compras,
          SUM(total) as monto_total,
          MAX(creado_en) as ultima_compra_fecha,
          GROUP_CONCAT(DISTINCT canal) as canales_usados
        FROM pedidos
        WHERE usuario_id IS NOT NULL AND estado != 'cancelado'
        GROUP BY usuario_id
      ) ped_stats ON ped_stats.usuario_id = u.id
      ${whereSql}
      ORDER BY u.fecha_registro DESC, u.id DESC
      LIMIT 100
    `;

    const [clientesRows]: any = await pool.query(sqlClientes, queryParams);

    // Obtener preocupaciones de piel para cada cliente
    const clientesConPreocupaciones = await Promise.all(
      clientesRows.map(async (c: any) => {
        let preocupaciones: string[] = [];
        if (c.perfil_id) {
          const [precRows]: any = await pool.query(
            "SELECT preocupacion FROM perfil_preocupaciones WHERE perfil_id = ?",
            [c.perfil_id]
          );
          preocupaciones = precRows.map((r: any) => r.preocupacion);
        }
        return {
          ...c,
          monto_total: parseFloat(c.monto_total || 0),
          canales: c.canales_usados ? c.canales_usados.split(",") : [],
          preocupaciones,
        };
      })
    );

    // 3. Si se solicita detalle de un cliente en particular
    let clienteDetalle: any = null;
    const targetId = clienteIdStr || (clientesConPreocupaciones.length > 0 ? String(clientesConPreocupaciones[0].id) : null);

    if (targetId) {
      const selectedClient = clientesConPreocupaciones.find((c) => String(c.id) === String(targetId));
      if (selectedClient) {
        // Historial de pedidos
        const [pedidosRows]: any = await pool.query(
          `SELECT p.id, p.canal, p.estado, p.total, p.metodo_pago, p.creado_en, s.nombre as sucursal_nombre
           FROM pedidos p
           LEFT JOIN sucursales s ON p.sucursal_id = s.id
           WHERE p.usuario_id = ?
           ORDER BY p.creado_en DESC`,
          [targetId]
        );

        // Ítems comprados históricamente para alertas de recompra
        const [itemsRows]: any = await pool.query(
          `SELECT 
            pi.producto_id,
            pr.nombre as producto_nombre,
            pr.sku,
            MAX(p.creado_en) as ultima_fecha_compra,
            COUNT(pi.id) as veces_comprado
           FROM pedido_items pi
           JOIN pedidos p ON pi.pedido_id = p.id
           JOIN productos pr ON pi.producto_id = pr.id
           WHERE p.usuario_id = ? AND p.estado != 'cancelado'
           GROUP BY pi.producto_id, pr.nombre, pr.sku
           ORDER BY ultima_fecha_compra DESC`,
          [targetId]
        );

        // Calcular recomendaciones de recompra (productos comprados hace más de 25 días)
        const ahora = new Date();
        const alertasRecompra = itemsRows.map((item: any) => {
          const fechaCompra = new Date(item.ultima_fecha_compra);
          const diasDesdeCompra = Math.floor((ahora.getTime() - fechaCompra.getTime()) / (1000 * 60 * 60 * 24));
          const necesitaRecompra = diasDesdeCompra >= 25;
          return {
            producto_id: item.producto_id,
            producto_nombre: item.producto_nombre,
            sku: item.sku,
            ultima_fecha_compra: item.ultima_fecha_compra,
            dias_transcurridos: diasDesdeCompra,
            necesitaRecompra,
          };
        });

        clienteDetalle = {
          ...selectedClient,
          pedidos: pedidosRows,
          alertasRecompra,
        };
      }
    }

    return NextResponse.json({
      ok: true,
      clientes: clientesConPreocupaciones,
      sucursales: sucursalesRows,
      clienteDetalle,
    });
  } catch (error) {
    console.error("[Admin Clientes API Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al obtener clientes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "clientes", "editar")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { accion, usuario_id, acepta_promociones, producto_id, producto_nombre } = body;

    const pool = getDbPool();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    if (accion === "toggle_promociones") {
      const nuevoValor = acepta_promociones ? 1 : 0;
      await pool.query("UPDATE usuarios SET acepta_promociones = ? WHERE id = ?", [nuevoValor, usuario_id]);

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "actualizar_cliente_promociones",
        entidad: "usuarios",
        entidadId: usuario_id,
        detalle: { acepta_promociones: nuevoValor },
        ip,
      });

      return NextResponse.json({ ok: true, mensaje: "Preferencia de promociones actualizada" });
    }

    if (accion === "enviar_recordatorio") {
      const prodNombre = producto_nombre || "tus productos favoritos";
      await pool.query(
        `INSERT INTO notificaciones (usuario_id, tipo, evento, titulo, mensaje, enlace, leida, creado_en)
         VALUES (?, 'recompra', 'recordatorio_admin', '¡Hora de reabastecer tus esenciales!', ?, '/cuenta/pedidos', 0, NOW())`,
        [usuario_id, `Notamos que podrías estar necesitando ${prodNombre}. Haz tu pedido hoy con envío prioritario.`]
      );

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "enviar_recordatorio_recompra",
        entidad: "usuarios",
        entidadId: usuario_id,
        detalle: { producto_id, producto_nombre },
        ip,
      });

      return NextResponse.json({ ok: true, mensaje: "Recordatorio de recompra enviado exitosamente" });
    }

    return NextResponse.json({ ok: false, error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("[Admin Clientes POST Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al procesar la solicitud" }, { status: 500 });
  }
}
