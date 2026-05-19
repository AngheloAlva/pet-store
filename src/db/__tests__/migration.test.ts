/**
 * Migration smoke test — runs all migrations from scratch on a fresh PGlite
 * instance and verifies the new tables from migration 0003 exist and work.
 */
import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

describe("migration 0003 — pets + points", () => {
  it("creates pets table and allows insert + retrieve", async () => {
    const db = await createTestDb();

    // Insert a user first (FK requirement)
    await db.insert(schema.users).values({
      id: "test-user-1",
      email: "test@test.cl",
      name: "Test User",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    });

    await db.insert(schema.pets).values({
      id: "pet-1",
      userId: "test-user-1",
      name: "Buddy",
      species: "dog",
      active: true,
    });

    const rows = await db.select().from(schema.pets).where(eq(schema.pets.id, "pet-1"));
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Buddy");
    expect(rows[0].active).toBe(true);
  });

  it("creates points_transactions with balanceAfter", async () => {
    const db = await createTestDb();

    await db.insert(schema.users).values({
      id: "test-user-2",
      email: "test2@test.cl",
      name: "Test User 2",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    });

    await db.insert(schema.pointsTransactions).values({
      id: "tx-1",
      userId: "test-user-2",
      deltaPoints: 500,
      balanceAfter: 500,
      kind: "purchase",
      description: "First purchase",
    });

    const rows = await db
      .select()
      .from(schema.pointsTransactions)
      .where(eq(schema.pointsTransactions.userId, "test-user-2"));

    expect(rows).toHaveLength(1);
    expect(rows[0].balanceAfter).toBe(500);
  });

  it("creates points_config singleton", async () => {
    const db = await createTestDb();

    await db.insert(schema.pointsConfig).values({
      id: "singleton",
    });

    const rows = await db.select().from(schema.pointsConfig);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("singleton");
    expect(rows[0].earnRatePerCLP).toBe(100);
    expect(rows[0].firstPurchaseBonus).toBe(500);
    expect(rows[0].petBirthdayBonus).toBe(200);
  });

  it("appointments.pet_id FK SET NULL on pet delete", async () => {
    const db = await createTestDb();

    await db.insert(schema.users).values({
      id: "test-user-fk",
      email: "fk@test.cl",
      name: "FK User",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    });

    // Insert a service and store first
    await db.insert(schema.stores).values({
      id: "store-fk",
      slug: "store-fk",
      name: "FK Store",
      address: "Test St",
      commune: "Test",
      phone: "+56900000000",
      lat: "0",
      lng: "0",
      schedule: {},
      services: [],
    });

    await db.insert(schema.services).values({
      id: "svc-fk",
      slug: "svc-fk",
      name: "FK Service",
      durationMin: 60,
      priceCents: 1000,
    });

    await db.insert(schema.pets).values({
      id: "pet-fk",
      userId: "test-user-fk",
      name: "FK Pet",
      species: "cat",
      active: true,
    });

    await db.insert(schema.appointments).values({
      id: "appt-fk",
      userId: "test-user-fk",
      petId: "pet-fk",
      petNameSnapshot: "FK Pet",
      serviceId: "svc-fk",
      storeId: "store-fk",
      startsAt: new Date("2026-05-20T10:00:00Z"),
      endsAt: new Date("2026-05-20T11:00:00Z"),
      status: "scheduled",
    });

    // Verify pet is linked
    const before = await db
      .select({ petId: schema.appointments.petId })
      .from(schema.appointments)
      .where(eq(schema.appointments.id, "appt-fk"));
    expect(before[0].petId).toBe("pet-fk");

    // Hard delete the pet — FK should SET NULL
    await db.delete(schema.pets).where(eq(schema.pets.id, "pet-fk"));

    const after = await db
      .select({ petId: schema.appointments.petId, snapshot: schema.appointments.petNameSnapshot })
      .from(schema.appointments)
      .where(eq(schema.appointments.id, "appt-fk"));

    expect(after).toHaveLength(1);
    expect(after[0].petId).toBeNull();
    expect(after[0].snapshot).toBe("FK Pet"); // snapshot preserved
  });
});

describe("migration 0006 — blog", () => {
  it("S-SCHEMA-2: blog_post_products CASCADE on product delete removes link, leaves post", async () => {
    const db = await createTestDb();

    await db.insert(schema.brands).values({
      id: "brand-cascade",
      slug: "brand-cascade",
      name: "Cascade Brand",
    });

    await db.insert(schema.products).values({
      id: "prod-cascade",
      slug: "prod-cascade",
      name: "Cascade Product",
      brandId: "brand-cascade",
      description: "Cascade product description",
      species: ["dog"],
    });

    await db.insert(schema.blogPosts).values({
      id: "post-cascade",
      slug: "post-cascade",
      title: "Cascade Post",
      excerpt: "Excerpt",
      bodyMarkdown: "Body",
      category: "cuidados",
      authorName: "Test",
      status: "published",
    });

    await db.insert(schema.blogPostProducts).values({
      postId: "post-cascade",
      productId: "prod-cascade",
    });

    const linksBefore = await db.select().from(schema.blogPostProducts);
    expect(linksBefore).toHaveLength(1);

    await db.delete(schema.products).where(eq(schema.products.id, "prod-cascade"));

    const linksAfter = await db.select().from(schema.blogPostProducts);
    expect(linksAfter).toHaveLength(0);

    const postAfter = await db
      .select()
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.id, "post-cascade"));
    expect(postAfter).toHaveLength(1);
    expect(postAfter[0].title).toBe("Cascade Post");
  });
});
