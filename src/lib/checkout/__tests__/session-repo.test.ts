/**
 * Task 3.11 RED — Session repo test.
 * Create session, expire existing active session on new create,
 * TTL-expired session returns null.
 */
import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "@/db/schema";

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

describe("session-repo", () => {
  it("createSession inserts a new checkout session", async () => {
    const db = await createTestDb();
    const { createSession } = await import("@/lib/checkout/session-repo");

    await db.insert(schema.users).values({
      id: "user-sr-1",
      email: "sr@test.cl",
      name: "SR User",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    });

    const session = await createSession(db, {
      id: "sess-sr-1",
      userId: "user-sr-1",
      idempotencyKey: "idem-sr-1",
      cartSnapshot: [{ variantId: "v1", quantity: 1 }],
    });

    expect(session.id).toBe("sess-sr-1");
    expect(session.status).toBe("active");
    expect(session.userId).toBe("user-sr-1");
  });

  it("createSession expires prior active session for same user", async () => {
    const db = await createTestDb();
    const { createSession, getActiveSession } = await import("@/lib/checkout/session-repo");

    await db.insert(schema.users).values({
      id: "user-sr-2",
      email: "sr2@test.cl",
      name: "SR User 2",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    });

    // Create first session
    await createSession(db, {
      id: "sess-sr-first",
      userId: "user-sr-2",
      idempotencyKey: "idem-sr-first",
      cartSnapshot: [],
    });

    // Create second session — should expire the first
    await createSession(db, {
      id: "sess-sr-second",
      userId: "user-sr-2",
      idempotencyKey: "idem-sr-second",
      cartSnapshot: [],
    });

    // The active session for user should be the second one
    const active = await getActiveSession(db, "user-sr-2");
    expect(active?.id).toBe("sess-sr-second");
  });

  it("getActiveSession returns null for TTL-expired session", async () => {
    const db = await createTestDb();
    const { getActiveSession } = await import("@/lib/checkout/session-repo");

    await db.insert(schema.users).values({
      id: "user-sr-3",
      email: "sr3@test.cl",
      name: "SR User 3",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    });

    // Insert session with expiresAt in the past
    const pastExpiry = new Date(Date.now() - 1000);
    await db.insert(schema.checkoutSessions).values({
      id: "sess-expired",
      userId: "user-sr-3",
      idempotencyKey: "idem-expired",
      cartSnapshot: [],
      status: "active",
      expiresAt: pastExpiry,
    });

    const active = await getActiveSession(db, "user-sr-3");
    expect(active).toBeNull();
  });
});
