import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autorizado. Inicia sesión para guardar tu rutina." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { plantillaClave = "manana", tipoPiel = "mixta", productoIds } = body;

    if (!Array.isArray(productoIds) || productoIds.length === 0) {
      return NextResponse.json(
        { error: "Debes proporcionar los IDs de los productos para guardar la rutina." },
        { status: 400 }
      );
    }

    const pool = getDbPool();

    // Validar máximo 5 rutinas guardadas por usuario
    const [countRows]: any = await pool.execute(
      "SELECT COUNT(*) as total FROM rutinas_guardadas WHERE usuario_id = ?",
      [session.userId]
    );

    const totalGuardadas = Number(countRows[0]?.total || 0);
    if (totalGuardadas >= 5) {
      return NextResponse.json(
        {
          error: "Límite alcanzado",
          message: "Has alcanzado el límite de 5 rutinas guardadas en tu cuenta.",
        },
        { status: 400 }
      );
    }

    // Insertar encabezado de la rutina
    const [insertHeader]: any = await pool.execute(
      `INSERT INTO rutinas_guardadas (usuario_id, plantilla_clave, tipo_piel, creado_en)
       VALUES (?, ?, ?, NOW())`,
      [session.userId, plantillaClave, tipoPiel]
    );

    const rutinaId = insertHeader.insertId;

    // Insertar items de la rutina
    for (let i = 0; i < productoIds.length; i++) {
      const pId = Number(productoIds[i]);
      if (pId > 0) {
        await pool.execute(
          `INSERT INTO rutina_guardada_items (rutina_id, orden, producto_id)
           VALUES (?, ?, ?)`,
          [rutinaId, i + 1, pId]
        );
      }
    }

    return NextResponse.json({
      success: true,
      exito: true,
      message: "Rutina guardada en tu cuenta",
      rutinaId,
    });
  } catch (error: any) {
    console.error("[POST /api/cuenta/rutinas Error]:", error);
    return NextResponse.json(
      { error: "Error al guardar rutina", message: error.message },
      { status: 500 }
    );
  }
}
