/**
 * Session repo — F3.1
 * CRUD for checkout_sessions with TTL enforcement and one-active-per-user rule.
 */
import { and, eq } from "drizzle-orm";
import { checkoutSessions } from "@/db/schema";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type * as schema from "@/db/schema";

type Db = PgliteDatabase<typeof schema>;

export const SESSION_TTL_MINUTES = 30;

export interface CreateSessionInput {
  id: string;
  userId: string;
  idempotencyKey: string;
  cartSnapshot: unknown;
}

export interface CheckoutSession {
  id: string;
  userId: string;
  idempotencyKey: string;
  cartSnapshot: unknown;
  address: unknown | null;
  shippingOptionId: string | null;
  shippingCost: number | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Creates a new checkout session.
 * Expires any existing active session for the same user before inserting.
 */
export async function createSession(
  db: Db,
  input: CreateSessionInput,
): Promise<CheckoutSession> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MINUTES * 60 * 1000);

  // Expire any existing active sessions for this user
  await db
    .update(checkoutSessions)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(checkoutSessions.userId, input.userId),
        eq(checkoutSessions.status, "active"),
      ),
    );

  // Insert the new session
  await db.insert(checkoutSessions).values({
    id: input.id,
    userId: input.userId,
    idempotencyKey: input.idempotencyKey,
    cartSnapshot: input.cartSnapshot as Record<string, unknown>[],
    status: "active",
    expiresAt,
  });

  const rows = await db
    .select()
    .from(checkoutSessions)
    .where(eq(checkoutSessions.id, input.id));

  const row = rows[0];
  return mapRow(row);
}

/**
 * Gets the active (non-expired) session for a user, or null.
 */
export async function getActiveSession(
  db: Db,
  userId: string,
): Promise<CheckoutSession | null> {
  const now = new Date();

  const rows = await db
    .select()
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.userId, userId),
        eq(checkoutSessions.status, "active"),
      ),
    );

  // Filter out TTL-expired sessions
  const active = rows.filter((r) => r.expiresAt > now);
  if (active.length === 0) return null;

  return mapRow(active[0]);
}

/**
 * Gets a session by id for a specific user.
 * Returns null if not found or expired.
 */
export async function getSession(
  db: Db,
  sessionId: string,
  userId: string,
): Promise<CheckoutSession | null> {
  const now = new Date();

  const rows = await db
    .select()
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.id, sessionId),
        eq(checkoutSessions.userId, userId),
      ),
    );

  if (rows.length === 0) return null;

  const row = rows[0];

  // Check TTL
  if (row.expiresAt <= now) {
    return null;
  }

  return mapRow(row);
}

/**
 * Updates session fields (address, shippingOptionId, shippingCost, status).
 */
export async function updateSession(
  db: Db,
  sessionId: string,
  updates: Partial<{
    address: unknown;
    shippingOptionId: string;
    shippingCost: number;
    status: string;
    gatewayToken: string;
  }>,
): Promise<void> {
  const now = new Date();
  await db
    .update(checkoutSessions)
    .set({ ...updates, updatedAt: now } as Record<string, unknown>)
    .where(eq(checkoutSessions.id, sessionId));
}

/**
 * Expires a session by id.
 */
export async function expireSession(db: Db, sessionId: string): Promise<void> {
  await db
    .update(checkoutSessions)
    .set({ status: "expired", updatedAt: new Date() })
    .where(eq(checkoutSessions.id, sessionId));
}

function mapRow(row: typeof checkoutSessions.$inferSelect): CheckoutSession {
  return {
    id: row.id,
    userId: row.userId,
    idempotencyKey: row.idempotencyKey,
    cartSnapshot: row.cartSnapshot,
    address: row.address,
    shippingOptionId: row.shippingOptionId,
    shippingCost: row.shippingCost,
    status: row.status,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
