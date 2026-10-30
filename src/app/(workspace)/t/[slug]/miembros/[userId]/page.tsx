import Link from "next/link";
import { teamPageAction, memberProfileAction } from "@/modules/teams/actions";
import { memberHistoryAction } from "@/modules/work-sessions/actions";
import { MemberProfile } from "@/modules/users/components/profile";
import { MemberHistory } from "@/modules/work-sessions/components/member-history";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ slug: string; userId: string }>;
}) {
  const { slug, userId } = await params;
  const team = await teamPageAction(slug);
  const [profile, history] = await Promise.all([
    memberProfileAction(team.id, userId),
    memberHistoryAction(team.id, userId),
  ]);
  return (
    <div className="list-stack">
      <Link href={`/t/${team.slug}/miembros`} className="text-link">
        ← Volver a miembros
      </Link>
      <MemberProfile user={profile} />
      <MemberHistory sessions={history} />
    </div>
  );
}
