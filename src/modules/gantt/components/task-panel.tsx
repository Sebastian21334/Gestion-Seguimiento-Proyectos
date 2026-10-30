"use client";

import { useId, useState } from "react";
import { ActionForm } from "@/shared/ui/action-form";
import { Icon } from "@/shared/ui/icon";
import { addGanttCommentAction, createGanttTaskAction, deleteGanttTaskAction, editGanttTaskAction } from "../actions";
import type { Attachments, Gantt, Member, Phase, Session, Task } from "./types";
import { statusLabels, taskStatus } from "./gantt-chart";
import styles from "./gantt.module.css";

const todayDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const dateTime = (value: Date | string) => new Date(value).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" });
function duration(session: Session) {
  const minutes = Math.max(1, Math.round((new Date(session.endedAt ?? Date.now()).getTime() - new Date(session.startedAt).getTime()) / 60_000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function Fields({ members, task, tasks, phases, sessions, disabled, onStartDateChange }: {
  members: Member[]; task?: Task; tasks: Task[]; phases: Phase[]; sessions: Session[]; disabled?: boolean; onStartDateChange: (date: string) => void;
}) {
  const [progress, setProgress] = useState(task?.progress ?? 0);
  const [status, setStatus] = useState(task ? taskStatus(task) : "pending");
  const progressId = useId();
  const missingAssignee = task?.assigneeId && !members.some(member => member.userId === task.assigneeId);
  // No ofrecer una tarea que ya dependa de ésta, ni siquiera indirectamente.
  const blocked = new Set(task ? [task.id] : []);
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of tasks) if (!blocked.has(candidate.id) && candidate.dependencyIds.some(id => blocked.has(id))) { blocked.add(candidate.id); changed = true; }
  }
  return <fieldset className="g2-fields" disabled={disabled}>
    <label>Título<input name="title" required maxLength={120} defaultValue={task?.title} placeholder="¿Qué hay que hacer?" /></label>
    <label>Descripción<textarea name="description" rows={3} maxLength={1000} defaultValue={task?.description ?? ""} placeholder="Agregá contexto para el equipo" /></label>
    <div className="g2-field-row">
      <label>Responsable<select name="assigneeId" defaultValue={task?.assigneeId ?? ""}><option value="">Sin responsable</option>{missingAssignee && <option value={task!.assigneeId!}>{task?.assigneeName ?? "Exmiembro"} · exmiembro</option>}{members.map(member => <option key={member.userId} value={member.userId}>{member.user.name}</option>)}</select></label>
      <label>Estado<select name="status" value={status} className={`${styles.statusSelect} ${styles[status]}`} onChange={event => { const next = event.target.value as typeof status; setStatus(next); if (next === "done") setProgress(100); else if (next === "pending" || progress === 100) setProgress(0); }}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <label>Fase<select name="phaseId" defaultValue={task?.phaseId ?? ""}><option value="">Sin fase</option>{phases.map(phase => <option key={phase.id} value={phase.id}>{phase.name}</option>)}</select></label>
    <div className="g2-field-row">
      <label>Fecha de inicio<input name="startDate" type="date" required defaultValue={task?.startDate ?? todayDate()} onChange={event => onStartDateChange(event.target.value)} /></label>
      <label>Fecha de fin<input name="endDate" type="date" required defaultValue={task?.endDate ?? todayDate()} /></label>
    </div>
    <details className={styles.timeOptions}><summary>Horario de la actividad</summary><div className="g2-field-row"><label>Hora de inicio<input name="startTime" type="time" required defaultValue={task?.startTime ?? "09:00"} /></label><label>Hora de fin<input name="endTime" type="time" required defaultValue={task?.endTime ?? "17:00"} /></label></div></details>
    <label htmlFor={progressId}>Progreso<div className={styles.progressControl}><input id={progressId} type="range" name="progress" min={0} max={100} step={1} value={progress} onChange={event => { const next = Number(event.target.value); setProgress(next); setStatus(next === 100 ? "done" : next > 0 || status === "done" ? "active" : status); }} /><output htmlFor={progressId}>{progress}%</output></div></label>
    <label>Prioridad<select name="priority" defaultValue={task?.priority ?? "medium"} className={styles.prioritySelect}><option value="low">⚑ Baja</option><option value="medium">⚑ Media</option><option value="high">⚑ Alta</option><option value="urgent">⚑ Urgente</option></select></label>
    <fieldset className={styles.dependencyChoices}><legend>Depende de</legend><p>Actividades previas de este diagrama. Las flechas van del fin de la predecesora al inicio de esta tarea; las fechas se ajustan manualmente.</p>{tasks.filter(candidate => !blocked.has(candidate.id)).map(candidate => <label key={candidate.id}><input type="checkbox" name="dependencyIds" value={candidate.id} defaultChecked={task?.dependencyIds.includes(candidate.id)} /><span>{candidate.title}</span></label>)}{!tasks.some(candidate => !blocked.has(candidate.id)) && <span className="muted small">No hay otras actividades disponibles.</span>}</fieldset>
  </fieldset>;
}

export function TaskPanel({ teamId, diagramId, task, tasks, phases, comments, members, sessions, attachments, onClose, onSaved }: {
  teamId: string; diagramId: string; task?: Task; tasks: Task[]; phases: Phase[]; comments: Gantt["comments"]; members: Member[]; sessions: Session[]; attachments: Attachments; onClose: () => void; onSaved: (startDate?: string) => void;
}) {
  const [tab, setTab] = useState<"details" | "comments" | "files" | "work">("details");
  const [newStartDate, setNewStartDate] = useState(todayDate);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const related = sessions.filter(session => session.ganttTaskId === task?.id);
  const files = related.filter(session => session.reports.length);
  const phase = phases.find(phase => phase.id === task?.phaseId);
  const status = task ? taskStatus(task) : "pending";
  async function remove() {
    if (!task || !window.confirm("¿Eliminar esta tarea? Se eliminarán sus dependencias y comentarios. Las sesiones de trabajo se conservarán sin asociación al Gantt.")) return;
    setDeleting(true); setDeleteError("");
    const form = new FormData(); form.set("teamId", teamId); form.set("taskId", task.id);
    try {
      const result = await deleteGanttTaskAction({ success: false, message: "" }, form);
      if (result.success) { onClose(); onSaved(); } else setDeleteError(result.message);
    } catch { setDeleteError("No pudimos eliminar la tarea. Intentá nuevamente."); }
    finally { setDeleting(false); }
  }
  const fields = <Fields members={members} task={task} tasks={tasks} phases={phases} sessions={sessions} disabled={!!task && !task.canEdit} onStartDateChange={setNewStartDate} />;
  return <aside className="g2-panel" aria-label={task ? `Detalles de ${task.title}` : "Nueva tarea"}>
    <header className="g2-panel-top"><div><span className="g2-panel-kicker"><span className={`g2-task-dot ${status}`} />{phase?.name ?? "ACTIVIDAD DEL DIAGRAMA"}</span><h2>{task?.title ?? "Nueva tarea"}</h2></div><button type="button" className="g2-icon-button" onClick={onClose} aria-label="Cerrar panel"><Icon name="close" /></button></header>
    {task && <div className="g2-panel-tabs" role="group" aria-label="Información de la tarea">{([["details", "Detalles"], ["comments", "Comentarios"], ["files", "Archivos"], ["work", "Actividad"]] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={tab === value} className={tab === value ? "selected" : ""} onClick={() => setTab(value)}>{label}</button>)}</div>}
    <div className="g2-panel-content">
      {tab === "details" && <>
        {task && !task.canEdit ? <>{fields}<p className="g2-permission">Solo el responsable o el dueño pueden modificar esta actividad.</p></> : <ActionForm key={task ? `${task.id}:${task.status}:${task.progress}:${task.phaseId}:${task.dependencyIds.join(",")}` : "new"} className={`form-stack ${styles.taskForm}`} action={task ? editGanttTaskAction : createGanttTaskAction} submitLabel={task ? "Guardar cambios" : "Crear tarea"} pendingLabel="Guardando…" onSuccess={() => onSaved(task ? undefined : newStartDate)} footerActions={<>{task && <button type="button" className={styles.deleteButton} disabled={deleting} onClick={() => { void remove(); }}><Icon name="delete" size={15} />{deleting ? "Eliminando…" : "Eliminar"}</button>}<button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button></>}>
          <input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="diagramId" value={diagramId} />{task && <input type="hidden" name="taskId" value={task.id} />}{fields}
        </ActionForm>}
        {deleteError && <p className="notice notice-error" role="alert">{deleteError}</p>}
        {task && <p className={styles.creator}>Creada por {task.creatorName}</p>}
      </>}
      {tab === "comments" && task && <div className={styles.comments}>
        <ActionForm action={addGanttCommentAction} submitLabel="Comentar" onSuccess={() => onSaved()} resetOnSuccess><input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="taskId" value={task.id} /><label>Nuevo comentario<textarea name="content" required maxLength={2000} rows={3} placeholder="Compartí una actualización con el equipo" /></label></ActionForm>
        {comments.length ? comments.map(comment => <article key={comment.id}><strong>{comment.authorName}</strong><time>{dateTime(comment.createdAt)}</time><p>{comment.content}</p></article>) : <p className="g2-empty-small">Todavía no hay comentarios.</p>}
      </div>}
      {tab === "files" && <div className="g2-work-list">{files.length ? files.map(session => <article className="g2-work-card" key={session.id}><span className="g2-work-icon"><Icon name="file" size={16} /></span><div><strong>{session.title}</strong><p>Por {session.user.name}</p><div className="g2-work-files">{attachments[session.id]}</div></div></article>) : <div className="g2-empty-small"><Icon name="attachment" size={22} /><strong>Sin archivos adjuntos</strong><p>Los archivos de las sesiones asociadas a esta tarea aparecerán acá. Podés cargarlos desde tu tarea activa en el tablero.</p></div>}</div>}
      {tab === "work" && <div className="g2-work-list">{related.length ? related.map(session => <article className="g2-work-card" key={session.id}><span className="g2-work-icon"><Icon name="clock" size={16} /></span><div><strong>{session.title}</strong><p>Por {session.user.name}</p><p>Inicio: {dateTime(session.startedAt)}</p><p>Fin: {session.endedAt ? dateTime(session.endedAt) : "En curso"}</p><p suppressHydrationWarning>Duración: {duration(session)}</p><div className="g2-work-files">{session.reports.length ? attachments[session.id] : "Sin archivos adjuntos"}</div></div></article>) : <div className="g2-empty-small"><Icon name="clock" size={22} /><strong>Todavía no hay trabajo registrado</strong><p>Las sesiones asociadas aparecerán acá, con sus horarios y archivos.</p></div>}</div>}
    </div>
  </aside>;
}
