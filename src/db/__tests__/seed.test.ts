import { vi, describe, it, expect } from "vitest";
import { db } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

// ---------------------------------------------------------------------------
// S-SEED-1: Seed is idempotent — running twice produces same row counts
// ---------------------------------------------------------------------------
describe("seed determinism", () => {
  it("S-SEED-1: running seed twice does not throw and returns stable row counts", async () => {
    // Track all insert calls
    const insertCalls: Array<{ table: string }> = [];

    let callIndex = 0;
    const createChain = () => {
      const chain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
      };
      return chain;
    };

    (db as AnyDb).insert = vi.fn(() => {
      callIndex++;
      const chain = createChain();
      insertCalls.push({ table: `table-${callIndex}` });
      return chain;
    });

    const { applySeed } = await import("@/db/seed");

    // Run once — should not throw
    await expect(applySeed(db as AnyDb)).resolves.not.toThrow();

    const countAfterFirst = insertCalls.length;

    // Run again — should not throw and produce the same number of insert calls
    await expect(applySeed(db as AnyDb)).resolves.not.toThrow();

    const countAfterSecond = insertCalls.length;

    // Each run produces the same number of inserts
    expect(countAfterSecond - countAfterFirst).toBe(countAfterFirst);
  });

  it("seed data files export non-empty arrays", async () => {
    const { seedServices } = await import("@/db/seed-data/services");
    const { seedScheduleConfigs, seedBlockedSlots } = await import("@/db/seed-data/schedule-configs");
    const { seedAppointments } = await import("@/db/seed-data/appointments");
    const { seedDemoEmails } = await import("@/db/seed-data/demo-emails");
    const { seedRestockAlerts } = await import("@/db/seed-data/restock-alerts");

    expect(seedServices.length).toBeGreaterThanOrEqual(3);
    expect(seedScheduleConfigs.length).toBeGreaterThan(0);
    expect(seedBlockedSlots.length).toBeGreaterThan(0);
    expect(seedAppointments.length).toBeGreaterThanOrEqual(8);
    expect(seedDemoEmails.length).toBe(5);
    expect(seedRestockAlerts.length).toBe(4);
  });

  it("S-SEED-1: demo emails seed has 5 rows with expected types for Camila", async () => {
    const { seedDemoEmails } = await import("@/db/seed-data/demo-emails");
    const types = seedDemoEmails.map((e) => e.type);
    expect(types).toContain("welcome");
    expect(types).toContain("appointment_confirmation");
    expect(types).toContain("points_adjustment");
    expect(types).toContain("restock_alert");
    expect(types).toContain("appointment_canceled");
    // All rows for Camila
    expect(seedDemoEmails.every((e) => e.toEmail === "camila@demo.cl")).toBe(true);
  });

  it("S-SEED-1: restock_alerts has expected status distribution", async () => {
    const { seedRestockAlerts } = await import("@/db/seed-data/restock-alerts");

    const statuses = seedRestockAlerts.map((a) => a.status);
    // At least 1 pending row with Camila's userId
    const pendingCamila = seedRestockAlerts.filter(
      (a) => a.status === "pending" && a.userId === "user-camila-demo",
    );
    expect(pendingCamila.length).toBeGreaterThanOrEqual(1);

    // At least 1 canceled row
    expect(statuses).toContain("canceled");

    // At least 1 pending row with userId=null (anonymous)
    const pendingAnon = seedRestockAlerts.filter(
      (a) => a.status === "pending" && a.userId === null,
    );
    expect(pendingAnon.length).toBeGreaterThanOrEqual(1);

    // All IDs are deterministic (not random UUIDs) — fixed strings
    const allDeterministic = seedRestockAlerts.every((a) => a.id.startsWith("restock-alert-"));
    expect(allDeterministic).toBe(true);
  });

  it("seed data has fixed IDs (deterministic)", async () => {
    const { seedServices } = await import("@/db/seed-data/services");
    const { seedAppointments } = await import("@/db/seed-data/appointments");

    // IDs should be stable strings (not random UUIDs)
    expect(seedServices[0].id).toBe("svc-bath-trim");
    expect(seedAppointments.find((a) => a.id === "appt-camila-upcoming")).toBeDefined();
    expect(seedAppointments.find((a) => a.id === "appt-camila-past")).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // S-SEED-1 Blog posts seed
  // ---------------------------------------------------------------------------
  it("S-SEED-1: blog posts seed has 10 rows", async () => {
    const { seedBlogPosts } = await import("@/db/seed-data/blog-posts");
    expect(seedBlogPosts.length).toBe(10);
  });

  it("S-SEED-1: status distribution — 8 published, 2 draft", async () => {
    const { seedBlogPosts } = await import("@/db/seed-data/blog-posts");
    const published = seedBlogPosts.filter((p) => p.status === "published");
    const drafts = seedBlogPosts.filter((p) => p.status === "draft");
    expect(published.length).toBe(8);
    expect(drafts.length).toBe(2);
  });

  it("S-SEED-1: blog_post_products has between 16 and 24 rows", async () => {
    const { seedBlogPostProducts } = await import("@/db/seed-data/blog-posts");
    expect(seedBlogPostProducts.length).toBeGreaterThanOrEqual(16);
    expect(seedBlogPostProducts.length).toBeLessThanOrEqual(24);
  });

  it("S-SEED-1: all blog post IDs are deterministic", async () => {
    const { seedBlogPosts } = await import("@/db/seed-data/blog-posts");
    const allDeterministic = seedBlogPosts.every((p) => p.id.startsWith("blog-post-"));
    expect(allDeterministic).toBe(true);
  });

  // T-32: Demo subscriptions for camila-demo
  it("T-32: demo subscriptions data exports at least 2 rows for camila-demo", async () => {
    const { demoSubscriptions } = await import("@/db/seed-data/demo-subscriptions");
    expect(demoSubscriptions.length).toBeGreaterThanOrEqual(2);
    const allForCamila = demoSubscriptions.every((s) => s.userId === "user-camila-demo");
    expect(allForCamila).toBe(true);
  });

  it("T-32: demo subscriptions include at least 1 active and 1 paused", async () => {
    const { demoSubscriptions } = await import("@/db/seed-data/demo-subscriptions");
    const hasActive = demoSubscriptions.some((s) => s.status === "active");
    const hasPaused = demoSubscriptions.some((s) => s.status === "paused");
    expect(hasActive).toBe(true);
    expect(hasPaused).toBe(true);
  });

  it("T-32: demo subscriptions have deterministic IDs", async () => {
    const { demoSubscriptions } = await import("@/db/seed-data/demo-subscriptions");
    const allDeterministic = demoSubscriptions.every((s) => s.id.startsWith("sub-camila-"));
    expect(allDeterministic).toBe(true);
  });
});
