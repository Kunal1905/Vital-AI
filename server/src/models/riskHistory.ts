import { integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { sessions } from "./session";
import { users } from "./user";

export const riskHistory = pgTable("risk_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => sessions.id, { onDelete: "set null" }),
  riskScore: real("risk_score").notNull(),
  riskLevel: text("risk_level").notNull(),
  reason: text("reason").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
