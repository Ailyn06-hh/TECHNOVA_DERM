import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const pool = getDbPool();

    const [rows]: any = await pool.execute(
      `SELECT COUNT(*) as total
       FROM pedidos
       WHERE sucursal_id = ? 
         AND tipo_entrega = 'recoger'
         AND estado IN ('pagado', 'preparando', 'listo_para_recoger', 'por_pagar_en_tienda')`,
      [dispositivo.sucursalId]
    );

    const total = Number(rows?.[0]?.total || 0);

    return NextResponse.json({
      exito: true,
      conteo: total,
    });
  } catch (error: any) {
    console.error("[GET /api/pos/por-recoger/conteo Error]:", error);
    return NextResponse.json(
      { error: "Error al consultar pedidos por recoger", details: error.message },
      { status: 500 }
    );
  }
}
