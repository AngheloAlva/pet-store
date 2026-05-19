import type { ReactNode } from "react";

interface DemoLayoutProps {
  children: ReactNode;
}

export default async function DemoLayout({ children }: DemoLayoutProps) {
  return (
    <div>
      <div
        role="status"
        className="sticky top-0 z-10 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 shadow-sm"
      >
        <span className="mr-1">🧪</span>
        Modo demo — los emails de esta bandeja no se enviaron de verdad. Esto es lo que el sistema mandaría con un proveedor real (Resend, etc.) cuando llegue Fase 3.
      </div>
      {children}
    </div>
  );
}
