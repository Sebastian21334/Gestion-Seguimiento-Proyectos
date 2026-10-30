import { teamPageAction, membersPageAction } from "@/modules/teams/actions";
import { ganttPageAction } from "@/modules/gantt/actions";
import { ganttSessionsAction } from "@/modules/work-sessions/actions";
import { GanttBoard } from "@/modules/gantt/components/gantt-board";
import { ReportDownload } from "@/modules/work-sessions/components/report-download";

export default async function GanttPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await teamPageAction(slug);
  const [data, members, sessions] = await Promise.all([
    ganttPageAction(team.id),
    membersPageAction(team.id),
    ganttSessionsAction(team.id),
  ]);
  return (
    <GanttBoard
      teamId={team.id}
      data={data}
      members={members}
      sessions={sessions}
      attachments={Object.fromEntries(sessions.map(session => [session.id, session.reports.map(report => <ReportDownload key={report.id} teamId={team.id} sessionId={session.id} reportId={report.id} name={report.name} />)]))}
    />
  );
}
