import {
  boolean,
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./user";

export const userOnboarding = pgTable(
  "user_onboarding",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    age: integer("age").default(20).notNull(),
    sex: text("sex").default("unspecified").notNull(),
    heightCm: integer("height_cm").default(170).notNull(),
    weightKg: integer("weight_kg").default(70).notNull(),
    activityLevel: text("activity_level").default("moderate").notNull(),
    conditions: text("conditions").default("").notNull(),
    medications: text("medications").default("").notNull(),
    allergies: text("allergies").default("").notNull(),
    sleepHours: integer("sleep_hours").default(8).notNull(),
    stressLevel: integer("stress_level").default(5).notNull(),
    emergencyName: text("emergency_name").default("Not provided").notNull(),
    emergencyPhone: text("emergency_phone").default("Not provided").notNull(),
    baselineHr: integer("baseline_hr").default(72).notNull(),
    baselineBp: text("baseline_bp").default("120/80").notNull(),
    hasHypertension: boolean("has_hypertension").default(false).notNull(),
    hasDiabetes: boolean("has_diabetes").default(false).notNull(),
    hasHeartDisease: boolean("has_heart_disease").default(false).notNull(),
    hasAsthma: boolean("has_asthma").default(false).notNull(),
    hasThyroidDisorder: boolean("has_thyroid_disorder").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdUniqueIdx: uniqueIndex("user_onboarding_user_id_unique").on(table.userId),
  }),
);
