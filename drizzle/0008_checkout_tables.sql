-- Migration 0008: checkout_sessions, orders, order_items, order_sequences
-- Part of F3.1 Checkout Completo Simulado

CREATE TABLE "checkout_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"idempotency_key" text NOT NULL UNIQUE,
	"cart_snapshot" jsonb NOT NULL,
	"address" jsonb,
	"shipping_option_id" text,
	"shipping_cost" integer,
	"status" text NOT NULL DEFAULT 'active',
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL UNIQUE,
	"user_id" text NOT NULL,
	"checkout_session_id" text NOT NULL,
	"status" text NOT NULL DEFAULT 'pending',
	"payment_status" text NOT NULL DEFAULT 'unpaid',
	"payment_gateway" text NOT NULL,
	"gateway_token" text,
	"address" jsonb NOT NULL,
	"shipping_option_id" text NOT NULL,
	"shipping_cost" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"discount_total" integer NOT NULL DEFAULT 0,
	"wallet_discount" integer NOT NULL DEFAULT 0,
	"total" integer NOT NULL,
	"coupon_code" text,
	"points_redeemed" integer NOT NULL DEFAULT 0,
	"points_earned" integer NOT NULL DEFAULT 0,
	"salesperson_id" text,
	"price_list_id" text,
	"dte_id" text,
	"credit_due_date" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"line_total" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_sequences" (
	"date" text PRIMARY KEY NOT NULL,
	"last_seq" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_checkout_sessions_user_expires_at" ON "checkout_sessions" USING btree ("user_id","expires_at");
--> statement-breakpoint
CREATE INDEX "idx_orders_user_created_at" ON "orders" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id");
