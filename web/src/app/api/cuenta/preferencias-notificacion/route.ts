import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export interface PreferencesMap {
  pedidos: { push: boolean; whatsapp: boolean; correo: boolean };
  recompras: { push: boolean; whatsapp: boolean; correo: boolean };
  favoritos: { push: boolean; whatsapp: boolean; correo: boolean };
  promociones: { push: boolean; whatsapp: boolean; correo: boolean };
}

const CATEGORIAS_VALIDAS = ["pedidos", "recompras", "favoritos", "promociones"] as const;
const CANALES_VALIDOS = ["push", "whatsapp", "correo"] as const;

export async function GET(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const pool = getDbPool();
    const [rows]: any = await pool.execute(
      "SELECT categoria, canal, activo FROM preferencias_notificacion WHERE usuario_id = ?",
      [session.userId]
    );

    // Valores por defecto si alguna categoría/canal no estuviera registrada
    const preferencias: PreferencesMap = {
      pedidos: { push: true, whatsapp: true, correo: true },
      recompras: { push: true, whatsapp: true, correo: false },
      favoritos: { push: true, whatsapp: false, correo: false },
      promociones: { push: false, whatsapp: false, correo: false },
    };

    if (Array.isArray(rows)) {
      for (const r of rows) {
        const cat = r.categoria as keyof PreferencesMap;
        const can = r.canal as "push" | "whatsapp" | "correo";
        if (preferencias[cat] && can in preferencias[cat]) {
          preferencias[cat][can] = Number(r.activo) === 1;
        }
      }
    }

    return NextResponse.json({ preferencias });
  } catch (error: any) {
    console.error("[GET /api/cuenta/preferencias-notificacion Error]:", error);
    return NextResponse.json(
      { error: "Error al obtener preferencias", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { categoria, canal, activo } = body;

    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      return NextResponse.json({ error: "Categoría de notificación inválida" }, { status: 400 });
    }

    if (!CANALES_VALIDOS.includes(canal)) {
      return NextResponse.json({ error: "Canal de notificación inválido" }, { status: 400 });
    }

    const valorActivo = Boolean(activo) ? 1 : 0;
    const pool = getDbPool();

    // Guardar o actualizar preferencia
    await pool.execute(
      `INSERT INTO preferencias_notificacion (usuario_id, categoria, canal, activo, creado_en)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE activo = VALUES(activo), actualizado_en = NOW()`,
      [session.userId, categoria, canal, valorActivo]
    );

    // Si se modifica promociones por correo o whatsapp, sincronizar acepta_promociones en usuarios
    if (categoria === "promociones" && (canal === "correo" || canal === "whatsapp")) {
      const [promoRows]: any = await pool.execute(
        "SELECT canal, activo FROM preferencias_notificacion WHERE usuario_id = ? AND categoria = 'promociones'",
        [session.userId]
      );

      const anyPromoActive = (promoRows || []).some(
        (r: any) => (r.canal === "correo" || r.canal === "whatsapp") && Number(r.activo) === 1
      );

      await pool.execute(
        "UPDATE usuarios SET acepta_promociones = ? WHERE id = ?",
        [anyPromoActive ? 1 : 0, session.userId]
      );
    }

    return NextResponse.json({
      success: true,
      exito: true,
      mensaje: "Preferencia actualizada correctamente",
      categoria,
      canal,
      activo: Boolean(activo),
    });
  } catch (error: any) {
    console.error("[PATCH /api/cuenta/preferencias-notificacion Error]:", error);
    return NextResponse.json(
      { error: "Error al actualizar preferencia", details: error.message },
      { status: 500 }
    );
  }
}
