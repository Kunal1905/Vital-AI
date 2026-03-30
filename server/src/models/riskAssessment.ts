import { integer, json, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { sessions } from "./session";

export const riskAssessments = pgTable("risk_assessments", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  riskScore: real("risk_score").notNull(),
  riskLevel: text("risk_level").notNull(),
  confidencePercent: integer("confidence_percent").default(60).notNull(),
  recommendation: text("recommendation").default("").notNull(),
  contributingFactors: json("contributing_factors").$type<Record<string, number>>(),
  modelVersion: text("model_version").default("v1").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
