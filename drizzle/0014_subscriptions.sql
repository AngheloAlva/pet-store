-- F3.5 Suscripciones — Migration 0014
-- Adds subscription config columns to products, reminder setting to app_settings,
-- and creates subscriptions + subscription_cycles tables.

ALTER TABLE "products" ADD COLUMN "subscription_enabled" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "subscription_frequencies" integer[] NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "subscription_discount_percent" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "subscription_reminder_days" integer NOT NULL DEFAULT 3;
--> statement-breakpoint
CREATE TABLE "subscriptions" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "product_id" text NOT NULL REFERENCES "products"("id"),
  "variant_id" text NOT NULL REFERENCES "product_variants"("id"),
  "frequency_days" integer NOT NULL,
  "discount_percent" integer NOT NULL DEFAULT 0,
  "quantity" integer NOT NULL DEFAULT 1,
  "status" text NOT NULL DEFAULT 'active',
  "next_charge_at" timestamp with time zone NOT NULL,
  "paused_until" timestamp with time zone,
  "failed_attempts" integer NOT NULL DEFAULT 0,
  "last_charged_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_subscriptions_status_next_charge" ON "subscriptions" ("status", "next_charge_at");
--> statement-breakpoint
CREATE INDEX "idx_subscriptions_user_id" ON "subscriptions" ("user_id");
--> statement-breakpoint
CREATE TABLE "subscription_cycles" (
  "id" text PRIMARY KEY,
  "subscription_id" text NOT NULL REFERENCES "subscriptions"("id") ON DELETE CASCADE,
  "order_id" text REFERENCES "orders"("id"),
  "status" text NOT NULL,
  "charged_at" timestamp with time zone,
  "attempt_number" integer NOT NULL DEFAULT 1,
  "failure_reason" text,
  "reminder_sent_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_subscription_cycles_sub_created" ON "subscription_cycles" ("subscription_id", "created_at");
