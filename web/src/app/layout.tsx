import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import "./globals.css";
import { NOMBRE_MARCA, LEMA } from "@/lib/marca";

const serifFont = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const sansFont = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: `Inicio · ${NOMBRE_MARCA}`,
  description: LEMA,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${serifFont.variable} ${sansFont.variable}`}>
      <body className="min-h-screen bg-[#F8F5F0] flex flex-col font-sans antialiased text-[#1A1715]">
        {children}
      </body>
    </html>
  );
}
