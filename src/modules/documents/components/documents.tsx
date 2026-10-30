import Link from "next/link";
import { ActionForm } from "@/shared/ui/action-form";
import { EmptyState } from "@/shared/ui/empty-state";
import { Icon } from "@/shared/ui/icon";
import { addDocumentAction, deleteDocumentAction } from "../actions";
import type { documentsPageAction } from "../actions";

const labels = { gantt: "Gantt", doc: "Documento", other: "Otro" };
export function DocumentFilters({
  slug,
  selected,
}: {
  slug: string;
  selected?: string;
}) {
  return (
    <nav className="filter-bar" aria-label="Filtrar documentos">
      {[
        { value: "", label: "Todos" },
        { value: "gantt", label: "Gantt" },
        { value: "doc", label: "Documentos" },
        { value: "other", label: "Otros" },
      ].map((filter) => (
        <Link
          key={filter.value}
          className={filter.value === (selected ?? "") ? "selected" : ""}
          href={`/t/${slug}/documentos${filter.value ? `?tipo=${filter.value}` : ""}`}
        >
          {filter.label}
        </Link>
      ))}
    </nav>
  );
}
export function DocumentList({
  documents,
  teamId,
}: {
  documents: Awaited<ReturnType<typeof documentsPageAction>>;
  teamId: string;
}) {
  const sorted = [...documents].sort(
    (a, b) => Number(b.type === "gantt") - Number(a.type === "gantt"),
  );
  return (
    <section>
      {sorted.length ? (
        <div className="document-grid">
          {sorted.map((doc) => (
            <article
              className={`document-card ${doc.type === "gantt" ? "gantt-card" : ""}`}
              key={doc.id}
            >
              <div className="section-heading">
                <span
                  className={`document-icon ${doc.type === "gantt" ? "violet" : ""}`}
                >
                  <Icon
                    name={doc.type === "gantt" ? "grid" : "file"}
                    size={24}
                  />
                </span>
                <span className="role-badge">{labels[doc.type]}</span>
              </div>
              {doc.type === "gantt" && (
                <span className="eyebrow">EL PLAN DEL EQUIPO</span>
              )}
              <h2>
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  {doc.title} <Icon name="arrow" size={18} />
                </a>
              </h2>
              <p className="muted">{doc.description || "Sin descripción"}</p>
              <div className="document-footer">
                <span className="small muted">Por {doc.creatorName}</span>
                {doc.canDelete && (
                  <ActionForm
                    action={deleteDocumentAction}
                    submitLabel="Borrar"
                    variant="quiet"
                    className="compact-form"
                    confirmMessage={`¿Borrar el enlace a «${doc.title}»?`}
                  >
                    <input type="hidden" name="teamId" value={teamId} />
                    <input type="hidden" name="documentId" value={doc.id} />
                  </ActionForm>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState title="Un lugar para todo lo importante" icon="file">
            Agregá el Gantt del equipo y los enlaces a sus documentos.
          </EmptyState>
        </div>
      )}
    </section>
  );
}
export function AddDocumentForm({ teamId }: { teamId: string }) {
  return (
    <section className="panel">
      <span className="panel-icon">
        <Icon name="plus" />
      </span>
      <h2>Siempre a mano</h2>
      <p className="muted intro">Compartí un enlace con tu equipo.</p>
      <ActionForm
        action={addDocumentAction}
        submitLabel="Agregar documento"
        resetOnSuccess
      >
        <input type="hidden" name="teamId" value={teamId} />
        <label>
          Título
          <input
            name="title"
            required
            maxLength={120}
            placeholder="Ej. Planificación del sprint"
          />
        </label>
        <label>
          Enlace
          <input
            name="url"
            type="url"
            required
            maxLength={2048}
            placeholder="https://…"
          />
        </label>
        <label>
          Tipo
          <select name="type" defaultValue="doc">
            <option value="gantt">Gantt</option>
            <option value="doc">Documento</option>
            <option value="other">Otro</option>
          </select>
        </label>
        <label>
          Descripción <span className="muted">(opcional)</span>
          <textarea
            name="description"
            maxLength={500}
            rows={3}
            placeholder="¿Qué van a encontrar acá?"
          />
        </label>
      </ActionForm>
    </section>
  );
}
