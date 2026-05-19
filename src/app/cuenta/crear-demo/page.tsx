import type { Metadata } from "next";
import { CrearDemoForm } from "./crear-demo-form";

export const metadata: Metadata = {
  title: "Crear cuenta demo | SimplePet",
  description: "Crea una cuenta de demostración para explorar SimplePet.",
};

export default function CrearDemoPage() {
  return (
    <main className="flex min-h-[60vh] items-start justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-2xl font-semibold font-heading">Crear cuenta demo</h1>
        <CrearDemoForm />
      </div>
    </main>
  );
}
