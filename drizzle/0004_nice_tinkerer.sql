ALTER TABLE "gantt_tasks" ADD COLUMN "start_time" varchar(5) DEFAULT '09:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "gantt_tasks" ADD COLUMN "end_time" varchar(5) DEFAULT '17:00' NOT NULL;