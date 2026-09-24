import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { productoId: string } }
) {
  try {
    const productoId = parseInt(params.productoId, 10);
    if (isNaN(productoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ isFavorito: false });
    }

    const pool = getDbPool();
    const [rows]: any = await pool.execute(
      "SELECT 1 FROM favoritos WHERE usuario_id = ? AND producto_id = ? LIMIT 1",
      [session.userId, productoId]
    );

    return NextResponse.json({
      isFavorito: Boolean(rows && rows.length > 0),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { productoId: string } }
) {
  try {
    const productoId = parseInt(params.productoId, 10);
    if (isNaN(productoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para guardar favoritos." },
        { status: 401 }
      );
    }

    const pool = getDbPool();
    await pool.execute(
      "INSERT IGNORE INTO favoritos (usuario_id, producto_id, creado_en) VALUES (?, ?, NOW())",
      [session.userId, productoId]
    );

    return NextResponse.json({ success: true, isFavorito: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { productoId: string } }
) {
  try {
    const productoId = parseInt(params.productoId, 10);
    if (isNaN(productoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para modificar favoritos." },
        { status: 401 }
      );
    }

    const pool = getDbPool();
    await pool.execute(
      "DELETE FROM favoritos WHERE usuario_id = ? AND producto_id = ?",
      [session.userId, productoId]
    );

    return NextResponse.json({ success: true, isFavorito: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
