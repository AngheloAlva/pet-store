import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { stores } from "@/data";
import { getStoreBySlug, getStoresCommuneSummary } from "@/lib/stores";
import { StoreLocator } from "./store-locator";

export const metadata: Metadata = {
  title: "Sucursales",
  description: `Encuentra tu SimplePet en ${getStoresCommuneSummary()}.`,
  alternates: { canonical: "/sucursales" },
};

type SearchParams = Promise<{ tienda?: string | string[] }>;

export default async function SucursalesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = params.tienda;
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const initial = getStoreBySlug(candidate);
  const initialSlug = initial?.slug ?? null;

  return (
    <Container className="py-8">
      <header className="mb-6 space-y-2">
        <h1 className="font-heading text-3xl font-semibold">Sucursales</h1>
        <p className="text-muted-foreground">
          Encontrá tu SimplePet más cercano en Santiago.
        </p>
      </header>
      <StoreLocator stores={stores} initialSlug={initialSlug} />
    </Container>
  );
}
