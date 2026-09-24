import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { enmascararCelular } from "@/lib/pos/ventas";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json(
        { error: "Sesión o terminal POS no válida.", redirect: "/pos" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (q.length < 3) {
      return NextResponse.json({
        exito: true,
        clientes: [],
        mensaje: "Escribe al menos 3 caracteres para buscar clientas.",
      });
    }

    const pool = getDbPool();
    const queryTerm = `%${q}%`;

    const [rows]: any = await pool.execute(
      `SELECT id, nombre, apellido, correo, celular
       FROM usuarios
       WHERE nombre LIKE ? OR apellido LIKE ? OR correo LIKE ? OR celular LIKE ?
       ORDER BY id DESC
       LIMIT 8`,
      [queryTerm, queryTerm, queryTerm, queryTerm]
    );

    const clientes = (rows || []).map((u: any) => ({
      id: Number(u.id),
      nombre: u.nombre,
      apellido: u.apellido,
      nombreCompleto: `${u.nombre} ${u.apellido}`.trim(),
      correo: u.correo,
      celular: u.celular,
      celularEnmascarado: enmascararCelular(u.celular),
    }));

    return NextResponse.json({
      exito: true,
      clientes,
    });
  } catch (error: any) {
    console.error("[GET /api/pos/clientes Error]:", error);
    return NextResponse.json(
      { error: "Error al buscar clientas", details: error.message },
      { status: 500 }
    );
  }
}
