import type { Metadata } from "next";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Blog",
  description: "Guías de cuidado y consejos para tu mascota.",
};

export default function BlogPage() {
  return (
    <Container className="py-12">
      <h1 className="text-3xl font-heading font-semibold">Blog</h1>
      <p className="mt-2 text-muted-foreground">Fase 2 — contenido SEO.</p>
    </Container>
  );
}
