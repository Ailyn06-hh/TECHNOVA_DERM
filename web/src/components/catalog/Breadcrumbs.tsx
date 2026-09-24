import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbsProps {
  categoryName?: string;
  categorySlug?: string;
}

export default function Breadcrumbs({ categoryName }: BreadcrumbsProps) {
  return (
    <nav aria-label="Migas de pan" className="mb-4">
      <ol className="flex items-center gap-1.5 text-xs text-slate-400 font-light">
        <li>
          <Link href="/" className="hover:text-slate-700 transition-colors">
            Inicio
          </Link>
        </li>
        <li className="flex items-center text-slate-300">
          <ChevronRight className="w-3.5 h-3.5" />
        </li>
        <li>
          <Link
            href="/catalogo"
            className={categoryName ? "hover:text-slate-700 transition-colors" : "text-slate-700 font-normal"}
          >
            Catálogo
          </Link>
        </li>
        {categoryName && (
          <>
            <li className="flex items-center text-slate-300">
              <ChevronRight className="w-3.5 h-3.5" />
            </li>
            <li className="text-slate-700 font-normal truncate max-w-[200px]" aria-current="page">
              {categoryName}
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}
