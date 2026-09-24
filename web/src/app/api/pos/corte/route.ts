import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { TOLERANCIA_CORTE, CORTE_CIEGO, NOMBRE_MARCA } from "@/lib/marca";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json({ error: "Sesión no válida o no iniciada." }, { status: 401 });
    }

    const pool = getDbPool();

    // 1. Obtener información del turno y de la sucursal/caja
    const [turnoRows]: any = await pool.execute(
      `SELECT t.id, t.caja_id, t.sucursal_id, t.empleado_id, t.inicio, t.fin, t.estado,
              t.fondo_inicial, c.nombre as caja_nombre, c.fondo_fijo,
              s.nombre as sucursal_nombre, s.correo_gerencia,
              e.nombre as empleado_nombre, e.apellido as empleado_apellido,
              e.hora_entrada, e.hora_salida
       FROM turnos t
       JOIN cajas c ON c.id = t.caja_id
       JOIN sucursales s ON s.id = t.sucursal_id
       JOIN empleados e ON e.id = t.empleado_id
       WHERE t.id = ? LIMIT 1`,
      [session.turnoId]
    );

    if (!turnoRows || turnoRows.length === 0) {
      return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
    }

    const turno = turnoRows[0];

    // 2. Si el turno ya fue cerrado, buscar su corte definitivo
    const [corteRows]: any = await pool.execute(
      `SELECT * FROM cortes_caja WHERE turno_id = ? LIMIT 1`,
      [turno.id]
    );

    const yaCerrado = turno.estado === "cerrado" && corteRows && corteRows.length > 0;
    const corteDefinitivo = yaCerrado ? corteRows[0] : null;

    // 3. Montos esperados calculados ESTRICTAMENTE desde movimientos_caja
    const [movRows]: any = await pool.execute(
      `SELECT tipo, COALESCE(SUM(monto), 0) as total, COUNT(*) as cantidad
       FROM movimientos_caja
       WHERE turno_id = ?
       GROUP BY tipo`,
      [turno.id]
    );

    const movMap: Record<string, { total: number; cantidad: number }> = {};
    for (const r of movRows) {
      movMap[r.tipo] = {
        total: Number(r.total || 0),
        cantidad: Number(r.cantidad || 0),
      };
    }

    // Fondo inicial (del movimiento o del turno)
    let fondoInicial = movMap["fondo_inicial"]?.total ?? Number(turno.fondo_inicial || turno.fondo_fijo || 1000.00);
    const efectivoVentas = movMap["venta_efectivo"]?.total ?? 0;
    const tarjetaEsperado = movMap["venta_tarjeta"]?.total ?? 0;
    const transferenciaEsperado = movMap["venta_transferencia"]?.total ?? 0;
    const ingresos = movMap["ingreso"]?.total ?? 0;
    const retiros = movMap["retiro"]?.total ?? 0;
    const devoluciones = movMap["devolucion"]?.total ?? 0;

    // Efectivo en caja esperado = fondo inicial + ventas efectivo + ingresos - retiros - devoluciones
    const efectivoEsperado = Math.round((fondoInicial + efectivoVentas + ingresos - retiros - devoluciones) * 100) / 100;
    const totalEsperado = Math.round((efectivoEsperado + tarjetaEsperado + transferenciaEsperado) * 100) / 100;

    // 4. Indicadores de la jornada:
    // Ventas mostrador entregadas en este turno
    const [ventasStats]: any = await pool.execute(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
       FROM pedidos
       WHERE turno_id = ? AND canal = 'tienda' AND estado = 'entregado'`,
      [turno.id]
    );
    const ventasCount = Number(ventasStats[0]?.count || 0);
    const ventasTotal = Number(ventasStats[0]?.total || 0);
    const ticketPromedio = ventasCount > 0 ? Math.round((ventasTotal / ventasCount) * 100) / 100 : 0;

    // Pedidos entregados por recoger en tienda
    const [pickupsStats]: any = await pool.execute(
      `SELECT COUNT(*) as count
       FROM pedidos
       WHERE entregado_por = ? AND tipo_entrega = 'recoger' AND estado = 'entregado' AND DATE(entregado_en) = CURDATE()`,
      [turno.empleado_id]
    );
    const pedidosEntregados = Number(pickupsStats[0]?.count || 0);

    // Devoluciones
    const devolucionesCount = movMap["devolucion"]?.cantidad ?? 0;
    const devolucionesTotal = devoluciones;

    // 5. Verificar si hay venta en borrador con productos pendientes en este turno
    const [draftRows]: any = await pool.execute(
      `SELECT p.id, COUNT(pi.id) as items_count
       FROM pedidos p
       LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
       WHERE p.turno_id = ? AND p.estado = 'borrador'
       GROUP BY p.id LIMIT 1`,
      [turno.id]
    );

    const tieneBorradorPendiente = draftRows.length > 0 && Number(draftRows[0].items_count) > 0;
    const itemsEnBorrador = tieneBorradorPendiente ? Number(draftRows[0].items_count) : 0;
    const borradorId = tieneBorradorPendiente ? Number(draftRows[0].id) : null;

    // Formatear fechas legibles
    const fmtFechaHora = (dStr: string | null) => {
      if (!dStr) return "";
      const d = new Date(dStr);
      return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    };

    return NextResponse.json({
      exito: true,
      marca: NOMBRE_MARCA,
      yaCerrado,
      corteDefinitivo,
      turno: {
        id: turno.id,
        inicio: turno.inicio,
        inicioHora: fmtFechaHora(turno.inicio),
        fin: turno.fin,
        finHora: fmtFechaHora(turno.fin),
        estado: turno.estado,
        fondoInicial,
        horaEntrada: turno.hora_entrada ? String(turno.hora_entrada).slice(0, 5) : "10:00",
        horaSalida: turno.hora_salida ? String(turno.hora_salida).slice(0, 5) : "18:00",
      },
      caja: {
        id: turno.caja_id,
        nombre: turno.caja_nombre,
      },
      sucursal: {
        id: turno.sucursal_id,
        nombre: `Technova-Derm ${turno.sucursal_nombre}`,
        sucursalSimple: turno.sucursal_nombre,
        correoGerencia: turno.correo_gerencia || "gerencia.centro@technovaderm.mx",
      },
      cajera: {
        id: turno.empleado_id,
        nombre: `${turno.empleado_nombre} ${turno.empleado_apellido}`,
      },
      indicadores: {
        ventasCount,
        ventasTotal,
        ticketPromedio,
        pedidosEntregados,
        devolucionesCount,
        devolucionesTotal,
      },
      esperados: {
        fondoInicial,
        efectivoVentas,
        efectivoEsperado,
        tarjetaEsperado,
        transferenciaEsperado,
        ingresos,
        retiros,
        devoluciones,
        totalEsperado,
      },
      configuracion: {
        tolerancia: TOLERANCIA_CORTE,
        corteCiego: CORTE_CIEGO,
      },
      advertencias: {
        tieneBorradorPendiente,
        itemsEnBorrador,
        borradorId,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/pos/corte Error]:", error);
    return NextResponse.json(
      { error: "Error al obtener datos para corte de caja", details: error.message },
      { status: 500 }
    );
  }
}
