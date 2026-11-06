"use client";

import Link from "next/link";
import useSWR from "swr";
import { ActionForm } from "@/shared/ui/action-form";
import { Avatar } from "@/shared/ui/avatar";
import { EmptyState } from "@/shared/ui/empty-state";
import { Icon } from "@/shared/ui/icon";
import { SessionFiles } from "./session-files";
import { SessionDelete } from "./session-delete";
import { SessionHistory } from "./session-history";
import styles from "./board.module.css";
import { ReportDownload } from "./report-download";
import {
  boardAction,
  startSessionAction,
  finishSessionAction,
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
    <div className={styles.board}>
      <div className="board-layout">
        <div className="board-main">
          <div className="board-summary">
            <div>
              <span className={styles.summaryIcon}>
                <Icon name="users" size={24} />
              </span>
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
          <section>
            <div className="section-heading">
              <h2>
                Trabajando ahora{" "}
                <span className="count-badge">{data.active.length}</span>
              </h2>
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
                    <div className={styles.taskPreview}>
                      <span className={styles.taskIcon}>
                        <Icon name="file" size={18} />
                      </span>
                      <div>
                        <span className={styles.taskLabel}>Trabajando en</span>
                        <h3 className="session-title">{session.title}</h3>
                        {session.description && (
                          <p className={styles.taskDescription}>
                            {session.description}
                          </p>
                        )}
                      </div>
                    </div>
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
          <SessionHistory sessions={data.history} slug={slug} currentUserId={currentUserId} onSaved={() => { void mutate(); }} />
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
                <SessionFiles key={mine.id} teamId={teamId} sessionId={mine.id} reports={mine.reports} canEdit onSaved={() => { void mutate(); }} />
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
                <SessionDelete key={mine.id} session={mine} onDeleted={() => { void mutate(); }} />
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
                </label>
                <label>
                  Descripción
                  <textarea
                    name="description"
                    rows={3}
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
            <span className={styles.tipIcon}>
              <Icon name="bulb" />
            </span>
            <strong>El contexto hace la diferencia</strong>
            <p>
              Una descripción clara ayuda a que el equipo se coordine mejor y
              evitemos duplicar esfuerzos.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
