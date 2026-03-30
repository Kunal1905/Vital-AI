ALTER TABLE "sessions" ADD COLUMN "nlp_confidence" json;
ALTER TABLE "sessions" ADD COLUMN "feeling" text;
ALTER TABLE "sessions" ADD COLUMN "panic_score" integer DEFAULT 0 NOT NULL;
ALTER TABLE "sessions" ADD COLUMN "panic_filter_activated" boolean DEFAULT false NOT NULL;
ALTER TABLE "sessions" ADD COLUMN "user_action_taken" text;
ALTER TABLE "sessions" ADD COLUMN "offline_session" boolean DEFAULT false NOT NULL;
ALTER TABLE "sessions" ADD COLUMN "client_timestamp" timestamp;

ALTER TABLE "sessions" ALTER COLUMN "free_text_input" DROP NOT NULL;
ALTER TABLE "sessions" ALTER COLUMN "free_text_input" DROP DEFAULT;
ALTER TABLE "sessions" ALTER COLUMN "stress_score" DROP NOT NULL;
ALTER TABLE "sessions" ALTER COLUMN "stress_score" DROP DEFAULT;
ALTER TABLE "sessions" ALTER COLUMN "sleep_hours" DROP NOT NULL;

ALTER TABLE "sessions" DROP COLUMN "panic";
ALTER TABLE "sessions" DROP COLUMN "overall_feeling";

ALTER TABLE "session_vitals" RENAME COLUMN "temperature" TO "temperature_f";
ALTER TABLE "session_vitals" RENAME COLUMN "blood_pressure_sys" TO "blood_pressure_systolic";
ALTER TABLE "session_vitals" RENAME COLUMN "blood_pressure_dia" TO "blood_pressure_diastolic";

ALTER TABLE "session_vitals" ALTER COLUMN "heart_rate" DROP NOT NULL;
ALTER TABLE "session_vitals" ALTER COLUMN "heart_rate" DROP DEFAULT;
ALTER TABLE "session_vitals" ALTER COLUMN "temperature_f" DROP NOT NULL;
ALTER TABLE "session_vitals" ALTER COLUMN "temperature_f" DROP DEFAULT;
ALTER TABLE "session_vitals" ALTER COLUMN "blood_pressure_systolic" DROP NOT NULL;
ALTER TABLE "session_vitals" ALTER COLUMN "blood_pressure_systolic" DROP DEFAULT;
ALTER TABLE "session_vitals" ALTER COLUMN "blood_pressure_diastolic" DROP NOT NULL;
ALTER TABLE "session_vitals" ALTER COLUMN "blood_pressure_diastolic" DROP DEFAULT;
ALTER TABLE "session_vitals" ALTER COLUMN "spo2" DROP NOT NULL;
ALTER TABLE "session_vitals" ALTER COLUMN "spo2" DROP DEFAULT;

ALTER TABLE "risk_assessments" ADD COLUMN "contributing_factors" json;
