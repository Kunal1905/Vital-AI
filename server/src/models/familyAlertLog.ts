import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { emergencyContacts } from "./emergencyContact";
import { sessions } from "./session";
import { users } from "./user";

export const familyAlertLog = pgTable("family_alert_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  contactId: integer("contact_id")
    .notNull()
    .references(() => emergencyContacts.id, { onDelete: "cascade" }),
  sessionId: integer("session_id")
    .references(() => sessions.id, { onDelete: "set null" }),
  triggerType: text("trigger_type").notNull(),
  messageTemplate: text("message_template").notNull(),
  messageSent: text("message_sent").notNull(),
  status: text("status").default("sent").notNull(),
  delivered: boolean("delivered").default(false).notNull(),
  deliveryError: text("delivery_error"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  response: text("response").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});