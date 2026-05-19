"use client";

import { useTransition } from "react";
import Link from "next/link";
import { User } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { switchPersona, clearSession } from "@/app/actions/session";
import type { SessionUser } from "@/types/session";

interface PersonaSelectorProps {
  currentUser: SessionUser | null;
}

const SEED_PERSONAS = [
  { email: "camila@demo.cl", label: "Camila Rojas", sub: "Cliente" },
  { email: "admin@demo.cl", label: "Admin Demo", sub: "Administradora" },
  { email: "staff@demo.cl", label: "Vendedor Sucursal Centro", sub: "Staff" },
] as const;

export function PersonaSelector({ currentUser }: PersonaSelectorProps) {
  const [, start] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={currentUser ? "Menú de usuario" : "Cambiar persona"}
          />
        }
      >
        <User size={18} />
        <span className="ml-2 hidden sm:inline">
          {currentUser ? currentUser.name : "Entrar como…"}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {currentUser ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel>{currentUser.email}</DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() =>
                start(() => {
                  void clearSession();
                })
              }
            >
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Entrar como…</DropdownMenuLabel>
              {SEED_PERSONAS.map((p) => (
                <DropdownMenuItem
                  key={p.email}
                  onSelect={() =>
                    start(async () => {
                      const fd = new FormData();
                      fd.set("email", p.email);
                      await switchPersona(fd);
                    })
                  }
                >
                  <div className="flex flex-col">
                    <span>{p.label}</span>
                    <span className="text-xs text-muted-foreground">{p.sub}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/cuenta/crear-demo" />}>
                Crear cuenta demo
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
