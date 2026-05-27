-- F3.2b: Singleton settings table (mirrors points_config pattern)
CREATE TABLE "app_settings" (
  "id" text PRIMARY KEY DEFAULT 'singleton',
  "payment_failure_mode" boolean NOT NULL DEFAULT false,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- F3.2b: Transfer receipts (base64-in-DB, isolated from orders)
CREATE TABLE "transfer_receipts" (
  "id" text PRIMARY KEY,
  "order_id" text NOT NULL REFERENCES "orders"("id"),
  "data_url" text NOT NULL,
  "bank_reference" text NOT NULL,
  "uploaded_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "idx_transfer_receipts_order_id" ON "transfer_receipts" ("order_id");

-- No DDL needed for ORDER_PAYMENT_STATUS extension:
-- the column is text + app-level enum. Updating schema.ts constants suffices.
