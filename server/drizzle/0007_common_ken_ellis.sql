ALTER TABLE "sessions" ALTER COLUMN "stress_score" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "stress_score" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "sleep_hours" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "free_text_input" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "free_text_input" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "session_vitals" ALTER COLUMN "heart_rate" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "session_vitals" ALTER COLUMN "heart_rate" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "session_vitals" ALTER COLUMN "spo2" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "session_vitals" ALTER COLUMN "spo2" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "nlp_confidence" json;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "feeling" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "panic_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "panic_filter_activated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "user_action_taken" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "offline_session" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "client_timestamp" timestamp;--> statement-breakpoint
ALTER TABLE "session_vitals" ADD COLUMN "temperature_f" real;--> statement-breakpoint
ALTER TABLE "session_vitals" ADD COLUMN "blood_pressure_systolic" integer;--> statement-breakpoint
ALTER TABLE "session_vitals" ADD COLUMN "blood_pressure_diastolic" integer;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD COLUMN "contributing_factors" json;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD COLUMN "push_subscription_id" text;--> statement-breakpoint
ALTER TABLE "family_alert_log" ADD COLUMN "trigger_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "family_alert_log" ADD COLUMN "message_template" text NOT NULL;--> statement-breakpoint
ALTER TABLE "family_alert_log" ADD COLUMN "message_sent" text NOT NULL;--> statement-breakpoint
ALTER TABLE "family_alert_log" ADD COLUMN "delivered" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "family_alert_log" ADD COLUMN "delivery_error" text;--> statement-breakpoint
ALTER TABLE "family_alert_log" ADD COLUMN "sent_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "sessions_user_created_idx" ON "sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "risk_assessments_session_idx" ON "risk_assessments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "alert_log_user_type_created_idx" ON "alert_log" USING btree ("user_id","alert_type","created_at");--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "panic";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "overall_feeling";--> statement-breakpoint
ALTER TABLE "session_vitals" DROP COLUMN "temperature";--> statement-breakpoint
ALTER TABLE "session_vitals" DROP COLUMN "blood_pressure_sys";--> statement-breakpoint
ALTER TABLE "session_vitals" DROP COLUMN "blood_pressure_dia";