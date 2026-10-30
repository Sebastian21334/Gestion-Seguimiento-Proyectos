import { EmptyState } from "@/shared/ui/empty-state";
import type { memberHistoryAction } from "../actions";
import { ReportDownload } from "./report-download";

export function MemberHistory({
  sessions,
}: {
  sessions: Awaited<ReturnType<typeof memberHistoryAction>>;
}) {
  return (
    <section className="panel">
      <h2>Actividad en este equipo</h2>
      {sessions.length ? (
        <div className="list-stack">
          {sessions.map((session) => (
            <article key={session.id} className="member-history-row">
              <strong className="session-title">{session.title}</strong>
              <p>{session.description}</p>
              <p>
                Gantt:{" "}
                {session.ganttTask?.title ?? "Sin asociación (sesión anterior)"}
              </p>
              {session.reports.map((report) => (
                <ReportDownload
                  key={report.id}
                  teamId={session.teamId}
                  sessionId={session.id}
                  reportId={report.id}
                  name={report.name}
                />
              ))}
              <span className="muted small">
                {session.startedAt.toLocaleString("es-AR", {
                  timeZone: "America/Argentina/Buenos_Aires",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Todavía sin sesiones terminadas" icon="clock">
          Su actividad reciente en este equipo aparecerá acá.
        </EmptyState>
      )}
    </section>
  );
}
