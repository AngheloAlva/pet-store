import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { CartPageClient } from "./cart-page-client";

export const metadata: Metadata = {
  title: "Carrito",
  description: "Revisa y edita los productos antes de pagar.",
  alternates: { canonical: "/carrito" },
};

export default function CarritoPage() {
  return (
    <Container className="py-10">
      <h1 className="mb-6 font-heading text-2xl font-semibold">Tu carrito</h1>
      <CartPageClient />
    </Container>
  );
}
