# Fase 2 — Lo que te Diferencia

> Objetivo: agregar las features que ninguna solución genérica ofrece para tiendas de mascotas.
> Aquí se introduce el backend real, base de datos y autenticación.
> Tiempo estimado: 6-8 semanas

---

## Cambios de Infraestructura

En la Fase 1 todo era estático. Ahora se necesita persistencia real:

| Componente | Tecnología | Notas |
|-----------|------------|-------|
| Base de datos | PostgreSQL (Neon) | |
| ORM | Prisma o Drizzle | Drizzle es más liviano y type-safe |
| Auth (Better Auth) | Login con email/password + Google + RUT para clientes en tienda |
| Email | Resend | Transaccional: confirmaciones, recordatorios, restock |
| Storage | Cloudflare R2 | Imágenes de productos |
| Cron jobs | Vercel Cron | Recordatorios de citas, emails programados |
| Estado global | Zustand (se mantiene de Fase 1) | Ahora sincronizado con el backend |

**Migración de datos estáticos a BD:**
Los seed data de la Fase 1 se convierten en migraciones de Prisma/Drizzle. La estructura de tipos se mantiene casi igual, solo se agregan relaciones y timestamps.

---

## Features Detalladas

### F2.1 — Autenticación y Cuentas de Usuario

**Flujos de auth:**
- Registro con email + contraseña
- Login con email + contraseña
- Recuperación de contraseña por email
- Verificación de email

**Perfil de usuario:**
- Datos personales (nombre, email, teléfono, RUT)
- Direcciones guardadas (para despacho futuro en Fase 3)
- Mis mascotas: nombre, especie, raza, edad, peso
  - Esto permite recomendaciones personalizadas ("Tu perro mediano de 3 años podría necesitar...")
  - Es un diferenciador fuerte vs. e-commerce genérico

**Consideraciones:**
- RUT como identificador alternativo (para buscar cliente en tienda por RUT)
- No exigir registro para navegar/agregar al carrito (solo para checkout en Fase 3)
- Rate limiting en login para prevenir brute force

---

### F2.2 — Panel de Administración

**Acceso:** ruta `/admin` protegida con role-based auth (admin, staff)

**Módulos del panel:**

#### Gestión de Productos
- CRUD completo de productos
- Upload múltiple de imágenes con drag & drop
- Editor de variantes (tamaños, pesos)
- Asignación de categorías y tags
- Gestión de stock por sucursal (tabla editable)
- Precios y descuentos (precio normal, precio oferta, fecha de vigencia)
- Productos relacionados (selección manual o automática por categoría)
- Bulk actions: activar/desactivar, cambiar precio, ajustar stock

#### Gestión de Categorías
- CRUD de categorías y subcategorías
- Orden de visualización (drag & drop)
- Imagen por categoría
- Asignación de especie

#### Gestión de Sucursales
- CRUD de sucursales
- Horarios por día
- Servicios disponibles (checkboxes)
- Coordenadas (picker en mapa)

#### Gestión de Usuarios/Clientes
- Listado con búsqueda y filtros
- Ver historial de puntos
- Ajustar puntos manualmente
- Ver mascotas registradas

---

### F2.3 — Agendamiento de Servicios

**Servicios agendables:**
- Consulta veterinaria general
- Vacunación
- Desparasitación
- Peluquería: baño, corte, deslanado, corte de uñas
- Urgencias (solo muestra horario y teléfono, no se agenda online)

**Flujo de agendamiento (cliente):**
1. Seleccionar servicio
2. Seleccionar sucursal (solo las que ofrecen ese servicio)
3. Seleccionar mascota (de su perfil) o agregar una nueva
4. Ver calendario con disponibilidad por día
5. Seleccionar horario disponible (slots de 30 o 60 min según servicio)
6. Confirmar datos y agendar
7. Recibe email de confirmación con detalle y botón para cancelar/reagendar

**Flujo de gestión (admin/staff):**
- Vista de calendario semanal por sucursal
- Ver citas del día con detalle de mascota y servicio
- Marcar como atendida / no asistió / cancelada
- Bloquear horarios (feriados, capacitación, etc.)
- Configurar duración de slots por tipo de servicio
- Configurar cantidad máxima de citas simultáneas

**Modelo de datos:**

```typescript
interface Service {
  id: string;
  name: string;                      // "Consulta veterinaria"
  type: 'veterinaria' | 'peluqueria';
  durationMinutes: number;           // 30, 60
  price?: number;                    // null si es "consultar"
  description: string;
  availableAtStores: string[];       // IDs de sucursales
}

interface Appointment {
  id: string;
  serviceId: string;
  storeId: string;
  userId: string;
  petId: string;
  date: Date;
  startTime: string;                 // "14:30"
  endTime: string;                   // "15:00"
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt: Date;
}

interface ScheduleConfig {
  storeId: string;
  serviceType: 'veterinaria' | 'peluqueria';
  dayOfWeek: number;                 // 0-6
  startTime: string;                 // "10:00"
  endTime: string;                   // "19:00"
  slotDuration: number;              // minutos
  maxConcurrent: number;             // citas simultáneas
}

interface BlockedSlot {
  storeId: string;
  date: Date;
  startTime?: string;                // null = día completo
  endTime?: string;
  reason: string;
}
```

**Notificaciones automáticas:**
- Confirmación inmediata al agendar
- Recordatorio 24h antes
- Recordatorio 2h antes (opcional, por WhatsApp si se integra)
- Email post-atención pidiendo valoración

---

### F2.4 — Sistema de Puntos / Fidelización

**Reglas de acumulación:**
- X puntos por cada $1.000 CLP gastado (configurable por admin)
- Puntos bonus por primera compra
- Puntos bonus en cumpleaños de la mascota
- Puntos por completar perfil (agregar mascota, foto, etc.)

**Reglas de canje:**
- Cada punto equivale a $X CLP de descuento (configurable)
- Mínimo de puntos para canjear (ej: 500 puntos)
- Se aplica como descuento en el checkout
- No combinable con otros descuentos (configurable)

**Vista del cliente:**
- Balance actual de puntos en "Mi Cuenta"
- Historial: fecha, concepto (compra #123, bonus cumpleaños), puntos +/-
- Calculadora: "Tienes 2.500 puntos = $2.500 de descuento"

**Vista admin/staff:**
- Buscar cliente por RUT o email
- Ver balance y historial
- Agregar/descontar puntos manualmente (con motivo obligatorio)
- Configurar reglas de acumulación y canje

**Modelo de datos:**

```typescript
interface PointsTransaction {
  id: string;
  userId: string;
  amount: number;                    // Positivo = acumula, negativo = canje
  type: 'purchase' | 'redemption' | 'bonus' | 'manual_adjustment' | 'expiration';
  reference?: string;                // ID de orden, motivo manual, etc.
  description: string;               // "Compra #1234", "Bonus primera compra"
  createdAt: Date;
  createdBy?: string;                // userId del staff si es ajuste manual
}

interface PointsConfig {
  pointsPerThousandCLP: number;      // Ej: 10 puntos por $1.000
  pointValueCLP: number;             // Ej: 1 punto = $1
  minimumRedemption: number;         // Ej: 500 puntos mínimo
  firstPurchaseBonus: number;
  petBirthdayBonus: number;
  expirationDays?: number;           // null = no expiran
}
```

---

### F2.5 — Notificaciones de Restock

**Flujo:**
1. En ficha de producto sin stock, aparece botón "Notificarme cuando vuelva"
2. Usuario ingresa email (o se usa el de su cuenta si está logueado)
3. Selecciona sucursal(es) de interés (opcional)
4. Cuando el admin actualiza stock > 0 para ese producto, se dispara email automático
5. El email incluye link directo al producto y CTA "Comprar ahora"

**Consideraciones:**
- Un usuario puede tener múltiples alertas activas
- Se envía una sola vez por restock (no se re-envía si el stock vuelve a bajar y subir)
- El usuario puede cancelar la alerta desde "Mi Cuenta" o desde el email
- Rate limit: máximo 20 alertas activas por usuario

**Modelo de datos:**

```typescript
interface RestockAlert {
  id: string;
  productId: string;
  variantId?: string;
  userId?: string;                   // null si es solo email
  email: string;
  storeIds?: string[];               // null = cualquier sucursal
  status: 'active' | 'notified' | 'cancelled';
  createdAt: Date;
  notifiedAt?: Date;
}
```

---

### F2.6 — Blog / Contenido SEO

**Tipos de contenido:**
- Guías de cuidado por especie ("Cómo alimentar a tu cachorro", "Guía de arenas para gato")
- Artículos estacionales ("Cómo proteger a tu perro del calor", "Kit de invierno para mascotas")
- Novedades de productos y marcas
- Tips de salud (vinculados a servicios veterinarios)

**Funcionalidad:**
- Listado de artículos con filtro por categoría y especie
- Artículo con contenido rico (texto, imágenes, videos embebidos)
- Productos relacionados al final del artículo (ej: artículo sobre alimentación → link a alimentos)
- Autor y fecha de publicación
- Compartir en redes sociales
- SEO: cada artículo genera una URL indexable con structured data (Article schema)

**Panel admin:**
- Editor de contenido (Markdown o rich text con TipTap)
- Programar publicación
- Asignar categoría, especie, tags
- Vincular productos relacionados

**Modelo de datos:**

```typescript
interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;                   // Markdown o HTML
  coverImage: string;
  author: string;
  category: string;                  // "cuidados", "alimentación", "salud", "novedades"
  species: ('perro' | 'gato' | 'exotico')[];
  tags: string[];
  relatedProductIds: string[];
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### F2.7 — Vista Staff (Componente en Tienda — Nivel Básico)

**Acceso:** ruta `/staff` protegida con rol `staff` o `admin`

**Diseño:** optimizado para tablet (iPad) en mostrador. UI simplificada, botones grandes, sin navegación de tienda online.

**Funcionalidades:**

#### Consulta de Stock
- Búsqueda rápida de producto (por nombre, SKU o escáner de código)
- Ver stock en la sucursal actual y en las otras sucursales
- Indicador visual claro: verde/amarillo/rojo

#### Consulta de Cliente
- Buscar por RUT, nombre o email
- Ver balance de puntos actual
- Ver historial reciente de compras y citas
- Ver mascotas registradas

#### Citas del Día
- Listado de citas agendadas para hoy en esta sucursal
- Detalle: hora, servicio, cliente, mascota, notas
- Marcar como atendida o no asistió

#### Pedidos para Retiro
- Lista de pedidos web marcados como "listo para retiro" en esta sucursal
- Buscar por número de pedido o nombre del cliente
- (En Fase 3 se agrega la funcionalidad de marcar como "entregado")

---

## Esquema de Base de Datos (Resumen)

```
users
  ├── pets (mis mascotas)
  ├── points_transactions (historial de puntos)
  ├── restock_alerts
  └── addresses (para Fase 3)

products
  ├── variants
  ├── images
  ├── stock_by_store
  └── restock_alerts

categories
  └── subcategories

stores
  ├── schedule_config
  └── blocked_slots

appointments
  └── (linked to: user, pet, service, store)

services

blog_posts

admin_users (staff con roles)
```

---

## Checklist de Entrega — Fase 2

- [ ] PostgreSQL configurado (Neon) con migraciones
- [ ] Auth funcional (email/password + Google)
- [ ] Panel admin: CRUD productos, categorías, sucursales
- [ ] Panel admin: gestión de stock por sucursal
- [ ] Panel admin: gestión de usuarios y puntos
- [ ] Perfil de usuario con datos y mascotas
- [ ] Sistema de agendamiento completo (cliente + admin)
- [ ] Calendario de citas con slots y bloqueos
- [ ] Emails transaccionales: confirmación cita, recordatorio, restock
- [ ] Sistema de puntos: acumulación, canje, historial
- [ ] Notificaciones de restock funcionales
- [ ] Blog con editor, listado y artículos SEO-ready
- [ ] Vista `/staff` para consulta en tienda (stock, cliente, citas)
- [ ] Seed data migrado a BD
- [ ] Tests para flujos críticos (auth, puntos, agendamiento)
