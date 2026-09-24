import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CuentaPagosRedirect() {
  redirect("/cuenta/direcciones");
}
