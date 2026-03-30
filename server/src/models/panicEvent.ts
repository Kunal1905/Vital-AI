import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { sessions } from "./session";
import { users } from "./user";

export const panicEvents = pgTable("panic_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => sessions.id, { onDelete: "set null" }),
  triggerSource: text("trigger_source").default("manual").notNull(),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
