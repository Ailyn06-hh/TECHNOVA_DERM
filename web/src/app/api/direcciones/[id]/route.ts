import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { validarDireccion } from "@/lib/validaciones";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const dirId = Number(params.id);
    if (!dirId || isNaN(dirId)) {
      return NextResponse.json({ error: "ID de dirección inválido" }, { status: 400 });
    }

    const pool = getDbPool();
    const [existing]: any = await pool.execute(
      "SELECT id FROM direcciones WHERE id = ? AND usuario_id = ? LIMIT 1",
      [dirId, session.userId]
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: "Dirección no encontrada" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    // Si solo viene para marcar predeterminada
    if (body.predeterminada === true && Object.keys(body).length === 1) {
      await pool.execute(
        "UPDATE direcciones SET predeterminada = 0 WHERE usuario_id = ?",
        [session.userId]
      );
      await pool.execute(
        "UPDATE direcciones SET predeterminada = 1 WHERE id = ? AND usuario_id = ?",
        [dirId, session.userId]
      );
      return NextResponse.json({ exito: true });
    }

    const validacion = validarDireccion(body);
    if (!validacion.valido) {
      return NextResponse.json(
        { error: "Datos inválidos", errores: validacion.errores },
        { status: 400 }
      );
    }

    if (body.predeterminada) {
      await pool.execute(
        "UPDATE direcciones SET predeterminada = 0 WHERE usuario_id = ?",
        [session.userId]
      );
    }

    await pool.execute(
      `UPDATE direcciones 
       SET alias = ?, calle = ?, numero_exterior = ?, numero_interior = ?, 
           colonia = ?, codigo_postal = ?, ciudad = ?, estado = ?, 
           referencias = ?, predeterminada = ?
       WHERE id = ? AND usuario_id = ?`,
      [
        body.alias?.trim() || "Domicilio",
        body.calle.trim(),
        body.numero_exterior.trim(),
        body.numero_interior ? body.numero_interior.trim() : null,
        body.colonia.trim(),
        body.codigo_postal.trim(),
        body.ciudad.trim(),
        body.estado.trim(),
        body.referencias ? body.referencias.trim() : null,
        body.predeterminada ? 1 : 0,
        dirId,
        session.userId,
      ]
    );

    return NextResponse.json({ exito: true });
  } catch (err: any) {
    console.error("[PATCH /api/direcciones/[id] Error]:", err);
    return NextResponse.json({ error: "Error al actualizar dirección" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const dirId = Number(params.id);
    if (!dirId || isNaN(dirId)) {
      return NextResponse.json({ error: "ID de dirección inválido" }, { status: 400 });
    }

    const pool = getDbPool();
    const [existing]: any = await pool.execute(
      "SELECT id, predeterminada FROM direcciones WHERE id = ? AND usuario_id = ? LIMIT 1",
      [dirId, session.userId]
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: "Dirección no encontrada" }, { status: 404 });
    }

    const eraPredeterminada = existing[0].predeterminada === 1;

    await pool.execute(
      "DELETE FROM direcciones WHERE id = ? AND usuario_id = ?",
      [dirId, session.userId]
    );

    // Si era predeterminada, asignar otra si queda alguna
    if (eraPredeterminada) {
      const [remaining]: any = await pool.execute(
        "SELECT id FROM direcciones WHERE usuario_id = ? ORDER BY id DESC LIMIT 1",
        [session.userId]
      );
      if (remaining && remaining.length > 0) {
        await pool.execute(
          "UPDATE direcciones SET predeterminada = 1 WHERE id = ?",
          [remaining[0].id]
        );
      }
    }

    return NextResponse.json({ exito: true });
  } catch (err: any) {
    console.error("[DELETE /api/direcciones/[id] Error]:", err);
    return NextResponse.json({ error: "Error al eliminar dirección" }, { status: 500 });
  }
}
