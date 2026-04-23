import Link from "next/link";
import { ArrowRight, MapPin } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/10 via-background to-background">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] [background-size:24px_24px]"
      />
      <Container className="py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Despacho a todo Chile · Retiro en tienda
          </p>
          <h1 className="mt-5 font-heading text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Todo para tu mascota,{" "}
            <span className="text-primary">simple y en un solo lugar.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Alimentos, accesorios, farmacia y servicios veterinarios. Con stock real
            en tus sucursales favoritas de Santiago.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/catalogo" />}>
              Ver catálogo
              <ArrowRight size={18} />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/sucursales" />}>
              <MapPin size={18} />
              Sucursales
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
