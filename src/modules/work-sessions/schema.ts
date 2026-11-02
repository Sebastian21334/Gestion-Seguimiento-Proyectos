import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { teams } from "@/modules/teams/schema";
import { users } from "@/modules/users/schema";
import { ganttTasks } from "@/modules/gantt/schema";

export const workStatus = pgEnum("work_status", ["active", "done"]);
export const workSessions = pgTable(
  "work_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    // Se conserva el nombre físico para mantener las sesiones existentes.
    title: varchar("area", { length: 120 }).notNull(),
    description: varchar("description", { length: 1000 }).notNull(),
    ganttTaskId: uuid("gantt_task_id").references(() => ganttTasks.id, {
      onDelete: "set null",
    }),
    reportName: varchar("report_name", { length: 160 }),
    reportMarkdown: text("report_markdown"),
    status: workStatus("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("one_active_session_per_user_team")
      .on(table.teamId, table.userId)
      .where(sql`${table.status} = 'active'`),
    index("work_sessions_team_status_idx").on(
      table.teamId,
      table.status,
      table.startedAt,
    ),
  ],
);
export const workSessionReports = pgTable(
  "work_session_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => workSessions.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("work_session_reports_session_idx").on(table.sessionId)],
);

export const reportChangeAction = pgEnum("report_change_action", [
  "added",
  "removed",
]);
export const workSessionReportChanges = pgTable(
  "work_session_report_changes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => workSessions.id, { onDelete: "cascade" }),
    // Sin FK al adjunto: el registro debe sobrevivir a su eliminación.
    reportId: uuid("report_id").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    action: reportChangeAction("action").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("work_session_report_changes_session_idx").on(table.sessionId, table.createdAt),
  ],
);
