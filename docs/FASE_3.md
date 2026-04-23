# Fase 3 — El Negocio Completo

> Objetivo: llevar la plataforma a producción real. Pagos, despacho, retiro en tienda,
> suscripciones y la integración completa entre canal online y tiendas físicas.
> Tiempo estimado: 6-8 semanas
> Prerrequisito: cliente con contrato firmado y pagando

---

## Cambios de Infraestructura

| Componente | Tecnología | Notas |
|-----------|------------|-------|
| Pagos | SDK WebPay (Transbank) + MercadoPago | WebPay es el estándar en Chile, MercadoPago como alternativa |
| Courier | API Chilexpress + API Starken | Cotización automática y generación de envíos |
| Webhooks | Next.js API Routes | Para callbacks de pago y eventos de courier |
| Queue / Jobs | Inngest o Trigger.dev | Emails, procesamiento de suscripciones, expiración de puntos |
| Monitoring | Sentry | Error tracking en producción |
| Analytics | Plausible o PostHog | Privacy-friendly, sin Google Analytics |

---

## Features Detalladas

### F3.1 — Checkout Completo

**Flujo de compra:**

```
Carrito → Login/Registro → Dirección/Retiro → Método de Envío → Pago → Confirmación
```

#### Paso 1: Autenticación
- Si no está logueado: login o registro rápido (solo email + nombre + RUT)
- Si está logueado: continúa directo

#### Paso 2: Método de Entrega
- **Despacho a domicilio:**
  - Seleccionar dirección guardada o agregar nueva
  - Autocompletado de dirección (Google Places API o similar)
  - Validar que la comuna esté dentro de la zona de cobertura
- **Retiro en tienda:**
  - Seleccionar sucursal
  - Mostrar tiempo estimado de preparación (ej: "Disponible para retiro en 48h")
  - Mostrar horario de la sucursal
- **Envío a regiones:**
  - Indicar que se cotizará por Chilexpress/Starken
  - Cotización automática vía API según peso y destino

#### Paso 3: Resumen y Puntos
- Detalle de productos con precios
- Costo de envío (gratis si > $20.000 en zona de cobertura)
- Aplicar puntos como descuento (si tiene suficientes)
- Cupón de descuento (campo opcional)
- Total final en CLP

#### Paso 4: Pago
- **WebPay (Transbank):** redirección al formulario de Transbank, callback de confirmación
- **MercadoPago:** checkout inline o redirección
- **Transferencia bancaria (manual):** muestra datos de cuenta, pedido queda "pendiente de pago"

#### Paso 5: Confirmación
- Página de éxito con número de pedido
- Email de confirmación con detalle completo
- Si es retiro en tienda: "Te avisaremos cuando esté listo"
- Opción de ver estado del pedido

**Consideraciones técnicas:**
- Toda la lógica de pago en server-side (API Routes)
- Validar stock al momento del pago (no al agregar al carrito)
- Si un producto se agotó entre el carrito y el pago, notificar al usuario
- Idempotencia en webhooks de pago (evitar cobros duplicados)
- Timeout de sesión de checkout: 30 minutos

**Modelo de datos:**

```typescript
interface Order {
  id: string;
  orderNumber: string;               // Formato: "TM-2026-00001"
  userId: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;                   // Puntos u otros
  total: number;
  status: OrderStatus;
  deliveryMethod: 'shipping' | 'pickup' | 'regional';
  shippingAddress?: Address;
  pickupStoreId?: string;
  paymentMethod: 'webpay' | 'mercadopago' | 'transfer';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentReference?: string;          // ID de transacción Transbank/MP
  pointsUsed: number;
  pointsEarned: number;
  couponCode?: string;
  notes?: string;                     // Notas del cliente
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

type OrderStatus =
  | 'pending_payment'                 // Esperando pago / transferencia
  | 'confirmed'                       // Pago confirmado
  | 'preparing'                       // En preparación
  | 'ready_for_pickup'                // Listo para retiro en tienda
  | 'shipped'                         // Despachado (con tracking)
  | 'delivered'                       // Entregado
  | 'cancelled'                       // Cancelado
  | 'refunded';                       // Reembolsado

interface OrderItem {
  productId: string;
  variantId?: string;
  name: string;                       // Snapshot del nombre al momento de compra
  price: number;                      // Snapshot del precio
  quantity: number;
  subtotal: number;
}

interface Address {
  street: string;
  number: string;
  apartment?: string;
  commune: string;
  city: string;
  region: string;
  zipCode?: string;
  reference?: string;                 // "Depto 302, torre B"
  coordinates?: { lat: number; lng: number };
}
```

---

### F3.2 — Integración con Medios de Pago

#### WebPay (Transbank)
- Integración vía SDK oficial de Transbank para Node.js
- Flujo: crear transacción → redirect a Transbank → callback de confirmación → actualizar orden
- Ambiente de integración para testing (sandbox de Transbank)
- Manejo de transacciones anuladas/timeout

#### MercadoPago
- SDK de MercadoPago para Node.js
- Checkout Pro (redirect) o Checkout API (inline)
- Webhook para notificaciones de pago (IPN)
- Soporte para reembolsos

**Consideraciones Chile:**
- Boleta electrónica: no se emite desde la plataforma (la tienda usa su sistema de facturación)
- Se genera un comprobante de compra interno con detalle para el cliente
- IVA incluido en los precios (estándar en retail Chile)

---

### F3.3 — Despacho y Logística

#### Despacho propio (zona de cobertura)
- Comunas configurables por admin
- Gratis sobre $20.000 CLP, $1.990-$2.990 bajo ese monto (configurable)
- Slots de despacho por día (configurable por admin)
- Seguimiento interno: preparando → en camino → entregado

#### Envío a regiones (Chilexpress / Starken / Bluexpress)
- Cotización automática vía API
  - Input: peso total, dimensiones del paquete, comuna de destino
  - Output: opciones de envío con precio y tiempo estimado
- Generación de etiqueta de envío
- Tracking con número de seguimiento del courier
- Notificación automática al cliente con tracking

**Flujo operativo:**
1. Pedido confirmado → aparece en panel admin como "Por preparar"
2. Staff prepara el pedido → marca como "Preparado"
3. Si es despacho propio: asignar a ruta del día
4. Si es courier: generar etiqueta, marcar como "Enviado" con tracking
5. Si es retiro: marcar como "Listo para retiro", enviar email/WhatsApp al cliente
6. Cliente retira / recibe → marcar como "Entregado"

**Modelo de datos:**

```typescript
interface ShippingConfig {
  freeShippingThreshold: number;      // Ej: 20000
  baseShippingCost: number;           // Ej: 1990
  coveredCommunes: string[];          // Comunas con despacho propio
  maxDailyDeliveries: number;         // Capacidad diaria
  deliverySlots: DeliverySlot[];
}

interface DeliverySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxOrders: number;
}

interface ShipmentTracking {
  orderId: string;
  carrier: 'propio' | 'chilexpress' | 'starken' | 'bluexpress';
  trackingNumber?: string;
  trackingUrl?: string;
  status: 'preparing' | 'ready' | 'in_transit' | 'delivered' | 'failed';
  estimatedDelivery?: Date;
  events: TrackingEvent[];
}

interface TrackingEvent {
  timestamp: Date;
  status: string;
  description: string;
  location?: string;
}
```

---

### F3.4 — Cuenta de Usuario Completa

**Secciones de "Mi Cuenta":**

#### Mis Pedidos
- Listado de pedidos con estado, fecha, total
- Detalle de pedido: productos, tracking, estado paso a paso
- Repetir pedido (agrega los mismos productos al carrito)
- Solicitar cambio/devolución (genera ticket por email/WhatsApp)

#### Mis Puntos
- Balance actual con equivalencia en CLP
- Historial de movimientos
- Nivel o categoría si se implementa tiers (ej: Bronce, Plata, Oro)

#### Mis Mascotas
- CRUD de mascotas (nombre, especie, raza, edad, peso, foto)
- Fecha de nacimiento (para bonus de cumpleaños)
- Vinculadas a citas veterinarias y recomendaciones

#### Mis Direcciones
- CRUD de direcciones de envío
- Marcar una como predeterminada
- Validación de comuna en zona de cobertura

#### Mis Citas
- Próximas citas con detalle
- Historial de citas pasadas
- Agendar nueva cita (acceso directo)
- Cancelar/reagendar cita

#### Mis Suscripciones (ver F3.5)
- Suscripciones activas y próximo envío
- Pausar / cancelar / modificar frecuencia

---

### F3.5 — Compra Recurrente / Suscripciones

**Concepto:** el cliente puede suscribirse a recibir un producto periódicamente (ideal para alimentos, arena de gato, antiparasitarios).

**Configuración (por producto, admin):**
- Habilitar/deshabilitar suscripción en el producto
- Frecuencias disponibles: cada 15, 30, 45, 60 días
- Descuento por suscripción (ej: 5% o 10%)

**Flujo del cliente:**
1. En la ficha de producto, opción "Compra única" vs "Suscribirme"
2. Si elige suscripción: selecciona frecuencia
3. Ve el precio con descuento aplicado
4. En el checkout, confirma la suscripción
5. Se cobra y despacha automáticamente según la frecuencia

**Gestión de suscripciones:**
- El cliente puede desde "Mi Cuenta":
  - Pausar (1 ciclo o indefinido)
  - Cambiar frecuencia
  - Cambiar variante (ej: de 8kg a 15kg)
  - Cancelar
- 3 días antes del próximo cobro, se envía email de aviso:
  - "Tu pedido de Royal Canin 15kg se procesará en 3 días"
  - Link para modificar o saltar este envío
- Si el pago falla: reintentar 2 veces con 24h de intervalo, luego pausar y notificar

**Modelo de datos:**

```typescript
interface Subscription {
  id: string;
  userId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  frequencyDays: number;              // 15, 30, 45, 60
  discountPercent: number;            // 5, 10
  status: 'active' | 'paused' | 'cancelled';
  paymentMethodToken: string;         // Token guardado del medio de pago
  shippingAddressId: string;
  nextDeliveryDate: Date;
  lastOrderId?: string;
  createdAt: Date;
  pausedAt?: Date;
  cancelledAt?: Date;
}

interface SubscriptionEvent {
  id: string;
  subscriptionId: string;
  type: 'created' | 'renewed' | 'paused' | 'resumed' | 'cancelled'
       | 'payment_failed' | 'skipped' | 'frequency_changed';
  details?: string;
  createdAt: Date;
}
```

---

### F3.6 — Panel de Reportes

**Dashboard principal (admin):**
- Ventas del día / semana / mes (gráfico de línea)
- Pedidos por estado (preparando, enviados, entregados)
- Ingresos totales y ticket promedio
- Productos más vendidos (top 10)
- Productos con stock bajo (alerta)

**Reportes disponibles:**
- Ventas por período (exportable a CSV)
- Ventas por sucursal
- Ventas por categoría / especie
- Clientes nuevos vs. recurrentes
- Citas agendadas vs. atendidas (tasa de no-show)
- Puntos emitidos vs. canjeados
- Suscripciones activas y tasa de cancelación

**Consideraciones:**
- No es un BI completo — son los reportes esenciales para operar
- Datos aggregados para no comprometer performance
- Exportar a CSV para análisis externo

---

### F3.7 — Componente en Tienda — Nivel Intermedio

Evolución de la vista `/staff` de la Fase 2:

#### Registrar Venta Presencial (solo para puntos)
- No reemplaza la caja/POS de la tienda
- Flujo rápido: buscar cliente por RUT → escanear o buscar productos → ingresar monto total → acumular puntos
- El objetivo es que las compras en tienda física también sumen puntos en el sistema
- Opción simplificada: solo ingresar RUT + monto total (sin detalle de productos)

#### Marcar Pedido como Retirado
- Buscar pedido por número o nombre del cliente
- Verificar identidad (RUT)
- Marcar como "Entregado" → actualiza estado y notifica al cliente
- Imprimir comprobante de retiro (opcional)

#### Gestión de Inventario Unificada
- Cuando se vende un producto en tienda (registrado en el POS externo), el stock debe actualizarse
- Opciones de sincronización:
  - **Manual:** staff actualiza stock desde `/staff` al final del día
  - **Semi-automática:** importar CSV diario del POS con movimientos
  - **Automática (ideal pero compleja):** integración API con el POS existente (Bsale, Vendty, etc.)
- La opción manual es la más realista para empezar

---

## Emails del Sistema (Resumen)

| Trigger | Destinatario | Contenido |
|---------|-------------|-----------|
| Registro | Cliente | Verificación de email |
| Pedido pagado | Cliente | Confirmación con detalle y número |
| Pedido preparado | Cliente | "Tu pedido está siendo preparado" |
| Listo para retiro | Cliente | "Tu pedido está listo en [sucursal]" |
| Pedido enviado | Cliente | Tracking number y link de seguimiento |
| Pedido entregado | Cliente | Confirmación + invitación a valorar |
| Cita agendada | Cliente | Confirmación con fecha, hora, servicio |
| Recordatorio cita | Cliente | 24h antes |
| Producto disponible | Cliente | Notificación de restock |
| Suscripción próxima | Cliente | 3 días antes del cobro |
| Pago fallido | Cliente | "No pudimos procesar tu pago" |
| Stock bajo | Admin | Producto con stock < umbral |
| Nuevo pedido | Admin/Staff | Resumen del pedido recibido |

---

## Seguridad en Producción

- HTTPS obligatorio (Vercel lo maneja)
- Rate limiting en API routes (especialmente auth y checkout)
- Validación server-side de todos los inputs (zod)
- Sanitización de contenido del blog (XSS)
- Tokens de pago nunca almacenados en la BD (solo tokens de Transbank/MP)
- CSRF protection en formularios
- Headers de seguridad (CSP, HSTS, X-Frame-Options)
- Backups automáticos de BD (Supabase/Neon lo ofrecen)
- Logging de acciones sensibles (pagos, cambios de stock, ajustes de puntos)

---

## Checklist de Entrega — Fase 3

- [ ] Checkout completo funcional (carrito → pago → confirmación)
- [ ] Integración WebPay (Transbank) con ambiente de producción
- [ ] Integración MercadoPago como alternativa
- [ ] Flujo de retiro en tienda (selección, notificación, entrega)
- [ ] Integración API Chilexpress/Starken para cotización y tracking
- [ ] Cuenta de usuario completa (pedidos, puntos, mascotas, direcciones, citas)
- [ ] Suscripciones/compra recurrente funcional
- [ ] Emails transaccionales para todos los triggers
- [ ] Panel de reportes con dashboard y exportación CSV
- [ ] Vista staff: registro de venta para puntos, marcar retiros, stock
- [ ] Seguridad: rate limiting, validación, headers, logging
- [ ] Monitoring: Sentry configurado
- [ ] Analytics: Plausible/PostHog integrado
- [ ] Testing E2E de flujo de compra completo
- [ ] Documentación de operación para el cliente
- [ ] Deploy en producción con dominio del cliente
