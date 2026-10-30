import Link from "next/link";
import { authenticatedPageAction, logoutAction } from "@/modules/auth/actions";
import { myTeamsAction } from "@/modules/teams/actions";
import { Avatar } from "@/shared/ui/avatar";
import { Icon } from "@/shared/ui/icon";
import { WorkspaceLinks, TeamSelector } from "@/shared/ui/navigation";

export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await authenticatedPageAction();
  const teams = await myTeamsAction();
  return (
    <div className="workspace">
      <a className="skip-link" href="#contenido">
        Ir al contenido
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Icon name="code" size={22} />
          </span>
          equipo<span className="brand-dot">.</span>
        </Link>
        <div className="sidebar-label">TU ESPACIO</div>
        <WorkspaceLinks />
        <div className="sidebar-teams">
          <div className="sidebar-label">
            TUS EQUIPOS{" "}
            <Link href="/" aria-label="Crear equipo">
              <Icon name="plus" size={16} />
            </Link>
          </div>
          {teams.map((team) => (
            <Link key={team.id} href={`/t/${team.slug}`}>
              <span className="team-mini-icon">
                {team.name[0]?.toUpperCase()}
              </span>
              {team.name}
            </Link>
          ))}
          {!teams.length && <p>Tu próximo equipo empieza acá.</p>}
        </div>
        <div className="sidebar-bottom">
          <span className="live-dot" />
          <p>
            Juntos, mejor.
            <br />
            <span>Un paso a la vez.</span>
          </p>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <TeamSelector teams={teams} />
          <div className="topbar-user">
            <Link href="/perfil">
              <span className="topbar-user-name">{user.name}</span>
              <Avatar name={user.name} githubUsername={user.githubUsername} />
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="icon-button"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <Icon name="logout" size={19} />
              </button>
            </form>
          </div>
        </header>
        <main id="contenido" className="main-content">
          {children}
        </main>
        <footer className="workspace-footer">
          Un mismo equipo. Un mismo rumbo.
        </footer>
      </div>
    </div>
  );
}
