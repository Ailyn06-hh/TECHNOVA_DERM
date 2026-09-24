import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { validarDireccion } from "@/lib/validaciones";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const pool = getDbPool();
    const [rows]: any = await pool.execute(
      `SELECT id, alias, calle, numero_exterior, numero_interior, colonia, 
              codigo_postal, ciudad, estado, referencias, predeterminada, creado_en
       FROM direcciones 
       WHERE usuario_id = ? 
       ORDER BY predeterminada DESC, id DESC`,
      [session.userId]
    );

    return NextResponse.json({ direcciones: rows || [] });
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

    // Contar direcciones previas
    const [countRows]: any = await pool.execute(
      "SELECT COUNT(*) as total FROM direcciones WHERE usuario_id = ?",
      [session.userId]
    );
    const esPrimera = Number(countRows[0]?.total || 0) === 0;
    const esPredeterminada = body.predeterminada ? 1 : esPrimera ? 1 : 0;

    if (esPredeterminada) {
      await pool.execute(
        "UPDATE direcciones SET predeterminada = 0 WHERE usuario_id = ?",
        [session.userId]
      );
    }

    const alias = (body.alias || "").trim() || "Domicilio";

    const [insertRes]: any = await pool.execute(
      `INSERT INTO direcciones 
       (usuario_id, alias, calle, numero_exterior, numero_interior, colonia, 
        codigo_postal, ciudad, estado, referencias, predeterminada, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        session.userId,
        alias,
        body.calle.trim(),
        body.numero_exterior.trim(),
        body.numero_interior ? body.numero_interior.trim() : null,
        body.colonia.trim(),
        body.codigo_postal.trim(),
        body.ciudad.trim(),
        body.estado.trim(),
        body.referencias ? body.referencias.trim() : null,
        esPredeterminada,
      ]
    );

    const nuevaDireccion = {
      id: insertRes.insertId,
      usuario_id: session.userId,
      alias,
      calle: body.calle.trim(),
      numero_exterior: body.numero_exterior.trim(),
      numero_interior: body.numero_interior ? body.numero_interior.trim() : null,
      colonia: body.colonia.trim(),
      codigo_postal: body.codigo_postal.trim(),
      ciudad: body.ciudad.trim(),
      estado: body.estado.trim(),
      referencias: body.referencias ? body.referencias.trim() : null,
      predeterminada: esPredeterminada,
    };

    return NextResponse.json({ exito: true, direccion: nuevaDireccion });
  } catch (err: any) {
    console.error("[POST /api/direcciones Error]:", err);
    return NextResponse.json({ error: "Error al guardar dirección" }, { status: 500 });
  }
}
