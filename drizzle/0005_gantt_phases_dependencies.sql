CREATE TABLE "gantt_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gantt_dependencies" (
	"team_id" uuid NOT NULL,
	"diagram_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"depends_on_id" uuid NOT NULL,
	CONSTRAINT "gantt_dependencies_task_id_depends_on_id_pk" PRIMARY KEY("task_id","depends_on_id"),
	CONSTRAINT "gantt_dependencies_self_check" CHECK ("gantt_dependencies"."task_id" <> "gantt_dependencies"."depends_on_id")
);
--> statement-breakpoint
CREATE TABLE "gantt_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"diagram_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"color" varchar(16) DEFAULT 'violet' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD COLUMN "phase_id" uuid;--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD COLUMN "status" varchar(16) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD COLUMN "priority" varchar(16) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
-- Preservar el estado de las tareas existentes antes de activar los checks.
UPDATE "gantt_tasks" SET
  "status" = CASE WHEN "completed" THEN 'done'
    WHEN EXISTS (SELECT 1 FROM "work_sessions" WHERE "work_sessions"."gantt_task_id" = "gantt_tasks"."id") THEN 'active'
    ELSE 'pending' END,
  "progress" = CASE WHEN "completed" THEN 100 ELSE 0 END;
--> statement-breakpoint
ALTER TABLE "gantt_comments" ADD CONSTRAINT "gantt_comments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_comments" ADD CONSTRAINT "gantt_comments_task_id_gantt_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."gantt_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_comments" ADD CONSTRAINT "gantt_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_dependencies" ADD CONSTRAINT "gantt_dependencies_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_dependencies" ADD CONSTRAINT "gantt_dependencies_diagram_id_gantt_diagrams_id_fk" FOREIGN KEY ("diagram_id") REFERENCES "public"."gantt_diagrams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_dependencies" ADD CONSTRAINT "gantt_dependencies_task_id_gantt_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."gantt_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_dependencies" ADD CONSTRAINT "gantt_dependencies_depends_on_id_gantt_tasks_id_fk" FOREIGN KEY ("depends_on_id") REFERENCES "public"."gantt_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_phases" ADD CONSTRAINT "gantt_phases_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_phases" ADD CONSTRAINT "gantt_phases_diagram_id_gantt_diagrams_id_fk" FOREIGN KEY ("diagram_id") REFERENCES "public"."gantt_diagrams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_phases" ADD CONSTRAINT "gantt_phases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gantt_comments_team_idx" ON "gantt_comments" USING btree ("team_id","created_at");--> statement-breakpoint
CREATE INDEX "gantt_dependencies_diagram_idx" ON "gantt_dependencies" USING btree ("team_id","diagram_id");--> statement-breakpoint
CREATE INDEX "gantt_phases_diagram_idx" ON "gantt_phases" USING btree ("team_id","diagram_id");--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_phase_id_gantt_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."gantt_phases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_progress_check" CHECK ("gantt_tasks"."progress" between 0 and 100);--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_status_check" CHECK ("gantt_tasks"."status" in ('pending', 'active', 'done'));--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_priority_check" CHECK ("gantt_tasks"."priority" in ('low', 'medium', 'high', 'urgent'));--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_completion_check" CHECK (("gantt_tasks"."status" = 'done' and "gantt_tasks"."completed" and "gantt_tasks"."progress" = 100) or ("gantt_tasks"."status" <> 'done' and not "gantt_tasks"."completed" and "gantt_tasks"."progress" < 100 and ("gantt_tasks"."status" <> 'pending' or "gantt_tasks"."progress" = 0)));
