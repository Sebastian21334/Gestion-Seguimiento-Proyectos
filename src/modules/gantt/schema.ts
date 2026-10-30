import {
  boolean,
  date,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { teams } from "@/modules/teams/schema";
import { users } from "@/modules/users/schema";

export const ganttDiagrams = pgTable(
  "gantt_diagrams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("gantt_diagrams_team_idx").on(table.teamId)],
);

export const ganttTasks = pgTable(
  "gantt_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    diagramId: uuid("diagram_id")
      .notNull()
      .references(() => ganttDiagrams.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    description: varchar("description", { length: 1000 }).notNull().default(""),
    assigneeId: uuid("assignee_id").references(() => users.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull().default("09:00"),
    endTime: varchar("end_time", { length: 5 }).notNull().default("17:00"),
    completed: boolean("completed").notNull().default(false),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("gantt_tasks_team_diagram_idx").on(table.teamId, table.diagramId),
  ],
);
