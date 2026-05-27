ALTER TABLE "checkout_sessions" ADD COLUMN "delivery_type" text;
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN "pickup_store_id" text REFERENCES "stores"("id");
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN "dispatch_slot" text;
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "covered_communes" text[];
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "free_shipping_threshold" integer;
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "dispatch_slots" text[];
--> statement-breakpoint
CREATE TABLE "shipments" (
  "id" text PRIMARY KEY,
  "order_id" text NOT NULL UNIQUE REFERENCES "orders"("id"),
  "carrier" text NOT NULL,
  "status" text NOT NULL DEFAULT 'preparando',
  "tracking_number" text,
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_shipments_order_id" ON "shipments" ("order_id");
--> statement-breakpoint
CREATE INDEX "idx_shipments_tracking_number" ON "shipments" ("tracking_number");
--> statement-breakpoint
CREATE TABLE "tracking_events" (
  "id" text PRIMARY KEY,
  "shipment_id" text NOT NULL REFERENCES "shipments"("id"),
  "status" text NOT NULL,
  "description" text NOT NULL,
  "timestamp" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_tracking_events_shipment_id" ON "tracking_events" ("shipment_id");
