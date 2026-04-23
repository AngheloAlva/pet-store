import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import {
  getStoresByService,
  STORE_SERVICE_META,
} from "@/lib/stores";
import type { StoreService } from "@/types";

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Tienda, veterinaria, peluquería y farmacia para tu mascota en sucursales seleccionadas.",
  alternates: { canonical: "/servicios" },
};

const SERVICE_DESCRIPTIONS: Record<StoreService, string> = {
  shop: "Alimentos, accesorios y productos para el día a día de tu mascota.",
  vet: "Consultas generales, vacunación y controles preventivos con veterinarios titulados.",
  grooming: "Baño, corte, deslanado y cuidado estético para perros y gatos.",
  pharmacy: "Medicamentos, antiparasitarios y recetas especializadas.",
};

const SERVICE_KEYS: StoreService[] = [
  "shop",
  "vet",
  "grooming",
  "pharmacy",
];

export default function ServiciosPage() {
  return (
    <Container className="py-12">
      <header className="mb-10 max-w-2xl">
        <h1 className="font-heading text-4xl font-semibold tracking-tight">
          Servicios
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Más que una tienda: cuidamos a tu mascota en cada etapa. Consultá qué
          ofrece cada sucursal y acercate cuando lo necesites.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Próximamente: agendamiento online
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {SERVICE_KEYS.map((service) => {
          const meta = STORE_SERVICE_META[service];
          const Icon = meta.Icon;
          const storesForService = getStoresByService(service);
          return (
            <article
              key={service}
              className="rounded-lg border border-border bg-background p-6"
            >
              <div className="flex items-start gap-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon size={22} aria-hidden />
                </div>
                <div className="flex-1">
                  <h2 className="font-heading text-2xl font-semibold tracking-tight">
                    {meta.label}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {SERVICE_DESCRIPTIONS[service]}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Disponible en
                </p>
                {storesForService.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {storesForService.map((store) => (
                      <li key={store.id}>
                        <Link
                          href={`/sucursales?tienda=${store.slug}`}
                          className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-sm font-medium hover:border-primary hover:text-primary"
                        >
                          {store.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sin sucursales por ahora.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </Container>
  );
}
