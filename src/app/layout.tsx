import type { Metadata, Viewport } from "next";
import { Inter, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { CartRoot } from "@/components/cart/cart-root";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://simplepet.cl"),
  title: {
    default: "SimplePet — Todo para tu mascota en un solo lugar",
    template: "%s · SimplePet",
  },
  description:
    "Alimentos, accesorios, farmacia, veterinaria y peluquería para tu mascota. Retiro en tienda en Santiago, despacho a todo Chile.",
  applicationName: "SimplePet",
  keywords: [
    "mascotas",
    "tienda de mascotas",
    "alimento para perros",
    "alimento para gatos",
    "veterinaria",
    "peluquería canina",
    "Chile",
  ],
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "SimplePet",
    title: "SimplePet",
    description:
      "Todo para tu mascota: alimentos, accesorios, farmacia y servicios veterinarios.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SimplePet",
    description:
      "Todo para tu mascota: alimentos, accesorios, farmacia y servicios veterinarios.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-CL"
      className={cn("h-full antialiased", inter.variable, bricolage.variable)}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-full flex flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <CartRoot />
        <Toaster />
      </body>
    </html>
  );
}
