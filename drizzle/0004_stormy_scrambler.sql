CREATE TABLE "demo_emails" (
	"id" text PRIMARY KEY NOT NULL,
	"to_email" text NOT NULL,
	"to_user_id" text,
	"subject" text NOT NULL,
	"type" text NOT NULL,
	"body_html" text NOT NULL,
	"body_text" text NOT NULL,
	"data" jsonb,
	"triggered_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "demo_emails" ADD CONSTRAINT "demo_emails_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_emails" ADD CONSTRAINT "demo_emails_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_demo_emails_created_at" ON "demo_emails" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_demo_emails_type_created_at" ON "demo_emails" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "idx_demo_emails_to_user_created_at" ON "demo_emails" USING btree ("to_user_id","created_at");