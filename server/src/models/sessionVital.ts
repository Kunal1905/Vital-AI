import { integer, pgTable, real, serial, uniqueIndex } from "drizzle-orm/pg-core";
import { sessions } from "./session";

export const sessionVitals = pgTable(
  "session_vitals",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    heartRate: integer("heart_rate"),
    temperatureF: real("temperature_f"),
    bloodPressureSystolic: integer("blood_pressure_systolic"),
    bloodPressureDiastolic: integer("blood_pressure_diastolic"),
    spo2: integer("spo2"),
  },
  (table) => ({
    sessionVitalsSessionUnique: uniqueIndex("session_vitals_session_unique").on(
      table.sessionId,
    ),
  }),
);
