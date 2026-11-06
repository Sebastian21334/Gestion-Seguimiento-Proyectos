import { teamPageAction, membersPageAction } from "@/modules/teams/actions";
import { ganttPageAction } from "@/modules/gantt/actions";
import { ganttSessionsAction } from "@/modules/work-sessions/actions";
import { GanttBoard } from "@/modules/gantt/components/gantt-board";
import { SessionFiles } from "@/modules/work-sessions/components/session-files";
import { requireCurrentUser } from "@/shared/session";

export default async function GanttPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireCurrentUser();
  const team = await teamPageAction(slug);
  const [data, members, sessions] = await Promise.all([
    ganttPageAction(team.id),
    membersPageAction(team.id),
    ganttSessionsAction(team.id),
  ]);
  return (
    <GanttBoard
      teamId={team.id}
      teamSlug={slug}
      data={data}
      members={members}
      sessions={sessions}
      attachments={Object.fromEntries(sessions.map(session => [session.id, <SessionFiles key={session.id} teamId={team.id} sessionId={session.id} reports={session.reports} canEdit={session.userId === user.id} />]))}
    />
  );
}
