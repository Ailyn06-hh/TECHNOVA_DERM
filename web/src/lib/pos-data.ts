import { getDbPool } from "@/lib/db";
import { PosCaja, PosEmpleado } from "@/components/pos/PosLoginCard";

export async function getPosInicioData(sucursalId: number): Promise<{
  cajas: PosCaja[];
  empleadas: PosEmpleado[];
}> {
  try {
    const pool = getDbPool();

    // 1. Obtener cajas de esta sucursal y turnos abiertos
    const [cajasRows]: any = await pool.execute(
      `SELECT c.id, c.nombre, c.activa
       FROM cajas c
       WHERE c.sucursal_id = ? AND c.activa = 1
       ORDER BY c.id ASC`,
      [sucursalId]
    );

    const [turnosAbiertos]: any = await pool.execute(
      `SELECT t.id, t.caja_id, t.empleado_id, t.inicio,
              e.nombre as empleado_nombre, e.apellido as empleado_apellido
       FROM turnos t
       JOIN empleados e ON t.empleado_id = e.id
       WHERE t.sucursal_id = ? AND t.estado = 'abierto'`,
      [sucursalId]
    );

    const turnosPorCaja = new Map<number, any>();
    for (const t of turnosAbiertos) {
      turnosPorCaja.set(Number(t.caja_id), t);
    }

    const cajas: PosCaja[] = cajasRows.map((c: any) => {
      const turnoActivo = turnosPorCaja.get(Number(c.id));
      if (turnoActivo) {
        return {
          id: c.id,
          nombre: c.nombre,
          enUso: true,
          ocupadaPor: {
            empleadoId: turnoActivo.empleado_id,
            nombre: `${turnoActivo.empleado_nombre} ${turnoActivo.empleado_apellido}`.trim(),
          },
          label: `${c.nombre} · En uso por ${turnoActivo.empleado_nombre}`,
        };
      }

      return {
        id: c.id,
        nombre: c.nombre,
        enUso: false,
        ocupadaPor: null,
        label: c.nombre,
      };
    });

    // 2. Obtener empleados activos asignados a esta sucursal
    const [empleadosRows]: any = await pool.execute(
      `SELECT e.id, e.nombre, e.apellido, e.rol, e.intentos_fallidos, e.bloqueado_hasta
       FROM empleados e
       JOIN empleado_sucursales es ON e.id = es.empleado_id
       WHERE es.sucursal_id = ? AND e.activo = 1
       ORDER BY e.rol = 'supervisora' DESC, e.rol = 'gerente' DESC, e.nombre ASC`,
      [sucursalId]
    );

    const ahora = new Date();

    const empleadas: PosEmpleado[] = empleadosRows.map((e: any) => {
      let estaBloqueada = false;
      let bloqueadaHastaTexto = "";

      if (e.bloqueado_hasta) {
        const fechaBloqueo = new Date(e.bloqueado_hasta);
        if (fechaBloqueo.getTime() > ahora.getTime()) {
          estaBloqueada = true;
          const hh = String(fechaBloqueo.getHours()).padStart(2, "0");
          const mm = String(fechaBloqueo.getMinutes()).padStart(2, "0");
          bloqueadaHastaTexto = `${hh}:${mm}`;
        }
      }

      const rolCapitalizado = e.rol.charAt(0).toUpperCase() + e.rol.slice(1);
      const nombreCompleto = `${e.nombre} ${e.apellido}`.trim();

      const label = estaBloqueada
        ? `${nombreCompleto} · Bloqueada hasta ${bloqueadaHastaTexto}`
        : `${nombreCompleto} · ${rolCapitalizado}`;

      return {
        id: e.id,
        nombre: e.nombre,
        apellido: e.apellido,
        nombreCompleto,
        rol: e.rol,
        rolLabel: rolCapitalizado,
        bloqueada: estaBloqueada,
        bloqueadaHasta: estaBloqueada ? bloqueadaHastaTexto : null,
        label,
      };
    });

    return { cajas, empleadas };
  } catch (error) {
    console.error("[getPosInicioData Error]:", error);
    return { cajas: [], empleadas: [] };
  }
}
