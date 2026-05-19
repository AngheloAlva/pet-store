CREATE TABLE "pets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"species" text NOT NULL,
	"breed" text,
	"birth_date" text,
	"weight_kg" numeric(5, 2),
	"notes" text,
	"photo_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "points_config" (
	"id" text PRIMARY KEY NOT NULL,
	"earn_rate_per_clp" integer DEFAULT 100 NOT NULL,
	"redeem_value_per_point" integer DEFAULT 1 NOT NULL,
	"min_redeem_points" integer DEFAULT 500 NOT NULL,
	"first_purchase_bonus" integer DEFAULT 500 NOT NULL,
	"pet_birthday_bonus" integer DEFAULT 200 NOT NULL,
	"expiration_months" integer,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "points_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"delta_points" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"kind" text NOT NULL,
	"reference_id" text,
	"description" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_points_transactions_user_created_at" ON "points_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE set null ON UPDATE no action;