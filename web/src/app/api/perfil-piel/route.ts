import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/session";
import {
  isValidTipoPiel,
  isValidPresupuesto,
  isValidPreocupacion,
  PreocupacionKey,
} from "@/lib/perfilPiel";

export const dynamic = "force-dynamic";

/**
 * GET /api/perfil-piel
 * Obtiene el perfil de piel y preocupaciones del usuario autenticado (o null si aún no existe)
 */
export async function GET(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "No has iniciado sesión o tu sesión ha expirado." },
        { status: 401 }
      );
    }

    const pool = getDbPool();

    // 1. Consultar tabla perfiles_piel
    const [profileRows]: any = await pool.execute(
      `SELECT id, tipo_piel, presupuesto, actualizado_en 
       FROM perfiles_piel 
       WHERE usuario_id = ? LIMIT 1`,
      [session.userId]
    );

    if (!profileRows || profileRows.length === 0) {
      return NextResponse.json({ perfil: null }, { status: 200 });
    }

    const profile = profileRows[0];

    // 2. Consultar preocupaciones vinculadas
    const [preocRows]: any = await pool.execute(
      `SELECT preocupacion 
       FROM perfil_preocupaciones 
       WHERE perfil_id = ?`,
      [profile.id]
    );

    const preocupaciones = preocRows.map((r: any) => r.preocupacion as PreocupacionKey);

    return NextResponse.json(
      {
        perfil: {
          tipo_piel: profile.tipo_piel,
          presupuesto: profile.presupuesto,
          preocupaciones,
          actualizado_en: profile.actualizado_en,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API GET PERFIL PIEL ERROR]:", error);
    return NextResponse.json(
      { error: "Error al consultar el perfil de piel.", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/perfil-piel
 * Crea o actualiza el perfil de piel dentro de una transacción atómica
 */
export async function PUT(req: NextRequest) {
  let connection: any = null;

  try {
    const session = getAuthUserFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "No has iniciado sesión o tu sesión ha expirado." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { tipo_piel, preocupaciones, presupuesto } = body;

    // 1. Validaciones contra el catálogo unificado
    if (!isValidTipoPiel(tipo_piel)) {
      return NextResponse.json(
        { error: "Tipo de piel no válido.", field: "tipo_piel" },
        { status: 400 }
      );
    }

    if (!isValidPresupuesto(presupuesto)) {
      return NextResponse.json(
        { error: "Presupuesto no válido.", field: "presupuesto" },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(preocupaciones) ||
      preocupaciones.length === 0 ||
      !preocupaciones.every(isValidPreocupacion)
    ) {
      return NextResponse.json(
        {
          error: "Debes seleccionar al menos una preocupación válida.",
          field: "preocupaciones",
        },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    connection = await pool.getConnection();

    // 2. Iniciar transacción atómica
    await connection.beginTransaction();

    // Upsert en perfiles_piel
    await connection.execute(
      `INSERT INTO perfiles_piel 
        (usuario_id, tipo_piel, presupuesto, actualizado_en) 
       VALUES (?, ?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE 
        tipo_piel = VALUES(tipo_piel), 
        presupuesto = VALUES(presupuesto), 
        actualizado_en = NOW()`,
      [session.userId, tipo_piel, presupuesto]
    );

    // Obtener el id del perfil
    const [pRows]: any = await connection.execute(
      "SELECT id FROM perfiles_piel WHERE usuario_id = ? LIMIT 1",
      [session.userId]
    );

    const perfilId = pRows[0].id;

    // Borrar preocupaciones anteriores
    await connection.execute(
      "DELETE FROM perfil_preocupaciones WHERE perfil_id = ?",
      [perfilId]
    );

    // Insertar nuevas preocupaciones seleccionadas
    for (const preocupacion of preocupaciones) {
      await connection.execute(
        "INSERT INTO perfil_preocupaciones (perfil_id, preocupacion) VALUES (?, ?)",
        [perfilId, preocupacion]
      );
    }

    // Asegurar que onboarding_omitido quede en 0
    await connection.execute(
      "UPDATE usuarios SET onboarding_omitido = 0 WHERE id = ?",
      [session.userId]
    );

    // 3. Confirmar transacción
    await connection.commit();

    return NextResponse.json(
      {
        success: true,
        message: "Tu perfil de piel fue guardado exitosamente.",
        redirectUrl: "/onboarding/rutina",
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (connection) {
      await connection.rollback();
    }
    console.error("[API PUT PERFIL PIEL ERROR]:", error);
    return NextResponse.json(
      {
        error: "Error interno al guardar tu perfil de piel. Intenta de nuevo.",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
