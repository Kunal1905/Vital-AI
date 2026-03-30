import {
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sessions } from "./session";
import { users } from "./user";

export const calmingSessions = pgTable("calming_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => sessions.id, { onDelete: "set null" }),
  exerciseType: text("exercise_type").notNull(),
  durationMinutes: integer("duration_minutes").default(5).notNull(),
  completionScore: real("completion_score").default(0).notNull(),
  status: text("status").default("assigned").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
