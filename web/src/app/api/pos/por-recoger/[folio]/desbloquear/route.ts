import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { tienePermisoPos } from "@/lib/pos/permisos";
import { marcarCodigoVerificado } from "@/lib/pos/verificacion-cache";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { folio: string } }
) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const folio = params.folio?.toUpperCase();
    const body = await req.json().catch(() => ({}));
    const pin = String(body.pin || "").trim();

    if (!pin) {
      return NextResponse.json({ error: "El PIN de supervisora es obligatorio" }, { status: 400 });
    }

    const pool = getDbPool();

    // 1. Buscar empleados supervisores o gerentes activos
    const [supervisores]: any = await pool.execute(
      `SELECT id, nombre, apellido, rol, pin_hash, activo
       FROM empleados
       WHERE rol IN ('supervisora', 'gerente', 'admin') AND activo = 1`
    );

    let supervisoraValida: any = null;
    for (const sup of supervisores) {
      const match = await bcrypt.compare(pin, sup.pin_hash);
      if (match) {
        supervisoraValida = sup;
        break;
      }
    }

    if (!supervisoraValida) {
      return NextResponse.json(
        { error: "PIN de supervisora incorrecto o no autorizado" },
        { status: 401 }
      );
    }

    if (!tienePermisoPos(supervisoraValida.rol, "desbloqueo_codigo_recogida")) {
      return NextResponse.json(
        { error: "Tu rol no tiene permisos para autorizar desbloqueo de entrega" },
        { status: 403 }
      );
    }

    // 2. Resetear intentos fallidos del pedido
    await pool.execute(
      `UPDATE pedidos 
       SET intentos_codigo = 0, intentos_codigo_recogida = 0 
       WHERE folio = ?`,
      [folio]
    );

    // 3. Marcar como verificado y autorizado por supervisora
    marcarCodigoVerificado(folio, session.empleadoId, supervisoraValida.id);

    // 4. Auditoría
    try {
      await pool.execute(
        `INSERT INTO auditoria_pos (tipo, empleado_id, sucursal_id, detalle, creado_en)
         VALUES ('desbloqueo_codigo_recogida', ?, ?, ?, NOW())`,
        [
          supervisoraValida.id,
          dispositivo.sucursalId,
          JSON.stringify({
            folio,
            autorizadoPor: `${supervisoraValida.nombre} ${supervisoraValida.apellido}`,
            cajeraId: session.empleadoId,
            turnoId: session.turnoId,
          }),
        ]
      );
    } catch (e: any) {
      console.warn("Error al registrar auditoría:", e.message);
    }

    return NextResponse.json({
      exito: true,
      mensaje: `Código desbloqueado y entrega autorizada por ${supervisoraValida.nombre}.`,
      supervisora: `${supervisoraValida.nombre} ${supervisoraValida.apellido}`,
    });
  } catch (error: any) {
    console.error("[POST /api/pos/por-recoger/[folio]/desbloquear Error]:", error);
    return NextResponse.json(
      { error: "Error interno al autorizar desbloqueo", details: error.message },
      { status: 500 }
    );
  }
}
