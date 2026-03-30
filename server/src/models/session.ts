import {
  boolean,
  integer,
  json,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./user";

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  severity: integer("severity").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  stress: integer("stress").notNull(),
  freeTextInput: text("free_text_input"),
  nlpConfidence: json("nlp_confidence").$type<Record<string, number>>(),
  stressScore: integer("stress_score"),
  sleepHours: real("sleep_hours"),
  feeling: text("feeling"),
  panicScore: integer("panic_score").default(0).notNull(),
  panicFilterActivated: boolean("panic_filter_activated").default(false).notNull(),
  userActionTaken: text("user_action_taken"),
  offlineSession: boolean("offline_session").default(false).notNull(),
  clientTimestamp: timestamp("client_timestamp"),
  finalRiskScore: real("final_risk_score").default(0).notNull(),
  finalRiskLevel: text("final_risk_level").default("low").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
