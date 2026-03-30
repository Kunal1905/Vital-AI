ALTER TABLE "users" ADD COLUMN "age" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sex" text DEFAULT 'unspecified' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "height_cm" integer DEFAULT 170 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "weight_kg" integer DEFAULT 70 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "activity_level" text DEFAULT 'moderate' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "conditions" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "medications" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "allergies" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sleep_hours" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stress_level" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "emergency_name" text DEFAULT 'Not provided' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "emergency_phone" text DEFAULT 'Not provided' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "baseline_hr" integer DEFAULT 72 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "baseline_bp" text DEFAULT '120/80' NOT NULL;