"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { switchPersona } from "@/app/actions/session";

const SEED_PERSONAS = [
  { email: "camila@demo.cl", label: "Camila Rojas", sub: "Cliente" },
  { email: "admin@demo.cl", label: "Admin Demo", sub: "Administradora" },
  { email: "staff@demo.cl", label: "Vendedor Sucursal Centro", sub: "Staff" },
] as const;

type Props = {
  callbackUrl: string;
};

export function LoginForm({ callbackUrl }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePick(email: string) {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("email", email);
      const result = await switchPersona(fd);
      if (!result.ok) {
        setError("No pudimos iniciar sesión con esa persona.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {SEED_PERSONAS.map((p) => (
          <Button
            key={p.email}
            type="button"
            variant="outline"
            className="w-full justify-start h-auto py-3"
            disabled={pending}
            onClick={() => handlePick(p.email)}
          >
            <div className="flex flex-col items-start">
              <span className="font-medium">{p.label}</span>
              <span className="text-xs text-muted-foreground">{p.sub}</span>
            </div>
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="text-center text-sm">
        <Link href="/cuenta/crear-demo" className="underline">
          Crear cuenta demo
        </Link>
      </div>
    </div>
  );
}
