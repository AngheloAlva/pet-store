# PetCommerce — Plataforma E-commerce Especializada en Tiendas de Mascotas

## Visión del Proyecto

Plataforma web completa y especializada para tiendas de mascotas en Chile, diseñada para ofrecer como producto replicable a múltiples negocios del rubro. No es un tema de WordPress ni una plantilla genérica: es una solución vertical que entiende cómo opera una tienda de mascotas (sucursales, veterinaria, peluquería, puntos, stock por local) y lo resuelve de forma integrada.

**Stack principal:** Next.js 14+ (App Router) / React / TypeScript
**Enfoque:** Mobile-first, rendimiento extremo (PageSpeed 90+), omnicanal

---

## Propuesta de Valor

Lo que diferencia a PetCommerce de un Shopify o un WooCommerce genérico:

- **Multi-sucursal nativo:** stock por local, retiro en tienda, mapa de sucursales
- **Servicios integrados:** agendamiento de veterinaria y peluquería con calendario
- **Fidelización real:** sistema de puntos que funciona igual en web y en tienda física
- **Compra recurrente:** suscripciones para alimentos y productos de consumo regular
- **Contenido SEO:** blog con guías de cuidado por especie, integrado al catálogo
- **Rendimiento:** carga en <2s, experiencia mobile nativa, PWA-ready

---

## Arquitectura General

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│            Next.js (App Router + RSC)            │
│     Pages: Home, Catálogo, Producto, Checkout,   │
│     Sucursales, Agendar, Blog, Mi Cuenta         │
│     Vista Staff: /staff (consulta en tienda)     │
├─────────────────────────────────────────────────┤
│                     API                          │
│           Next.js API Routes / tRPC              │
├─────────────────────────────────────────────────┤
│                   BACKEND                        │
│  Base de datos: PostgreSQL (Supabase o Neon)     │
│  Auth: NextAuth.js / Auth.js                     │
│  Pagos: WebPay + MercadoPago                     │
│  Storage: S3 / Cloudflare R2 (imágenes)          │
│  Email: Resend                                   │
│  Hosting: Vercel                                 │
└─────────────────────────────────────────────────┘
```

---

## Fases del Proyecto

### Fase 1 — El Demo que Vende
> *Lo que construyes antes de tocar puertas*
> Tiempo estimado: 4-6 semanas

El objetivo es tener algo que un dueño de tienda pueda navegar y decir "quiero esto". No necesita backend real ni pagos, pero debe sentirse completo y rápido.

**Incluye:**
- Homepage con hero, categorías destacadas, productos populares
- Catálogo con búsqueda, filtros por categoría/especie/marca y ordenamiento
- Ficha de producto: galería, variantes, precio, stock por sucursal
- Carrito funcional (estado local, sin checkout real)
- Página de sucursales con mapa interactivo
- Diseño responsive mobile-first
- Seed data realista (productos, categorías, sucursales de ejemplo)
- PageSpeed 90+ en mobile

**Doc detallado:** → `fase-1-demo.md`

---

### Fase 2 — Lo que te Diferencia
> *Lo que construyes con el primer cliente*
> Tiempo estimado: 6-8 semanas

Aquí entra todo lo que una solución genérica no ofrece y lo que hace que la tienda diga "esto está hecho para mí".

**Incluye:**
- Agendamiento online de veterinaria y peluquería (calendario + confirmación)
- Sistema de puntos/fidelización integrado (acumula y canjea sin WhatsApp)
- Panel de administración (gestión de productos, stock, categorías, sucursales)
- Notificaciones por email (confirmación, estado de pedido, recordatorios)
- Notificaciones de restock ("avisarme cuando vuelva a estar disponible")
- Blog/contenido SEO (guías de cuidado, artículos por especie)
- Componente en tienda - nivel básico:
  - Vista `/staff` para que vendedores consulten stock y puntos desde tablet
  - Búsqueda rápida de cliente por RUT

**Doc detallado:** → `fase-2-diferenciacion.md`

---

### Fase 3 — El Negocio Completo
> *Producción real, con contrato firmado y cliente pagando*
> Tiempo estimado: 6-8 semanas

Todo lo que falta para que la tienda opere 100% con la plataforma en su canal online.

**Incluye:**
- Checkout completo con WebPay y MercadoPago
- Flujo de retiro en tienda (selección de sucursal, notificación de "listo para retiro")
- Despacho con integración Chilexpress/Starken (cotización automática)
- Cuenta de usuario completa (historial, pedidos, puntos, direcciones, mascotas)
- Suscripción/compra recurrente (ej: "recibir este alimento cada 30 días")
- Panel de reportes de ventas y métricas
- Componente en tienda - nivel intermedio:
  - Registrar ventas presenciales para acumular puntos
  - Marcar pedidos web como "retirado en tienda"
  - Gestión de inventario unificada (venta en tienda descuenta stock web)

**Doc detallado:** → `fase-3-produccion.md`

---

### Fase 4 — Extras y Crecimiento
> *Features adicionales que agregan valor post-lanzamiento*
> Sin timeline fijo — se priorizan según feedback de clientes

**Candidatos:**
- PWA (experiencia tipo app sin publicar en stores)
- Módulo de adopciones (colaboración con fundaciones)
- Ficha veterinaria (historial médico vinculado al perfil del dueño)
- Programa de referidos
- Integración con redes sociales (catálogo en Instagram/Facebook Shop)
- Multi-idioma (si algún cliente apunta a turistas o zonas fronterizas)
- Marketplace (que múltiples tiendas vendan en una misma plataforma)
- POS avanzado (si se decide competir con Bsale/Vendty)

---

## Estrategia de Datos para el Demo

Para que el demo se sienta real sin depender de un backend, se usa seed data estática:

- **~50 productos** distribuidos en categorías (alimentos, juguetes, higiene, farmacia)
- **3 especies:** perros, gatos, exóticos
- **4 sucursales ficticias** con datos de stock diferentes
- **Servicios:** veterinaria general, vacunación, peluquería (corte, baño, deslanado)
- **Precios en CLP** realistas basados en el mercado chileno

---

## Modelo de Negocio (cómo vendes esto)

Opciones para monetizar:

1. **Setup + mensualidad:** Cobrar implementación inicial + fee mensual por hosting, soporte y actualizaciones
2. **Solo setup:** Cobrar el proyecto completo y entregar — el cliente se encarga del hosting
3. **SaaS (largo plazo):** Si escalas a muchos clientes, multi-tenant con suscripción mensual

La opción 1 es la más sostenible para empezar: genera ingresos recurrentes y te permite mantener el control técnico para iterar el producto.

---

## Documentos del Proyecto

| Documento | Descripción |
|-----------|-------------|
| `roadmap.md` | Este archivo — visión general y fases |
| `fase-1-demo.md` | Detalle técnico de la Fase 1 |
| `fase-2-diferenciacion.md` | Detalle técnico de la Fase 2 |
| `fase-3-produccion.md` | Detalle técnico de la Fase 3 |
