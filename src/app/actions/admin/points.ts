"use server";

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pointsTransactions, pointsConfig, pets } from "@/db/schema";
import { and, desc, eq, inArray, gte, sql } from "drizzle-orm";
import {
  sendDemoEmail,
  DEMO_EMAIL_TEMPLATE,
} from "@/lib/notifications/demo-email";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }
  return user;
}

// ---------------------------------------------------------------------------
// addPointsTransaction
// Balance correctness: read latest inside tx, compute new, insert with balanceAfter.
// ---------------------------------------------------------------------------
export async function addPointsTransaction(input: {
  userId: string;
  deltaPoints: number;
  description: string;
  kind?: string;
  referenceId?: string;
}): Promise<{ ok: true; balanceAfter: number } | { ok: false; error: string }> {
  const admin = await requireAdmin();

  if (!input.description || input.description.trim() === "") {
    return { ok: false, error: "Description is required" };
  }

  const kind = input.kind ?? "manual_adjustment";
  const id = `tx-${crypto.randomUUID()}`;

  const newBalance = await db.transaction(async (tx) => {
    const [prev] = await tx
      .select({ balance: pointsTransactions.balanceAfter })
      .from(pointsTransactions)
      .where(eq(pointsTransactions.userId, input.userId))
      .orderBy(desc(pointsTransactions.createdAt))
      .limit(1);

    const currentBalance = prev?.balance ?? 0;
    const newBalanceValue = currentBalance + input.deltaPoints;

    await tx.insert(pointsTransactions).values({
      id,
      userId: input.userId,
      deltaPoints: input.deltaPoints,
      balanceAfter: newBalanceValue,
      kind,
      referenceId: input.referenceId ?? null,
      description: input.description,
      createdBy: admin.id,
    });

    return newBalanceValue;
  });

  revalidatePath("/admin/puntos");

  // Best-effort email — errors are swallowed
  sendDemoEmail({
    to: input.userId,
    template: DEMO_EMAIL_TEMPLATE.POINTS_ADJUSTMENT,
    data: { deltaPoints: input.deltaPoints, balanceAfter: newBalance },
  }).catch((err) => console.warn("[demo-email] failed", err));

  return { ok: true, balanceAfter: newBalance };
}

// ---------------------------------------------------------------------------
// recordPresentialPurchase
// Atomic: read config + read prior + insert purchase + conditionally insert
// first_purchase_bonus — all in a SINGLE db.transaction.
// ---------------------------------------------------------------------------
export async function recordPresentialPurchase(input: {
  userId: string;
  amountCLP: number;
  description: string;
  storeId?: string;
}): Promise<
  | { ok: true; finalBalance: number; transactionIds: string[] }
  | { ok: false; error: string }
> {
  const admin = await requireAdmin();

  const { finalBalance, transactionIds } = await db.transaction(async (tx) => {
    // 1. Read config
    const [config] = await tx
      .select()
      .from(pointsConfig)
      .where(eq(pointsConfig.id, "singleton"))
      .limit(1);

    const earnRatePerCLP = config?.earnRatePerCLP ?? 100;
    const firstPurchaseBonusAmt = config?.firstPurchaseBonus ?? 500;

    // 2. Compute purchase points
    const purchasePoints = Math.floor(input.amountCLP / earnRatePerCLP);

    // 3. Read latest balance
    const [prevTx] = await tx
      .select({ balance: pointsTransactions.balanceAfter })
      .from(pointsTransactions)
      .where(eq(pointsTransactions.userId, input.userId))
      .orderBy(desc(pointsTransactions.createdAt))
      .limit(1);

    const currentBalance = prevTx?.balance ?? 0;

    // 4. Check for prior purchase (same tx for read-consistency)
    const priorPurchase = await tx
      .select({ id: pointsTransactions.id })
      .from(pointsTransactions)
      .where(
        and(
          eq(pointsTransactions.userId, input.userId),
          inArray(pointsTransactions.kind, ["purchase", "first_purchase_bonus"]),
        ),
      )
      .limit(1);

    const isFirst = priorPurchase.length === 0;
    const ids: string[] = [];

    // 5. Insert purchase tx
    const purchaseTxId = `tx-${crypto.randomUUID()}`;
    const purchaseBalance = currentBalance + purchasePoints;
    await tx.insert(pointsTransactions).values({
      id: purchaseTxId,
      userId: input.userId,
      deltaPoints: purchasePoints,
      balanceAfter: purchaseBalance,
      kind: "purchase",
      description: input.description,
      referenceId: input.storeId ?? null,
      createdBy: admin.id,
    });
    ids.push(purchaseTxId);

    let lastBalance = purchaseBalance;

    // 6. If first purchase, also insert first_purchase_bonus
    if (isFirst) {
      const bonusTxId = `tx-${crypto.randomUUID()}`;
      const bonusBalance = purchaseBalance + firstPurchaseBonusAmt;
      await tx.insert(pointsTransactions).values({
        id: bonusTxId,
        userId: input.userId,
        deltaPoints: firstPurchaseBonusAmt,
        balanceAfter: bonusBalance,
        kind: "first_purchase_bonus",
        description: "Bono primera compra",
        createdBy: admin.id,
      });
      ids.push(bonusTxId);
      lastBalance = bonusBalance;
    }

    return { finalBalance: lastBalance, transactionIds: ids };
  });

  revalidatePath("/admin/puntos");

  // Best-effort email
  sendDemoEmail({
    to: input.userId,
    template: DEMO_EMAIL_TEMPLATE.POINTS_ADJUSTMENT,
    data: { finalBalance, type: "purchase" },
  }).catch((err) => console.warn("[demo-email] failed", err));

  return { ok: true, finalBalance, transactionIds };
}

// ---------------------------------------------------------------------------
// triggerPetBirthdayBonuses
// Per-pet transactions. Idempotent: skip if already granted this year.
// ---------------------------------------------------------------------------
export async function triggerPetBirthdayBonuses(input?: {
  month?: number;
}): Promise<{ ok: true; granted: string[]; skipped: string[] }> {
  const admin = await requireAdmin();

  const targetMonth = input?.month ?? new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);

  // Get config for petBirthdayBonus amount
  const [config] = await db
    .select()
    .from(pointsConfig)
    .where(eq(pointsConfig.id, "singleton"));

  const bonusAmount = config?.petBirthdayBonus ?? 200;

  // Get active pets born in target month
  const eligiblePets = await db
    .select({ id: pets.id, userId: pets.userId })
    .from(pets)
    .where(
      and(
        eq(pets.active, true),
        sql`EXTRACT(MONTH FROM (${pets.birthDate})::date) = ${targetMonth}`,
      ),
    );

  const granted: string[] = [];
  const skipped: string[] = [];

  for (const pet of eligiblePets) {
    // Per-pet transaction for partial success on error
    await db.transaction(async (tx) => {
      // Check for existing bonus this year
      const [existing] = await tx
        .select({ id: pointsTransactions.id })
        .from(pointsTransactions)
        .where(
          and(
            eq(pointsTransactions.userId, pet.userId),
            eq(pointsTransactions.kind, "pet_birthday_bonus"),
            eq(pointsTransactions.referenceId, pet.id),
            gte(pointsTransactions.createdAt, startOfYear),
          ),
        )
        .limit(1);

      if (existing) {
        skipped.push(pet.id);
        return;
      }

      // Read latest balance
      const [prevTx] = await tx
        .select({ balance: pointsTransactions.balanceAfter })
        .from(pointsTransactions)
        .where(eq(pointsTransactions.userId, pet.userId))
        .orderBy(desc(pointsTransactions.createdAt))
        .limit(1);

      const currentBalance = prevTx?.balance ?? 0;
      const newBalance = currentBalance + bonusAmount;

      await tx.insert(pointsTransactions).values({
        id: `tx-${crypto.randomUUID()}`,
        userId: pet.userId,
        deltaPoints: bonusAmount,
        balanceAfter: newBalance,
        kind: "pet_birthday_bonus",
        referenceId: pet.id,
        description: `Bono cumpleaños mascota`,
        createdBy: admin.id,
      });

      granted.push(pet.id);
    });
  }

  revalidatePath("/admin/puntos");

  // Best-effort emails for granted pets
  for (const petId of granted) {
    const pet = eligiblePets.find((p) => p.id === petId);
    if (pet) {
      sendDemoEmail({
        to: pet.userId,
        template: DEMO_EMAIL_TEMPLATE.POINTS_ADJUSTMENT,
        data: { petId, type: "pet_birthday_bonus" },
      }).catch((err) => console.warn("[demo-email] failed", err));
    }
  }

  return { ok: true, granted, skipped };
}

// ---------------------------------------------------------------------------
// redeemPoints — stub only; real implementation ships with Phase 3 checkout
// ---------------------------------------------------------------------------
export async function redeemPoints(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _input?: { userId?: string; points?: number },
): Promise<{
  error: "not_implemented";
  message: "Redeem flow ships with Phase 3 checkout";
}> {
  return {
    error: "not_implemented",
    message: "Redeem flow ships with Phase 3 checkout",
  };
}
