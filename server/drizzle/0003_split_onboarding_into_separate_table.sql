CREATE TABLE "user_onboarding" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"age" integer DEFAULT 20 NOT NULL,
	"sex" text DEFAULT 'unspecified' NOT NULL,
	"height_cm" integer DEFAULT 170 NOT NULL,
	"weight_kg" integer DEFAULT 70 NOT NULL,
	"activity_level" text DEFAULT 'moderate' NOT NULL,
	"conditions" text DEFAULT '' NOT NULL,
	"medications" text DEFAULT '' NOT NULL,
	"allergies" text DEFAULT '' NOT NULL,
	"sleep_hours" integer DEFAULT 8 NOT NULL,
	"stress_level" integer DEFAULT 5 NOT NULL,
	"emergency_name" text DEFAULT 'Not provided' NOT NULL,
	"emergency_phone" text DEFAULT 'Not provided' NOT NULL,
	"baseline_hr" integer DEFAULT 72 NOT NULL,
	"baseline_bp" text DEFAULT '120/80' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_onboarding_user_id_unique" ON "user_onboarding" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "age";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "sex";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "height_cm";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "weight_kg";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "activity_level";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "conditions";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "medications";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "allergies";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "sleep_hours";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "stress_level";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "emergency_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "emergency_phone";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "baseline_hr";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "baseline_bp";