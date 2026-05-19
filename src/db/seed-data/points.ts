import type { InferInsertModel } from "drizzle-orm";
import { pointsConfig, pointsTransactions } from "@/db/schema";

type NewPointsConfig = InferInsertModel<typeof pointsConfig>;
type NewPointsTransaction = InferInsertModel<typeof pointsTransactions>;

// ---------------------------------------------------------------------------
// points_config singleton
// ---------------------------------------------------------------------------
export const seedPointsConfig: NewPointsConfig = {
  id: "singleton",
  earnRatePerCLP: 100,
  redeemValuePerPoint: 1,
  minRedeemPoints: 500,
  firstPurchaseBonus: 500,
  petBirthdayBonus: 200,
  expirationMonths: null,
  active: true,
};

// ---------------------------------------------------------------------------
// Camila's 9 transactions — ending at balanceAfter = 2500
// Deterministic ISO timestamps
// ---------------------------------------------------------------------------
export const seedPointsTransactions: NewPointsTransaction[] = [
  // 1. Primera compra presencial
  {
    id: "ptx-camila-1",
    userId: "user-camila-demo",
    deltaPoints: 500,
    balanceAfter: 500,
    kind: "purchase",
    referenceId: "providencia",
    description: "Compra presencial — alimento premium",
    createdBy: "user-admin-demo",
    createdAt: new Date("2026-01-20T10:00:00.000Z"),
  },
  // 2. Bono primera compra
  {
    id: "ptx-camila-2",
    userId: "user-camila-demo",
    deltaPoints: 500,
    balanceAfter: 1000,
    kind: "first_purchase_bonus",
    referenceId: null,
    description: "Bono primera compra",
    createdBy: "user-admin-demo",
    createdAt: new Date("2026-01-20T10:00:01.000Z"),
  },
  // 3. Segunda compra
  {
    id: "ptx-camila-3",
    userId: "user-camila-demo",
    deltaPoints: 350,
    balanceAfter: 1350,
    kind: "purchase",
    referenceId: "las-condes",
    description: "Compra presencial — accesorios",
    createdBy: "user-admin-demo",
    createdAt: new Date("2026-02-05T10:00:00.000Z"),
  },
  // 4. Bono cumpleaños Tobi (marzo 2026)
  {
    id: "ptx-camila-4",
    userId: "user-camila-demo",
    deltaPoints: 200,
    balanceAfter: 1550,
    kind: "pet_birthday_bonus",
    referenceId: "pet-tobi-camila",
    description: "Bono cumpleaños mascota",
    createdBy: "user-admin-demo",
    createdAt: new Date("2026-03-12T10:00:00.000Z"),
  },
  // 5. Tercera compra
  {
    id: "ptx-camila-5",
    userId: "user-camila-demo",
    deltaPoints: 350,
    balanceAfter: 1900,
    kind: "purchase",
    referenceId: "providencia",
    description: "Compra presencial — snacks y juguetes",
    createdBy: "user-admin-demo",
    createdAt: new Date("2026-03-20T10:00:00.000Z"),
  },
  // 6. Ajuste manual positivo
  {
    id: "ptx-camila-6",
    userId: "user-camila-demo",
    deltaPoints: 200,
    balanceAfter: 2100,
    kind: "manual_adjustment",
    referenceId: null,
    description: "Compensación por error en caja",
    createdBy: "user-admin-demo",
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
  },
  // 7. Cuarta compra
  {
    id: "ptx-camila-7",
    userId: "user-camila-demo",
    deltaPoints: 350,
    balanceAfter: 2450,
    kind: "purchase",
    referenceId: "las-condes",
    description: "Compra presencial — alimento veterinario",
    createdBy: "user-admin-demo",
    createdAt: new Date("2026-04-15T10:00:00.000Z"),
  },
  // 8. Ajuste negativo
  {
    id: "ptx-camila-8",
    userId: "user-camila-demo",
    deltaPoints: -150,
    balanceAfter: 2300,
    kind: "manual_adjustment",
    referenceId: null,
    description: "Corrección por duplicado",
    createdBy: "user-admin-demo",
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
  },
  // 9. Bono cumpleaños extra
  {
    id: "ptx-camila-9",
    userId: "user-camila-demo",
    deltaPoints: 200,
    balanceAfter: 2500,
    kind: "pet_birthday_bonus",
    referenceId: "pet-tobi-camila",
    description: "Bono cumpleaños mascota — recordatorio",
    createdBy: "user-admin-demo",
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
  },
];
