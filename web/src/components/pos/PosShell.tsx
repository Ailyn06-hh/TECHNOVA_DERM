"use client";

import React from "react";
import PosSidebar from "./PosSidebar";
import type { PosSessionData } from "@/lib/pos-session";

interface PosShellProps {
  session: PosSessionData;
  tieneItemsBorrador?: boolean;
  children: React.ReactNode;
}

export default function PosShell({
  session,
  tieneItemsBorrador = false,
  children,
}: PosShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF7F2] font-sans text-stone-900 select-none">
      <PosSidebar session={session} tieneItemsBorrador={tieneItemsBorrador} />
      <main className="flex-1 flex overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
