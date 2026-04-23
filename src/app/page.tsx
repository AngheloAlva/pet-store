import type { Metadata } from "next";
import { HeroSection } from "@/components/home/hero-section";
import { TrustStrip } from "@/components/home/trust-strip";
import { FeaturedCategories } from "@/components/home/featured-categories";
import { PopularProducts } from "@/components/home/popular-products";
import { ServicesBanner } from "@/components/home/services-banner";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustStrip />
      <FeaturedCategories />
      <PopularProducts />
      <ServicesBanner />
    </>
  );
}
