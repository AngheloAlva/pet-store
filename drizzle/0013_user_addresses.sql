CREATE TABLE "user_addresses" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "name" text NOT NULL,
  "street" text NOT NULL,
  "commune" text NOT NULL,
  "region" text NOT NULL,
  "phone" text NOT NULL,
  "notes" text,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_user_addresses_user_id" ON "user_addresses" ("user_id");
