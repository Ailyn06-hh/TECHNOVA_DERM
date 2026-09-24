import { getDbPool } from "@/lib/db";
import { NOMBRE_MARCA } from "@/lib/marca";
import { sugerirRecompra } from "@/lib/recomendaciones";

export function formatearFechaCorta(fechaStr: string | Date): string {
  const d = new Date(fechaStr);
  const ahora = new Date();
  const esMismoAnio = d.getFullYear() === ahora.getFullYear();

  const formatter = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    ...(esMismoAnio ? {} : { year: "numeric" }),
  });

  return formatter.format(d).replace(/\./g, "");
}

export async function getResumenCuenta(userId: number, sessionUser: { nombre: string; correo: string }) {
  const pool = getDbPool();

  // 1. Consultar pedido en curso más reciente
  const [activeRows]: any = await pool.execute(
    `SELECT 
      p.id, p.folio, p.canal, p.tipo_entrega, p.sucursal_id, p.codigo_recogida,
      p.total, p.subtotal, p.descuento, p.costo_envio, p.estado, p.metodo_pago,
      p.reserva_expira_en, p.creado_en,
      p.envio_calle, p.envio_numero, p.envio_colonia, p.envio_cp, p.envio_ciudad,
      s.nombre as sucursal_nombre, s.direccion_corta as sucursal_direccion_corta
     FROM pedidos p
     LEFT JOIN sucursales s ON s.id = p.sucursal_id
     WHERE p.usuario_id = ?
       AND p.estado IN ('pagado', 'por_pagar_en_tienda', 'listo_para_recoger', 'enviado', 'preparando')
     ORDER BY p.creado_en DESC, p.id DESC
     LIMIT 1`,
    [userId]
  );

  // Contar total de pedidos activos en curso
  const [countActiveRows]: any = await pool.execute(
    `SELECT COUNT(*) as total_activos 
     FROM pedidos 
     WHERE usuario_id = ? 
       AND estado IN ('pagado', 'por_pagar_en_tienda', 'listo_para_recoger', 'enviado', 'preparando')`,
    [userId]
  );

  const totalActivos = Number(countActiveRows[0]?.total_activos || 0);
  const otrosPedidosEnCursoCount = Math.max(0, totalActivos - 1);

  let pedidoEnCurso: any = null;
  let activeOrderId: number | null = null;

  if (activeRows && activeRows.length > 0) {
    const p = activeRows[0];
    activeOrderId = p.id;

    const [itemsCountRows]: any = await pool.execute(
      "SELECT COALESCE(SUM(cantidad), 0) as items_count FROM pedido_items WHERE pedido_id = ?",
      [p.id]
    );
    const itemsCount = Number(itemsCountRows[0]?.items_count || 1);

    let canalOrigenTexto = "la web";
    if (p.canal === "app") canalOrigenTexto = "la app";
    else if (p.canal === "tienda") canalOrigenTexto = "la tienda";

    const sucursalNombreFinal = p.sucursal_nombre
      ? p.sucursal_nombre.startsWith(NOMBRE_MARCA)
        ? p.sucursal_nombre
        : `${NOMBRE_MARCA} ${p.sucursal_nombre}`
      : `${NOMBRE_MARCA} Centro`;

    const sucursalDirCorta = p.sucursal_direccion_corta || "Calle Madero 45";

    pedidoEnCurso = {
      id: p.id,
      folio: p.folio,
      estado: p.estado,
      tipo_entrega: p.tipo_entrega,
      total: Number(p.total),
      itemsCount,
      canalTexto: `Hecho en ${canalOrigenTexto} · ${itemsCount} ${itemsCount === 1 ? "producto" : "productos"} · $${Math.round(Number(p.total))}`,
      codigoRecogida: p.codigo_recogida,
      sucursalTexto: `${sucursalNombreFinal}, ${sucursalDirCorta}`,
      reservaExpiraEn: p.reserva_expira_en,
      direccionCorta: p.envio_calle ? `${p.envio_calle} #${p.envio_numero}, Col. ${p.envio_colonia}` : null,
    };
  }

  // 2. Recompra sugerida
  const recompra = await sugerirRecompra(userId);

  // 3. Perfil de piel
  const [profileRows]: any = await pool.execute(
    "SELECT id, tipo_piel, presupuesto FROM perfiles_piel WHERE usuario_id = ? LIMIT 1",
    [userId]
  );

  let perfilPiel: any = null;
  if (profileRows && profileRows.length > 0) {
    const prof = profileRows[0];
    const [preocRows]: any = await pool.execute(
      "SELECT preocupacion FROM perfil_preocupaciones WHERE perfil_id = ?",
      [prof.id]
    );
    const preocupaciones = (preocRows || []).map((r: any) => r.preocupacion);

    let presupuestoTexto = "$300 - $500 por producto";
    if (prof.presupuesto === "bajo") presupuestoTexto = "$150 - $300 por producto";
    else if (prof.presupuesto === "alto") presupuestoTexto = "$500+ por producto";
    else if (prof.presupuesto && prof.presupuesto !== "medio") presupuestoTexto = `${prof.presupuesto} por producto`;

    perfilPiel = {
      hasProfile: true,
      tipoPiel: prof.tipo_piel,
      preocupaciones,
      presupuestoTexto: `Presupuesto: ${presupuestoTexto}`,
    };
  } else {
    perfilPiel = {
      hasProfile: false,
    };
  }

  // 4. Mi rutina guardada
  const [savedRoutineRows]: any = await pool.execute(
    `SELECT id, plantilla_clave, tipo_piel, creado_en 
     FROM rutinas_guardadas 
     WHERE usuario_id = ? 
     ORDER BY creado_en DESC 
     LIMIT 1`,
    [userId]
  );

  let rutinaGuardada: any = null;

  if (savedRoutineRows && savedRoutineRows.length > 0) {
    const r = savedRoutineRows[0];
    const [itemRows]: any = await pool.execute(
      `SELECT rgi.orden, p.id, p.nombre, p.slug, p.color_fondo, p.color_frasco
       FROM rutina_guardada_items rgi
       JOIN productos p ON p.id = rgi.producto_id
       WHERE rgi.rutina_id = ?
       ORDER BY rgi.orden ASC`,
      [r.id]
    );

    rutinaGuardada = {
      hasRoutine: true,
      titulo: "Mi rutina guardada",
      esComprada: false,
      plantillaClave: r.plantilla_clave,
      subtitulo: `${(itemRows || []).length} pasos · ${r.plantilla_clave === "noche" ? "noche" : "mañana"}`,
      productos: (itemRows || []).map((it: any) => ({
        id: it.id,
        nombre: it.nombre,
        slug: it.slug,
        color_fondo: it.color_fondo,
        color_frasco: it.color_frasco,
      })),
    };
  } else {
    const [boughtRoutineRows]: any = await pool.execute(
      `SELECT pi.pedido_id, pi.grupo_clave, p_ped.creado_en
       FROM pedido_items pi
       JOIN pedidos p_ped ON p_ped.id = pi.pedido_id
       WHERE p_ped.usuario_id = ?
         AND pi.grupo_tipo = 'rutina'
       ORDER BY p_ped.creado_en DESC, pi.id DESC
       LIMIT 1`,
      [userId]
    );

    if (boughtRoutineRows && boughtRoutineRows.length > 0) {
      const br = boughtRoutineRows[0];
      const [boughtItems]: any = await pool.execute(
        `SELECT pi.producto_id as id, pr.nombre, pr.slug, pr.color_fondo, pr.color_frasco
         FROM pedido_items pi
         JOIN productos pr ON pr.id = pi.producto_id
         WHERE pi.pedido_id = ? AND pi.grupo_tipo = 'rutina'`,
        [br.pedido_id]
      );

      rutinaGuardada = {
        hasRoutine: true,
        titulo: "Tu última rutina",
        esComprada: true,
        plantillaClave: br.grupo_clave || "manana",
        subtitulo: `${(boughtItems || []).length} pasos · ${br.grupo_clave === "noche" ? "noche" : "mañana"}`,
        productos: (boughtItems || []).map((it: any) => ({
          id: it.id,
          nombre: it.nombre,
          slug: it.slug,
          color_fondo: it.color_fondo,
          color_frasco: it.color_frasco,
        })),
      };
    } else {
      rutinaGuardada = {
        hasRoutine: false,
      };
    }
  }

  // 5. Últimos pedidos
  const excludeFilter = activeOrderId ? `AND p.id != ${activeOrderId}` : "";
  const [recentOrdersRows]: any = await pool.execute(
    `SELECT 
      p.id, p.folio, p.canal, p.tipo_entrega, p.sucursal_id, 
      s.nombre as sucursal_nombre, p.total, p.estado, p.creado_en
     FROM pedidos p
     LEFT JOIN sucursales s ON s.id = p.sucursal_id
     WHERE p.usuario_id = ?
       AND p.estado != 'borrador'
       ${excludeFilter}
     ORDER BY p.creado_en DESC
     LIMIT 3`,
    [userId]
  );

  const ultimosPedidos = (recentOrdersRows || []).map((ped: any) => {
    let canalLabel = "Web";
    if (ped.canal === "app") canalLabel = "App";
    else if (ped.canal === "tienda") {
      canalLabel = `Tienda ${ped.sucursal_nombre || "Centro"}`;
    }

    return {
      id: ped.id,
      folio: ped.folio,
      fechaCorta: formatearFechaCorta(ped.creado_en),
      canalLabel,
      estado: ped.estado,
      total: Number(ped.total),
    };
  });

  // 6. Contador de notificaciones no leídas
  const [countUnread]: any = await pool.execute(
    "SELECT COUNT(*) as unread_count FROM notificaciones WHERE usuario_id = ? AND leida = 0",
    [userId]
  );
  const unreadCount = Number(countUnread[0]?.unread_count || 0);

  return {
    usuario: {
      nombre: sessionUser.nombre,
      correo: sessionUser.correo,
    },
    pedidoEnCurso,
    otrosPedidosEnCursoCount,
    recompra,
    perfilPiel,
    rutinaGuardada,
    ultimosPedidos,
    unreadCount,
  };
}

export async function obtenerDireccionesYPagos(userId: number) {
  const pool = getDbPool();

  // 1. Direcciones
  const [dirRows]: any = await pool.execute(
    `SELECT id, alias, calle_y_numero, calle, numero_exterior, numero_interior, 
            colonia, codigo_postal, ciudad, estado, referencias, predeterminada, creado_en
     FROM direcciones 
     WHERE usuario_id = ? 
     ORDER BY predeterminada DESC, id DESC`,
    [userId]
  );

  const direcciones = (dirRows || []).map((r: any) => ({
    id: r.id,
    alias: r.alias || "Casa",
    calle_y_numero: r.calle_y_numero || `${r.calle || ""} ${r.numero_exterior || ""}`.trim(),
    numero_interior: r.numero_interior || null,
    colonia: r.colonia,
    codigo_postal: r.codigo_postal,
    ciudad: r.ciudad,
    estado: r.estado,
    referencias: r.referencias || null,
    predeterminada: r.predeterminada === 1,
    creado_en: r.creado_en instanceof Date ? r.creado_en.toISOString() : String(r.creado_en),
  }));

  // 2. Tarjetas
  const [cardRows]: any = await pool.execute(
    `SELECT id, proveedor, marca, ultimos4, titular, mes_vencimiento, anio_vencimiento, predeterminado, creado_en
     FROM metodos_pago
     WHERE usuario_id = ?
     ORDER BY predeterminado DESC, id DESC`,
    [userId]
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const tarjetas = (cardRows || []).map((t: any) => {
    const mes = Number(t.mes_vencimiento);
    const anio = Number(t.anio_vencimiento);
    const cardExpDate = new Date(anio, mes, 0, 23, 59, 59);
    const estaVencida =
      anio < currentYear || (anio === currentYear && mes < currentMonth);
    const vencePronto = !estaVencida && cardExpDate <= in60Days;

    return {
      id: t.id,
      proveedor: t.proveedor,
      marca: t.marca.toLowerCase(),
      marcaLabel: t.marca.toUpperCase(),
      ultimos4: t.ultimos4,
      titular: t.titular,
      mes_vencimiento: mes,
      anio_vencimiento: anio,
      vencimientoTexto: `${String(mes).padStart(2, "0")}/${String(anio).slice(-2)}`,
      predeterminado: t.predeterminado === 1,
      estaVencida,
      vencePronto,
      creado_en: t.creado_en instanceof Date ? t.creado_en.toISOString() : String(t.creado_en),
    };
  });

  // 3. Cuentas vinculadas
  const [vincRows]: any = await pool.execute(
    `SELECT proveedor, cuenta_mascara, conectado_en
     FROM cuentas_vinculadas
     WHERE usuario_id = ?`,
    [userId]
  );

  const cuentasVinculadas: Record<string, { conectado: boolean; cuentaMascara?: string; conectadoEn?: string }> = {
    mercadopago: { conectado: false },
  };

  if (Array.isArray(vincRows)) {
    for (const row of vincRows) {
      cuentasVinculadas[row.proveedor] = {
        conectado: true,
        cuentaMascara: row.cuenta_mascara,
        conectadoEn: row.conectado_en instanceof Date ? row.conectado_en.toISOString() : String(row.conectado_en),
      };
    }
  }

  return {
    direcciones,
    tarjetas,
    cuentasVinculadas,
  };
}
