import Link from "next/link";
import { ActionForm } from "@/shared/ui/action-form";
import { EmptyState } from "@/shared/ui/empty-state";
import { Icon } from "@/shared/ui/icon";
import { createTeamAction } from "../actions";

export function CreateTeamForm() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <span className="panel-icon">
          <Icon name="plus" />
        </span>
        <div>
          <h2>Un nuevo equipo</h2>
          <p>Invitá a tus compañeros y empiecen a colaborar.</p>
        </div>
      </div>
      <ActionForm action={createTeamAction} submitLabel="Crear equipo">
        <label>
          Nombre del equipo
          <input
            name="name"
            required
            maxLength={80}
            placeholder="Ej. Producto & Desarrollo"
          />
        </label>
        <label>
          Identificador del equipo
          <input
            name="slug"
            required
            maxLength={100}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="producto-desarrollo"
          />
          <span className="field-hint">
            Solo minúsculas, números y guiones. Se usa en la dirección del
            equipo.
          </span>
        </label>
      </ActionForm>
    </section>
  );
}
export function MyTeams({
  teams,
}: {
  teams: { id: string; name: string; slug: string }[];
}) {
  return (
    <section>
      <div className="section-heading">
        <h2>
          Tus equipos <span className="count-badge">{teams.length}</span>
        </h2>
        <span className="muted small">Un espacio para cada grupo</span>
      </div>
      {teams.length ? (
        <div className="team-grid">
          {teams.map((team, index) => (
            <Link
              key={team.id}
              className={`team-card team-color-${index % 3}`}
              href={`/t/${team.slug}`}
            >
              <span className="team-monogram">
                {team.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <h3>{team.name}</h3>
                <p>/{team.slug}</p>
              </div>
              <span className="team-card-arrow">
                <Icon name="arrow" />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState title="Lo bueno empieza con un equipo" icon="users">
            Creá el primero o aceptá una invitación para compartir tu espacio de
            trabajo.
          </EmptyState>
        </div>
      )}
    </section>
  );
}
