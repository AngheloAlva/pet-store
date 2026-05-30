-- F3.6 DTE Simulados — Migration 0016
-- Widens dte_documents with full tax/identity fields, changes folio to integer,
-- makes order_id nullable (NC/ND have no order), adds dte_folio_counters table,
-- and adds document_type / receiver columns to checkout_sessions.

-- 1. Widen dte_documents -------------------------------------------------

ALTER TABLE "dte_documents"
  ADD COLUMN "net" integer,
  ADD COLUMN "tax_amount" integer,
  ADD COLUMN "total" integer,
  ADD COLUMN "issuer_rut" text,
  ADD COLUMN "receiver_rut" text,
  ADD COLUMN "receiver_name" text,
  ADD COLUMN "receiver_business_line" text,
  ADD COLUMN "receiver_address" text,
  ADD COLUMN "document_code" integer,
  ADD COLUMN "stamp" text,
  ADD COLUMN "reference_dte_id" text REFERENCES "dte_documents"("id"),
  ADD COLUMN "cancellation_reason" text,
  ADD COLUMN "cancelled_at" timestamp with time zone;

--> statement-breakpoint

-- Change folio from text to integer; legacy rows (null / 'DTE-MOCK-*') become NULL.
ALTER TABLE "dte_documents"
  ALTER COLUMN "folio" TYPE integer USING NULL;

--> statement-breakpoint

-- Make order_id nullable so NC/ND rows can exist without an order.
ALTER TABLE "dte_documents"
  ALTER COLUMN "order_id" DROP NOT NULL;

--> statement-breakpoint

-- Unique constraint: no two documents of the same type may share a folio.
-- Partial on non-null folios only so legacy NULL rows do not conflict.
CREATE UNIQUE INDEX "dte_documents_type_folio_unique"
  ON "dte_documents" ("type", "folio")
  WHERE "folio" IS NOT NULL;

--> statement-breakpoint

-- 2. New table: dte_folio_counters ----------------------------------------

CREATE TABLE "dte_folio_counters" (
  "type" text PRIMARY KEY NOT NULL,
  "last_folio" integer NOT NULL DEFAULT 0
);

--> statement-breakpoint

-- 3. Widen checkout_sessions for document type selection ------------------

ALTER TABLE "checkout_sessions"
  ADD COLUMN "document_type" text,
  ADD COLUMN "receiver" jsonb;
