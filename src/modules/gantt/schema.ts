import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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

export const ganttPhases = pgTable("gantt_phases", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  diagramId: uuid("diagram_id").notNull().references(() => ganttDiagrams.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  color: varchar("color", { length: 16 }).notNull().default("violet"),
  position: integer("position").notNull().default(0),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("gantt_phases_diagram_idx").on(table.teamId, table.diagramId)]);

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
    phaseId: uuid("phase_id").references(() => ganttPhases.id, { onDelete: "set null" }),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    progress: integer("progress").notNull().default(0),
    priority: varchar("priority", { length: 16 }).notNull().default("medium"),
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
    check("gantt_tasks_progress_check", sql`${table.progress} between 0 and 100`),
    check("gantt_tasks_status_check", sql`${table.status} in ('pending', 'active', 'done')`),
    check("gantt_tasks_priority_check", sql`${table.priority} in ('low', 'medium', 'high', 'urgent')`),
    check("gantt_tasks_completion_check", sql`(${table.status} = 'done' and ${table.completed} and ${table.progress} = 100) or (${table.status} <> 'done' and not ${table.completed} and ${table.progress} < 100 and (${table.status} <> 'pending' or ${table.progress} = 0))`),
  ],
);

export const ganttDependencies = pgTable("gantt_dependencies", {
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  diagramId: uuid("diagram_id").notNull().references(() => ganttDiagrams.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").notNull().references(() => ganttTasks.id, { onDelete: "cascade" }),
  dependsOnId: uuid("depends_on_id").notNull().references(() => ganttTasks.id, { onDelete: "cascade" }),
}, table => [
  primaryKey({ columns: [table.taskId, table.dependsOnId] }),
  index("gantt_dependencies_diagram_idx").on(table.teamId, table.diagramId),
  check("gantt_dependencies_self_check", sql`${table.taskId} <> ${table.dependsOnId}`),
]);

export const ganttComments = pgTable("gantt_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").notNull().references(() => ganttTasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("gantt_comments_team_idx").on(table.teamId, table.createdAt)]);
