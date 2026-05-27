ALTER TABLE "checkout_sessions" ADD COLUMN "payment_gateway" text;
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN "payment_metadata" jsonb;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_metadata" jsonb;
