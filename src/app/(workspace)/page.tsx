import { authenticatedPageAction } from "@/modules/auth/actions";
import { myTeamsAction } from "@/modules/teams/actions";
import { pendingInvitationsAction } from "@/modules/invitations/actions";
import { CreateTeamForm, MyTeams } from "@/modules/teams/components/teams";
import { PendingInvitations } from "@/modules/invitations/components/invitations";

export default async function HomePage() {
  const [user, teams, invitations] = await Promise.all([
    authenticatedPageAction(),
    myTeamsAction(),
    pendingInvitationsAction(),
  ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU PUNTO DE ENCUENTRO</span>
          <h1>
            Hola, {user.name.split(" ")[0]}
            <span className="heading-dot">.</span>
          </h1>
          <p>Todo listo para avanzar con tu equipo.</p>
        </div>
        <span className="header-decoration" aria-hidden="true">
          ↗
        </span>
      </div>
      <MyTeams teams={teams} />
      <div className="home-bottom">
        <CreateTeamForm />
        <PendingInvitations invitations={invitations} />
      </div>
    </>
  );
}
