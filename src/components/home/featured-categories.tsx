import Link from "next/link";
import {
  Dog,
  Cat,
  PawPrint,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { getTopLevelCategories } from "@/lib/catalog";

const categoryVisuals: Record<string, { icon: Icon; blurb: string; accent: string }> = {
  perros: {
    icon: Dog,
    blurb: "Alimento, snacks, juguetes y accesorios para tu perro.",
    accent: "from-amber-200/40 to-transparent",
  },
  gatos: {
    icon: Cat,
    blurb: "Alimento, arenas, juguetes y más para tu gato.",
    accent: "from-purple-200/40 to-transparent",
  },
  exoticos: {
    icon: PawPrint,
    blurb: "Aves, peces, reptiles y pequeñas mascotas.",
    accent: "from-emerald-200/40 to-transparent",
  },
};

export function FeaturedCategories() {
  const cats = getTopLevelCategories();

  return (
    <section className="py-16">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl font-semibold tracking-tight">
              Comprá por mascota
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Encontrá todo lo que necesitás según tu compañero.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {cats.map((cat) => {
            const visual = categoryVisuals[cat.slug] ?? {
              icon: PawPrint,
              blurb: cat.name,
              accent: "from-muted to-transparent",
            };
            const Icon = visual.icon;
            return (
              <Card
                key={cat.id}
                className="group relative overflow-hidden p-0 transition-shadow hover:shadow-md"
              >
                <Link
                  href={`/catalogo?categoria=${cat.slug}`}
                  className="flex h-full flex-col justify-between p-6 min-h-44"
                >
                  <div
                    aria-hidden
                    className={`absolute inset-0 -z-10 bg-gradient-to-br ${visual.accent}`}
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border">
                      <Icon size={24} weight="duotone" className="text-primary" />
                    </div>
                    <h3 className="font-heading text-2xl font-semibold">{cat.name}</h3>
                  </div>
                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground">{visual.blurb}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Ver productos
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
