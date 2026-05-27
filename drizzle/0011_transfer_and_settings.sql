CREATE TABLE "app_settings" (
  "id" text PRIMARY KEY DEFAULT 'singleton',
  "payment_failure_mode" boolean NOT NULL DEFAULT false,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transfer_receipts" (
  "id" text PRIMARY KEY,
  "order_id" text NOT NULL REFERENCES "orders"("id"),
  "data_url" text NOT NULL,
  "bank_reference" text NOT NULL,
  "uploaded_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_transfer_receipts_order_id" ON "transfer_receipts" ("order_id");
