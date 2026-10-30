"use client";

import Link from "next/link";
import useSWR from "swr";
import { ActionForm } from "@/shared/ui/action-form";
import { Avatar } from "@/shared/ui/avatar";
import { EmptyState } from "@/shared/ui/empty-state";
import { Icon } from "@/shared/ui/icon";
import { ReportField } from "./report-field";
import { ReportDownload } from "./report-download";
import {
  boardAction,
  startSessionAction,
  finishSessionAction,
  uploadSessionReportAction,
} from "../actions";

type BoardData = Awaited<ReturnType<typeof boardAction>>;
function elapsed(date: Date | string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(date).getTime()) / 60_000),
  );
  return minutes < 1
    ? "Recién empezó"
    : minutes < 60
      ? `Hace ${minutes} min`
      : `Hace ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
function duration(start: Date | string, end: Date | string | null) {
  const minutes = Math.max(
    1,
    Math.round(
      (new Date(end ?? Date.now()).getTime() - new Date(start).getTime()) /
        60_000,
    ),
  );
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
function History({
  sessions,
  slug,
}: {
  sessions: BoardData["history"];
  slug: string;
}) {
  return (
    <section className="panel history-panel">
      <div className="section-heading">
        <div>
          <h2>Lo que ya avanzamos</h2>
          <p className="muted small">Las últimas 20 sesiones del equipo</p>
        </div>
        <span className="subtle-icon">
          <Icon name="clock" />
        </span>
      </div>
      {sessions.length ? (
        <div className="history-list">
          {sessions.map((session) => (
            <div key={session.id} className="history-row">
              <Avatar
                name={session.user.name}
                githubUsername={session.user.githubUsername}
              />
              <div className="history-main">
                <div>
                  <strong>{session.user.name}</strong>
                  <span className="muted small"> terminó </span>
                  <Link
                    href={`/t/${slug}/miembros/${session.userId}`}
                    className="area-inline"
                  >
                    {session.title}
                  </Link>
                </div>
                <p>{session.description}</p>
                <p>
                  Gantt:{" "}
                  {session.ganttTask
                    ? `${session.ganttDiagramName} · ${session.ganttTask.title}`
                    : "Sin asociación (sesión anterior)"}
                </p>
                <p>
                  Inicio:{" "}
                  {new Date(session.startedAt).toLocaleString("es-AR", {
                    timeZone: "America/Argentina/Buenos_Aires",
                  })}{" "}
                  · Fin:{" "}
                  {session.endedAt
                    ? new Date(session.endedAt).toLocaleString("es-AR", {
                        timeZone: "America/Argentina/Buenos_Aires",
                      })
                    : "En curso"}
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
              </div>
              <span className="duration">
                <Icon name="check" size={14} />
                {duration(session.startedAt, session.endedAt)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="El historial empieza con ustedes" icon="clock">
          Las sesiones terminadas aparecerán acá.
        </EmptyState>
      )}
    </section>
  );
}
export function WorkBoard({
  teamId,
  slug,
  currentUserId,
  initialData,
}: {
  teamId: string;
  slug: string;
  currentUserId: string;
  initialData: BoardData;
}) {
  const {
    data = initialData,
    error,
    isValidating,
    mutate,
  } = useSWR(["board", teamId], () => boardAction(teamId), {
    fallbackData: initialData,
    refreshInterval: 9000,
    revalidateOnFocus: true,
    dedupingInterval: 1000,
  });
  const mine = data.active.find((session) => session.userId === currentUserId);
  const collisions = data.active.filter((session) =>
    data.active.some(
      (other) =>
        other.userId !== session.userId &&
        other.title.toLocaleLowerCase("es") ===
          session.title.toLocaleLowerCase("es"),
    ),
  );
  return (
    <>
      <div className="board-summary">
        <div>
          <span className="summary-number">
            {data.active.length.toString().padStart(2, "0")}
          </span>
          <span>
            personas trabajando
            <br />
            <strong>ahora mismo</strong>
          </span>
        </div>
        <div className="sync-label">
          <span className={`live-dot ${error ? "dot-error" : ""}`} />
          {error
            ? "Sin actualizar"
            : isValidating
              ? "Actualizando…"
              : "Se actualiza automáticamente"}
          <span className="sync-interval">cada 9 s</span>
        </div>
      </div>
      {error && (
        <p className="notice notice-error" role="alert">
          No pudimos actualizar el tablero. Revisá tu conexión o volvé a iniciar
          sesión.
        </p>
      )}
      {collisions.length > 0 && (
        <p className="notice notice-warning" role="status">
          Hay tareas activas con el mismo título. Coordinen antes de trabajar:{" "}
          {[...new Set(collisions.map((session) => session.title))].join(", ")}.
        </p>
      )}
      <div className="board-layout">
        <div className="board-main">
          <section>
            <div className="section-heading">
              <h2>
                Trabajando ahora{" "}
                <span className="count-badge">{data.active.length}</span>
              </h2>
              <span className="live-label">
                <span className="live-dot" />
                EN VIVO
              </span>
            </div>
            {data.active.length ? (
              <div className="session-grid">
                {data.active.map((session) => (
                  <article
                    className={`session-card ${session.userId === currentUserId ? "my-session" : ""}`}
                    key={session.id}
                  >
                    <div className="session-person">
                      <Link href={`/t/${slug}/miembros/${session.userId}`}>
                        <Avatar
                          name={session.user.name}
                          githubUsername={session.user.githubUsername}
                        />
                      </Link>
                      <div>
                        <strong>
                          {session.user.name}
                          {session.userId === currentUserId && (
                            <span className="muted"> (vos)</span>
                          )}
                        </strong>
                        <span className="session-status">
                          <span className="live-dot" />
                          En foco
                        </span>
                      </div>
                      <Icon name="code" size={20} />
                    </div>
                    <h3 className="session-title">{session.title}</h3>
                    <p className="session-description">{session.description}</p>
                    {session.reports.map((report) => (
                      <ReportDownload
                        key={report.id}
                        teamId={session.teamId}
                        sessionId={session.id}
                        reportId={report.id}
                        name={report.name}
                      />
                    ))}
                    <div className="session-footer">
                      <Icon name="clock" size={15} />
                      <span suppressHydrationWarning>
                        {elapsed(session.startedAt)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="panel">
                <EmptyState title="Todo listo para empezar" icon="code">
                  Contale al equipo qué vas a hacer. Tu tarea aparecerá acá.
                </EmptyState>
              </div>
            )}
          </section>
          <History sessions={data.history} slug={slug} />
        </div>
        <aside className="board-aside">
          <section className="panel start-panel">
            <span className="panel-icon">
              <Icon name={mine ? "check" : "plus"} />
            </span>
            <h2>{mine ? "Tu tarea activa" : "¿En qué vas a trabajar?"}</h2>
            <p className="muted intro">
              {mine
                ? `Estás trabajando en «${mine.title}». Cerrá esta tarea antes de empezar otra.`
                : "Compartí tu próximo paso y evitá pisarte con alguien."}
            </p>
            {mine ? (
              <>
                {mine.reports.length > 0 && (
                  <div className="session-attachments">
                    <strong>Archivos cargados</strong>
                    {mine.reports.map((report) => (
                      <ReportDownload
                        key={report.id}
                        teamId={teamId}
                        sessionId={mine.id}
                        reportId={report.id}
                        name={report.name}
                      />
                    ))}
                  </div>
                )}
                <ActionForm
                  action={uploadSessionReportAction}
                  submitLabel="Agregar archivos .md"
                  onSuccess={() => {
                    void mutate();
                  }}
                  resetOnSuccess
                >
                  <input type="hidden" name="teamId" value={teamId} />
                  <input type="hidden" name="sessionId" value={mine.id} />
                  <ReportField required />
                </ActionForm>
                <hr />
                <ActionForm
                  action={finishSessionAction}
                  submitLabel="Cerrar tarea"
                  onSuccess={() => {
                    void mutate();
                  }}
                >
                  <input type="hidden" name="teamId" value={teamId} />
                  <input type="hidden" name="sessionId" value={mine.id} />
                </ActionForm>
              </>
            ) : (
              <ActionForm
                action={startSessionAction}
                submitLabel="Empezar tarea"
                pendingLabel="Iniciando…"
                onSuccess={() => {
                  void mutate();
                }}
                resetOnSuccess
              >
                <input type="hidden" name="teamId" value={teamId} />
                <label>
                  Título
                  <input
                    name="title"
                    required
                    maxLength={120}
                    placeholder="Ej. Agregar filtros al tablero"
                  />
                  <span className="field-hint">
                    Resumí qué vas a hacer en esta tarea.
                  </span>
                </label>
                <label>
                  Descripción
                  <textarea
                    name="description"
                    rows={4}
                    required
                    maxLength={1000}
                    placeholder="Un poco de contexto para tus compañeros…"
                  />
                </label>
                <label>
                  Tarea del Gantt
                  <select name="ganttTaskId" required defaultValue="">
                    <option value="" disabled>
                      Elegí una tarea
                    </option>
                    {data.gantt.tasks
                      .filter(
                        (task) =>
                          !task.completed &&
                          (!task.assigneeId ||
                            task.assigneeId === currentUserId),
                      )
                      .map((task) => (
                        <option key={task.id} value={task.id}>
                          {
                            data.gantt.diagrams.find(
                              (diagram) => diagram.id === task.diagramId,
                            )?.name
                          }{" "}
                          · {task.title}
                        </option>
                      ))}
                  </select>
                  <span className="field-hint">
                    Elegí una tarea sin responsable o asignada a vos. Creala
                    primero en Gantt si hace falta.
                  </span>
                </label>
              </ActionForm>
            )}
          </section>
          <div className="tip-card">
            <Icon name="users" />
            <strong>El contexto hace la diferencia</strong>
            <p>
              Una descripción clara ayuda a que el equipo se coordine sin
              interrumpirse.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
