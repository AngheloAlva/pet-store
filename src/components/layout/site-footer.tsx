import Link from "next/link";
import { PawPrint, InstagramLogo, FacebookLogo } from "@phosphor-icons/react/dist/ssr";
import { Container } from "./container";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/lib/site";

const footerLinks = [
  {
    title: "Tienda",
    links: [
      { label: "Catálogo", href: "/catalogo" },
      { label: "Blog", href: "/blog" },
      { label: "Sucursales", href: "/sucursales" },
      { label: "Servicios", href: "/servicios" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { label: "Despacho", href: "/ayuda/despacho" },
      { label: "Retiro en tienda", href: "/ayuda/retiro" },
      { label: "Contacto", href: "/contacto" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Términos", href: "/legal/terminos" },
      { label: "Privacidad", href: "/legal/privacidad" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 mt-16">
      <Container className="py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 font-heading text-xl font-semibold">
              <PawPrint size={24} weight="fill" className="text-primary" />
              <span>SimplePet</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">
              {siteConfig.tagline}. Retiro en tienda en Santiago, despacho a todo Chile.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href={siteConfig.social.instagram}
                aria-label="Instagram"
                className="text-muted-foreground hover:text-foreground"
              >
                <InstagramLogo size={20} />
              </Link>
              <Link
                href={siteConfig.social.facebook}
                aria-label="Facebook"
                className="text-muted-foreground hover:text-foreground"
              >
                <FacebookLogo size={20} />
              </Link>
            </div>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <ul className="mt-3 space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.
        </p>
      </Container>
    </footer>
  );
}
