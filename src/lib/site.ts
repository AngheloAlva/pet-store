export const siteConfig = {
  name: "SimplePet",
  tagline: "Todo para tu mascota en un solo lugar",
  url: "https://simplepet.cl",
  supportEmail: "hola@simplepet.cl",
  nav: [
    { label: "Catálogo", href: "/catalogo" },
    { label: "Sucursales", href: "/sucursales" },
    { label: "Servicios", href: "/servicios" },
    { label: "Blog", href: "/blog" },
  ],
  social: {
    instagram: "https://instagram.com/simplepet",
    facebook: "https://facebook.com/simplepet",
  },
} as const;

export type SiteConfig = typeof siteConfig;
