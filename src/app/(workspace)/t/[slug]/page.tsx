import { authenticatedPageAction } from "@/modules/auth/actions";
import { teamPageAction } from "@/modules/teams/actions";
import { boardAction } from "@/modules/work-sessions/actions";
import { WorkBoard } from "@/modules/work-sessions/components/board";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [team, user] = await Promise.all([
    teamPageAction(slug),
    authenticatedPageAction(),
  ]);
  const board = await boardAction(team.id);
  return (
    <WorkBoard
      teamId={team.id}
      slug={team.slug}
      currentUserId={user.id}
      initialData={board}
    />
  );
}
