CREATE TABLE "gantt_diagrams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gantt_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diagram_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" varchar(1000) DEFAULT '' NOT NULL,
	"assignee_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_sessions" ADD COLUMN "gantt_task_id" uuid;--> statement-breakpoint
ALTER TABLE "gantt_diagrams" ADD CONSTRAINT "gantt_diagrams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_diagrams" ADD CONSTRAINT "gantt_diagrams_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_diagram_id_gantt_diagrams_id_fk" FOREIGN KEY ("diagram_id") REFERENCES "public"."gantt_diagrams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD CONSTRAINT "gantt_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gantt_diagrams_team_idx" ON "gantt_diagrams" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "gantt_tasks_team_diagram_idx" ON "gantt_tasks" USING btree ("team_id","diagram_id");--> statement-breakpoint
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_gantt_task_id_gantt_tasks_id_fk" FOREIGN KEY ("gantt_task_id") REFERENCES "public"."gantt_tasks"("id") ON DELETE set null ON UPDATE no action;