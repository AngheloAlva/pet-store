import { vi, describe, it, expect, beforeEach } from "vitest";

const TEST_SECRET = "test-secret-32-chars-min-padded-12345678901234567890";

// Must run before module initialization — vi.stubEnv is hoisted by Vitest
// when called at the module's top level before any imports that use the env var.
// We use vi.hoisted to guarantee execution before the session module loads.
const { stubEnvSetup } = vi.hoisted(() => {
  process.env.SESSION_SECRET = "test-secret-32-chars-min-padded-12345678901234567890";
  return { stubEnvSetup: true };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

import { cookies } from "next/headers";
import { db } from "@/db";
import { signSession, verifySession, getCurrentUser } from "./session";
import type { SessionPayload } from "@/types/session";

void stubEnvSetup; // reference to prevent tree-shaking

// ---------------------------------------------------------------------------
// signSession / verifySession
// ---------------------------------------------------------------------------

describe("signSession / verifySession — crypto round-trip", () => {
  const validPayload: SessionPayload = {
    uid: "user-test-001",
    role: "customer",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };

  it("1. round-trip: signSession → verifySession returns same payload", async () => {
    const token = await signSession(validPayload);
    const result = await verifySession(token);
    expect(result).not.toBeNull();
    expect(result?.uid).toBe(validPayload.uid);
    expect(result?.role).toBe(validPayload.role);
    expect(result?.exp).toBe(validPayload.exp);
  });

  it("2. tampered signature segment → verifySession returns null", async () => {
    const token = await signSession(validPayload);
    const [data] = token.split(".");
    const tamperedToken = `${data}.invalidsignatureXXXXXXXXXXXXXXXXXXXXXXXXXXXX`;
    const result = await verifySession(tamperedToken);
    expect(result).toBeNull();
  });

  it("3. expired exp → verifySession returns null", async () => {
    const expiredPayload: SessionPayload = {
      uid: "user-expired",
      role: "customer",
      exp: Math.floor(Date.now() / 1000) - 10,
    };
    const token = await signSession(expiredPayload);
    const result = await verifySession(token);
    expect(result).toBeNull();
  });

  it("4. empty string token → verifySession returns null (no throw)", async () => {
    const result = await verifySession("");
    expect(result).toBeNull();
  });

  it("5. malformed token (no dot) → verifySession returns null (no throw)", async () => {
    const result = await verifySession("nodotsinhere");
    expect(result).toBeNull();
  });

  it("6. exp boundary: token at exactly now → verifySession returns null (expired)", async () => {
    const now = Math.floor(Date.now() / 1000);
    const boundaryPayload: SessionPayload = {
      uid: "user-boundary",
      role: "admin",
      exp: now,
    };
    const token = await signSession(boundaryPayload);
    // Brief wait to ensure Date.now() > exp*1000
    await new Promise((r) => setTimeout(r, 1010));
    const result = await verifySession(token);
    expect(result).toBeNull();
  });

  it("7. role round-trip: signed payload role matches what was passed in", async () => {
    const adminPayload: SessionPayload = {
      uid: "user-admin-001",
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = await signSession(adminPayload);
    const result = await verifySession(token);
    expect(result?.role).toBe("admin");
  });
});

// ---------------------------------------------------------------------------
// getCurrentUser
// ---------------------------------------------------------------------------

describe("getCurrentUser — five branches", () => {
  const validPayload: SessionPayload = {
    uid: "user-test-001",
    role: "customer",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const mockUser = {
    id: "user-test-001",
    email: "test@demo.cl",
    name: "Test User",
    rut: null,
    phone: null,
    role: "customer" as const,
    storeId: null,
    isDemoSeed: false,
    createdAt: "2026-01-15T10:00:00.000Z",
  };

  beforeEach(() => {
    vi.mocked(db.query.users.findFirst).mockReset();
    vi.mocked(cookies).mockReset();
  });

  it("A. no cookie → getCurrentUser() returns null", async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("B. valid cookie + user exists in DB → returns SessionUser", async () => {
    const token = await signSession(validPayload);

    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue({ value: token }),
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(mockUser);

    const result = await getCurrentUser();
    expect(result).not.toBeNull();
    expect(result?.id).toBe("user-test-001");
    expect(result?.email).toBe("test@demo.cl");
    expect(result?.role).toBe("customer");
  });

  it("C. valid cookie + user NOT in DB → returns null", async () => {
    const token = await signSession(validPayload);

    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue({ value: token }),
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("D. expired cookie → returns null", async () => {
    const expiredPayload: SessionPayload = {
      uid: "user-expired",
      role: "customer",
      exp: Math.floor(Date.now() / 1000) - 10,
    };
    const token = await signSession(expiredPayload);

    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue({ value: token }),
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("E. tampered cookie → returns null", async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue({ value: "tampered.invalidsig" }),
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });
});
