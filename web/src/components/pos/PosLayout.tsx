"use client";

import React from "react";

interface PosLayoutProps {
  children: React.ReactNode;
}

export default function PosLayout({ children }: PosLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] text-[#1A1715] flex flex-col justify-center items-center p-4 sm:p-6 select-none font-sans antialiased">
      {children}
    </div>
  );
}
