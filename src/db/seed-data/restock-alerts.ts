import type { InferInsertModel } from "drizzle-orm";
import { restockAlerts } from "@/db/schema";

type NewRestockAlert = InferInsertModel<typeof restockAlerts>;

// Deterministic IDs and cancelTokens (never random at seed time for test repeatability).
// productId and variantId reference IDs from src/test/fixtures/index.ts.
export const seedRestockAlerts: NewRestockAlert[] = [
  // Row 1: Camila — pending alert on Royal Canin Medium Adult 15kg (out_of_stock in Maipú)
  {
    id: "restock-alert-1",
    email: "camila@demo.cl",
    userId: "user-camila-demo",
    productId: "rc-medium-adult",
    variantId: "rc-ma-15",
    storeIds: null,
    status: "pending",
    cancelToken: "cancel-token-restock-1",
    createdAt: new Date("2026-04-10T10:00:00.000Z"),
    firedAt: null,
    canceledAt: null,
  },

  // Row 2: Camila — fired alert (already notified, with firedAt set)
  {
    id: "restock-alert-2",
    email: "camila@demo.cl",
    userId: "user-camila-demo",
    productId: "hills-adult",
    variantId: "hl-ad-15",
    storeIds: null,
    status: "fired",
    cancelToken: "cancel-token-restock-2",
    createdAt: new Date("2026-03-01T09:00:00.000Z"),
    firedAt: new Date("2026-03-15T14:30:00.000Z"),
    canceledAt: null,
  },

  // Row 3: Camila — canceled alert
  {
    id: "restock-alert-3",
    email: "camila@demo.cl",
    userId: "user-camila-demo",
    productId: "rc-puppy-mini",
    variantId: "rc-mp-15",
    storeIds: null,
    status: "canceled",
    cancelToken: "cancel-token-restock-3",
    createdAt: new Date("2026-02-01T08:00:00.000Z"),
    firedAt: null,
    canceledAt: new Date("2026-02-05T11:00:00.000Z"),
  },

  // Row 4: Anonymous email — pending alert (userId=null)
  {
    id: "restock-alert-4",
    email: "lucia@example.com",
    userId: null,
    productId: "rc-medium-adult",
    variantId: "rc-ma-15",
    storeIds: null,
    status: "pending",
    cancelToken: "cancel-token-restock-4",
    createdAt: new Date("2026-04-12T15:00:00.000Z"),
    firedAt: null,
    canceledAt: null,
  },
];
