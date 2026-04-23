import type { Metadata } from "next";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Mi cuenta",
  description: "Gestiona tus pedidos, puntos y mascotas.",
};

export default function CuentaPage() {
  return (
    <Container className="py-12">
      <h1 className="text-3xl font-heading font-semibold">Mi cuenta</h1>
      <p className="mt-2 text-muted-foreground">Fase 3 — perfil completo.</p>
    </Container>
  );
}
