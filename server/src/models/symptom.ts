import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { symptomCategories } from "./symptomCategory";

export const symptoms = pgTable("symptoms", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => symptomCategories.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  baseWeight: integer("base_weight").default(1).notNull(),
  isRedFlag: boolean("is_red_flag").default(false).notNull(),
  severityWeight: integer("severity_weight").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
