"use server";

/**
 * selectDocumentType — F3.6 Checkout Paso 3 document type selection
 * Validates the document type choice (boleta/factura) and persists it to the checkout session.
 * Factura requires a valid Chilean RUT and business line (giro) — validated via Zod (INV-4).
 * Spec: C-1, C-2, C-3, INV-4
 */
import { getCurrentUser } from "@/lib/session";
import { db } from "@/db";
import { checkoutSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { selectDocumentTypeSchema } from "./select-document-type.schema";

type AnyDb = typeof db;

interface SelectDocumentTypeInternalInput {
  sessionId: string;
  userId: string;
  documentType: string;
  receiverRut?: string;
  receiverBusinessLine?: string;
  receiverName?: string;
  receiverAddress?: string;
}

export type SelectDocumentTypeResult =
  | { ok: true }
  | { ok: false; code: "UNAUTHENTICATED" | "SESSION_NOT_FOUND" | "VALIDATION_ERROR"; message?: string };

/**
 * Core logic with DB injection for tests.
 */
export async function selectDocumentTypeWithDb(
  database: AnyDb,
  input: SelectDocumentTypeInternalInput,
): Promise<SelectDocumentTypeResult> {
  const { sessionId, userId, documentType, receiverRut, receiverBusinessLine, receiverName, receiverAddress } = input;

  // Validate input via Zod schema (C-2, INV-4)
  const parsed = selectDocumentTypeSchema.safeParse({
    documentType,
    receiverRut,
    receiverBusinessLine,
    receiverName,
    receiverAddress,
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: JSON.stringify(parsed.error.flatten()),
    };
  }

  // Load session
  const sessionRows = await database
    .select()
    .from(checkoutSessions)
    .where(and(eq(checkoutSessions.id, sessionId), eq(checkoutSessions.userId, userId)));

  if (sessionRows.length === 0) {
    return { ok: false, code: "SESSION_NOT_FOUND" };
  }

  // Build receiver JSONB for session (only populated for factura)
  const receiverJson =
    parsed.data.documentType === "factura"
      ? {
          rut: parsed.data.receiverRut,
          businessLine: parsed.data.receiverBusinessLine,
          name: parsed.data.receiverName ?? null,
          address: parsed.data.receiverAddress ?? null,
        }
      : null;

  // Persist to session
  await database
    .update(checkoutSessions)
    .set({
      documentType: parsed.data.documentType,
      receiver: receiverJson,
      updatedAt: new Date(),
    })
    .where(eq(checkoutSessions.id, sessionId));

  return { ok: true };
}

/**
 * Public server action — wraps with auth.
 */
export async function selectDocumentType(input: unknown): Promise<SelectDocumentTypeResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED" };

  const { sessionId, ...rest } = input as SelectDocumentTypeInternalInput;

  return selectDocumentTypeWithDb(db, {
    sessionId,
    ...rest,
    userId: user.id,
  });
}
