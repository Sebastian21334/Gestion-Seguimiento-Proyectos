import { authenticatedPageAction } from "@/modules/auth/actions";
import { teamPageAction, membersPageAction } from "@/modules/teams/actions";
import { teamInvitationsAction } from "@/modules/invitations/actions";
import { MembersList, TeamSettings } from "@/modules/teams/components/members";
import {
  InviteForm,
  TeamInvitations,
} from "@/modules/invitations/components/invitations";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [team, user] = await Promise.all([
    teamPageAction(slug),
    authenticatedPageAction(),
  ]);
  const members = await membersPageAction(team.id);
  const invitations =
    team.role === "owner" ? await teamInvitationsAction(team.id) : [];
  return (
    <div className="board-layout">
      <div className="list-stack">
        <MembersList team={team} members={members} currentUserId={user.id} />
        {team.role === "owner" && (
          <TeamInvitations teamId={team.id} invitations={invitations} />
        )}
      </div>
      <aside className="list-stack">
        {team.role === "owner" && <InviteForm teamId={team.id} />}
        <TeamSettings team={team} />
      </aside>
    </div>
  );
}
