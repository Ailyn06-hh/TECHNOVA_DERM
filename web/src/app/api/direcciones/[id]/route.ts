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
      "SELECT id, predeterminada FROM direcciones WHERE id = ? AND usuario_id = ? LIMIT 1",
      [dirId, session.userId]
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: "Dirección no encontrada" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    // Caso 1: Solo marcar como predeterminada
    if (
      (body.predeterminada === true || body.predeterminada === 1) &&
      Object.keys(body).length === 1
    ) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute(
          "UPDATE direcciones SET predeterminada = 0 WHERE usuario_id = ?",
          [session.userId]
        );
        await conn.execute(
          "UPDATE direcciones SET predeterminada = 1, actualizado_en = NOW() WHERE id = ? AND usuario_id = ?",
          [dirId, session.userId]
        );
        await conn.commit();
      } catch (txErr) {
        await conn.rollback();
        throw txErr;
      } finally {
        conn.release();
      }

      return NextResponse.json({
        exito: true,
        mensaje: "Dirección marcada como predeterminada.",
      });
    }

    // Caso 2: Edición completa de la dirección
    const validacion = validarDireccion(body);
    if (!validacion.valido) {
      return NextResponse.json(
        { error: "Datos de dirección inválidos", errores: validacion.errores },
        { status: 400 }
      );
    }

    const alias = (body.alias || "").trim() || "Casa";
    const calleYNumero = (
      body.calle_y_numero ||
      `${body.calle || ""} ${body.numero_exterior || ""}`
    ).trim();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (body.predeterminada) {
        await conn.execute(
          "UPDATE direcciones SET predeterminada = 0 WHERE usuario_id = ?",
          [session.userId]
        );
      }

      await conn.execute(
        `UPDATE direcciones 
         SET alias = ?, calle_y_numero = ?, calle = ?, numero_exterior = ?, numero_interior = ?, 
             colonia = ?, codigo_postal = ?, ciudad = ?, estado = ?, 
             referencias = ?, predeterminada = ?, actualizado_en = NOW()
         WHERE id = ? AND usuario_id = ?`,
        [
          alias,
          calleYNumero,
          calleYNumero,
          body.numero_exterior ? String(body.numero_exterior).trim() : null,
          body.numero_interior ? String(body.numero_interior).trim() : null,
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

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    return NextResponse.json({
      exito: true,
      mensaje: "Dirección actualizada correctamente.",
      direccion: {
        id: dirId,
        alias,
        calle_y_numero: calleYNumero,
        numero_interior: body.numero_interior ? String(body.numero_interior).trim() : null,
        colonia: body.colonia.trim(),
        codigo_postal: body.codigo_postal.trim(),
        ciudad: body.ciudad.trim(),
        estado: body.estado.trim(),
        referencias: body.referencias ? body.referencias.trim() : null,
        predeterminada: Boolean(body.predeterminada),
      },
    });
  } catch (err: any) {
    console.error("[PATCH /api/direcciones/[id] Error]:", err);
    return NextResponse.json(
      { error: "Error al actualizar dirección", details: err.message },
      { status: 500 }
    );
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
      "SELECT id, predeterminada, alias FROM direcciones WHERE id = ? AND usuario_id = ? LIMIT 1",
      [dirId, session.userId]
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: "Dirección no encontrada" }, { status: 404 });
    }

    const eraPredeterminada = existing[0].predeterminada === 1;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        "DELETE FROM direcciones WHERE id = ? AND usuario_id = ?",
        [dirId, session.userId]
      );

      // Si era predeterminada, la más reciente restante pasa a serlo
      if (eraPredeterminada) {
        const [remaining]: any = await conn.execute(
          "SELECT id FROM direcciones WHERE usuario_id = ? ORDER BY id DESC LIMIT 1",
          [session.userId]
        );
        if (remaining && remaining.length > 0) {
          await conn.execute(
            "UPDATE direcciones SET predeterminada = 1, actualizado_en = NOW() WHERE id = ?",
            [remaining[0].id]
          );
        }
      }

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    return NextResponse.json({
      exito: true,
      mensaje: "Dirección eliminada correctamente.",
    });
  } catch (err: any) {
    console.error("[DELETE /api/direcciones/[id] Error]:", err);
    return NextResponse.json(
      { error: "Error al eliminar dirección", details: err.message },
      { status: 500 }
    );
  }
}
