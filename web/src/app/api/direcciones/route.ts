import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { validarDireccion } from "@/lib/validaciones";
import { MAX_DIRECCIONES } from "@/lib/marca";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const pool = getDbPool();
    const [rows]: any = await pool.execute(
      `SELECT id, alias, calle_y_numero, calle, numero_exterior, numero_interior, colonia, 
              codigo_postal, ciudad, estado, referencias, predeterminada, creado_en, actualizado_en
       FROM direcciones 
       WHERE usuario_id = ? 
       ORDER BY predeterminada DESC, id DESC`,
      [session.userId]
    );

    // Normalizar calle_y_numero si hubiera registros antiguos
    const normalizadas = (rows || []).map((r: any) => ({
      ...r,
      calle_y_numero: r.calle_y_numero || `${r.calle || ""} ${r.numero_exterior || ""}`.trim(),
    }));

    return NextResponse.json({ direcciones: normalizadas });
  } catch (err: any) {
    console.error("[GET /api/direcciones Error]:", err);
    return NextResponse.json({ error: "Error al obtener direcciones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const validacion = validarDireccion(body);

    if (!validacion.valido) {
      return NextResponse.json(
        { error: "Datos de dirección inválidos", errores: validacion.errores },
        { status: 400 }
      );
    }

    const pool = getDbPool();

    // Validar límite MAX_DIRECCIONES
    const [countRows]: any = await pool.execute(
      "SELECT COUNT(*) as total FROM direcciones WHERE usuario_id = ?",
      [session.userId]
    );
    const totalActual = Number(countRows[0]?.total || 0);

    if (totalActual >= MAX_DIRECCIONES) {
      return NextResponse.json(
        {
          error: `Llegaste al máximo de direcciones (${MAX_DIRECCIONES}); elimina una para agregar otra.`,
        },
        { status: 400 }
      );
    }

    const esPrimera = totalActual === 0;
    const esPredeterminada = body.predeterminada ? 1 : esPrimera ? 1 : 0;

    const alias = (body.alias || "").trim() || "Casa";
    const calleYNumero = (
      body.calle_y_numero ||
      `${body.calle || ""} ${body.numero_exterior || ""}`
    ).trim();

    const conn = await pool.getConnection();
    let insertId = 0;
    try {
      await conn.beginTransaction();

      if (esPredeterminada) {
        await conn.execute(
          "UPDATE direcciones SET predeterminada = 0 WHERE usuario_id = ?",
          [session.userId]
        );
      }

      const [insertRes]: any = await conn.execute(
        `INSERT INTO direcciones 
         (usuario_id, alias, calle_y_numero, calle, numero_exterior, numero_interior, colonia, 
          codigo_postal, ciudad, estado, referencias, predeterminada, creado_en, actualizado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          session.userId,
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
          esPredeterminada,
        ]
      );
      insertId = insertRes.insertId;

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    const nuevaDireccion = {
      id: insertId,
      usuario_id: session.userId,
      alias,
      calle_y_numero: calleYNumero,
      calle: calleYNumero,
      numero_exterior: body.numero_exterior || "",
      numero_interior: body.numero_interior ? String(body.numero_interior).trim() : null,
      colonia: body.colonia.trim(),
      codigo_postal: body.codigo_postal.trim(),
      ciudad: body.ciudad.trim(),
      estado: body.estado.trim(),
      referencias: body.referencias ? body.referencias.trim() : null,
      predeterminada: esPredeterminada,
    };

    return NextResponse.json({
      exito: true,
      mensaje: "Dirección guardada correctamente.",
      direccion: nuevaDireccion,
    });
  } catch (err: any) {
    console.error("[POST /api/direcciones Error]:", err);
    return NextResponse.json(
      { error: "Error al guardar la dirección", details: err.message },
      { status: 500 }
    );
  }
}
