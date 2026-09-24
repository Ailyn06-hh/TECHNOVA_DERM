import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUserServer } from "@/lib/session";
import { NOMBRE_MARCA } from "@/lib/marca";
import { getDbPool } from "@/lib/db";
import { revisarFavoritos } from "@/lib/favoritos";
import AccountLayout from "@/components/account/AccountLayout";
import NotificationsPage, {
  NotificationsInitialData,
} from "@/components/account/notifications/NotificationsPage";
import { formatearFechaNotificacion } from "@/lib/notificaciones";
import { PreferencesState } from "@/components/account/notifications/NotificationPreferences";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Notificaciones | ${NOMBRE_MARCA}`,
  description: `Avisos y estados de tus pedidos en ${NOMBRE_MARCA}.`,
};

export default async function NotificacionesRoute() {
  const user = getAuthUserServer();
  if (!user?.userId) {
    redirect("/login?volver=/cuenta/notificaciones");
  }

  // Ejecutar revisión de favoritos al cargar
  revisarFavoritos(user.userId).catch((err) =>
    console.error("[SSR REVISAR FAVORITOS ERROR]:", err)
  );

  const pool = getDbPool();

  // 1. Contador de no leídas
  const [countRows]: any = await pool.execute(
    "SELECT COUNT(*) as unread_count FROM notificaciones WHERE usuario_id = ? AND leida = 0",
    [user.userId]
  );
  const unreadCount = Number(countRows[0]?.unread_count || 0);

  // 2. Primeras 20 notificaciones
  const limit = 20;
  const [rows]: any = await pool.execute(
    `SELECT id, tipo, evento, titulo, mensaje, enlace, leida, leida_en, creado_en
     FROM notificaciones
     WHERE usuario_id = ?
     ORDER BY id DESC
     LIMIT ?`,
    [user.userId, limit + 1]
  );

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

  // 3. Consultar preferencias de notificación
  const [prefRows]: any = await pool.execute(
    "SELECT categoria, canal, activo FROM preferencias_notificacion WHERE usuario_id = ?",
    [user.userId]
  );

  const preferencias: PreferencesState = {
    pedidos: { push: true, whatsapp: true, correo: true },
    recompras: { push: true, whatsapp: true, correo: false },
    favoritos: { push: true, whatsapp: false, correo: false },
    promociones: { push: false, whatsapp: false, correo: false },
  };

  if (Array.isArray(prefRows)) {
    for (const r of prefRows) {
      const cat = r.categoria as keyof PreferencesState;
      const can = r.canal as "push" | "whatsapp" | "correo";
      if (preferencias[cat] && can in preferencias[cat]) {
        preferencias[cat][can] = Number(r.activo) === 1;
      }
    }
  }

  const initialData: NotificationsInitialData = {
    notificaciones,
    unreadCount,
    hayMas,
    nextCursor: hayMas ? nextCursor : null,
    preferencias,
  };

  return (
    <AccountLayout usuario={{ nombre: user.nombre, correo: user.correo }}>
      <NotificationsPage initialData={initialData} />
    </AccountLayout>
  );
}
