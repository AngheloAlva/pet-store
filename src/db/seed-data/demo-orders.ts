/**
 * Demo orders for user-camila-demo — F3.4 DEMO-1
 *
 * Creates 3 orders so Mis Pedidos is non-empty in demo/QA environments.
 * Deterministic IDs: order-demo-001, order-demo-002, order-demo-003.
 * Idempotent: onConflictDoUpdate on each table (mirrors seed.ts convention).
 *
 * Orders:
 *   001 — completed + paid + mock_chilexpress shipment with tracking
 *   002 — pending_verification + transfer_mock (awaiting payment confirmation)
 *   003 — confirmed + pickup (retiro en tienda)
 */

import type { InferInsertModel } from "drizzle-orm";
import {
  checkoutSessions,
  orders,
  orderItems,
  shipments,
} from "@/db/schema";

type NewCheckoutSession = InferInsertModel<typeof checkoutSessions>;
type NewOrder = InferInsertModel<typeof orders>;
type NewOrderItem = InferInsertModel<typeof orderItems>;
type NewShipment = InferInsertModel<typeof shipments>;

const CAMILA_USER_ID = "user-camila-demo";

// Deterministic expiry far in the future (completed sessions)
const PAST_EXPIRY = new Date("2026-02-01T00:00:00.000Z");

const SHARED_ADDRESS = {
  street: "Av. Las Condes 8500",
  commune: "Las Condes",
  region: "Región Metropolitana",
  name: "Camila Rojas",
  phone: "+56 9 8123 4567",
};

// ---------------------------------------------------------------------------
// Checkout sessions (required by orders FK)
// ---------------------------------------------------------------------------
export const demoCheckoutSessions: NewCheckoutSession[] = [
  {
    id: "cs-demo-001",
    userId: CAMILA_USER_ID,
    idempotencyKey: "demo-checkout-001",
    cartSnapshot: [{ productId: "rc-medium-adult", variantId: "rc-ma-8", quantity: 2 }],
    address: SHARED_ADDRESS,
    shippingOptionId: "standard",
    shippingCost: 2990,
    status: "completed",
    paymentGateway: "webpay_mock",
    paymentMetadata: { token: "WEBPAY-DEMO-001", result: "approved" },
    deliveryType: "delivery",
    pickupStoreId: null,
    dispatchSlot: null,
    expiresAt: PAST_EXPIRY,
    createdAt: new Date("2026-02-10T14:00:00.000Z"),
  },
  {
    id: "cs-demo-002",
    userId: CAMILA_USER_ID,
    idempotencyKey: "demo-checkout-002",
    cartSnapshot: [{ productId: "proplan-adult-complete", variantId: "pp-ac-3", quantity: 1 }],
    address: SHARED_ADDRESS,
    shippingOptionId: "standard",
    shippingCost: 2990,
    status: "completed",
    paymentGateway: "transfer_mock",
    paymentMetadata: {
      bankName: "Banco Demo",
      accountNumber: "12345678",
      reference: "TRANSFER-DEMO-002",
    },
    deliveryType: "delivery",
    pickupStoreId: null,
    dispatchSlot: null,
    expiresAt: PAST_EXPIRY,
    createdAt: new Date("2026-03-05T10:00:00.000Z"),
  },
  {
    id: "cs-demo-003",
    userId: CAMILA_USER_ID,
    idempotencyKey: "demo-checkout-003",
    cartSnapshot: [{ productId: "hills-adult", variantId: "hl-ad-2", quantity: 3 }],
    address: SHARED_ADDRESS,
    shippingOptionId: "pickup",
    shippingCost: 0,
    status: "completed",
    paymentGateway: "webpay_mock",
    paymentMetadata: { token: "WEBPAY-DEMO-003", result: "approved" },
    deliveryType: "pickup",
    pickupStoreId: "providencia",
    dispatchSlot: null,
    expiresAt: PAST_EXPIRY,
    createdAt: new Date("2026-04-01T11:00:00.000Z"),
  },
];

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export const demoOrders: NewOrder[] = [
  {
    id: "order-demo-001",
    orderNumber: "PET-DEMO-001",
    userId: CAMILA_USER_ID,
    checkoutSessionId: "cs-demo-001",
    status: "completed",
    paymentStatus: "paid",
    paymentGateway: "webpay_mock",
    paymentMetadata: { token: "WEBPAY-DEMO-001", result: "approved" },
    gatewayToken: "WEBPAY-DEMO-001",
    address: SHARED_ADDRESS,
    shippingOptionId: "standard",
    shippingCost: 2990,
    subtotal: 99980,
    discountTotal: 0,
    walletDiscount: 0,
    total: 102970,
    couponCode: null,
    pointsRedeemed: 0,
    pointsEarned: 103,
    createdAt: new Date("2026-02-10T14:05:00.000Z"),
    updatedAt: new Date("2026-02-12T09:00:00.000Z"),
  },
  {
    id: "order-demo-002",
    orderNumber: "PET-DEMO-002",
    userId: CAMILA_USER_ID,
    checkoutSessionId: "cs-demo-002",
    status: "pending_verification",
    paymentStatus: "pending",
    paymentGateway: "transfer_mock",
    paymentMetadata: {
      bankName: "Banco Demo",
      accountNumber: "12345678",
      reference: "TRANSFER-DEMO-002",
    },
    gatewayToken: null,
    address: SHARED_ADDRESS,
    shippingOptionId: "standard",
    shippingCost: 2990,
    subtotal: 22990,
    discountTotal: 0,
    walletDiscount: 0,
    total: 25980,
    couponCode: null,
    pointsRedeemed: 0,
    pointsEarned: 0,
    createdAt: new Date("2026-03-05T10:05:00.000Z"),
    updatedAt: new Date("2026-03-05T10:05:00.000Z"),
  },
  {
    id: "order-demo-003",
    orderNumber: "PET-DEMO-003",
    userId: CAMILA_USER_ID,
    checkoutSessionId: "cs-demo-003",
    status: "confirmed",
    paymentStatus: "paid",
    paymentGateway: "webpay_mock",
    paymentMetadata: { token: "WEBPAY-DEMO-003", result: "approved" },
    gatewayToken: "WEBPAY-DEMO-003",
    address: SHARED_ADDRESS,
    shippingOptionId: "pickup",
    shippingCost: 0,
    subtotal: 59970,
    discountTotal: 0,
    walletDiscount: 0,
    total: 59970,
    couponCode: null,
    pointsRedeemed: 0,
    pointsEarned: 60,
    createdAt: new Date("2026-04-01T11:05:00.000Z"),
    updatedAt: new Date("2026-04-01T11:05:00.000Z"),
  },
];

// ---------------------------------------------------------------------------
// Order items
// ---------------------------------------------------------------------------
export const demoOrderItems: NewOrderItem[] = [
  // Order 001 — Royal Canin Medium Adult 8kg × 2
  {
    id: "oi-demo-001-1",
    orderId: "order-demo-001",
    productId: "rc-medium-adult",
    variantId: "rc-ma-8",
    sku: "RC-MA-8KG",
    name: "Royal Canin Medium Adult 8 kg",
    quantity: 2,
    unitPrice: 49990,
    lineTotal: 99980,
  },
  // Order 002 — Pro Plan Adult Complete 3kg × 1
  {
    id: "oi-demo-002-1",
    orderId: "order-demo-002",
    productId: "proplan-adult-complete",
    variantId: "pp-ac-3",
    sku: "PP-AC-3KG",
    name: "Pro Plan Adult Complete 3 kg",
    quantity: 1,
    unitPrice: 22990,
    lineTotal: 22990,
  },
  // Order 003 — Hill's Science Diet Adult 2kg × 3
  {
    id: "oi-demo-003-1",
    orderId: "order-demo-003",
    productId: "hills-adult",
    variantId: "hl-ad-2",
    sku: "HL-AD-2KG",
    name: "Hill's Science Diet Adult 2 kg",
    quantity: 3,
    unitPrice: 19990,
    lineTotal: 59970,
  },
];

// ---------------------------------------------------------------------------
// Shipments (only for completed order-demo-001)
// ---------------------------------------------------------------------------
export const demoShipments: NewShipment[] = [
  {
    id: "ship-demo-001",
    orderId: "order-demo-001",
    carrier: "mock_chilexpress",
    status: "entregado",
    trackingNumber: "CHILEXPRESS-DEMO-001",
    metadata: {
      estimatedDelivery: "2026-02-13",
      events: [
        { date: "2026-02-10", status: "preparando", description: "Pedido en preparación" },
        { date: "2026-02-11", status: "despachado", description: "Paquete despachado a courier" },
        { date: "2026-02-12", status: "en_ruta", description: "En ruta hacia destino" },
        { date: "2026-02-12", status: "entregado", description: "Entregado exitosamente" },
      ],
    },
    createdAt: new Date("2026-02-10T15:00:00.000Z"),
    updatedAt: new Date("2026-02-12T09:00:00.000Z"),
  },
];
