import type { Metadata } from "next";
import { UserCircle } from "@phosphor-icons/react/dist/ssr";
import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = {
  title: "Mi cuenta",
  description: "Gestiona tus pedidos, puntos y mascotas.",
  alternates: { canonical: "/cuenta" },
};

const TEASERS = [
  {
    title: "Historial de pedidos",
    description:
      "Revisá tus compras web y presenciales en un solo lugar, con estado de despacho.",
  },
  {
    title: "Puntos de fidelidad",
    description:
      "Acumulá y canjeá puntos que suman igual en tienda física y en el sitio.",
  },
  {
    title: "Direcciones",
    description:
      "Guardá tus direcciones de despacho para comprar más rápido la próxima vez.",
  },
  {
    title: "Tus mascotas",
    description:
      "Registrá datos de tus mascotas para recibir recomendaciones y recordatorios.",
  },
];

export default function CuentaPage() {
  return (
    <ComingSoon
      title="Mi cuenta"
      description="Un espacio personal para gestionar tus compras, puntos, direcciones y mascotas. Lo estamos preparando para que todo fluya sin fricción."
      Icon={UserCircle}
      items={TEASERS}
    />
  );
}
