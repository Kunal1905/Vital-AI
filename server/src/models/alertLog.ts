import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { sessions } from "./session";
import { users } from "./user";

export const alertLog = pgTable("alert_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => sessions.id, { onDelete: "set null" }),
  alertType: text("alert_type").notNull(),
  severity: text("severity").default("info").notNull(),
  channel: text("channel").default("in_app").notNull(),
  status: text("status").default("sent").notNull(),
  message: text("message").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
