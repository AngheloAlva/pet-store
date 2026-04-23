import type { Metadata } from "next";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Servicios",
  description: "Veterinaria, vacunación, peluquería y baño para tu mascota.",
};

export default function ServiciosPage() {
  return (
    <Container className="py-12">
      <h1 className="text-3xl font-heading font-semibold">Servicios</h1>
      <p className="mt-2 text-muted-foreground">Fase 2 — agendamiento online.</p>
    </Container>
  );
}
