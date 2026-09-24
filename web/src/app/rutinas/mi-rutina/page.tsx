import { redirect } from "next/navigation";
import { getAuthUserServer } from "@/lib/session";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MiRutinaPage() {
  const sessionUser = getAuthUserServer();

  if (!sessionUser?.userId) {
    redirect("/rutinas");
  }

  const pool = getDbPool();
  const [profileRows]: any = await pool.execute(
    "SELECT tipo_piel FROM perfiles_piel WHERE usuario_id = ? LIMIT 1",
    [sessionUser.userId]
  );

  if (profileRows && profileRows.length > 0 && profileRows[0].tipo_piel) {
    redirect(`/rutinas?piel=${profileRows[0].tipo_piel}`);
  }

  redirect("/rutinas");
}
