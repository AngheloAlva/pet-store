# Fase 3 — El Negocio Completo (Demo con módulos financieros)

> Objetivo: convertir PetCommerce en una plataforma que se sienta como un
> e-commerce + mini-ERP especializado en tiendas de mascotas. Esta fase agrega
> toda la capa financiera/operativa que diferencia a una tienda vertical de
> un Shopify genérico.
> Tiempo estimado: 6-8 semanas
> Prerrequisito: Fases 1 y 2 completas

---

## Filosofía de esta Fase

A diferencia de un despliegue productivo real, esta Fase 3 está pensada como
**demo navegable de extremo a extremo**. La premisa es:

- **Cero APIs externas obligatorias.** Cualquiera que abra el proyecto debe
  poder hacer un checkout completo, ver un pedido despachado, recibir una
  boleta y revisar reportes sin configurar credenciales de Transbank,
  MercadoPago, Chilexpress, SII ni nada.
- **Todo simulado, pero con datos realistas.** Pagos, despachos y emisión
  tributaria viven en módulos `mock-*` que devuelven respuestas creíbles,
  con delays artificiales, estados intermedios y eventos de webhook
  ejecutados desde dentro de la app (no desde fuera).
- **Arquitectura preparada para reemplazo.** Cada módulo simulado expone una
  interfaz idéntica a la que tendría su contraparte real (`PaymentGateway`,
  `CourierProvider`, `DTEProvider`). El día que un cliente quiera pasarlo a
  producción, se reemplaza la implementación sin tocar el resto.

Esto significa que en esta Fase **no se integra con Transbank, MercadoPago,
Chilexpress, Starken, SII, ni ningún servicio externo real**. Toda esa lógica
se simula.

---

## Cambios de Infraestructura

| Componente | Estrategia demo | Notas |
|-----------|-----------------|-------|
| Pagos | `MockPaymentGateway` con UI propia | Pantalla tipo "redirección" con animación, ingreso de tarjeta ficticia, 90% éxito / 10% fallo configurable |
| Courier | `MockCourierProvider` | Genera tracking falso, eventos cron-simulados (preparado → en ruta → entregado) |
| DTE / SII | `MockDTEProvider` | Genera folio, timbre simulado y PDF descargable; no envía nada a ninguna entidad |
| Banco / cartola | Generador local de CSV | Importable desde Conciliación; sin conexión bancaria real |
| Webhooks | API Routes que se gatillan desde el panel admin con botones | "Marcar pago como recibido", "Avanzar estado del envío" |
| Queue / Jobs | Scheduler in-memory + botones de "ejecutar ahora" | Para suscripciones y vencimientos sin depender de cron real |
| Email | Bandeja interna en `/demo/inbox` | Sin envío real; ya creada en Fase 2 |
| Persistencia | Misma estrategia de Fase 1-2 (seed + localStorage o BD ligera) | El foco sigue siendo navegabilidad de la demo |

> Cuando llegue un cliente real, los `Mock*Provider` se sustituyen por
> implementaciones reales detrás de la misma interfaz.

---

## Mapa de Módulos

La Fase 3 se compone de **18 módulos**, agrupados en cuatro bloques:

**Bloque A — Cierre del flujo de venta**
1. F3.1 Checkout completo simulado
2. F3.2 Medios de pago simulados
3. F3.3 Despacho y retiro simulado
4. F3.4 Cuenta de usuario completa
5. F3.5 Suscripciones / compra recurrente simulada

**Bloque B — Capa financiera (lo nuevo)**
6. F3.6 Documentos Tributarios Electrónicos (DTE) simulados
7. F3.7 Caja y arqueo (cash management)
8. F3.8 Cuentas por cobrar / Cobranzas B2B
9. F3.9 Cotizaciones convertibles
10. F3.10 Compras a proveedores y kardex valorizado
11. F3.11 Gastos operativos y P&L mensual
12. F3.12 Pricing avanzado (listas, packs, cupones)
13. F3.13 Comisiones a vendedores
14. F3.14 Wallet del cliente y gift cards
15. F3.15 Conciliación de pagos (mock)

**Bloque C — Inteligencia de negocio**
16. F3.16 Dashboard financiero (margen, P&L, cash)

**Bloque D — Operación física**
17. F3.17 Vista staff — nivel intermedio
18. F3.18 Stubs de integraciones contables (Chipax, Defontana, SII)

---

# Bloque A — Cierre del flujo de venta

## F3.1 — Checkout Completo Simulado

**Flujo de compra (sin cambios respecto a Fase 1 hasta el pago):**

```
Carrito → Login/Registro → Dirección o Retiro → Método de Envío → Pago → Confirmación
```

### Paso 1: Autenticación
- Si no está logueado: login o registro rápido (email + nombre + RUT).
- Si está logueado: continúa directo.

### Paso 2: Método de Entrega
- **Despacho a domicilio**: seleccionar dirección guardada o agregar nueva.
  La validación de comuna se hace contra una lista hardcoded de comunas de
  cobertura (no Google Places).
- **Retiro en tienda**: seleccionar sucursal y mostrar tiempo estimado
  ("Disponible para retiro en 48h") y horario.
- **Envío a regiones**: cotización generada por `MockCourierProvider` según
  comuna y peso simulado del carrito (no llama a Chilexpress).

### Paso 3: Resumen
- Detalle de productos con precios.
- Costo de envío (gratis si > $20.000, $1.990-$2.990 si no, configurable).
- Aplicar puntos como descuento.
- Aplicar wallet/saldo a favor del cliente (ver F3.14).
- Aplicar cupón de descuento.
- Selección de tipo de documento: **Boleta** o **Factura** (si es factura
  pide datos de empresa).
- Total final en CLP con desglose de IVA.

### Paso 4: Pago
Pantalla con selector de medio de pago (ver F3.2). Cada uno gatilla su propia
UI simulada y termina volviendo al callback `/checkout/resultado`.

### Paso 5: Confirmación
- Página de éxito con número de pedido (formato `PC-2026-00001`).
- Email de confirmación enviado a `/demo/inbox`.
- Generación automática del DTE asociado (boleta o factura — ver F3.6).
- Si es retiro en tienda: "Te avisaremos cuando esté listo".
- Acumulación de puntos registrada.

**Consideraciones técnicas:**
- Toda la lógica de pago vive server-side en API Routes.
- Validar stock al momento del pago (no al agregar al carrito).
- Si un producto se agotó entre el carrito y el pago, notificar al usuario.
- Idempotencia: cada intento de pago tiene un `idempotencyKey` propio.
- Timeout de sesión de checkout: 30 minutos.

**Modelo de datos:**

```typescript
interface Order {
  id: string;
  orderNumber: string;               // "PC-2026-00001"
  userId: string;
  salespersonId?: string;            // Para comisiones (F3.13)
  items: OrderItem[];
  subtotal: number;                  // Neto
  taxAmount: number;                 // IVA 19%
  shippingCost: number;
  discount: number;                  // Cupones, descuentos por volumen
  pointsDiscount: number;            // Descuento por canje de puntos
  walletDiscount: number;            // Saldo a favor usado (F3.14)
  total: number;
  status: OrderStatus;
  deliveryMethod: 'shipping' | 'pickup' | 'regional';
  shippingAddress?: Address;
  pickupStoreId?: string;
  documentType: 'boleta' | 'factura';
  documentData?: InvoiceData;        // Solo si es factura
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentReference?: string;         // ID interno del MockPaymentGateway
  dteId?: string;                    // Referencia al DTE emitido (F3.6)
  pointsUsed: number;
  pointsEarned: number;
  couponCode?: string;
  priceListId?: string;              // Lista de precios aplicada (F3.12)
  isCreditSale: boolean;             // Venta a crédito B2B (F3.8)
  creditDueDate?: Date;              // Si es crédito
  notes?: string;
  createdAt: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';
```

---

## F3.2 — Medios de Pago Simulados

Todos los medios viven detrás de la interfaz común:

```typescript
interface PaymentGateway {
  id: PaymentMethod;
  name: string;
  createPayment(order: Order): Promise<PaymentSession>;
  confirmPayment(sessionId: string): Promise<PaymentResult>;
  refund(paymentId: string, amount: number): Promise<RefundResult>;
}

type PaymentMethod =
  | 'webpay_mock'        // Tarjeta crédito/débito
  | 'mercadopago_mock'   // Tarjeta + cuotas
  | 'transfer_mock'      // Transferencia con OCR de comprobante mockeado
  | 'cash_mock'          // Efectivo (POS)
  | 'wallet'             // Saldo del cliente (F3.14)
  | 'gift_card'          // Tarjeta de regalo (F3.14)
  | 'credit_b2b';        // Venta a crédito (F3.8)
```

**WebPay mock:** pantalla con look-and-feel similar a Transbank (formulario de
tarjeta, número, vencimiento, CVV). No valida nada real. Botón "Aprobar" y
"Rechazar" para que el demostrador elija el resultado. Animación de
procesamiento (3 segundos).

**MercadoPago mock:** mismo principio pero con selector de cuotas (1, 3, 6, 12
sin interés) y cálculo del valor por cuota.

**Transferencia mock:** muestra datos de cuenta bancaria ficticios, sube
comprobante (cualquier imagen), queda en estado `pending_verification`. En el
panel admin hay un botón "Confirmar transferencia" que cambia el estado.

**Efectivo (cash mock):** solo disponible desde el POS de `/staff`. Calcula
vuelto automáticamente.

**Wallet y Gift Card:** ver F3.14.

**Crédito B2B:** ver F3.8.

**Comportamiento de fallo configurable:** un toggle en `/admin/configuracion`
permite forzar el modo "10% de transacciones fallan" para demostrar el flujo
de error y reintento.

**Reembolsos:** botón en el panel admin sobre cualquier pedido pagado. Genera
nota de crédito automática (ver F3.6) y revierte el pago en estado.

---

## F3.3 — Despacho y Retiro Simulado

### Despacho propio (zona de cobertura)
- Comunas configurables por admin desde `/admin/configuracion/cobertura`.
- Tarifa gratuita sobre $20.000 (configurable).
- Slots de despacho por día (mañana / tarde).
- Estados: `preparando` → `en_ruta` → `entregado` → `fallido`.

### Envío a regiones (mock courier)
- `MockCourierProvider` cotiza según una tabla peso×destino estática.
- Genera tracking number ficticio (`MOCK-` + 8 dígitos).
- Página de tracking interna `/tracking/[number]` con timeline simulado.
- Botón "Avanzar estado" en el panel admin para mover el envío manualmente
  durante la demo.

### Retiro en tienda
- Listo desde Fase 1: selección de sucursal, notificación al cliente
  ("Tu pedido está listo en [sucursal]").
- Vista staff (F3.17) permite buscar pedido, verificar identidad y marcar
  como entregado.

**Modelo de datos:**

```typescript
interface Shipment {
  id: string;
  orderId: string;
  carrier: 'propio' | 'mock_chilexpress' | 'mock_starken' | 'pickup';
  trackingNumber?: string;
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

## F3.4 — Cuenta de Usuario Completa

Secciones de "Mi Cuenta":

- **Mis Pedidos**: listado con estado, fecha, total. Detalle con tracking,
  estado paso a paso, opción de "repetir pedido" y "solicitar devolución".
- **Mis Documentos**: boletas y facturas emitidas, descarga del PDF (F3.6).
- **Mis Puntos** (ya existe desde Fase 2): balance, historial, equivalencia.
- **Mi Wallet** (ver F3.14): saldo a favor y movimientos.
- **Mis Gift Cards** (ver F3.14): tarjetas activas y saldo.
- **Mis Mascotas** (ya existe): CRUD con fecha de nacimiento para bonos.
- **Mis Direcciones**: CRUD, predeterminada, validación de zona.
- **Mis Citas** (ya existe): próximas, historial, agendar, cancelar.
- **Mis Suscripciones** (ver F3.5): activas, próximo envío, pausar / cancelar.
- **Mi Estado de Cuenta** (si es cliente B2B con crédito, ver F3.8): facturas
  pendientes, vencidas, próximas a vencer.

---

## F3.5 — Suscripciones / Compra Recurrente Simulada

**Concepto:** cliente se suscribe a recibir un producto periódicamente.
Ideal para alimentos, arena de gato, antiparasitarios.

**Configuración (por producto, admin):**
- Habilitar / deshabilitar suscripción.
- Frecuencias: 15, 30, 45, 60 días.
- Descuento por suscripción (5% o 10%).

**Flujo del cliente:**
1. En la ficha de producto: "Compra única" vs "Suscribirme".
2. Selecciona frecuencia.
3. Ve precio con descuento aplicado.
4. En el checkout confirma la suscripción.
5. Se "cobra" y "despacha" automáticamente según frecuencia (simulado).

**Gestión:**
- Pausar (1 ciclo o indefinido), cambiar frecuencia, cambiar variante (8kg a
  15kg), cancelar.
- 3 días antes del próximo cobro: email a `/demo/inbox`.
- Si el "pago" mock falla: reintentar 2 veces, luego pausar y notificar.

**Demo-friendly:**
- Panel admin tiene botón "Ejecutar ciclo de suscripciones ahora" para no
  esperar a un cron real.
- Cada suscripción muestra el próximo cobro y se puede adelantar para fines
  de demo.

```typescript
interface Subscription {
  id: string;
  userId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  frequencyDays: number;
  discountPercent: number;
  status: 'active' | 'paused' | 'cancelled';
  paymentMethodToken: string;       // Token mock guardado
  shippingAddressId: string;
  nextDeliveryDate: Date;
  lastOrderId?: string;
  createdAt: Date;
  pausedAt?: Date;
  cancelledAt?: Date;
}
```

---

# Bloque B — Capa financiera (lo nuevo)

## F3.6 — Documentos Tributarios Electrónicos (DTE) Simulados

Este es el módulo "más Bsale" de la demo.

**Tipos de documento soportados:**
- Boleta electrónica (39)
- Factura electrónica (33)
- Nota de crédito (61) — anulación o devolución
- Nota de débito (56) — corrección al alza
- Guía de despacho (52) — opcional

**Flujo:**
1. Al confirmar una venta (web o POS), se crea el DTE en estado `por_emitir`.
2. El `MockDTEProvider` asigna un folio correlativo por tipo de documento,
   genera un timbre electrónico simulado (string base64 de relleno) y arma el
   PDF con la información tributaria estándar chilena:
   - RUT emisor (de la tienda).
   - RUT receptor (cliente).
   - Glosa de productos, neto, IVA 19%, total.
   - Folio, fecha, tipo de documento.
3. El estado pasa a `emitido`. En la realidad este sería el ack del SII; en
   demo es instantáneo.
4. Se puede generar nota de crédito desde el detalle del DTE para anular
   total o parcialmente.

**Páginas:**
- `/admin/documentos`: listado filtrable por tipo, fecha, cliente, vendedor,
  rango de folios. Totales por período (neto, IVA, total).
- `/admin/documentos/[id]`: detalle con preview del PDF y botones "Anular"
  (genera NC) y "Descargar".
- `/cuenta/documentos`: cliente ve sus boletas/facturas y descarga.

**Reportes:**
- Libro de Ventas mensual (exportable a CSV con columnas SII).
- Resumen IVA débito por período.
- Folios disponibles vs. utilizados por tipo.

**Modelo de datos:**

```typescript
interface DTE {
  id: string;
  type: 'boleta' | 'factura' | 'nota_credito' | 'nota_debito' | 'guia';
  documentCode: 39 | 33 | 61 | 56 | 52;
  folio: number;                     // Correlativo por tipo
  orderId?: string;
  referenceDteId?: string;           // Para NC/ND que referencian otro DTE
  issuerRut: string;
  receiver: {
    rut: string;
    name: string;
    businessLine?: string;           // Giro (solo facturas)
    address?: string;
  };
  items: DTEItem[];
  net: number;                       // Neto
  taxAmount: number;                 // IVA 19%
  total: number;
  status: 'por_emitir' | 'emitido' | 'anulado' | 'rechazado';
  issuedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  stamp: string;                     // Timbre simulado
  pdfUrl: string;                    // URL al PDF generado
}

interface DTEItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  net: number;
}
```

**Interfaz para producción futura:**

```typescript
interface DTEProvider {
  issueDocument(dte: DTE): Promise<DTEResult>;
  cancelDocument(dteId: string, reason: string): Promise<DTEResult>;
  getFolio(type: DTEType): Promise<number>;
}
// MockDTEProvider implementa esto. Reemplazable por OpenFactura, LibreDTE,
// Acepta, Haulmer o el módulo de DTE de Bsale el día que sea producción.
```

---

## F3.7 — Caja y Arqueo (Cash Management)

Pensado para la vista `/staff` cuando se opera como POS físico.

**Apertura de caja:**
- Vendedor selecciona su sucursal y caja.
- Ingresa saldo inicial declarado.
- Quedan registrados timestamp y usuario.

**Movimientos durante el turno:**
- Ventas en efectivo (suman).
- Ingresos manuales: anotaciones de "fondo de caja", "cambio entregado por
  administración" (suman).
- Retiros: pago a proveedor en efectivo, retiro a banco, gastos menores
  (restan). Cada retiro requiere motivo y opcionalmente comprobante.

**Cierre de turno:**
- Sistema calcula saldo teórico = inicial + ingresos − retiros + ventas
  efectivo.
- Vendedor ingresa monto físico contado (declarado).
- Diferencia = físico − teórico. Si es ≠ 0, queda flag de diferencia con
  campo de explicación.
- Se genera comprobante de cierre imprimible.

**Reportes:**
- Cierres por caja, por sucursal, por vendedor, por fecha.
- Suma de diferencias del mes (señal de control interno).
- Conciliación con depósitos bancarios (alimenta F3.15).

```typescript
interface CashSession {
  id: string;
  storeId: string;
  registerId: string;
  openedBy: string;
  openedAt: Date;
  openingBalance: number;
  closedBy?: string;
  closedAt?: Date;
  expectedBalance?: number;
  countedBalance?: number;
  difference?: number;
  differenceReason?: string;
  status: 'open' | 'closed';
}

interface CashMovement {
  id: string;
  sessionId: string;
  type: 'sale_cash' | 'deposit' | 'withdrawal' | 'adjustment';
  amount: number;                   // Positivo o negativo
  reason: string;
  reference?: string;               // orderId o documentId asociado
  createdBy: string;
  createdAt: Date;
}
```

---

## F3.8 — Cuentas por Cobrar / Cobranzas B2B

Para clientes mayoristas: criaderos, hoteles caninos, peluquerías
revendedoras, fundaciones. Compran a crédito y se cobran después.

**Configuración por cliente:**
- Habilitar venta a crédito.
- Cupo de crédito asignado ($X CLP).
- Plazo estándar: 15 / 30 / 60 / 90 días.

**Venta a crédito:**
- En el checkout (o POS), si el cliente B2B tiene crédito habilitado, aparece
  el método "Crédito a 30 días".
- Se crea la factura electrónica de inmediato (F3.6).
- El pedido queda en estado `confirmado` pero con `paymentStatus = pending`.
- Se calcula `creditDueDate = today + plazo`.

**Gestión de cobranza:**
- Página `/admin/cobranza`:
  - **Facturas por cobrar**: vencimiento, días al vencer, monto.
  - **Vencidas**: con semáforo (1-15 días, 16-30, 31-60, 60+).
  - **Calendario de pagos**: vista calendario con vencimientos del mes.
- Registrar pago: total o parcial, fecha, medio (transferencia, efectivo,
  cheque), referencia. Disminuye el saldo de la factura.
- Aplicar nota de crédito como pago.
- Generar estado de cuenta del cliente (PDF descargable).

**Métricas:**
- DSO (Days Sales Outstanding) por cliente y global.
- Cartera vencida total y por rango de antigüedad.
- Top clientes morosos.

**Alertas:**
- Cliente intenta comprar a crédito pero superaría su cupo → bloqueo.
- Facturas próximas a vencer (7 días antes) → email al cliente desde
  `/demo/inbox`.

```typescript
interface CustomerCredit {
  customerId: string;
  enabled: boolean;
  creditLimit: number;
  standardTermDays: number;
  currentDebt: number;              // Calculado
  oldestOverdueDate?: Date;
}

interface AccountReceivable {
  id: string;
  customerId: string;
  dteId: string;                    // Factura asociada
  orderId: string;
  amount: number;
  amountPaid: number;
  balance: number;
  issueDate: Date;
  dueDate: Date;
  status: 'open' | 'partially_paid' | 'paid' | 'overdue' | 'written_off';
  payments: ARPayment[];
}

interface ARPayment {
  id: string;
  receivableId: string;
  amount: number;
  method: 'transfer' | 'cash' | 'check' | 'credit_note';
  reference?: string;
  receivedAt: Date;
  registeredBy: string;
  notes?: string;
}
```

---

## F3.9 — Cotizaciones Convertibles

Útil para B2B (hoteles caninos cotizando alimento al mes, fundaciones
solicitando descuento por volumen, veterinarias mayoristas).

**Flujo:**
1. Vendedor o cliente registrado crea cotización desde `/cotizaciones/nueva`.
2. Selecciona productos, cantidades, lista de precios aplicable.
3. Define vigencia (días).
4. Opcionalmente exige abono al confirmar (20%, 50%).
5. Se genera PDF descargable con folio interno.
6. Se envía al cliente por email (a `/demo/inbox`).

**Estados:** `borrador` → `enviada` → `aceptada` / `rechazada` / `expirada`.

**Conversión:**
- Si el cliente acepta, con un click se convierte en pedido (`Order`).
- Si exigió abono, queda como `paid_partial`; el saldo se cobra al
  despachar.
- Si no, sigue el flujo normal.

```typescript
interface Quotation {
  id: string;
  quotationNumber: string;          // "COT-2026-00001"
  customerId: string;
  items: QuotationItem[];
  net: number;
  taxAmount: number;
  total: number;
  validUntil: Date;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  depositRequired?: number;         // % o monto
  depositPaid?: number;
  convertedOrderId?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}
```

---

## F3.10 — Compras a Proveedores y Kardex Valorizado

Es lo que hace que el margen del Dashboard (F3.16) sea **verdadero**, porque
introduce el costo unitario al inventario.

**Proveedores:**
- CRUD básico: nombre, RUT, contacto, condición de pago, plazo.
- Historial de compras y deuda con el proveedor.

**Órdenes de Compra (OC):**
- Crear OC → enviar a proveedor → recibir (parcial o total).
- Al recibir, ingresa stock con `costoUnitario` y se genera la "factura por
  pagar" (cuentas por pagar — AP).

**Kardex valorizado:**
- Cada producto mantiene un kardex con cada movimiento (entrada por compra,
  salida por venta, ajustes).
- Método configurable: **PEPS** (FIFO) o **Promedio Ponderado**.
- Costo unitario actual = resultado del método sobre las últimas entradas.

**Reportes:**
- Inventario valorizado a una fecha (suma de stock × costo).
- Rotación: días promedio de stock por producto.
- Productos sin movimiento en X días.
- Diferencias de inventario tras toma física.

**Pagos a proveedores (AP):**
- Listado de facturas por pagar.
- Calendario de vencimientos.
- Registrar pago (total o parcial).

```typescript
interface Supplier {
  id: string;
  name: string;
  rut: string;
  contactEmail?: string;
  paymentTermDays: number;
  currentDebt: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
  items: POItem[];
  total: number;
  expectedDate?: Date;
  receivedAt?: Date;
  invoiceFolio?: string;
}

interface POItem {
  productId: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
}

interface KardexEntry {
  id: string;
  productId: string;
  storeId: string;
  movementType: 'purchase' | 'sale' | 'adjustment' | 'transfer' | 'return';
  quantity: number;                 // Signo según tipo
  unitCost: number;
  balanceQuantity: number;          // Stock resultante
  balanceCost: number;              // Costo unitario resultante (promedio o FIFO)
  reference?: string;               // ID del documento origen
  createdAt: Date;
}
```

---

## F3.11 — Gastos Operativos y P&L Mensual

CRUD de gastos para que el negocio refleje su realidad completa, no solo
ingresos.

**Categorías sugeridas (configurables):**
- Arriendo
- Sueldos
- Servicios básicos (luz, agua, internet)
- Marketing / Publicidad
- Mantención
- Honorarios
- Insumos no inventariables
- Otros

**Registro de gasto:**
- Categoría, sucursal asignada, monto, fecha, descripción, comprobante
  (imagen opcional), método de pago, proveedor (opcional).

**Gastos recurrentes:**
- Marcar un gasto como "recurrente" para que se genere automáticamente cada
  mes (arriendo, sueldos). Botón "Generar gastos del mes" en admin.

**P&L mensual:**
```
Ingresos (ventas netas)
  − Devoluciones y notas de crédito
= Ingresos netos
  − COGS (costo de mercadería vendida, del kardex)
= Utilidad bruta
  − Gastos operativos (categorizados)
= Utilidad operativa
```

Vista comparativa mes contra mes y contra el mismo mes del año anterior.

```typescript
interface Expense {
  id: string;
  category: string;
  storeId?: string;
  amount: number;
  date: Date;
  description: string;
  receiptUrl?: string;
  paymentMethod: 'cash' | 'transfer' | 'card' | 'credit';
  supplierId?: string;
  isRecurring: boolean;
  recurringConfig?: {
    frequency: 'monthly' | 'weekly';
    dayOfMonth?: number;
  };
  createdBy: string;
  createdAt: Date;
}
```

---

## F3.12 — Pricing Avanzado (Listas, Packs, Cupones)

### Listas de precios
- Mayorista, retail, fundación, clínica veterinaria.
- Se asignan a clientes o se activan por monto mínimo de pedido.
- Cada producto puede tener precio distinto por lista.

### Packs y combos
- Combinaciones con precio especial (ej: "Pack adopción": alimento 1kg +
  collar + plato + juguete = 20% menos que la suma).
- Al venderse, descuenta stock de cada componente.

### Cupones avanzados
- Por % o monto fijo.
- Por categoría, por marca, por producto específico.
- Por primera compra, por monto mínimo, por cliente segmentado.
- Vigencia, uso único o N usos totales, uso único por cliente.
- Métrica: uso por cupón y conversión.

### Descuentos automáticos por volumen
- "3x2 en juguetes", "10% adicional sobre $50.000".
- Reglas configurables desde el admin sin tocar código.

```typescript
interface PriceList {
  id: string;
  name: string;
  description: string;
  minimumOrderAmount?: number;
  prices: Map<string, number>;      // productId → precio
  assignedCustomerIds: string[];
  active: boolean;
}

interface Bundle {
  id: string;
  name: string;
  components: BundleComponent[];
  price: number;
  validFrom?: Date;
  validUntil?: Date;
}

interface BundleComponent {
  productId: string;
  variantId?: string;
  quantity: number;
}

interface PromoRule {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  conditions: PromoCondition[];
  active: boolean;
  validFrom?: Date;
  validUntil?: Date;
}
```

---

## F3.13 — Comisiones a Vendedores

Cada venta asignada a un vendedor (`salespersonId`) acumula comisión según
las reglas configuradas.

**Reglas configurables:**
- % sobre venta neta.
- % sobre margen (necesita kardex de F3.10).
- Escalones: "0-1M = 3%, 1-2M = 4%, 2M+ = 5%".
- Por categoría / marca (incentivar productos específicos).
- Solo comisiona si el pago se concretó (no facturas vencidas).

**Liquidación mensual:**
- Reporte por vendedor: ventas, devoluciones, comisión calculada.
- Aprobación de la liquidación → genera asiento de gasto (F3.11).
- Marcar como pagada.

```typescript
interface CommissionRule {
  id: string;
  name: string;
  basis: 'net_sale' | 'margin';
  tiers: CommissionTier[];
  categoryFilter?: string[];
  brandFilter?: string[];
  active: boolean;
}

interface CommissionTier {
  fromAmount: number;
  toAmount?: number;
  percentage: number;
}

interface CommissionPayout {
  id: string;
  salespersonId: string;
  period: string;                   // "2026-05"
  salesTotal: number;
  marginTotal: number;
  amount: number;
  status: 'draft' | 'approved' | 'paid';
  approvedAt?: Date;
  paidAt?: Date;
}
```

---

## F3.14 — Wallet del Cliente y Gift Cards

Dos features que se acoplan al sistema de pago.

### Wallet (saldo a favor)
- Cuando se hace una devolución, el cliente puede elegir reembolso al medio
  de pago original o crédito a su wallet (con un bonus opcional, ej: 5%).
- El saldo en wallet se usa como medio de pago en futuras compras.
- Vista en `/cuenta/wallet`: saldo y movimientos.

### Gift Cards
- Compra de gift card por monto fijo o configurable, con código único.
- Diseños predefinidos (cumpleaños, navidad, adopción).
- Mensaje personalizable.
- Activación inmediata o programada (fecha del regalo).
- Canje desde el checkout introduciendo el código.
- Saldo parcial: si la gift card vale más que la compra, queda saldo
  remanente.
- Reporte de gift cards emitidas, canjeadas y por canjear (pasivo
  pendiente).

```typescript
interface WalletAccount {
  userId: string;
  balance: number;
  movements: WalletMovement[];
}

interface WalletMovement {
  id: string;
  amount: number;                   // Signo según tipo
  type: 'refund_credit' | 'purchase' | 'admin_adjustment' | 'expiration';
  reference?: string;
  createdAt: Date;
  expiresAt?: Date;
}

interface GiftCard {
  id: string;
  code: string;                     // Único
  initialAmount: number;
  balance: number;
  design: string;
  recipientName?: string;
  recipientEmail?: string;
  senderMessage?: string;
  status: 'active' | 'redeemed' | 'expired';
  purchasedBy: string;
  activationDate: Date;
  expirationDate?: Date;
  redemptions: GiftCardRedemption[];
}
```

---

## F3.15 — Conciliación de Pagos (Mock)

Cruce entre los pedidos pagados en el sistema y los movimientos del banco /
pasarela.

**Flujo:**
1. Admin sube CSV (cartola bancaria simulada o reporte mock de pasarela).
2. Sistema intenta hacer match automático por fecha + monto + referencia.
3. Movimientos sin match quedan en bandeja para revisión manual.
4. Comisiones de pasarela detectadas y registradas como gasto.
5. Reporte: depósitos pendientes de conciliar, comisiones del mes, diferencias.

**Generador local de cartola:**
- Para demo, hay un endpoint `/admin/conciliacion/generar-cartola-mock` que
  produce un CSV realista a partir de los pedidos pagados de un período,
  introduciendo deliberadamente algunas inconsistencias (montos parciales,
  comisiones, depósitos consolidados) para que la conciliación tenga
  trabajo real que mostrar.

```typescript
interface BankStatement {
  id: string;
  source: 'bank_csv' | 'gateway_report';
  uploadedAt: Date;
  period: { from: Date; to: Date };
  entries: BankEntry[];
}

interface BankEntry {
  date: Date;
  description: string;
  amount: number;
  reference?: string;
  matchedOrderId?: string;
  matchedManually: boolean;
  fee?: number;
  status: 'pending' | 'matched' | 'no_match';
}
```

---

# Bloque C — Inteligencia de negocio

## F3.16 — Dashboard Financiero

Reemplaza el "Panel de Reportes" simple por uno completo, alimentado por todos
los módulos anteriores.

**Página principal `/admin/dashboard`:**

**Indicadores clave (hoy / mes / año):**
- Ventas brutas y netas.
- Margen bruto absoluto y %.
- Ticket promedio, unidades por boleta.
- Ingresos cobrados vs. por cobrar (cartera vigente).
- Cash flow operativo del mes.
- Punto de equilibrio mensual configurable (alerta si quedan X días para
  alcanzarlo).

**Gráficos:**
- Línea: ventas día a día (mes actual vs. mes anterior).
- Stacked bars: ventas por canal (web, POS, suscripciones).
- Pie: ventas por categoría / especie.
- Embudo: visitas → carrito → checkout → pago confirmado.

**Top y bottom:**
- Top 10 productos por ingresos vs. top 10 por margen (raramente coinciden).
- Top clientes por valor de vida.
- Productos con stock bajo.
- Suscripciones próximas a renovar.

**Reportes exportables a CSV:**
- Ventas por período / sucursal / categoría / vendedor.
- Libro de ventas SII (F3.6).
- Cartera vencida (F3.8).
- Inventario valorizado (F3.10).
- P&L mensual (F3.11).
- Liquidación de comisiones (F3.13).

**Filtros globales:** rango de fechas, sucursal, canal, vendedor.

---

# Bloque D — Operación física

## F3.17 — Vista Staff — Nivel Intermedio

Evolución de la vista `/staff` que ya existe desde Fase 2.

### POS rápido en `/staff/venta`
- Buscar cliente por RUT (o continuar como anónimo).
- Escanear o buscar productos por SKU / nombre.
- Aplicar descuentos manuales (con permiso).
- Seleccionar medio de pago (incluye efectivo con vuelto).
- Emite DTE (boleta/factura) automáticamente.
- Suma puntos al cliente.
- Se vincula a la sesión de caja activa (F3.7).

### Marcar pedido web como retirado
- Buscar pedido por número o cliente.
- Verificar identidad por RUT.
- Marcar como entregado → notifica al cliente.
- Imprimir comprobante de retiro.

### Apertura y cierre de caja
- Conectado a F3.7.

### Reposición y traspaso de stock
- Recibir mercadería desde una OC (F3.10).
- Traspaso entre sucursales (sale de stock A, entra a stock B).
- Toma física: ajuste de inventario con motivo.

---

## F3.18 — Stubs de Integraciones Contables

Aunque no se conecten realmente, dejar la arquitectura visible suma mucho en
una demo enseñada a un cliente con asesor contable.

**Exportadores incluidos:**
- **Chipax**: CSV con formato esperado para conciliación bancaria + ventas.
- **Defontana / Nubox**: CSV con asientos contables sugeridos.
- **SII — Libro de Ventas**: CSV en formato del libro mensual.
- **Buk Finanzas**: webhook simulado.

**Pantalla `/admin/integraciones`:**
- Cada integración con su estado (en demo: "Simulada").
- Botón de exportar último período.
- Documentación de la interfaz para futura integración real.

---

# Emails del Sistema (Resumen actualizado)

Todos los emails caen en la bandeja interna `/demo/inbox`.

| Trigger | Destinatario | Contenido |
|---------|-------------|-----------|
| Registro | Cliente | Verificación de email |
| Pedido pagado | Cliente | Confirmación + DTE adjunto |
| Pedido preparado | Cliente | "Tu pedido está siendo preparado" |
| Listo para retiro | Cliente | "Tu pedido está listo en [sucursal]" |
| Pedido enviado | Cliente | Tracking + link de seguimiento |
| Pedido entregado | Cliente | Confirmación + invitación a valorar |
| Cita agendada | Cliente | Confirmación |
| Recordatorio cita | Cliente | 24h antes |
| Producto disponible | Cliente | Notificación de restock |
| Suscripción próxima | Cliente | 3 días antes del cobro |
| Pago fallido | Cliente | "No pudimos procesar tu pago" |
| Cotización enviada | Cliente B2B | PDF de cotización |
| Factura próxima a vencer | Cliente B2B | 7 días antes |
| Factura vencida | Cliente B2B | Día siguiente al vencimiento |
| Gift card recibida | Destinatario | Diseño + código + saldo |
| Estado de cuenta | Cliente B2B | Resumen mensual |
| Stock bajo | Admin | Producto bajo umbral |
| Nuevo pedido | Admin / Staff | Resumen del pedido recibido |
| Diferencia de caja | Admin | Cierre con diferencia ≠ 0 |
| Liquidación comisiones | Vendedor | Resumen mensual |

---

# Seguridad (modo demo)

- Validación server-side con zod en todas las API Routes.
- Sanitización del contenido editable (blog, descripciones).
- Tokens de pago "mock" nunca contienen datos reales (sólo IDs internos).
- Roles y permisos: cliente, vendedor, supervisor, admin.
- Logging interno de acciones sensibles (cambios de precio, ajustes de
  inventario, ajustes de wallet, anulación de DTE).
- Rate limiting básico en login y checkout.

Para producción real se sumarían HSTS, CSP, CSRF, Sentry, backups, etc., pero
no son parte de esta Fase 3 demo.

---

# Checklist de Entrega — Fase 3

### Bloque A — Cierre de venta
- [ ] Checkout completo simulado (carrito → pago → confirmación)
- [ ] `MockPaymentGateway` con WebPay, MercadoPago, transferencia, efectivo
- [ ] `MockCourierProvider` con tracking simulado
- [ ] Retiro en tienda integrado a vista staff
- [ ] Cuenta de usuario completa (pedidos, documentos, puntos, wallet,
      mascotas, direcciones, citas, suscripciones)
- [ ] Suscripciones / compra recurrente con cron simulable

### Bloque B — Capa financiera
- [ ] DTE simulados (boleta, factura, NC, ND) con PDF descargable
- [ ] Libro de ventas SII exportable
- [ ] Caja y arqueo con apertura/cierre y diferencia
- [ ] Cuentas por cobrar B2B con calendario y semáforo
- [ ] Cotizaciones convertibles a pedido
- [ ] Compras a proveedores y kardex valorizado (PEPS o promedio)
- [ ] Inventario valorizado y rotación
- [ ] Gastos operativos con recurrencia
- [ ] P&L mensual comparable
- [ ] Listas de precios por segmento
- [ ] Packs y combos
- [ ] Cupones avanzados y reglas de descuento por volumen
- [ ] Comisiones de vendedores con escalones y liquidación
- [ ] Wallet del cliente
- [ ] Gift cards (compra, canje, saldo parcial)
- [ ] Conciliación de pagos con generador local de cartola mock

### Bloque C — BI
- [ ] Dashboard financiero con margen, ticket, cash, embudo
- [ ] Reportes exportables a CSV (≥ 6 reportes)
- [ ] Punto de equilibrio configurable y alerta

### Bloque D — Operación física
- [ ] POS rápido en `/staff/venta` con emisión de DTE
- [ ] Marcar pedidos web como retirados
- [ ] Apertura / cierre de caja
- [ ] Reposición, traspaso y toma física
- [ ] Stubs de integraciones contables (Chipax, Defontana, SII, Buk)

### Calidad
- [ ] Tests unitarios de cálculos críticos (IVA, kardex, comisiones, P&L)
- [ ] Tests E2E del flujo de compra completo
- [ ] Tests E2E del flujo POS + cierre de caja
- [ ] Seed data realista en todos los módulos nuevos
- [ ] Documentación de cada `Mock*Provider` con instrucciones para
      reemplazarlo por una integración real
