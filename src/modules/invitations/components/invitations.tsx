import { ActionForm } from "@/shared/ui/action-form";
import { Icon } from "@/shared/ui/icon";
import {
  acceptInvitationAction,
  inviteAction,
  revokeInvitationAction,
} from "../actions";

export function PendingInvitations({
  invitations,
}: {
  invitations: { id: string; teamId: string; expiresAt: Date }[];
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <span className="panel-icon violet">
          <Icon name="mail" />
        </span>
        <div>
          <h2>
            Invitaciones pendientes{" "}
            <span className="count-badge">{invitations.length}</span>
          </h2>
          <p>Tu próximo equipo puede estar acá.</p>
        </div>
      </div>
      {invitations.length ? (
        <div className="list-stack">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="invitation-row">
              <div>
                <strong>Invitación a un equipo</strong>
                <p className="muted small">
                  Vence el{" "}
                  {invitation.expiresAt.toLocaleDateString("es-AR", {
                    timeZone: "America/Argentina/Buenos_Aires",
                  })}
                </p>
              </div>
              <ActionForm
                action={acceptInvitationAction}
                submitLabel="Aceptar"
                className="compact-form"
              >
                <input
                  type="hidden"
                  name="invitationId"
                  value={invitation.id}
                />
              </ActionForm>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted empty-copy">
          No tenés invitaciones pendientes. Cuando alguien te invite, también
          las vas a encontrar acá.
        </p>
      )}
    </section>
  );
}
export function InviteForm({ teamId }: { teamId: string }) {
  return (
    <section className="panel">
      <h2>El equipo crece</h2>
      <p className="muted intro">
        Enviá una invitación por correo. Tendrá 7 días para aceptarla.
      </p>
      <ActionForm
        action={inviteAction}
        submitLabel="Enviar invitación"
        resetOnSuccess
      >
        <input type="hidden" name="teamId" value={teamId} />
        <label>
          Correo electrónico
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="compa@ejemplo.com"
          />
        </label>
      </ActionForm>
    </section>
  );
}
export function TeamInvitations({
  teamId,
  invitations,
}: {
  teamId: string;
  invitations: { id: string; email: string; expiresAt: Date }[];
}) {
  if (!invitations.length) return null;
  return (
    <section className="panel">
      <h2>Invitaciones enviadas</h2>
      <div className="list-stack">
        {invitations.map((invitation) => (
          <div key={invitation.id} className="invitation-row">
            <div>
              <strong>{invitation.email}</strong>
              <p className="muted small">Pendiente de aceptación</p>
            </div>
            <ActionForm
              action={revokeInvitationAction}
              submitLabel="Revocar"
              variant="quiet"
              className="compact-form"
            >
              <input type="hidden" name="teamId" value={teamId} />
              <input type="hidden" name="invitationId" value={invitation.id} />
            </ActionForm>
          </div>
        ))}
      </div>
    </section>
  );
}
export function AcceptInvitationForm({
  invitationId,
}: {
  invitationId: string;
}) {
  return (
    <ActionForm
      action={acceptInvitationAction}
      submitLabel="Aceptar y entrar al equipo"
    >
      <input type="hidden" name="invitationId" value={invitationId} />
    </ActionForm>
  );
}
