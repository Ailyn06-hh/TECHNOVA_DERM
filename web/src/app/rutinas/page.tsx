import type { Metadata } from "next";
import { getAuthUserServer } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { NOMBRE_MARCA } from "@/lib/marca";
import {
  getRutinasArmadas,
  getCombosParaRutinas,
} from "@/lib/recomendaciones";
import RoutinesPage from "@/components/routines/RoutinesPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Rutinas y Combos — ${NOMBRE_MARCA}`,
  description:
    "Rutinas completas armadas con productos disponibles hoy, con descuento por llevar todos los pasos.",
};

const TIPOS_VALIDOS = new Set(["mixta", "seca", "grasa", "normal", "sensible", "todas"]);

interface PageProps {
  searchParams: {
    piel?: string;
  };
}

export default async function RutinasMainPage({ searchParams }: PageProps) {
  const sessionUser = getAuthUserServer();
  const userId = sessionUser?.userId || null;
  const pool = getDbPool();

  let userTipoPiel: string | null = null;

  if (userId) {
    const [profileRows]: any = await pool.execute(
      "SELECT tipo_piel FROM perfiles_piel WHERE usuario_id = ? LIMIT 1",
      [userId]
    );
    if (profileRows && profileRows.length > 0) {
      userTipoPiel = profileRows[0].tipo_piel || null;
    }
  }

  // Determinar pestaña inicial según especificación:
  // - La de ?piel= si es válida
  // - Si no, la del perfil del usuario
  // - Si no hay perfil o sesión, "todas"
  const pielQuery = searchParams?.piel?.toLowerCase();
  let initialTab = "todas";

  if (pielQuery && TIPOS_VALIDOS.has(pielQuery)) {
    initialTab = pielQuery;
  } else if (userTipoPiel && TIPOS_VALIDOS.has(userTipoPiel)) {
    initialTab = userTipoPiel;
  }

  // Cargar rutinas y combos en el servidor para primera carga ultra rápida (SSR)
  const [initialSecciones, initialCombos] = await Promise.all([
    getRutinasArmadas(initialTab, userId),
    getCombosParaRutinas(userId),
  ]);

  return (
    <RoutinesPage
      initialActiveTab={initialTab}
      initialSecciones={initialSecciones}
      initialCombos={initialCombos}
      userSkinType={userTipoPiel}
    />
  );
}
