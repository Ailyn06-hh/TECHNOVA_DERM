import type { Metadata } from "next";
import StoreLayout from "@/components/layout/StoreLayout";
import HeroSection from "@/components/home/HeroSection";
import LowStockSection from "@/components/home/LowStockSection";
import CombosSection from "@/components/home/CombosSection";
import RelatedProductsSection from "@/components/home/RelatedProductsSection";
import { NOMBRE_MARCA, LEMA } from "@/lib/marca";

export const metadata: Metadata = {
  title: `${NOMBRE_MARCA} — ${LEMA}`,
  description:
    "Fórmulas dermatológicas creadas para cuidar, reparar y proteger tu barrera cutánea todos los días con resultados comprobados.",
};

export default function HomePage() {
  return (
    <StoreLayout>
      <div className="flex flex-col min-h-screen">
        <HeroSection />
        <LowStockSection />
        <CombosSection />
        <RelatedProductsSection />
      </div>
    </StoreLayout>
  );
}
