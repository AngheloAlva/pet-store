"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/utils";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    if (error?.digest) {
      console.error("Global error boundary digest:", error.digest);
    }
  }, [error]);

  return (
    <Container className="py-24">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Algo salió mal
        </h1>
        <p className="mt-2 text-muted-foreground">
          Tuvimos un problema inesperado al cargar esta página. Probá de nuevo o
          volvé al inicio.
        </p>
        <div className="mt-6 flex gap-2">
          <Button type="button" onClick={() => reset()}>
            Reintentar
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </Container>
  );
}
