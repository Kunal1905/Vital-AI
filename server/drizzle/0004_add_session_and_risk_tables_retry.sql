CREATE TABLE "symptom_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "symptom_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "symptoms" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"severity_weight" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "symptoms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"severity" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"stress" integer NOT NULL,
	"sleep_hours" real NOT NULL,
	"overall_feeling" text DEFAULT 'neutral' NOT NULL,
	"final_risk_score" real DEFAULT 0 NOT NULL,
	"final_risk_level" text DEFAULT 'low' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_symptoms" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"symptom_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_vitals" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"heart_rate" integer DEFAULT 72 NOT NULL,
	"temperature" real DEFAULT 98.6 NOT NULL,
	"blood_pressure_sys" integer DEFAULT 120 NOT NULL,
	"blood_pressure_dia" integer DEFAULT 80 NOT NULL,
	"spo2" integer DEFAULT 98 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"risk_score" real NOT NULL,
	"risk_level" text NOT NULL,
	"confidence_percent" integer DEFAULT 60 NOT NULL,
	"recommendation" text DEFAULT '' NOT NULL,
	"model_version" text DEFAULT 'v1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "symptoms" ADD CONSTRAINT "symptoms_category_id_symptom_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."symptom_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_symptoms" ADD CONSTRAINT "session_symptoms_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_symptoms" ADD CONSTRAINT "session_symptoms_symptom_id_symptoms_id_fk" FOREIGN KEY ("symptom_id") REFERENCES "public"."symptoms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_vitals" ADD CONSTRAINT "session_vitals_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "session_symptoms_unique" ON "session_symptoms" USING btree ("session_id","symptom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_vitals_session_unique" ON "session_vitals" USING btree ("session_id");