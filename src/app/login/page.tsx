import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl: rawCallback } = await searchParams;
  const callbackUrl =
    rawCallback && rawCallback.startsWith("/") ? rawCallback : "/";

  const user = await getCurrentUser();
  if (user) redirect(callbackUrl);

  return (
    <div className="container mx-auto max-w-md py-12 px-4">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-heading font-semibold">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground">
            Elegí una persona demo para continuar.
          </p>
        </div>
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
