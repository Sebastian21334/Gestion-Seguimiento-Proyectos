"use client";

import { useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Avatar } from "@/shared/ui/avatar";
import { Icon } from "@/shared/ui/icon";
import type { Gantt, Phase, Session, Task } from "./types";
import styles from "./gantt.module.css";

const DAY = 86400000;
export const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY);
const fraction = (time: string) => { const [hour, minute] = time.split(":").map(Number); return (hour * 60 + minute) / 1440; };
export function taskStatus(task: Task) {
  return task.completed ? "done" : task.status === "active" ? "active" : "pending";
}
export const statusLabels = { pending: "Pendiente", active: "En curso", done: "Completada" };
const ROW_HEIGHT = 44;
type Row = { kind: "phase"; phase: Phase } | { kind: "task"; task: Task };

export function GanttChart({ data, diagramId, search, first, count, width, scale, today, selectedId, moving, sessions, onSelect, onEditPhase, onMove }: {
  data: Gantt; diagramId: string; search: string; first: number; count: number; width: number;
  scale: "day" | "week" | "month"; today: number; selectedId: string | null; moving: string | null;
  sessions: Session[]; onSelect: (id: string) => void; onEditPhase: (id: string) => void; onMove: (task: Task, days: number) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const drag = useRef<{ id: string; x: number; moved: boolean } | null>(null);
  const skipClick = useRef(false);
  const markerId = `dependency-${useId().replace(/:/g, "")}`;
  const phases = data.phases.filter(phase => phase.diagramId === diagramId);
  const query = search.trim().toLocaleLowerCase("es");
  const allTasks = data.tasks.filter(task => task.diagramId === diagramId);
  const matches = (task: Task, phase?: Phase) => `${task.title} ${task.assigneeName ?? ""} ${phase?.name ?? ""}`.toLocaleLowerCase("es").includes(query);
  const rows: Row[] = [];
  for (const phase of phases) {
    const tasks = allTasks.filter(task => task.phaseId === phase.id && matches(task, phase));
    if (query && !tasks.length && !phase.name.toLocaleLowerCase("es").includes(query)) continue;
    rows.push({ kind: "phase", phase });
    if (!collapsed.has(phase.id) || query) for (const task of tasks) rows.push({ kind: "task", task });
  }
  for (const task of allTasks.filter(task => !task.phaseId && matches(task))) rows.push({ kind: "task", task });
  const ticks: { offset: number; days: number }[] = [];
  const months: { label: string; days: number }[] = [];
  for (let offset = 0; offset < count;) {
    const date = new Date((first + offset) * DAY);
    const nextMonth = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) / DAY;
    const days = Math.min(count - offset, scale === "day" ? 1 : scale === "week" ? 7 : nextMonth - first - offset);
    ticks.push({ offset, days }); offset += days;
  }
  for (let offset = 0; offset < count; offset++) {
    const label = new Date((first + offset) * DAY).toLocaleDateString("es-AR", { timeZone: "UTC", month: "long", year: "numeric" });
    if (months.at(-1)?.label === label) months[months.length - 1].days++;
    else months.push({ label, days: 1 });
  }
  const coordinates = (task: { startDate: string; endDate: string; startTime: string; endTime: string }) => ({
    start: (dayNumber(task.startDate) + fraction(task.startTime) - first) * width,
    end: (dayNumber(task.endDate) + fraction(task.endTime) - first) * width,
  });
  const trackStyle: CSSProperties = { width: count * width, backgroundSize: `${width * (scale === "day" ? 1 : 7)}px 100%`, backgroundImage: scale === "month" ? "none" : undefined };
  return (
    <div className={styles.chartShell}>
      <div className="g2-chart-card">
        <div className="g2-scroll" aria-label="Diagrama de Gantt desplazable horizontalmente" tabIndex={0}>
          <div className={`g2-grid ${styles.chartGrid}`} style={{ width: `calc(var(--gantt-fixed) + ${count * width}px)` }}>
            <div className="g2-header-row">
              <div className="g2-fixed g2-column-head"><span>Tarea</span><span>Responsable</span><span>Estado</span><span>Progreso</span></div>
              <div className="g2-timeline-header" style={{ width: count * width }}>
                <div className="g2-months">{months.map((month, index) => <div key={index} style={{ width: month.days * width }}>{month.label}</div>)}</div>
                <div className="g2-date-ticks">{ticks.map(({ offset, days }) => {
                  const date = new Date((first + offset) * DAY);
                  return <div key={offset} className={today >= first + offset && today < first + offset + days ? "today" : ""} style={{ width: days * width }}>
                    <strong>{date.toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", ...(scale !== "day" ? { month: "short" } : {}) })}</strong>
                    {scale === "day" && <span>{date.toLocaleDateString("es-AR", { timeZone: "UTC", weekday: "short" })}</span>}
                  </div>;
                })}</div>
              </div>
            </div>
            <div className={styles.chartBody}>
              <svg className={styles.dependencies} width={count * width} height={rows.length * ROW_HEIGHT} aria-hidden="true">
                <defs><marker id={markerId} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#8c9bb2" /></marker></defs>
                {data.dependencies.map(edge => {
                  const fromIndex = rows.findIndex(row => row.kind === "task" && row.task.id === edge.dependsOnId);
                  const toIndex = rows.findIndex(row => row.kind === "task" && row.task.id === edge.taskId);
                  if (fromIndex < 0 || toIndex < 0) return null;
                  const from = rows[fromIndex]; const to = rows[toIndex];
                  if (from.kind !== "task" || to.kind !== "task") return null;
                  const x1 = coordinates(from.task).end; const x2 = coordinates(to.task).start;
                  if (x1 < 0 || x1 > count * width || x2 < 0 || x2 > count * width) return null;
                  const y1 = fromIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
                  const y2 = toIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
                  const middleY = y2 > y1 ? y2 - ROW_HEIGHT / 2 : y2 + ROW_HEIGHT / 2;
                  return <path key={`${edge.taskId}-${edge.dependsOnId}`} d={`M${x1},${y1} H${x1 + 10} V${middleY} H${x2 - 10} V${y2} H${x2 - 1}`} fill="none" stroke="#8c9bb2" strokeWidth="1.5" strokeLinejoin="round" markerEnd={`url(#${markerId})`} />;
                })}
              </svg>
              {rows.map(row => {
                if (row.kind === "phase") {
                  const phase = row.phase;
                  const position = phase.startDate && phase.endDate ? coordinates({ startDate: phase.startDate, endDate: phase.endDate, startTime: phase.startTime!, endTime: phase.endTime! }) : null;
                  const left = Math.max(0, position?.start ?? 0); const right = Math.min(count * width, position?.end ?? 0);
                  return <div key={`phase-${phase.id}`} className={`g2-row ${styles.phaseRow}`} style={{ "--phase-color": `var(--phase-${phase.color})` } as CSSProperties}>
                    <div className="g2-fixed g2-cells">
                      <div className={styles.phaseName}>
                        <button type="button" aria-expanded={!collapsed.has(phase.id) || !!query} aria-label={`${collapsed.has(phase.id) ? "Expandir" : "Contraer"} ${phase.name}`} onClick={() => setCollapsed(current => { const next = new Set(current); if (next.has(phase.id)) next.delete(phase.id); else next.add(phase.id); return next; })}><span className={collapsed.has(phase.id) && !query ? "" : styles.expanded}><Icon name="chevron" size={12} /></span></button>
                        <button type="button" onClick={() => onEditPhase(phase.id)} title={`Ver fase ${phase.name}`}><i />{phase.name}</button>
                      </div>
                      <span /><span /><strong className={styles.rowProgress}>{phase.progress}%</strong>
                    </div>
                    <div className="g2-track" style={trackStyle}>
                      {today >= first && today < first + count && <span className="g2-today-line" style={{ left: (today - first) * width, width }} />}
                      {right > left && <button type="button" className={styles.phaseBar} onClick={() => onEditPhase(phase.id)} style={{ left, width: Math.max(12, right - left) }} title={`${phase.name}: ${phase.startDate} – ${phase.endDate} · ${phase.taskCount} tareas · ${phase.progress}%`} aria-label={`Ver fase ${phase.name}, ${phase.progress}%`}><span style={{ width: `${phase.progress}%` }} /></button>}
                    </div>
                  </div>;
                }
                const task = row.task; const status = taskStatus(task); const position = coordinates(task);
                const left = Math.max(0, position.start); const right = Math.min(count * width, position.end);
                return <div key={task.id} className={`g2-row ${selectedId === task.id ? "selected" : ""}`}>
                  <div className="g2-fixed g2-cells">
                    <button type="button" className={`g2-task-name ${task.phaseId ? styles.childTask : ""}`} onClick={() => onSelect(task.id)} title={`${task.title} · Prioridad: ${{ low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente" }[task.priority] ?? task.priority}`}><span className={`g2-task-dot ${status}`} /><span>{task.title}</span>{(task.priority === "high" || task.priority === "urgent") && <b className={styles.priorityMark} aria-label={`Prioridad ${task.priority === "urgent" ? "urgente" : "alta"}`}>!</b>}</button>
                    <div className="g2-person">{task.assigneeName ? <Avatar name={task.assigneeName} githubUsername={task.assigneeGithubUsername} /> : <span className="g2-unassigned" title="Sin responsable">—</span>}</div>
                    <div><span className={`g2-badge ${status}`}>{statusLabels[status]}</span></div>
                    <span className={styles.rowProgress}>{task.progress}%</span>
                  </div>
                  <div className="g2-track" style={trackStyle}>
                    {scale === "month" && ticks.slice(1).map(tick => <span key={tick.offset} className="g2-month-line" style={{ left: tick.offset * width }} />)}
                    {today >= first && today < first + count && <span className="g2-today-line" style={{ left: (today - first) * width, width }} />}
                    {right > left && <button type="button" className={`g2-bar ${status} ${selectedId === task.id ? "selected" : ""} ${task.canEdit ? "movable" : ""}`} style={{ left, width: Math.max(12, right - left) }} disabled={moving === task.id} title={`${task.title}: ${task.startDate} ${task.startTime} – ${task.endDate} ${task.endTime} · ${task.progress}%${task.canEdit ? " · Arrastrá para mover" : ""}`} aria-label={`Abrir ${task.title}. Progreso ${task.progress}%.`}
                      onPointerDown={event => { if (!task.canEdit || event.button !== 0) return; drag.current = { id: task.id, x: event.clientX, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }}
                      onPointerMove={event => { if (drag.current?.id !== task.id) return; const delta = event.clientX - drag.current.x; if (Math.abs(delta) > 4) drag.current.moved = true; event.currentTarget.style.transform = `translateX(${delta}px)`; }}
                      onPointerCancel={event => { drag.current = null; event.currentTarget.style.transform = ""; }}
                      onPointerUp={event => { event.currentTarget.style.transform = ""; const current = drag.current; drag.current = null; if (!current || current.id !== task.id || !current.moved) return; skipClick.current = true; const delta = Math.round((event.clientX - current.x) / width); if (delta) onMove(task, delta); }}
                      onClick={() => { if (skipClick.current) { skipClick.current = false; return; } onSelect(task.id); }}>
                      <i className={styles.barFill} style={{ width: `${task.progress}%` }} />
                      <span className={styles.barLabel}>{status === "done" && <Icon name="check" size={13} />}{task.title}</span>
                    </button>}
                  </div>
                </div>;
              })}
            </div>
            {!rows.length && <div className="g2-chart-empty">{query ? "No hay actividades que coincidan con la búsqueda." : "Creá una fase o una tarea para empezar a planificar."}</div>}
          </div>
        </div>
        <div className="g2-chart-footer"><span><span className="g2-legend-dot active" />En curso</span><span><span className="g2-legend-dot done" />Completada</span><span><span className="g2-legend-dot pending" />Pendiente</span><p>Las flechas indican dependencias de fin a inicio. Arrastrá las tareas para mover sus fechas.</p></div>
      </div>
    </div>
  );
}
