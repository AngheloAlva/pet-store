import type { Metadata } from "next";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Sucursales",
  description: "Encuentra tu SimplePet más cercano en Santiago.",
};

export default function SucursalesPage() {
  return (
    <Container className="py-12">
      <h1 className="text-3xl font-heading font-semibold">Sucursales</h1>
      <p className="mt-2 text-muted-foreground">Mapa y listado — Slice 5.</p>
    </Container>
  );
}
