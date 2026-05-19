import Link from "next/link";
import { cancelRestockAlert } from "@/app/actions/restock-alerts";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function CancelarPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="max-w-md w-full mx-auto p-8 bg-white rounded-xl shadow-sm space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Token inválido</h1>
          <p className="text-muted-foreground">
            No se encontró la alerta. El enlace puede haber expirado o ser incorrecto.
          </p>
          <Link href="/" className="inline-block text-sm underline text-muted-foreground">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const result = await cancelRestockAlert({ kind: "token", token });

  if (result.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="max-w-md w-full mx-auto p-8 bg-white rounded-xl shadow-sm space-y-4">
          <h1 className="text-2xl font-bold text-green-700">Alerta cancelada</h1>
          <p className="text-muted-foreground">
            Tu alerta de reposición ha sido cancelada correctamente. No recibirás más correos sobre este producto.
          </p>
          <Link href="/" className="inline-block text-sm underline text-muted-foreground">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (result.error === "already_canceled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="max-w-md w-full mx-auto p-8 bg-white rounded-xl shadow-sm space-y-4">
          <h1 className="text-2xl font-bold">Alerta ya cancelada</h1>
          <p className="text-muted-foreground">
            Esta alerta ya estaba cancelada anteriormente.
          </p>
          <Link href="/" className="inline-block text-sm underline text-muted-foreground">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  // not_found or other error
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20">
      <div className="max-w-md w-full mx-auto p-8 bg-white rounded-xl shadow-sm space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Alerta no encontrada</h1>
        <p className="text-muted-foreground">
          No se encontró la alerta asociada a este enlace.
        </p>
        <Link href="/" className="inline-block text-sm underline text-muted-foreground">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
