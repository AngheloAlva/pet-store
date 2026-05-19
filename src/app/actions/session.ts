"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { USER_ROLES } from "@/db/schema";
import type { UserRole } from "@/types/session";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
};

const switchSchema = z.object({ email: z.string().email() });
const createSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
});

// ---------------------------------------------------------------------------
// switchPersona
// ---------------------------------------------------------------------------
export async function switchPersona(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: "invalid_input" | "user_not_found" }> {
  const parsed = switchSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });
  if (!user) return { ok: false, error: "user_not_found" };

  const token = await signSession({
    uid: user.id,
    role: user.role as UserRole,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, cookieOptions);
  revalidatePath("/");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// clearSession
// ---------------------------------------------------------------------------
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// createDemoAccount
// ---------------------------------------------------------------------------
type CreateDemoResult =
  | { ok: true }
  | { ok: false; error: "invalid_input"; issues: z.ZodFormattedError<{ name: string; email: string }> }
  | { ok: false; error: "email_taken" };

export async function createDemoAccount(formData: FormData): Promise<CreateDemoResult> {
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      issues: parsed.error.format(),
    };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });
  if (existing) return { ok: false, error: "email_taken" };

  const id = crypto.randomUUID();
  await db.insert(users).values({
    id,
    email: parsed.data.email,
    name: parsed.data.name,
    role: USER_ROLES.CUSTOMER,
    isDemoSeed: false,
    createdAt: new Date().toISOString(),
  });

  const token = await signSession({
    uid: id,
    role: USER_ROLES.CUSTOMER,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, cookieOptions);
  revalidatePath("/");

  return { ok: true };
}
