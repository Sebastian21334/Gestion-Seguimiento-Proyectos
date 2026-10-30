import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { teams } from "@/modules/teams/schema";
import { users } from "@/modules/users/schema";

export const documentType = pgEnum("document_type", ["gantt", "doc", "other"]);
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    url: text("url").notNull(),
    type: documentType("type").notNull(),
    description: varchar("description", { length: 500 }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("documents_team_idx").on(table.teamId)],
);
