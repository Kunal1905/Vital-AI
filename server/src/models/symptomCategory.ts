import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const symptomCategories = pgTable("symptom_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
