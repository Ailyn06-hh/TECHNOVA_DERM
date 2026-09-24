import { redirect } from "next/navigation";

interface BuscarPageProps {
  searchParams: { q?: string };
}

export default function BuscarPage({ searchParams }: BuscarPageProps) {
  const q = searchParams.q ? encodeURIComponent(searchParams.q) : "";
  redirect(q ? `/catalogo?q=${q}` : "/catalogo");
}
