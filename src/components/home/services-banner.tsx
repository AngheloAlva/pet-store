import Link from "next/link";
import { Stethoscope, Scissors, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

export function ServicesBanner() {
  return (
    <section className="py-16">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-background to-background p-8 md:p-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Stethoscope size={20} />
                </span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Scissors size={20} />
                </span>
              </div>
              <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
                Veterinaria y peluquería en tu sucursal
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Agenda online para consultas, vacunación, baño y corte. Disponible en
                sucursales seleccionadas.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" render={<Link href="/servicios" />}>
                Ver servicios
                <ArrowRight size={18} />
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/sucursales" />}>
                Buscar sucursal
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
