import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { revisarFavoritos } from "@/lib/favoritos";

export const dynamic = "force-dynamic";

function formatearFechaNotificacion(fechaInput: Date | string): string {
  const fecha = new Date(fechaInput);
  const ahora = new Date();
  const diffMs = Math.max(0, ahora.getTime() - fecha.getTime());
  const diffMin = Math.floor(diffMs / (1000 * 60));

  if (diffMin < 60) {
    if (diffMin <= 1) return "Hace un momento";
    return `Hace ${diffMin} min`;
  }

  const esHoy =
    fecha.getDate() === ahora.getDate() &&
    fecha.getMonth() === ahora.getMonth() &&
    fecha.getFullYear() === ahora.getFullYear();

  if (esHoy) {
    const hh = String(fecha.getHours()).padStart(2, "0");
    const mm = String(fecha.getMinutes()).padStart(2, "0");
    return `Hoy · ${hh}:${mm}`;
  }

  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  const esAyer =
    fecha.getDate() === ayer.getDate() &&
    fecha.getMonth() === ayer.getMonth() &&
    fecha.getFullYear() === ayer.getFullYear();

  if (esAyer) {
    return "Ayer";
  }

  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias < 7) {
    return `Hace ${diffDias} días`;
  }

  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const dia = fecha.getDate();
  const mes = meses[fecha.getMonth()];

  if (fecha.getFullYear() === ahora.getFullYear()) {
    return `${dia} ${mes}`;
  }

  return `${dia} ${mes} ${fecha.getFullYear()}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor"); // ID menor que cursor para paginación
    const limit = 20;

    // Al abrir la primera página (sin cursor), revisar favoritos en segundo plano
    if (!cursor) {
      revisarFavoritos(session.userId).catch((err) =>
        console.error("[REVISAR FAVORITOS ERROR]:", err)
      );
    }

    const pool = getDbPool();

    // 1. Contador de no leídas total para este usuario
    const [countRows]: any = await pool.execute(
      "SELECT COUNT(*) as unread_count FROM notificaciones WHERE usuario_id = ? AND leida = 0",
      [session.userId]
    );
    const unreadCount = Number(countRows[0]?.unread_count || 0);

    // 2. Consulta paginada (20 por página + 1 para detectar hayMas)
    let query = `
      SELECT id, tipo, evento, titulo, mensaje, enlace, leida, leida_en, creado_en
      FROM notificaciones
      WHERE usuario_id = ?
    `;
    const params: any[] = [session.userId];

    if (cursor) {
      const cursorId = Number(cursor);
      if (!isNaN(cursorId) && cursorId > 0) {
        query += " AND id < ?";
        params.push(cursorId);
      }
    }

    query += " ORDER BY id DESC LIMIT ?";
    params.push(limit + 1);

    const [rows]: any = await pool.execute(query, params);

    const hayMas = rows.length > limit;
    const items = hayMas ? rows.slice(0, limit) : rows;
    const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

    const notificaciones = items.map((r: any) => ({
      id: r.id,
      tipo: r.tipo || "cuenta",
      evento: r.evento || null,
      titulo: r.titulo,
      mensaje: r.mensaje,
      enlace: r.enlace || null,
      leida: Number(r.leida) === 1,
      leida_en: r.leida_en,
      creado_en: r.creado_en,
      tiempoRelativo: formatearFechaNotificacion(r.creado_en),
    }));

    return NextResponse.json({
      exito: true,
      success: true,
      notificaciones,
      unreadCount,
      noLeidas: unreadCount,
      nextCursor: hayMas ? nextCursor : null,
      hayMas,
    });
  } catch (error: any) {
    console.error("[GET /api/cuenta/notificaciones Error]:", error);
    return NextResponse.json(
      { error: "Error al obtener notificaciones", details: error.message },
      { status: 500 }
    );
  }
}
