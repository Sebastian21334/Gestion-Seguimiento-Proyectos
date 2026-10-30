import Link from "next/link";
import { Avatar } from "@/shared/ui/avatar";
import { ActionForm } from "@/shared/ui/action-form";
import {
  removeMemberAction,
  renameTeamAction,
  leaveTeamAction,
  deleteTeamAction,
} from "../actions";

export function MembersList({
  members,
  team,
  currentUserId,
}: {
  members: {
    userId: string;
    role: "owner" | "member";
    user: { name: string; email: string; githubUsername: string | null };
  }[];
  team: { id: string; slug: string; role: "owner" | "member" };
  currentUserId: string;
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Quienes hacen el equipo</h2>
        <span className="count-badge">{members.length}</span>
      </div>
      <div className="member-list">
        {members.map((member) => (
          <div key={member.userId} className="member-row">
            <Link
              href={`/t/${team.slug}/miembros/${member.userId}`}
              className="member-identity"
            >
              <Avatar
                name={member.user.name}
                githubUsername={member.user.githubUsername}
              />
              <span>
                <strong>
                  {member.user.name}
                  {member.userId === currentUserId && (
                    <span className="muted"> (vos)</span>
                  )}
                </strong>
                <span className="muted small">{member.user.email}</span>
              </span>
            </Link>
            <span
              className={`role-badge ${member.role === "owner" ? "owner-badge" : ""}`}
            >
              {member.role === "owner" ? "Owner" : "Miembro"}
            </span>
            {team.role === "owner" && member.role !== "owner" && (
              <ActionForm
                action={removeMemberAction}
                submitLabel="Quitar"
                variant="quiet"
                className="compact-form"
                confirmMessage={`¿Quitar a ${member.user.name} del equipo?`}
              >
                <input type="hidden" name="teamId" value={team.id} />
                <input type="hidden" name="userId" value={member.userId} />
              </ActionForm>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
export function TeamSettings({
  team,
}: {
  team: { id: string; name: string; role: "owner" | "member" };
}) {
  return (
    <section className="panel">
      <h2>Ajustes del equipo</h2>
      {team.role === "owner" && (
        <ActionForm
          action={renameTeamAction}
          submitLabel="Actualizar nombre"
          variant="secondary"
        >
          <input type="hidden" name="teamId" value={team.id} />
          <label>
            Nombre
            <input
              name="name"
              defaultValue={team.name}
              required
              maxLength={80}
            />
          </label>
        </ActionForm>
      )}
      <div className="danger-zone">
        <h3>Abandonar equipo</h3>
        <p className="muted small">
          Si sos el último miembro y owner, se eliminará el equipo junto con sus
          datos. El owner no puede salir si hay otros miembros.
        </p>
        <ActionForm
          action={leaveTeamAction}
          submitLabel="Abandonar equipo"
          variant="secondary"
          confirmMessage="¿Querés abandonar este equipo? Si sos el último miembro, se eliminarán sus datos."
        >
          <input type="hidden" name="teamId" value={team.id} />
        </ActionForm>
        {team.role === "owner" && (
          <details>
            <summary>Eliminar equipo permanentemente</summary>
            <p className="muted small">
              Se borrarán sus documentos, sesiones e invitaciones.
            </p>
            <ActionForm
              action={deleteTeamAction}
              submitLabel="Eliminar equipo"
              variant="danger"
              confirmMessage="¿Eliminar el equipo y todos sus datos? Esta acción no se puede deshacer."
            >
              <input type="hidden" name="teamId" value={team.id} />
            </ActionForm>
          </details>
        )}
      </div>
    </section>
  );
}
