import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const pool = getDbPool();
    const [rows]: any = await pool.execute(
      `SELECT id, proveedor, marca, ultimos4, titular, mes_vencimiento, anio_vencimiento, predeterminado 
       FROM metodos_pago 
       WHERE usuario_id = ? 
       ORDER BY predeterminado DESC, id DESC`,
      [session.userId]
    );

    return NextResponse.json({ metodosPago: rows || [] });
  } catch (err: any) {
    console.error("[GET /api/metodos-pago Error]:", err);
    return NextResponse.json({ error: "Error al obtener métodos de pago" }, { status: 500 });
  }
}
