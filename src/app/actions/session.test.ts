import { vi, describe, it, expect, beforeEach } from "vitest";

// Ensure SESSION_SECRET is set before session module loads
vi.hoisted(() => {
  process.env.SESSION_SECRET = "test-secret-32-chars-min-padded-12345678901234567890";
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  signSession: vi.fn(async () => "mock.token"),
  SESSION_COOKIE_NAME: "sp_session",
  setSessionCookie: vi.fn(async () => {}),
  clearSessionCookie: vi.fn(async () => {}),
  verifySession: vi.fn(async () => null),
  getCurrentUser: vi.fn(async () => null),
}));

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { switchPersona, clearSession, createDemoAccount } from "./session";

describe("switchPersona", () => {
  beforeEach(() => {
    vi.mocked(db.query.users.findFirst).mockReset();
    vi.mocked(cookies).mockReset();
    vi.mocked(revalidatePath).mockReset();
  });

  it("happy path → cookie set, returns { ok: true }", async () => {
    const mockSet = vi.fn();
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn(),
      set: mockSet,
      delete: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "user-camila-demo",
      email: "camila@demo.cl",
      name: "Camila Rojas",
      rut: null,
      phone: null,
      role: "customer",
      storeId: null,
      isDemoSeed: true,
      createdAt: "2026-01-15T10:00:00.000Z",
    });

    const fd = new FormData();
    fd.set("email", "camila@demo.cl");
    const result = await switchPersona(fd);

    expect(result).toEqual({ ok: true });
    expect(mockSet).toHaveBeenCalledWith("sp_session", "mock.token", expect.any(Object));
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("unknown email → { ok: false, error: 'user_not_found' }, no cookie set", async () => {
    const mockSet = vi.fn();
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn(),
      set: mockSet,
      delete: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);

    const fd = new FormData();
    fd.set("email", "unknown@demo.cl");
    const result = await switchPersona(fd);

    expect(result).toEqual({ ok: false, error: "user_not_found" });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("invalid input (bad email format) → { ok: false, error: 'invalid_input' }", async () => {
    const fd = new FormData();
    fd.set("email", "not-an-email");
    const result = await switchPersona(fd);

    expect(result).toEqual({ ok: false, error: "invalid_input" });
  });
});

describe("clearSession", () => {
  beforeEach(() => {
    vi.mocked(cookies).mockReset();
    vi.mocked(revalidatePath).mockReset();
  });

  it("calls cookies().delete('sp_session') and revalidatePath('/')", async () => {
    const mockDelete = vi.fn();
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn(),
      set: vi.fn(),
      delete: mockDelete,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await clearSession();

    expect(mockDelete).toHaveBeenCalledWith("sp_session");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});

describe("createDemoAccount", () => {
  beforeEach(() => {
    vi.mocked(db.query.users.findFirst).mockReset();
    vi.mocked(cookies).mockReset();
    // Reset insert mock
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn(async () => ({})),
    } as unknown as ReturnType<typeof db.insert>);
  });

  it("duplicate email → { ok: false, error: 'email_taken' }", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "user-camila-demo",
      email: "camila@demo.cl",
      name: "Camila Rojas",
      rut: null,
      phone: null,
      role: "customer",
      storeId: null,
      isDemoSeed: true,
      createdAt: "2026-01-15T10:00:00.000Z",
    });

    const fd = new FormData();
    fd.set("name", "Test User");
    fd.set("email", "camila@demo.cl");
    const result = await createDemoAccount(fd);

    expect(result).toMatchObject({ ok: false, error: "email_taken" });
  });
});
