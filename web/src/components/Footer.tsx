"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // En pantallas de autenticación y onboarding no se muestra el footer general
  if (
    pathname === "/login" ||
    pathname === "/registro" ||
    pathname === "/register" ||
    pathname === "/verificar" ||
    pathname.startsWith("/recuperar") ||
    pathname.startsWith("/onboarding")
  ) {
    return null;
  }

  return (
    <footer className="border-t border-nacar-200 py-6 text-center text-xs text-nacar-600 bg-[#FAF7F5]">
      <p>© 2026 Technova-Derm · E-Business Omnicanal · HackaTec 2026</p>
      <p className="mt-1 text-[11px] text-nacar-500">
        Arquitectura E-Business: Monolito modular FastAPI + SQLite + Next.js + React Native · Machine Learning con scikit-learn
      </p>
    </footer>
  );
}
