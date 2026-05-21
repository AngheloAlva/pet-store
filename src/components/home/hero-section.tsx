import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/utils";
import { loremflickr } from "@/lib/demo-images";

const heroImageUrl = loremflickr({ tags: ["dog", "cat"], seed: "home-hero", width: 1920, height: 1080 });

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <Image
        src={heroImageUrl}
        alt=""
        fill
        priority
        className="object-cover -z-20"
        aria-hidden
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/30 via-background/80 to-background"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] [background-size:24px_24px]"
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
            <Link href="/catalogo" className={cn(buttonVariants({ size: "lg" }))}>
              Ver catálogo
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/sucursales"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            >
              <MapPin size={18} />
              Sucursales
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
