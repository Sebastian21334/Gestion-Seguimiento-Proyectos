CREATE TYPE "public"."report_change_action" AS ENUM('added', 'removed');--> statement-breakpoint
CREATE TABLE "work_session_report_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"report_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"action" "report_change_action" NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_session_report_changes" ADD CONSTRAINT "work_session_report_changes_session_id_work_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."work_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_session_report_changes" ADD CONSTRAINT "work_session_report_changes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_session_report_changes_session_idx" ON "work_session_report_changes" USING btree ("session_id","created_at");--> statement-breakpoint
INSERT INTO "work_session_report_changes" ("session_id", "report_id", "name", "action", "user_id", "created_at")
SELECT r."session_id", r."id", r."name", 'added', s."user_id", r."created_at"
FROM "work_session_reports" r
JOIN "work_sessions" s ON s."id" = r."session_id";
