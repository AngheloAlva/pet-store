import Link from "next/link";
import { PawPrint } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

export default function NotFoundProduct() {
  return (
    <Container className="py-24">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <PawPrint size={28} className="text-muted-foreground" />
        </div>
        <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight">
          Producto no encontrado
        </h1>
        <p className="mt-2 text-muted-foreground">
          El producto que buscás no existe o fue movido. Volvé al catálogo para
          seguir explorando.
        </p>
        <Button className="mt-6" render={<Link href="/catalogo" />}>
          Ir al catálogo
        </Button>
      </div>
    </Container>
  );
}
