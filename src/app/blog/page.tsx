import type { Metadata } from "next";
import { BookOpen } from "@phosphor-icons/react/dist/ssr";
import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = {
  title: "Blog",
  description: "Guías de cuidado y consejos para tu mascota.",
  alternates: { canonical: "/blog" },
};

const TEASERS = [
  {
    title: "Nutrición por etapa",
    description:
      "Cómo elegir el alimento correcto para cachorros, adultos y mascotas senior.",
  },
  {
    title: "Cuidados del pelaje",
    description:
      "Frecuencia de baño, cepillado y cuándo llevarlo a la peluquería.",
  },
  {
    title: "Vacunación y calendario",
    description:
      "Qué vacunas necesita tu mascota y cuándo corresponde cada refuerzo.",
  },
  {
    title: "Adopción responsable",
    description:
      "Todo lo que hay que considerar antes de sumar una mascota a la familia.",
  },
];

export default function BlogPage() {
  return (
    <ComingSoon
      title="Blog"
      description="Guías de cuidado, tips y artículos escritos por veterinarios y especialistas. Acá vas a encontrar contenido útil para el día a día con tu mascota."
      Icon={BookOpen}
      items={TEASERS}
    />
  );
}
