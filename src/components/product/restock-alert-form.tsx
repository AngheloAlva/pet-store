"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createRestockAlert } from "@/app/actions/restock-alerts";

interface Props {
  productId: string;
  variantId?: string;
  isAuthenticated: boolean;
  // Reserved for future pre-fill UX; currently unused because logged-in flow
  // resolves the email server-side via getCurrentUser in createRestockAlert.
  userEmail?: string;
}

export function RestockAlertForm({ productId, variantId, isAuthenticated }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const input = {
      productId,
      variantId,
      ...(isAuthenticated ? {} : { email }),
    };

    const result = await createRestockAlert(input);

    if (result.ok) {
      setStatus("success");
      toast.success("¡Listo! Te avisaremos cuando vuelva.");
    } else {
      setStatus("error");
      setErrorMessage("No se pudo registrar la alerta. Intentá de nuevo.");
    }
  }

  if (status === "success") {
    return (
      <p className="text-sm text-muted-foreground">
        Te avisaremos cuando vuelva a estar disponible.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {!isAuthenticated && (
        <label className="flex flex-col gap-1 text-sm">
          <span>Tu email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@ejemplo.com"
            required
            className="rounded-md border px-3 py-2 text-sm"
          />
        </label>
      )}

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {status === "loading" ? "Enviando..." : "Avisame cuando vuelva"}
      </button>
    </form>
  );
}
