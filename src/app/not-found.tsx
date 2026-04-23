import type { Metadata } from "next";
import Link from "next/link";
import { PawPrint } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

export default function NotFound() {
  return (
    <Container className="py-24">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <PawPrint size={28} className="text-muted-foreground" />
        </div>
        <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight">
          Página no encontrada
        </h1>
        <p className="mt-2 text-muted-foreground">
          La página que buscás no existe o fue movida. Volvé al inicio para
          seguir explorando.
        </p>
        <Button className="mt-6" render={<Link href="/" />}>
          Ir al inicio
        </Button>
      </div>
    </Container>
  );
}
