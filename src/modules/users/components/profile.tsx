import { Avatar } from "@/shared/ui/avatar";
import { ActionForm } from "@/shared/ui/action-form";
import { updateProfileAction } from "../actions";

type Profile = {
  name: string;
  bio: string | null;
  githubUsername: string | null;
};
export function ProfileForm({ user }: { user: Profile & { email: string } }) {
  return (
    <div className="profile-layout">
      <section className="panel profile-preview">
        <Avatar {...user} size="large" />
        <h2>{user.name}</h2>
        <p className="muted">{user.email}</p>
        <span className="verified-badge">✓ Correo verificado</span>
        <p className="muted small">
          Tu avatar usa tu foto de GitHub. Si no agregás un usuario, mostramos
          tus iniciales.
        </p>
      </section>
      <section className="panel">
        <h2>Un poco sobre vos</h2>
        <p className="muted intro">
          Así te van a ver tus compañeros de equipo.
        </p>
        <ActionForm action={updateProfileAction} submitLabel="Guardar perfil">
          <label>
            Nombre
            <input
              name="name"
              defaultValue={user.name}
              autoComplete="name"
              required
              maxLength={80}
            />
          </label>
          <label>
            Biografía
            <textarea
              name="bio"
              defaultValue={user.bio ?? ""}
              maxLength={500}
              rows={5}
              placeholder="Qué hacés, qué te interesa…"
            />
            <span className="field-hint">Hasta 500 caracteres.</span>
          </label>
          <label>
            Usuario de GitHub
            <input
              name="githubUsername"
              defaultValue={user.githubUsername ?? ""}
              maxLength={39}
              placeholder="tu-usuario"
              autoComplete="off"
            />
            <span className="field-hint">Sin @ ni la dirección completa.</span>
          </label>
        </ActionForm>
      </section>
    </div>
  );
}
export function MemberProfile({ user }: { user: Profile }) {
  return (
    <section className="panel member-profile">
      <Avatar {...user} size="large" />
      <div>
        <span className="eyebrow">CONOCÉ A TU EQUIPO</span>
        <h1>{user.name}</h1>
        <p className="profile-bio">
          {user.bio || "Todavía no agregó una biografía."}
        </p>
        {user.githubUsername && (
          <a
            href={`https://github.com/${encodeURIComponent(user.githubUsername)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            @{user.githubUsername} en GitHub ↗
          </a>
        )}
      </div>
    </section>
  );
}
