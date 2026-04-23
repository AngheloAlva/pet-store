import type { Metadata } from "next";
import { Container } from "@/components/layout/container";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug };
}

export default async function ProductoPage({ params }: Props) {
  const { slug } = await params;
  return (
    <Container className="py-12">
      <h1 className="text-3xl font-heading font-semibold">{slug}</h1>
      <p className="mt-2 text-muted-foreground">Ficha de producto — Slice 3.</p>
    </Container>
  );
}
