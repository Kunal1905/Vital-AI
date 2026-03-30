import { integer, pgTable, serial, uniqueIndex } from "drizzle-orm/pg-core";
import { sessions } from "./session";
import { symptoms } from "./symptom";

export const sessionSymptoms = pgTable(
  "session_symptoms",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    symptomId: integer("symptom_id")
      .notNull()
      .references(() => symptoms.id, { onDelete: "restrict" }),
  },
  (table) => ({
    sessionSymptomUnique: uniqueIndex("session_symptoms_unique").on(
      table.sessionId,
      table.symptomId,
    ),
  }),
);
