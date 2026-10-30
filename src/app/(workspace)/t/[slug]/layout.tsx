import { teamPageAction } from "@/modules/teams/actions";
import { TeamNavigation } from "@/shared/ui/navigation";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await teamPageAction(slug);
  return (
    <>
      <div className="page-heading team-page-heading">
        <div>
          <span className="eyebrow">ESPACIO DE EQUIPO</span>
          <h1>
            {team.name}
            <span className="heading-dot">.</span>
          </h1>
          <p>Lo que está pasando, en un mismo lugar.</p>
        </div>
        <span className="team-heading-badge">/{team.slug}</span>
      </div>
      <TeamNavigation slug={team.slug} />
      {children}
    </>
  );
}
