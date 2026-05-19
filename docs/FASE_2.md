# Fase 2 — Lo que te Diferencia (adaptada a PGlite / demo autocontenido)

> Objetivo: agregar las features que ninguna solución genérica ofrece para tiendas de mascotas,
> manteniendo el demo 100% autocontenido (sin credenciales externas, sin infraestructura paga).
> Tiempo estimado: 4-6 semanas (más corto que el plan original porque sale Better Auth, Resend, OAuth, R2 y Cron).

---

## Principio rector

**Todo es efímero, y eso ES la feature.** PGlite reinicia el estado en cada cold start del server.
En vez de pelear contra eso, lo abrazamos: cada visitante encuentra una demo prístina, puede romper
lo que quiera (crear productos, agendar citas, canjear puntos), y al rato vuelve todo a su lugar.

Para un demo de ventas esto es oro: el dueño de tienda ve QUE TODO FUNCIONA, sin que te cueste
un peso ni dependencias externas.

---

## Cambios de Infraestructura (vs. plan original)

| Componente | Plan original | Plan adaptado | Por qué |
|-----------|---------------|---------------|---------|
| Base de datos | PostgreSQL (Neon) | **PGlite in-memory** (ya migrado en slice-9) | Sin credenciales, reseed en cold start |
| ORM | Drizzle | **Drizzle** (sin cambios) | Funciona idéntico contra PGlite |
| Auth | Better Auth (email+pwd, Google, RUT) | **Demo Personas** (selector visible, cookie firmada) | Demo no necesita auth real, ahorra ~5 días de trabajo |
| Email | Resend (transaccional) | **Fake Inbox** en `/demo/inbox` | Pedagógico; muestra QUÉ recibiría sin pagar Resend |
| Storage | Cloudflare R2 | **`/public` local + URLs en seed** | Sin cuenta R2, imágenes commiteadas o linkeadas |
| Cron jobs | Vercel Cron | **Eliminado** | Sin persistencia, no hay nada que ejecutar diferido |
| Estado global | Zustand | **Zustand** (sin cambios) | Sigue igual, sincronizado con PGlite |

**Lo que NO entra en Fase 2 (queda para Fase 3 si hay cliente real):**
- Rate limiting real (sin auth real no aplica)
- CSRF tokens, sanitización XSS profunda (demo no es superficie de ataque)
- Backups, monitoring (no hay nada que respaldar/monitorear)
- Verificación de email, recuperación de password

---

## Features Detalladas

### F2.1 — Demo Personas (en lugar de Auth real)

**Concepto:** en vez de un sistema de auth tradicional, el demo expone un **selector de personas**
visible en el header. Cualquier visitante puede entrar como cliente, admin o staff con un click.

**Personas pre-seedeadas:**

| Persona | Email | Rol | Para qué sirve |
|---------|-------|-----|----------------|
| Camila Rojas | `camila@demo.cl` | `customer` | Cliente con historial: 3 mascotas, 2.500 puntos, 4 pedidos previos, 1 cita futura |
| Admin Demo | `admin@demo.cl` | `admin` | Acceso completo al panel `/admin` |
| Vendedor Sucursal Centro | `staff@demo.cl` | `staff` | Acceso a vista `/staff`, scopeado a una sucursal |

**Implementación:**

- Selector en el header tipo dropdown: "Entrar como…" → lista las 3 personas
- Al elegir, se setea una cookie firmada (`SESSION_SECRET` en `.env`) con `{ userId, role }`
- Middleware lee la cookie y popula `request.locals.user`
- "Cerrar sesión" = borrar cookie y volver al estado anónimo
- **NO hay registro tradicional**, pero existe un formulario "Crear cuenta demo" que crea un user
  volátil en PGlite (se pierde en cold start, y la UI lo dice explícitamente)
- RUT se mantiene en el modelo como identificador alternativo (parte del valor diferencial:
  buscar cliente en tienda por RUT)

**Persistencia de sesión:**
- Cookie firmada HMAC-SHA256, expira en 7 días
- Si el `userId` en la cookie no existe en PGlite (porque hubo cold start), se trata como anónimo
- Esto es aceptable: el visitante simplemente vuelve a elegir persona

**Modelo de datos:**

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  rut?: string;
  phone?: string;
  role: 'customer' | 'admin' | 'staff';
  storeId?: string;                  // Solo para role=staff (su sucursal)
  isDemoSeed: boolean;               // true = persona seedeada, no se borra en reset
  createdAt: Date;
}
```

---

### F2.2 — Panel de Administración

**Acceso:** ruta `/admin`, gated por middleware que chequea `role === 'admin'`.

**Banner de demo (siempre visible en `/admin`):**
> ⚠️ Demo · los cambios que hagas se reiniciarán periódicamente

Esto es honesto con quien evalúa: ve que el panel ANDA, y entiende por qué su cambio "desapareció"
si vuelve mañana.

**Módulos del panel** (sin cambios vs. plan original):

#### Gestión de Productos
- CRUD completo contra PGlite
- Upload de imágenes: data URL inline guardada en la fila, o link a URL pública
  (no R2, no upload real al filesystem en producción)
- Variantes, categorías, tags, stock por sucursal
- Precios y descuentos
- Bulk actions

#### Gestión de Categorías
- CRUD, orden drag & drop, imagen por categoría

#### Gestión de Sucursales
- CRUD, horarios, servicios, coordenadas

#### Gestión de Usuarios/Clientes
- Listado con búsqueda y filtros
- Ver historial de puntos, ajustar manualmente
- Ver mascotas registradas
- Las 3 personas seedeadas aparecen marcadas con un badge "demo" y no se pueden borrar

---

### F2.3 — Agendamiento de Servicios

**Sin cambios estructurales vs. plan original.** Todo el modelo, flujos cliente/admin y datos
funcionan idéntico, solo viven en PGlite.

**Seed rico pre-cargado:**
- 2-3 citas futuras del cliente demo Camila (para que su perfil se vea "vivo")
- 5-10 citas históricas distribuidas en el pasado (atendidas, canceladas, no_show)
- `ScheduleConfig` y `BlockedSlot` realistas por sucursal

**Notificaciones automáticas → Fake Inbox:**
- Confirmación inmediata al agendar → aparece en `/demo/inbox`
- Recordatorio 24h antes → en el demo, simulamos con un toggle "ver emails programados"
- Recordatorio 2h antes → mismo mecanismo

Modelo de datos sin cambios (`Service`, `Appointment`, `ScheduleConfig`, `BlockedSlot`).

---

### F2.4 — Sistema de Puntos / Fidelización

**Sin cambios.** Modelo y reglas idénticas al plan original. Todo vive en PGlite.

**Seed rico:**
- Camila arranca con 2.500 puntos y un historial de transacciones realistas (compras, bonus
  primera compra, bonus cumpleaños de su perro, ajuste manual del admin)
- Esto permite mostrar la pantalla "Mis Puntos" con datos creíbles desde el primer click

Modelo de datos sin cambios (`PointsTransaction`, `PointsConfig`).

---

### F2.5 — Notificaciones de Restock

**Flujo (idéntico al plan, sin Resend):**
1. En ficha de producto sin stock, botón "Notificarme cuando vuelva"
2. Si está logueado, usa el email de la persona; si no, pide un email
3. Selecciona sucursal(es) (opcional)
4. Cuando el admin actualiza stock > 0, se dispara un "email" que va a `/demo/inbox`
5. El cliente puede cancelar la alerta desde su perfil o desde el email (link funciona)

**Diferencia con plan original:** el "envío" del email es escribir una fila en `demo_emails`,
no llamar a Resend. La UX es la misma.

Modelo de datos sin cambios (`RestockAlert`), más una tabla `demo_emails` (ver F2.8).

---

### F2.6 — Blog / Contenido SEO

**Sin cambios estructurales.** Todo el modelo y la UX funcionan idéntico.

**Seed:**
- 8-12 artículos pre-escritos cubriendo las categorías (cuidados, alimentación, salud, novedades)
- Cobertura de las 3 especies (perro, gato, exótico)
- Productos relacionados ya linkeados al catálogo seedeado

Modelo de datos sin cambios (`BlogPost`).

---

### F2.7 — Vista Staff (Componente en Tienda — Nivel Básico)

**Acceso:** ruta `/staff`, gated por `role === 'staff' || role === 'admin'`.

**Diseño:** optimizado para tablet, UI simplificada, botones grandes.

**Selector de sucursal:** la persona `staff@demo.cl` está scopeada a "Sucursal Centro" en seed,
pero el admin puede cambiar la sucursal activa desde un dropdown (para demostrar el feature).

**Funcionalidades sin cambios vs. plan original:**
- Consulta de stock (búsqueda rápida, indicadores visuales)
- Consulta de cliente (por RUT, nombre o email)
- Citas del día (con marcar atendida / no asistió)
- Pedidos para retiro (placeholder hasta Fase 3)

---

### F2.8 — Fake Inbox (nuevo, reemplaza a Resend)

**Ruta:** `/demo/inbox` — accesible para cualquier visitante.

**Concepto:** una bandeja de entrada falsa que muestra todos los emails que el sistema HABRÍA
enviado en una operación real. Es una herramienta pedagógica para el evaluador del demo.

**Qué muestra:**
- Lista cronológica de emails con: destinatario, asunto, fecha, tipo, body renderizado
- Filtros por tipo de email (confirmación cita, restock, bienvenida, etc.) y por destinatario
- Botón "Limpiar inbox" (resetea la tabla, útil para demos en vivo)

**Modelo de datos:**

```typescript
interface DemoEmail {
  id: string;
  to: string;                        // Email destinatario
  toUserId?: string;                 // Si el destinatario es un user conocido
  subject: string;
  type: 'appointment_confirmation' | 'appointment_reminder'
      | 'restock_alert' | 'welcome' | 'points_adjustment' | 'other';
  bodyHtml: string;                  // Render del template (usando templates simples in-repo)
  bodyText: string;
  createdAt: Date;
  triggeredBy?: string;              // userId que provocó el email (admin que ajustó stock, etc.)
}
```

**Helper centralizado:**

```typescript
// src/lib/demo-mail.ts
export async function sendDemoEmail(args: {
  to: string;
  subject: string;
  type: DemoEmail['type'];
  template: (data: any) => { html: string; text: string };
  data: any;
}): Promise<void>;
```

Toda feature que "envía email" llama a este helper. El día que haya cliente real con Fase 3, se
swappea la implementación interna por Resend sin tocar callers.

---

## Esquema de Base de Datos (Resumen)

```
users (con isDemoSeed flag)
  ├── pets
  ├── points_transactions
  ├── restock_alerts
  └── addresses (para Fase 3)

products
  ├── variants
  ├── images
  ├── stock_by_store
  └── restock_alerts

categories ── subcategories

stores
  ├── schedule_config
  └── blocked_slots

appointments (linked to: user, pet, service, store)
services

blog_posts

demo_emails (nueva — fake inbox)
```

---

## Estrategia de Seed (crítica para Fase 2)

El seed deja de ser solo "catálogo de productos" y pasa a ser **una narrativa completa**
para que el demo se sienta vivo desde el primer click.

**Capas del seed:**

1. **Catálogo** (ya existe en slice-8): productos, categorías, marcas, sucursales, stock
2. **Personas demo**: 3 usuarios con sus mascotas, direcciones, RUT
3. **Historia de Camila** (cliente demo): 4 pedidos previos, 2.500 puntos con historial,
   2 citas futuras + 5 históricas, 1 mascota con cumpleaños próximo
4. **Blog**: 8-12 artículos con productos relacionados
5. **Configuración**: horarios de sucursales, slots de servicios, reglas de puntos
6. **Inbox**: 3-5 emails de ejemplo ya en la bandeja (para que `/demo/inbox` no aparezca vacío)

Todo esto se ejecuta en `seed.ts` después del `migrate`. Tiempo objetivo: <2 segundos.

---

## Checklist de Entrega — Fase 2 (adaptada)

- [x] PGlite configurado con migraciones (slice-9)
- [x] Seed data básico (catálogo) en BD (slice-8b)
- [x] Demo Personas: tabla `users`, seed de las 3 personas, selector en header, cookie firmada, middleware
  - (middleware deferred — getCurrentUser helper covers RSC/server action needs for this slice; route gating will be in admin/staff layout slices)
- [x] "Crear cuenta demo" volátil (registro que se pierde en cold start, con disclaimer)
- [ ] Perfil de usuario: datos, mascotas (CRUD), historial de puntos, mis citas
- [ ] Panel admin: CRUD productos, categorías, sucursales, stock por sucursal
- [ ] Panel admin: gestión de usuarios y ajuste manual de puntos
- [ ] Banner "demo" persistente en `/admin`
- [ ] Sistema de agendamiento completo (cliente + admin)
- [ ] Calendario de citas con slots, bloqueos y vista semanal
- [ ] Sistema de puntos: acumulación automática (cuando exista checkout en Fase 3 esto se completa), canje, historial, ajustes manuales
- [ ] Notificaciones de restock funcionales (escriben en `demo_emails`)
- [ ] Blog: editor admin, listado público, artículos con productos relacionados
- [ ] Vista `/staff` para consulta en tienda (stock, cliente, citas)
- [ ] Fake Inbox `/demo/inbox` con filtros, limpieza y templates de email
- [ ] Helper `sendDemoEmail` swappeable
- [ ] Seed rico: historia completa de Camila + blog + inbox
- [ ] Tests Vitest para flujos críticos (sesión de persona, agendamiento, puntos, restock alert→email)

---

## Para más adelante (cuando aparezca cliente real con contrato)

Estos ítems quedan listos para Fase 3 sin reescribir nada del trabajo de Fase 2, porque el código
está diseñado con boundaries claros:

- **Auth real**: reemplazar el módulo de Demo Personas por Better Auth (o Lucia, o lo que toque).
  La cookie sigue siendo cookie, el middleware sigue leyéndola, el resto de la app no se entera.
- **Persistencia real**: swappear PGlite por Neon/Supabase Postgres. Drizzle ya hace de buffer.
- **Resend real**: reemplazar implementación de `sendDemoEmail` por la integración con Resend.
  Los callers siguen igual.
- **R2 para imágenes**: el campo `image_url` ya existe, solo cambia de dónde sale.
