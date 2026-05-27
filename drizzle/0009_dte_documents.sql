-- Migration 0009: dte_documents
-- Part of F3.1 Checkout Completo Simulado — W2 fix
-- Tracks issued DTE (electronic tax document) records per order.

CREATE TABLE "dte_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"dte_id" text NOT NULL,
	"status" text NOT NULL DEFAULT 'por_emitir',
	"folio" text,
	"type" text,
	"issued_at" timestamp with time zone,
	"pdf_url" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "dte_documents" ADD CONSTRAINT "dte_documents_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_dte_documents_order_id" ON "dte_documents" USING btree ("order_id");
