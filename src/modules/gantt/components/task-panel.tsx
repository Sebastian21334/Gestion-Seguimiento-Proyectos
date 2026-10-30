"use client";

import { useState } from "react";
import { ActionForm } from "@/shared/ui/action-form";
import { Icon } from "@/shared/ui/icon";
import {
  createGanttTaskAction,
  editGanttTaskAction,
  setGanttTaskCompletedAction,
} from "../actions";
import type { Attachments, Member, Session, Task } from "./types";

const dateTime = (value: Date | string) =>
  new Date(value).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "short",
  });
function duration(start: Date | string, end: Date | string | null) {
  const minutes = Math.max(
    1,
    Math.round(
      (new Date(end ?? Date.now()).getTime() - new Date(start).getTime()) /
        60000,
    ),
  );
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
function Fields({
  members,
  task,
  disabled,
  onStartDateChange,
}: {
  members: Member[];
  task?: Task;
  disabled?: boolean;
  onStartDateChange?: (value: string) => void;
}) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
  const missingAssignee =
    task?.assigneeId &&
    !members.some((member) => member.userId === task.assigneeId);
  return (
    <fieldset className="g2-fields" disabled={disabled}>
      <label>
        Título
        <input
          name="title"
          required
          maxLength={120}
          defaultValue={task?.title}
          placeholder="¿Qué hay que hacer?"
        />
      </label>
      <label>
        Descripción
        <textarea
          name="description"
          rows={4}
          maxLength={1000}
          defaultValue={task?.description ?? ""}
          placeholder="Agregá contexto para el equipo"
        />
      </label>
      <label>
        Responsable
        <select name="assigneeId" defaultValue={task?.assigneeId ?? ""}>
          <option value="">Sin responsable</option>
          {missingAssignee && (
            <option value={task!.assigneeId!}>
              {task?.assigneeName ?? "Exmiembro"} · ya no pertenece al equipo
            </option>
          )}
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.user.name}
            </option>
          ))}
        </select>
      </label>
      <div className="g2-field-row">
        <label>
          Fecha de inicio
          <input
            name="startDate"
            type="date"
            required
            defaultValue={task?.startDate ?? today}
            onChange={(event) => onStartDateChange?.(event.target.value)}
          />
        </label>
        <label>
          Fecha de fin
          <input
            name="endDate"
            type="date"
            required
            defaultValue={task?.endDate ?? today}
          />
        </label>
      </div>
      <div className="g2-field-row">
        <label>
          Hora de inicio
          <input
            name="startTime"
            type="time"
            required
            defaultValue={task?.startTime ?? "09:00"}
          />
        </label>
        <label>
          Hora de fin
          <input
            name="endTime"
            type="time"
            required
            defaultValue={task?.endTime ?? "17:00"}
          />
        </label>
      </div>
    </fieldset>
  );
}
export function TaskPanel({
  teamId,
  diagramId,
  task,
  members,
  sessions,
  attachments,
  onClose,
  onSaved,
}: {
  teamId: string;
  diagramId: string;
  task?: Task;
  members: Member[];
  sessions: Session[];
  attachments: Attachments;
  onClose: () => void;
  onSaved: (startDate?: string) => void;
}) {
  const [tab, setTab] = useState<"details" | "work">("details");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusPending, setStatusPending] = useState(false);
  const [newStartDate, setNewStartDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date()));
  const related = task
    ? sessions.filter((session) => session.ganttTaskId === task.id)
    : [];
  const hasWork = related.length > 0;
  const status = task?.completed
    ? "Terminada"
    : hasWork
      ? "En curso"
      : "Pendiente";
  async function toggleStatus() {
    if (!task) return;
    setStatusPending(true);
    setStatusMessage("");
    try {
      const result = await setGanttTaskCompletedAction({
        teamId,
        taskId: task.id,
        completed: !task.completed,
      });
      setStatusMessage(result.message);
      if (result.success) onSaved();
    } catch {
      setStatusMessage("No pudimos actualizar el estado. Intentá nuevamente.");
    } finally {
      setStatusPending(false);
    }
  }
  const hidden = (
    <>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="diagramId" value={diagramId} />
      {task && <input type="hidden" name="taskId" value={task.id} />}
    </>
  );
  return (
    <aside
      className="g2-panel"
      aria-label={task ? `Detalles de ${task.title}` : "Nueva tarea"}
    >
      <div className="g2-panel-top">
        <div>
          <span className="g2-panel-kicker">
            <span className="g2-dot" />
            {task ? "ACTIVIDAD DEL DIAGRAMA" : "PLANIFICACIÓN"}
          </span>
          <h2>{task ? task.title : "Nueva tarea"}</h2>
        </div>
        <button
          type="button"
          className="g2-icon-button"
          onClick={onClose}
          aria-label="Cerrar panel"
        >
          ×
        </button>
      </div>
      {task && (
        <div
          className="g2-panel-tabs"
          role="group"
          aria-label="Información de la tarea"
        >
          <button
            type="button"
            aria-pressed={tab === "details"}
            className={tab === "details" ? "selected" : ""}
            onClick={() => setTab("details")}
          >
            Detalles
          </button>
          <button
            type="button"
            aria-pressed={tab === "work"}
            className={tab === "work" ? "selected" : ""}
            onClick={() => setTab("work")}
          >
            Trabajo realizado <span>{related.length}</span>
          </button>
        </div>
      )}
      <div className="g2-panel-content">
        {tab === "work" && task ? (
          <div className="g2-work-list">
            {related.length ? (
              related.map((session) => (
                <article className="g2-work-card" key={session.id}>
                  <span className="g2-work-icon">
                    <Icon name="clock" size={16} />
                  </span>
                  <div>
                    <strong>{session.title}</strong>
                    <p>Por {session.user.name}</p>
                    <p>Inicio: {dateTime(session.startedAt)}</p>
                    <p>
                      Fin:{" "}
                      {session.endedAt ? dateTime(session.endedAt) : "En curso"}
                    </p>
                    <p suppressHydrationWarning>
                      Duración: {duration(session.startedAt, session.endedAt)}
                    </p>
                    <div className="g2-work-files">
                      {session.reports.length ? (
                        attachments[session.id]
                      ) : (
                        <span>Sin archivos adjuntos</span>
                      )}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="g2-empty-small">
                <Icon name="clock" size={22} />
                <strong>Todavía no hay trabajo registrado</strong>
                <p>
                  Las sesiones asociadas aparecerán acá, con sus horarios y
                  archivos.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {task && (
              <div className="g2-status-block">
                <div>
                  <span className="g2-label">Estado</span>
                  <span
                    className={`g2-badge ${task.completed ? "done" : hasWork ? "active" : "pending"}`}
                  >
                    {status}
                  </span>
                </div>
                <span className="g2-created">
                  Creada por {task.creatorName}
                </span>
              </div>
            )}
            {task && !task.canEdit ? (
              <>
                <Fields members={members} task={task} disabled />
                <p className="g2-permission">
                  Solo el responsable o el dueño pueden modificar esta
                  actividad.
                </p>
              </>
            ) : (
              <ActionForm
                key={task?.id ?? "new"}
                action={task ? editGanttTaskAction : createGanttTaskAction}
                submitLabel={task ? "Guardar cambios" : "Crear tarea"}
                pendingLabel="Guardando…"
              onSuccess={() => onSaved(task ? undefined : newStartDate)}
              >
                {hidden}
              <Fields members={members} task={task} onStartDateChange={setNewStartDate} />
              </ActionForm>
            )}
            {task?.canEdit && (
              <button
                type="button"
                className="g2-complete"
                disabled={statusPending}
                onClick={toggleStatus}
              >
                {statusPending
                  ? "Actualizando…"
                  : task.completed
                    ? "↺ Reabrir tarea"
                    : "✓ Marcar como terminada"}
              </button>
            )}
            {statusMessage && (
              <p className="g2-feedback" role="status">
                {statusMessage}
              </p>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
