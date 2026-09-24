import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDbPool } from "@/lib/db";
import {
  getDispositivoFromRequest,
  signPosSession,
  POS_SESSION_COOKIE,
  registrarAuditoriaPos,
} from "@/lib/pos-session";
import { NOMBRE_MARCA } from "@/lib/marca";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Validar dispositivo POS
    const dispositivo = await getDispositivoFromRequest(req);
    if (!dispositivo) {
      return NextResponse.json(
        { error: "Este dispositivo no está registrado como caja", noRegistrado: true },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { caja_id, empleado_id, pin } = body;

    const cajaId = Number(caja_id);
    const empleadoId = Number(empleado_id);
    const pinStr = pin ? String(pin).trim() : "";

    if (!cajaId || !empleadoId || !pinStr) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios (caja, empleada y PIN)." },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(pinStr)) {
      return NextResponse.json(
        { error: "El PIN debe contener exactamente 4 dígitos." },
        { status: 400 }
      );
    }

    const pool = getDbPool();

    // 2. Validar que la caja pertenezca a la sucursal del dispositivo
    const [cajaRows]: any = await pool.execute(
      "SELECT id, nombre, sucursal_id, activa, fondo_fijo FROM cajas WHERE id = ? AND sucursal_id = ? AND activa = 1 LIMIT 1",
      [cajaId, dispositivo.sucursalId]
    );

    if (!cajaRows || cajaRows.length === 0) {
      return NextResponse.json(
        { error: "La caja seleccionada no es válida o no pertenece a esta sucursal." },
        { status: 400 }
      );
    }
    const caja = cajaRows[0];

    // 3. Validar empleado y asignación a la sucursal
    const [empRows]: any = await pool.execute(
      `SELECT e.id, e.nombre, e.apellido, e.rol, e.pin_hash, e.activo,
              e.intentos_fallidos, e.bloqueado_hasta, e.hora_entrada, e.hora_salida
       FROM empleados e
       JOIN empleado_sucursales es ON e.id = es.empleado_id
       WHERE e.id = ? AND es.sucursal_id = ? AND e.activo = 1
       LIMIT 1`,
      [empleadoId, dispositivo.sucursalId]
    );

    if (!empRows || empRows.length === 0) {
      return NextResponse.json(
        { error: "La empleada seleccionada no tiene asignación en esta sucursal." },
        { status: 400 }
      );
    }
    const empleado = empRows[0];

    const ahora = new Date();

    // 4. Si la empleada está bloqueada, responder tiempo restante SIN verificar el PIN
    if (empleado.bloqueado_hasta) {
      const fechaBloqueo = new Date(empleado.bloqueado_hasta);
      const diffMs = fechaBloqueo.getTime() - ahora.getTime();

      if (diffMs > 0) {
        const minutosRestantes = Math.ceil(diffMs / (1000 * 60));
        const hh = String(fechaBloqueo.getHours()).padStart(2, "0");
        const mm = String(fechaBloqueo.getMinutes()).padStart(2, "0");

        return NextResponse.json(
          {
            error: `Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo a las ${hh}:${mm} (en ${minutosRestantes} min).`,
            bloqueada: true,
            bloqueadaHasta: `${hh}:${mm}`,
            minutosRestantes,
          },
          { status: 423 } // Locked
        );
      }
    }

    // 5. Comparar PIN con bcrypt
    const pinCorrecto = await bcrypt.compare(pinStr, empleado.pin_hash);

    if (!pinCorrecto) {
      const nuevosIntentos = Number(empleado.intentos_fallidos || 0) + 1;

      if (nuevosIntentos >= 5) {
        // Bloquear 15 minutos
        await pool.execute(
          `UPDATE empleados 
           SET intentos_fallidos = 5, bloqueado_hasta = DATE_ADD(NOW(), INTERVAL 15 MINUTE) 
           WHERE id = ?`,
          [empleado.id]
        );

        await registrarAuditoriaPos(
          "bloqueo_empleado",
          dispositivo.sucursalId,
          `Empleado ${empleado.nombre} ${empleado.apellido} (ID: ${empleado.id}) bloqueado 15 min tras 5 intentos de PIN fallidos.`,
          empleado.id
        );

        return NextResponse.json(
          {
            error: "Demasiados intentos incorrectos. Tu usuario ha sido bloqueado por 15 minutos.",
            bloqueada: true,
            intentosRestantes: 0,
          },
          { status: 423 }
        );
      } else {
        await pool.execute(
          "UPDATE empleados SET intentos_fallidos = ? WHERE id = ?",
          [nuevosIntentos, empleado.id]
        );

        await registrarAuditoriaPos(
          "intento_pin_fallido",
          dispositivo.sucursalId,
          `Intento fallido de PIN #${nuevosIntentos} para empleado ${empleado.nombre} ${empleado.apellido}.`,
          empleado.id
        );

        const restantes = 5 - nuevosIntentos;
        return NextResponse.json(
          {
            error: `PIN incorrecto. Te quedan ${restantes} ${restantes === 1 ? "intento" : "intentos"}.`,
            intentosRestantes: restantes,
          },
          { status: 401 }
        );
      }
    }

    // 6. PIN correcto: reiniciar contador de intentos fallidos
    await pool.execute(
      "UPDATE empleados SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?",
      [empleado.id]
    );

    // 7. Validar lógica de turnos
    // A) ¿El empleado ya tiene un turno abierto en alguna caja?
    const [turnosAbiertosEmpleado]: any = await pool.execute(
      `SELECT t.id, t.caja_id, t.sucursal_id, t.inicio, c.nombre as caja_nombre
       FROM turnos t
       JOIN cajas c ON t.caja_id = c.id
       WHERE t.empleado_id = ? AND t.estado = 'abierto'
       LIMIT 1`,
      [empleado.id]
    );

    let turnoIdFinal = 0;
    let esReanudacion = false;

    if (turnosAbiertosEmpleado && turnosAbiertosEmpleado.length > 0) {
      const turnoPrevio = turnosAbiertosEmpleado[0];

      if (turnoPrevio.caja_id === caja.id) {
        // Reanuda su propio turno en esta misma caja
        turnoIdFinal = turnoPrevio.id;
        esReanudacion = true;
      } else {
        // Tiene turno abierto en OTRA caja -> Rechazar
        return NextResponse.json(
          {
            error: `Tienes un turno abierto en ${turnoPrevio.caja_nombre}. Debes cerrarlo antes de iniciar en otra caja.`,
          },
          { status: 409 }
        );
      }
    }

    // B) ¿La caja seleccionada está abierta por OTRA persona?
    if (!esReanudacion) {
      const [turnoOcupadoCaja]: any = await pool.execute(
        `SELECT t.id, t.empleado_id, e.nombre, e.apellido
         FROM turnos t
         JOIN empleados e ON t.empleado_id = e.id
         WHERE t.caja_id = ? AND t.estado = 'abierto' AND t.empleado_id != ?
         LIMIT 1`,
        [caja.id, empleado.id]
      );

      if (turnoOcupadoCaja && turnoOcupadoCaja.length > 0) {
        const otro = turnoOcupadoCaja[0];
        return NextResponse.json(
          {
            error: `La caja seleccionada (${caja.nombre}) ya está en uso por ${otro.nombre} ${otro.apellido}.`,
          },
          { status: 409 }
        );
      }

      // C) Abrir nuevo turno
      const fondoInicial = Number(caja.fondo_fijo || 1000.00);

      const [insertTurno]: any = await pool.execute(
        `INSERT INTO turnos (empleado_id, caja_id, sucursal_id, fondo_inicial, inicio, estado)
         VALUES (?, ?, ?, ?, NOW(), 'abierto')`,
        [empleado.id, caja.id, dispositivo.sucursalId, fondoInicial]
      );
      turnoIdFinal = insertTurno.insertId;

      // Registrar fondo inicial en movimientos_caja
      await pool.execute(
        `INSERT INTO movimientos_caja (turno_id, tipo, monto, empleado_id, creado_en)
         VALUES (?, 'fondo_inicial', ?, ?, NOW())`,
        [turnoIdFinal, fondoInicial, empleado.id]
      );

      await registrarAuditoriaPos(
        "inicio_turno",
        dispositivo.sucursalId,
        `Turno #${turnoIdFinal} iniciado por ${empleado.nombre} ${empleado.apellido} en ${caja.nombre} con fondo de $${fondoInicial}.`,
        empleado.id
      );
    } else {
      // Verificar si tiene registrado el fondo_inicial en movimientos_caja
      const [fondoRows]: any = await pool.execute(
        "SELECT id FROM movimientos_caja WHERE turno_id = ? AND tipo = 'fondo_inicial' LIMIT 1",
        [turnoIdFinal]
      );
      if (!fondoRows || fondoRows.length === 0) {
        const fondoInicial = Number(caja.fondo_fijo || 1000.00);
        await pool.execute(
          `INSERT INTO movimientos_caja (turno_id, tipo, monto, empleado_id, creado_en)
           VALUES (?, 'fondo_inicial', ?, ?, NOW())`,
          [turnoIdFinal, fondoInicial, empleado.id]
        );
      }

      await registrarAuditoriaPos(
        "reanudacion_turno",
        dispositivo.sucursalId,
        `Turno #${turnoIdFinal} reanudado por ${empleado.nombre} ${empleado.apellido} en ${caja.nombre}.`,
        empleado.id
      );
    }

    // 8. Crear cookie de sesión pos_sesion (12 horas)
    const sessionData = {
      turnoId: turnoIdFinal,
      empleadoId: empleado.id,
      cajaId: caja.id,
      sucursalId: dispositivo.sucursalId,
      nombre: empleado.nombre,
      apellido: empleado.apellido,
      rol: empleado.rol,
      cajaNombre: caja.nombre,
      sucursalNombre: dispositivo.sucursalNombre,
      sucursalNombreCompleto: dispositivo.sucursalNombreCompleto,
      inicioTurno: new Date().toISOString(),
      horaEntrada: empleado.hora_entrada ? String(empleado.hora_entrada).slice(0, 5) : "10:00",
      horaSalida: empleado.hora_salida ? String(empleado.hora_salida).slice(0, 5) : "18:00",
    };

    const sessionCookieValue = signPosSession(sessionData);

    const response = NextResponse.json({
      exito: true,
      success: true,
      mensaje: esReanudacion
        ? `Turno reanudado en ${caja.nombre}.`
        : `Turno iniciado correctamente en ${caja.nombre}.`,
      turno: {
        id: turnoIdFinal,
        caja: caja.nombre,
        empleada: `${empleado.nombre} ${empleado.apellido}`,
        rol: empleado.rol,
        reanudado: esReanudacion,
      },
      redirect: "/pos/venta",
    });

    response.cookies.set({
      name: POS_SESSION_COOKIE,
      value: sessionCookieValue,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60, // 12 horas
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error: any) {
    console.error("[POST /api/pos/turnos/iniciar Error]:", error);
    return NextResponse.json(
      { error: "Error al iniciar turno de caja", details: error.message },
      { status: 500 }
    );
  }
}
