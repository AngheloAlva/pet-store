import type { Metadata } from "next";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Carrito",
  description: "Revisa los productos en tu carrito.",
};

export default function CarritoPage() {
  return (
    <Container className="py-12">
      <h1 className="text-3xl font-heading font-semibold">Tu carrito</h1>
      <p className="mt-2 text-muted-foreground">Detalle del carrito — Slice 4.</p>
    </Container>
  );
}
