import Link from "next/link";
import { invitationPageAction } from "@/modules/invitations/actions";
import { AcceptInvitationForm } from "@/modules/invitations/components/invitations";
import { Icon } from "@/shared/ui/icon";
import { WorkspaceShell } from "@/shared/ui/workspace-shell";

export const dynamic = "force-dynamic";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await invitationPageAction(token);
  return (
    <WorkspaceShell>
      <section className="panel invitation-page">
        <span className="empty-icon">
          <Icon name="mail" size={30} />
        </span>
        <span className="eyebrow">HAY UN LUGAR PARA VOS</span>
        <h1>
          {result.success
            ? "Te esperan en un equipo"
            : "Revisemos esa invitación"}
        </h1>
        <p className="muted">
          {result.success
            ? "Aceptá la invitación para compartir el tablero y empezar a colaborar."
            : result.message}
        </p>
        {result.invitation && (
          <AcceptInvitationForm invitationId={result.invitation.id} />
        )}
        <Link href="/" className="text-link">
          Volver a mis equipos
        </Link>
      </section>
    </WorkspaceShell>
  );
}
