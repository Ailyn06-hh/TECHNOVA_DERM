import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDbPool } from "@/lib/db";
import {
  getPosSessionFromRequest,
  getDispositivoFromRequest,
  POS_SESSION_COOKIE,
  registrarAuditoriaPos,
} from "@/lib/pos-session";
import { TOLERANCIA_CORTE, NOMBRE_MARCA } from "@/lib/marca";
import { sendCorteCajaEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let conn: any = null;
  try {
    const pool = getDbPool();
    const dispositivo = await getDispositivoFromRequest(req);
    let session = await getPosSessionFromRequest(req);

    let turnoIdCandidate: number | null = session?.turnoId || null;

    if (!turnoIdCandidate) {
      // Intentar extraer turnoId de la cookie pos_sesion aunque el turno ya esté en estado 'cerrado'
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|; )pos_sesion=([^;]*)/);
      if (match) {
        try {
          const raw = decodeURIComponent(match[1]);
          const [dataStr] = raw.split(".");
          const payload = JSON.parse(Buffer.from(dataStr, "base64url").toString("utf8"));
          if (payload?.turnoId) {
            turnoIdCandidate = Number(payload.turnoId);
          }
        } catch {}
      }
    }

    if (!turnoIdCandidate) {
      return NextResponse.json(
        { error: "No hay un turno activo en sesión.", redirect: "/pos" },
        { status: 400 }
      );
    }

    // 1. Obtener detalles del turno actual
    const [turnoRows]: any = await pool.execute(
      `SELECT t.id, t.caja_id, t.sucursal_id, t.empleado_id, t.inicio, t.fin, t.estado,
              t.fondo_inicial, c.nombre as caja_nombre, c.fondo_fijo,
              s.nombre as sucursal_nombre, s.correo_gerencia,
              e.nombre as empleado_nombre, e.apellido as empleado_apellido
       FROM turnos t
       JOIN cajas c ON c.id = t.caja_id
       JOIN sucursales s ON s.id = t.sucursal_id
       JOIN empleados e ON e.id = t.empleado_id
       WHERE t.id = ? LIMIT 1`,
      [turnoIdCandidate]
    );

    if (!turnoRows || turnoRows.length === 0) {
      return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
    }

    const turno = turnoRows[0];

    // Si ya está cerrado con corte, responder idempotentemente
    if (turno.estado === "cerrado") {
      const [existingCorte]: any = await pool.execute(
        "SELECT * FROM cortes_caja WHERE turno_id = ? LIMIT 1",
        [turno.id]
      );
      if (existingCorte && existingCorte.length > 0) {
        const resp = NextResponse.json({
          exito: true,
          mensaje: "El turno ya se encuentra cerrado.",
          yaCerrado: true,
          corteId: existingCorte[0].id,
          redirect: "/pos",
        });
        resp.cookies.set({
          name: POS_SESSION_COOKIE,
          value: "",
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        });
        return resp;
      }
    }

    // 2. Validar que no haya una venta en borrador con productos pendientes
    const [draftRows]: any = await pool.execute(
      `SELECT p.id, p.folio, COUNT(pi.id) as items_count
       FROM pedidos p
       LEFT JOIN pedido_items pi ON p.id = pi.pedido_id
       WHERE p.turno_id = ? AND p.estado = 'borrador'
       GROUP BY p.id LIMIT 1`,
      [turno.id]
    );

    if (draftRows.length > 0 && Number(draftRows[0].items_count) > 0) {
      return NextResponse.json(
        {
          error: `Tienes una venta en borrador (${draftRows[0].folio}) con ${draftRows[0].items_count} producto(s). Debes cobrarla o cancelarla antes de realizar el corte.`,
          tieneBorradorPendiente: true,
        },
        { status: 400 }
      );
    }

    // 3. Procesar datos del arqueo recibidos del cuerpo
    const body = await req.json().catch(() => ({}));
    const {
      efectivo_contado,
      tarjeta_contado,
      transferencia_contado,
      desglose_efectivo,
      notas,
      pin_supervisor,
    } = body;

    const efecContadoNum = Math.round(Number(efectivo_contado || 0) * 100) / 100;
    const tarjContadoNum = Math.round(Number(tarjeta_contado || 0) * 100) / 100;
    const transContadoNum = Math.round(Number(transferencia_contado || 0) * 100) / 100;
    const totalContadoNum = Math.round((efecContadoNum + tarjContadoNum + transContadoNum) * 100) / 100;

    // 4. Recalcular montos esperados ESTRICTAMENTE desde movimientos_caja en el servidor
    const [movRows]: any = await pool.execute(
      `SELECT tipo, COALESCE(SUM(monto), 0) as total, COUNT(*) as cantidad
       FROM movimientos_caja
       WHERE turno_id = ?
       GROUP BY tipo`,
      [turno.id]
    );

    const movMap: Record<string, number> = {};
    for (const r of movRows) {
      movMap[r.tipo] = Number(r.total || 0);
    }

    const fondoInicial = movMap["fondo_inicial"] ?? Number(turno.fondo_inicial || turno.fondo_fijo || 1000.00);
    const efectivoVentas = movMap["venta_efectivo"] ?? 0;
    const tarjetaEsperado = movMap["venta_tarjeta"] ?? 0;
    const transferenciaEsperado = movMap["venta_transferencia"] ?? 0;
    const ingresos = movMap["ingreso"] ?? 0;
    const retiros = movMap["retiro"] ?? 0;
    const devoluciones = movMap["devolucion"] ?? 0;

    const efectivoEsperado = Math.round((fondoInicial + efectivoVentas + ingresos - retiros - devoluciones) * 100) / 100;
    const totalEsperado = Math.round((efectivoEsperado + tarjetaEsperado + transferenciaEsperado) * 100) / 100;

    // Calcular diferencias
    const diffEfectivo = Math.round((efecContadoNum - efectivoEsperado) * 100) / 100;
    const diffTarjeta = Math.round((tarjContadoNum - tarjetaEsperado) * 100) / 100;
    const diffTransferencia = Math.round((transContadoNum - transferenciaEsperado) * 100) / 100;
    const diferenciaTotal = Math.round((totalContadoNum - totalEsperado) * 100) / 100;

    // 5. Validación de Tolerancia y Descuadre
    let autorizadoPorId: number | null = null;
    let supervisorNombre: string | null = null;

    const excedeTolerancia = Math.abs(diferenciaTotal) > TOLERANCIA_CORTE;

    if (excedeTolerancia) {
      // Si la diferencia excede los $10, requiere justificación (notas) y PIN de supervisora
      const notasTexto = String(notas || "").trim();
      if (!notasTexto || notasTexto.length < 5) {
        return NextResponse.json(
          {
            error: `La diferencia ($${diferenciaTotal}) excede la tolerancia permitida de ±$${TOLERANCIA_CORTE}. Debes ingresar una justificación detallada en las notas del turno.`,
            requiereNotas: true,
          },
          { status: 400 }
        );
      }

      const pinSupStr = String(pin_supervisor || "").trim();
      if (!pinSupStr) {
        return NextResponse.json(
          {
            error: `La diferencia de arqueo ($${diferenciaTotal}) requiere autorización y PIN de la supervisora de turno.`,
            requiereSupervisor: true,
          },
          { status: 403 }
        );
      }

      // Validar PIN de supervisora asignada a esta sucursal
      const [supRows]: any = await pool.execute(
        `SELECT e.id, e.nombre, e.apellido, e.rol, e.pin_hash, e.activo
         FROM empleados e
         JOIN empleado_sucursales es ON e.id = es.empleado_id
         WHERE es.sucursal_id = ? AND e.rol IN ('supervisora', 'administrador', 'gerente') AND e.activo = 1`,
        [turno.sucursal_id]
      );

      let supervisorValido: any = null;
      for (const sup of supRows) {
        const pinMatch = await bcrypt.compare(pinSupStr, sup.pin_hash);
        if (pinMatch) {
          supervisorValido = sup;
          break;
        }
      }

      if (!supervisorValido) {
        await registrarAuditoriaPos(
          "intento_supervisor_fallido",
          turno.sucursal_id,
          `Intento fallido de autorización de corte en Turno #${turno.id} con diferencia de $${diferenciaTotal}.`,
          turno.empleado_id
        );

        return NextResponse.json(
          {
            error: "PIN de supervisora incorrecto o el usuario no cuenta con facultades de supervisión en esta sucursal.",
            pinInvalido: true,
          },
          { status: 401 }
        );
      }

      autorizadoPorId = supervisorValido.id;
      supervisorNombre = `${supervisorValido.nombre} ${supervisorValido.apellido}`;
    }

    // 6. Consultar estadísticas de la jornada para el reporte
    const [ventasStats]: any = await pool.execute(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
       FROM pedidos
       WHERE turno_id = ? AND canal = 'tienda' AND estado = 'entregado'`,
      [turno.id]
    );
    const ventasCount = Number(ventasStats[0]?.count || 0);
    const ventasTotal = Number(ventasStats[0]?.total || 0);
    const ticketPromedio = ventasCount > 0 ? Math.round((ventasTotal / ventasCount) * 100) / 100 : 0;

    const [pickupsStats]: any = await pool.execute(
      `SELECT COUNT(*) as count
       FROM pedidos
       WHERE entregado_por = ? AND tipo_entrega = 'recoger' AND estado = 'entregado' AND DATE(entregado_en) = CURDATE()`,
      [turno.empleado_id]
    );
    const pedidosEntregados = Number(pickupsStats[0]?.count || 0);

    const [devolucionesRows]: any = await pool.execute(
      `SELECT COUNT(*) as count, COALESCE(SUM(monto), 0) as total
       FROM movimientos_caja
       WHERE turno_id = ? AND tipo = 'devolucion'`,
      [turno.id]
    );
    const devolucionesCount = Number(devolucionesRows[0]?.count || 0);
    const devolucionesTotal = Number(devolucionesRows[0]?.total || 0);

    // 7. Guardar en Base de Datos mediante Transacción Atómica
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const correoDestino = turno.correo_gerencia || "gerencia.centro@technovaderm.mx";

    // A) Insertar registro en cortes_caja
    const [corteResult]: any = await conn.execute(
      `INSERT INTO cortes_caja (
        turno_id, empleado_id, caja_id, sucursal_id,
        fondo_inicial,
        efectivo_esperado, efectivo_contado,
        tarjeta_esperado, tarjeta_contado,
        transferencia_esperado, transferencia_contado,
        total_esperado, total_contado, diferencia_total,
        desglose_efectivo, notas, autorizado_por, enviado_a, cerrado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        turno.id,
        turno.empleado_id,
        turno.caja_id,
        turno.sucursal_id,
        fondoInicial,
        efectivoEsperado,
        efecContadoNum,
        tarjetaEsperado,
        tarjContadoNum,
        transferenciaEsperado,
        transContadoNum,
        totalEsperado,
        totalContadoNum,
        diferenciaTotal,
        desglose_efectivo ? JSON.stringify(desglose_efectivo) : null,
        notas ? String(notas).trim() : null,
        autorizadoPorId,
        correoDestino,
      ]
    );

    const corteId = corteResult.insertId;

    // B) Cerrar el turno oficialmente
    await conn.execute(
      "UPDATE turnos SET estado = 'cerrado', fin = NOW() WHERE id = ?",
      [turno.id]
    );

    // C) Registrar auditoría POS
    await conn.execute(
      `INSERT INTO auditoria_pos (tipo, empleado_id, sucursal_id, detalle, creado_en)
       VALUES ('corte_caja', ?, ?, ?, NOW())`,
      [
        turno.empleado_id,
        turno.sucursal_id,
        JSON.stringify({
          turnoId: turno.id,
          corteId,
          caja: turno.caja_nombre,
          totalEsperado,
          totalContado: totalContadoNum,
          diferencia: diferenciaTotal,
          autorizadoPor: supervisorNombre || null,
        }),
      ]
    );

    await conn.commit();

    // 8. Enviar correo electrónico oficial a gerencia
    const ahoraIso = new Date().toISOString();
    try {
      await sendCorteCajaEmail({
        to: correoDestino,
        sucursalNombre: `Technova-Derm ${turno.sucursal_nombre}`,
        cajaNombre: turno.caja_nombre,
        cajeraNombre: `${turno.empleado_nombre} ${turno.empleado_apellido}`,
        turnoId: turno.id,
        inicioTurno: new Date(turno.inicio).toLocaleString("es-MX"),
        finTurno: new Date().toLocaleString("es-MX"),
        fondoInicial,
        efectivoEsperado,
        efectivoContado: efecContadoNum,
        tarjetaEsperado,
        tarjetaContado: tarjContadoNum,
        transferenciaEsperado,
        transferenciaContado: transContadoNum,
        totalEsperado,
        totalContado: totalContadoNum,
        diferenciaTotal,
        ventasCount,
        ventasTotal,
        ticketPromedio,
        pedidosEntregados,
        devolucionesCount,
        devolucionesTotal,
        notas: notas ? String(notas).trim() : null,
        supervisorNombre,
      });
    } catch (mailErr) {
      console.error("[Corte Email Error]:", mailErr);
    }

    // 9. Crear respuesta y eliminar cookie de sesión pos_sesion
    const response = NextResponse.json({
      exito: true,
      mensaje: "Turno cerrado y corte de caja registrado exitosamente.",
      corteId,
      corte: {
        id: corteId,
        turnoId: turno.id,
        cerradoEn: ahoraIso,
        fondoInicial,
        efectivoEsperado,
        efectivoContado: efecContadoNum,
        tarjetaEsperado,
        tarjetaContado: tarjContadoNum,
        transferenciaEsperado,
        transferenciaContado: transContadoNum,
        totalEsperado,
        totalContado: totalContadoNum,
        diferenciaTotal,
        notas: notas || null,
        autorizadoPor: supervisorNombre || null,
        enviadoA: correoDestino,
      },
      indicadores: {
        ventasCount,
        ventasTotal,
        ticketPromedio,
        pedidosEntregados,
        devolucionesCount,
        devolucionesTotal,
      },
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
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    console.error("[POST /api/pos/turnos/cerrar Error]:", error);
    return NextResponse.json(
      { error: "Error al cerrar turno y registrar corte de caja", details: error.message },
      { status: 500 }
    );
  } finally {
    if (conn) {
      conn.release();
    }
  }
}
