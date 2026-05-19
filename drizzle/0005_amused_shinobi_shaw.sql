CREATE TABLE "restock_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"user_id" text,
	"product_id" text NOT NULL,
	"variant_id" text,
	"store_ids" text[],
	"status" text DEFAULT 'pending' NOT NULL,
	"cancel_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fired_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	CONSTRAINT "restock_alerts_cancel_token_unique" UNIQUE("cancel_token")
);
--> statement-breakpoint
ALTER TABLE "restock_alerts" ADD CONSTRAINT "restock_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restock_alerts" ADD CONSTRAINT "restock_alerts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restock_alerts" ADD CONSTRAINT "restock_alerts_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_restock_product_status" ON "restock_alerts" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "idx_restock_variant_status" ON "restock_alerts" USING btree ("variant_id","status");--> statement-breakpoint
CREATE INDEX "idx_restock_user" ON "restock_alerts" USING btree ("user_id");