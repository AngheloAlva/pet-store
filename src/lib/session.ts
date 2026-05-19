import "server-only";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { SessionPayload, SessionUser, UserRole } from "@/types/session";

// ---------------------------------------------------------------------------
// Fail-fast: SESSION_SECRET must be set and >= 32 chars before any request
// ---------------------------------------------------------------------------
const SECRET = process.env.SESSION_SECRET;
if (!SECRET || SECRET.length < 32) {
  throw new Error(
    "SESSION_SECRET env var is missing or shorter than 32 chars. " +
      "Add it to .env.local (see .env.example). " +
      "Generate one with: openssl rand -base64 48",
  );
}

export const SESSION_COOKIE_NAME = "sp_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// ---------------------------------------------------------------------------
// Web Crypto key — imported once at module load
// ---------------------------------------------------------------------------
const keyPromise = crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(SECRET),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

// ---------------------------------------------------------------------------
// base64url helpers (no Buffer — edge-compatible)
// ---------------------------------------------------------------------------
function base64urlEncode(bytes: Uint8Array): string {
  const binary = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlDecode(str: string): Uint8Array {
  // Restore standard base64 padding
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const padded2 = padded + "=".repeat(padLength);
  const binary = atob(padded2);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// signSession
// ---------------------------------------------------------------------------
export async function signSession(payload: SessionPayload): Promise<string> {
  const key = await keyPromise;
  const data = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sig = base64urlEncode(new Uint8Array(sigBuffer));
  return `${data}.${sig}`;
}

// ---------------------------------------------------------------------------
// verifySession
// ---------------------------------------------------------------------------
export async function verifySession(token: string): Promise<SessionPayload | null> {
  if (!token) return null;

  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;

  const data = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);

  if (!data || !sig) return null;

  let sigBytes: Uint8Array;
  try {
    sigBytes = base64urlDecode(sig);
  } catch {
    return null;
  }

  const key = await keyPromise;
  let ok: boolean;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ok = await crypto.subtle.verify("HMAC", key, sigBytes as any, new TextEncoder().encode(data));
  } catch {
    return null;
  }

  if (!ok) return null;

  let parsed: SessionPayload;
  try {
    const json = new TextDecoder().decode(base64urlDecode(data));
    parsed = JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof parsed.exp !== "number") return null;

  // Strict less-than: exp === now is expired
  if (parsed.exp * 1000 <= Date.now()) return null;

  return parsed;
}

// ---------------------------------------------------------------------------
// setSessionCookie / clearSessionCookie
// ---------------------------------------------------------------------------
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// ---------------------------------------------------------------------------
// getCurrentUser
// ---------------------------------------------------------------------------
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies(); // Next.js 16 async API
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null; // [A] no cookie

  const payload = await verifySession(token);
  if (!payload) return null; // [B] bad sig | [C] expired | [D] malformed

  const row = await db.query.users.findFirst({
    where: eq(users.id, payload.uid),
  });
  if (!row) return null; // [E] stale uid (cold start)

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    storeId: row.storeId,
    isDemoSeed: row.isDemoSeed,
  };
}
