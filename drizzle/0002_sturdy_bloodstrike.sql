CREATE TABLE "work_session_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_session_reports" ADD CONSTRAINT "work_session_reports_session_id_work_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."work_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_session_reports_session_idx" ON "work_session_reports" USING btree ("session_id");--> statement-breakpoint
INSERT INTO "work_session_reports" ("session_id", "name", "content")
SELECT "id", "report_name", "report_markdown" FROM "work_sessions"
WHERE "report_name" IS NOT NULL AND "report_markdown" IS NOT NULL;
