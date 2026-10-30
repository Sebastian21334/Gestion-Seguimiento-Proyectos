"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/shared/ui/action-form";
import { Avatar } from "@/shared/ui/avatar";
import { Icon } from "@/shared/ui/icon";
import { createDiagramAction, moveGanttTaskAction } from "../actions";
import { TaskPanel } from "./task-panel";
import type { Attachments, Gantt, Member, Session, Task } from "./types";

const DAY = 86400000;
const dayNumber = (value: string) =>
  Math.floor(Date.parse(`${value}T00:00:00Z`) / DAY);
const asDate = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
const todayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
const fraction = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return (hour * 60 + minute) / 1440;
};
function statusOf(task: Task, sessions: Session[]) {
  return task.completed
    ? "Terminada"
    : sessions.some((session) => session.ganttTaskId === task.id)
      ? "En curso"
      : "Pendiente";
}
function timelineTicks(first: number, count: number, scale: "day" | "week" | "month") {
  const ticks: { current: number; offset: number; days: number }[] = [];
  for (let offset = 0; offset < count;) {
    const current = first + offset;
    const date = new Date(current * DAY);
    const nextMonth = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) / DAY;
    const days = Math.min(count - offset, scale === "day" ? 1 : scale === "week" ? 7 : nextMonth - current);
    ticks.push({ current, offset, days });
    offset += days;
  }
  return ticks;
}
function MonthBands({
  first,
  count,
  width,
}: {
  first: number;
  count: number;
  width: number;
}) {
  const months: { label: string; days: number }[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date((first + i) * DAY);
    const label = date.toLocaleDateString("es-AR", {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    });
    if (months.at(-1)?.label === label) months[months.length - 1].days++;
    else months.push({ label, days: 1 });
  }
  return (
    <div className="g2-months">
      {months.map((month, index) => (
        <div key={index} style={{ width: month.days * width }}>
          {month.label}
        </div>
      ))}
    </div>
  );
}

export function GanttBoard({
  teamId,
  data,
  members,
  sessions,
  attachments,
}: {
  teamId: string;
  data: Gantt;
  members: Member[];
  sessions: Session[];
  attachments: Attachments;
}) {
  const router = useRouter();
  const [diagramId, setDiagramId] = useState(data.diagrams[0]?.id ?? "");
  const [start, setStart] = useState(() => asDate(dayNumber(todayDate()) - 7));
  const [scale, setScale] = useState<"day" | "week" | "month">("day");
  const [periodDays, setPeriodDays] = useState(365);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState<string | "new" | null>(null);
  const [notice, setNotice] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const drag = useRef<{ taskId: string; x: number; moved: boolean } | null>(
    null,
  );
  const skipClick = useRef(false);
  const knownDiagrams = useRef(data.diagrams.map(diagram => diagram.id));
  const diagramMenu = useRef<HTMLDetailsElement>(null);
  const count = scale === "day" ? 60 : scale === "week" ? 140 : periodDays;
  const width = scale === "day" ? 34 : scale === "week" ? 15 : 8;
  const step = scale === "day" ? 1 : scale === "week" ? 7 : 30;
  const first = dayNumber(start);
  const ticks = timelineTicks(first, count, scale);
  const today = dayNumber(todayDate());
  const visibleTasks = data.tasks.filter(
    (task) =>
      task.diagramId === diagramId &&
      `${task.title} ${task.assigneeName ?? ""}`
        .toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")),
  );
  const selected =
    panel && panel !== "new"
      ? data.tasks.find(
          (task) => task.id === panel && task.diagramId === diagramId,
        )
      : undefined;
  useEffect(() => {
    const added = data.diagrams.find(diagram => !knownDiagrams.current.includes(diagram.id));
    knownDiagrams.current = data.diagrams.map(diagram => diagram.id);
    if (added) { setDiagramId(added.id); setPanel(null); }
    else if (!data.diagrams.some((diagram) => diagram.id === diagramId))
      setDiagramId(data.diagrams[0]?.id ?? "");
  }, [data.diagrams, diagramId]);
  const refresh = () => router.refresh();
  function selectDiagram(value: string) {
    setDiagramId(value);
    setPanel(null);
  }
  async function move(task: Task, delta: number) {
    setMoving(task.id);
    setNotice(null);
    try {
      const result = await moveGanttTaskAction({
        teamId,
        taskId: task.id,
        startDate: asDate(dayNumber(task.startDate) + delta),
        endDate: asDate(dayNumber(task.endDate) + delta),
      });
      setNotice(result);
      if (result.success) refresh();
    } catch {
      setNotice({
        success: false,
        message: "No pudimos mover la tarea. Intentá nuevamente.",
      });
    } finally {
      setMoving(null);
    }
  }
  return (
    <section className="g2-page">
      <div className="g2-heading">
        <div>
          <span className="g2-eyebrow">PLANIFICACIÓN DEL EQUIPO</span>
          <h2>
            Diagrama de Gantt<span>.</span>
          </h2>
          <p>Visualizá el trabajo de tu equipo y organizá lo que viene.</p>
        </div>
        <details className="g2-new-diagram" ref={diagramMenu}>
          <summary>+ Nuevo diagrama</summary>
          <div className="g2-diagram-popover">
            <ActionForm
              action={createDiagramAction}
              submitLabel="Crear diagrama"
              onSuccess={() => { if (diagramMenu.current) diagramMenu.current.open = false; refresh(); }}
              resetOnSuccess
            >
              <input type="hidden" name="teamId" value={teamId} />
              <label>
                Nombre del diagrama
                <input
                  name="name"
                  maxLength={100}
                  required
                  placeholder="Ej. Lanzamiento"
                />
              </label>
            </ActionForm>
          </div>
        </details>
      </div>
      {data.diagrams.length ? (
        <>
          <div className="g2-toolbar">
            <label>
              Diagrama
              <select
                value={diagramId}
                onChange={(event) => selectDiagram(event.target.value)}
              >
                {data.diagrams.map((diagram) => (
                  <option key={diagram.id} value={diagram.id}>
                    {diagram.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ver desde
              <input
                type="date"
                value={start}
                onChange={(event) => {
                  if (event.target.value) setStart(event.target.value);
                }}
              />
            </label>
            <div className="g2-scale-field">
              <span>Escala</span>
              <div
                className="g2-scale"
                role="group"
                aria-label="Escala de tiempo"
              >
                {(
                  [
                    ["day", "Días"],
                    ["week", "Semanas"],
                    ["month", "Meses"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    aria-pressed={scale === id}
                    className={scale === id ? "selected" : ""}
                    onClick={() => setScale(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {scale === "month" && (
              <label className="g2-period">
                Días visibles
                <input
                  type="number"
                  min={7}
                  max={730}
                  value={periodDays}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value))
                      setPeriodDays(Math.min(730, Math.max(7, value)));
                  }}
                />
              </label>
            )}
            <label className="g2-search">
              <span className="sr-only">Buscar actividades</span>
              <Icon name="search" size={17} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar tareas..."
              />
            </label>
            <button
              type="button"
              className="g2-primary"
              onClick={() => setPanel("new")}
            >
              <Icon name="plus" size={17} /> Nueva tarea
            </button>
            <div className="g2-navigate">
              <button
                type="button"
                onClick={() => setStart(asDate(first - Math.floor(count / 2)))}
              >
                ← <span>Anterior</span>
              </button>
              <button
                type="button"
                onClick={() => setStart(asDate(first + Math.floor(count / 2)))}
              >
                <span>Siguiente</span> →
              </button>
            </div>
          </div>
          {notice && (
            <p
              className={`notice ${notice.success ? "notice-success" : "notice-error"} g2-notice`}
              role="status"
            >
              {notice.message}
            </p>
          )}
          <div className={`g2-workspace ${panel ? "with-panel" : ""}`}>
            <div className="g2-chart-card">
              <div
                className="g2-scroll"
                aria-label="Diagrama de Gantt desplazable horizontalmente"
              >
                <div className="g2-grid" style={{ width: 410 + count * width }}>
                  <div className="g2-header-row">
                    <div className="g2-fixed g2-column-head">
                      <span>Actividad</span>
                      <span>Responsable</span>
                      <span>Estado</span>
                    </div>
                    <div
                      className="g2-timeline-header"
                      style={{ width: count * width }}
                    >
                      <MonthBands first={first} count={count} width={width} />
                      <div className="g2-date-ticks">
                        {ticks.map(
                          ({ current, days }, index) => {
                            const date = new Date(current * DAY);
                            return (
                              <div
                                key={index}
                                className={
                                  today >= current && today < current + days
                                    ? "today"
                                    : ""
                                }
                                style={{
                                  width: days * width,
                                }}
                              >
                                <strong>
                                  {date.toLocaleDateString("es-AR", {
                                    timeZone: "UTC",
                                    day: "2-digit",
                                    ...(scale !== "day"
                                      ? { month: "short" }
                                      : {}),
                                  })}
                                </strong>
                                {scale === "day" && (
                                  <span>
                                    {date.toLocaleDateString("es-AR", {
                                      timeZone: "UTC",
                                      weekday: "short",
                                    })}
                                  </span>
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                  {visibleTasks.map((task) => {
                    const status = statusOf(task, sessions);
                    const begin = dayNumber(task.startDate);
                    const end = dayNumber(task.endDate);
                    const left = Math.max(
                      0,
                      begin + fraction(task.startTime) - first,
                    );
                    const right = Math.min(
                      count,
                      end + fraction(task.endTime) - first,
                    );
                    const selectedRow = panel === task.id;
                    return (
                      <div
                        className={`g2-row ${selectedRow ? "selected" : ""}`}
                        key={task.id}
                      >
                        <div className="g2-fixed g2-cells">
                          <button
                            type="button"
                            className="g2-task-name"
                            title={task.title}
                            onClick={() => setPanel(task.id)}
                          >
                            <span
                              className={`g2-task-dot ${status === "Terminada" ? "done" : status === "En curso" ? "active" : "pending"}`}
                            />
                            <span>{task.title}</span>
                          </button>
                          <div className="g2-person">
                            {task.assigneeName ? (
                              <>
                                <Avatar
                                  name={task.assigneeName}
                                  githubUsername={task.assigneeGithubUsername}
                                />
                                <span title={task.assigneeName}>
                                  {task.assigneeName}
                                </span>
                              </>
                            ) : (
                              <span className="g2-unassigned">Sin asignar</span>
                            )}
                          </div>
                          <div>
                            <span
                              className={`g2-badge ${status === "Terminada" ? "done" : status === "En curso" ? "active" : "pending"}`}
                            >
                              {status}
                            </span>
                          </div>
                        </div>
                        <div
                          className="g2-track"
                          style={{
                            width: count * width,
                            backgroundSize: `${width * step}px 100%`,
                            backgroundImage: scale === "month" ? "none" : undefined,
                          }}
                        >
                          {scale === "month" && ticks.slice(1).map(tick => <span key={tick.offset} className="g2-month-line" style={{ left: tick.offset * width }} />)}
                          {today >= first && today < first + count && (
                            <span
                              className="g2-today-line"
                              style={{ left: (today - first) * width, width }}
                            />
                          )}
                          {right > left && (
                            <button
                              type="button"
                              className={`g2-bar ${selectedRow ? "selected" : ""} ${status === "Terminada" ? "done" : status === "En curso" ? "active" : "pending"} ${task.canEdit ? "movable" : ""}`}
                              title={`${task.title}: ${task.startDate} ${task.startTime} – ${task.endDate} ${task.endTime}${task.canEdit ? " · Arrastrá para mover" : ""}`}
                              aria-label={`Abrir ${task.title}. ${task.startDate} a ${task.endDate}.`}
                              disabled={moving === task.id}
                              style={{
                                left: left * width,
                                width: Math.max(12, (right - left) * width),
                              }}
                              onPointerDown={(event) => {
                                if (!task.canEdit) return;
                                drag.current = {
                                  taskId: task.id,
                                  x: event.clientX,
                                  moved: false,
                                };
                                event.currentTarget.setPointerCapture(
                                  event.pointerId,
                                );
                              }}
                              onPointerMove={(event) => {
                                if (drag.current?.taskId !== task.id) return;
                                const delta = event.clientX - drag.current.x;
                                if (Math.abs(delta) > 4)
                                  drag.current.moved = true;
                                event.currentTarget.style.transform = `translateX(${delta}px)`;
                              }}
                              onPointerCancel={(event) => {
                                drag.current = null;
                                event.currentTarget.style.transform = "";
                              }}
                              onPointerUp={(event) => {
                                event.currentTarget.style.transform = "";
                                const current = drag.current;
                                drag.current = null;
                                if (
                                  !current ||
                                  current.taskId !== task.id ||
                                  !current.moved
                                )
                                  return;
                                skipClick.current = true;
                                const delta = Math.round(
                                  (event.clientX - current.x) / width,
                                );
                                if (delta) void move(task, delta);
                              }}
                              onClick={() => {
                                if (skipClick.current) {
                                  skipClick.current = false;
                                  return;
                                }
                                setPanel(task.id);
                              }}
                            >
                              <span>{task.title}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!visibleTasks.length && (
                    <div className="g2-chart-empty">
                      {search
                        ? "No hay actividades que coincidan con la búsqueda."
                        : "Todavía no hay actividades. Creá la primera con «Nueva tarea»."}
                    </div>
                  )}
                </div>
              </div>
              <div className="g2-chart-footer">
                <span>
                  <span className="g2-legend-dot active" />
                  En curso
                </span>
                <span>
                  <span className="g2-legend-dot done" />
                  Terminada
                </span>
                <span>
                  <span className="g2-legend-dot pending" />
                  Pendiente
                </span>
                <p>
                  Seleccioná una actividad para ver sus detalles
                  {visibleTasks.some((task) => task.canEdit)
                    ? " o arrastrá una barra para moverla"
                    : ""}
                  .
                </p>
              </div>
            </div>
            {panel && (panel === "new" || selected) && (
              <TaskPanel
                key={panel}
                teamId={teamId}
                diagramId={diagramId}
                task={selected}
                members={members}
                sessions={sessions}
                attachments={attachments}
                onClose={() => setPanel(null)}
                onSaved={(startDate) => {
                  if (startDate) setStart(asDate(dayNumber(startDate) - 3));
                  refresh();
                  if (panel === "new") setPanel(null);
                }}
              />
            )}
          </div>
        </>
      ) : (
        <div className="g2-empty">
          <span className="g2-empty-icon">
            <Icon name="grid" size={26} />
          </span>
          <h3>Tu primer diagrama empieza acá</h3>
          <p>
            Organizá actividades, fechas y responsables en una línea de tiempo
            compartida.
          </p>
          <div className="g2-empty-form">
            <ActionForm
              action={createDiagramAction}
              submitLabel="Crear diagrama"
              onSuccess={refresh}
              resetOnSuccess
            >
              <input type="hidden" name="teamId" value={teamId} />
              <label>
                Nombre del diagrama
                <input
                  name="name"
                  maxLength={100}
                  required
                  placeholder="Ej. Lanzamiento del proyecto"
                />
              </label>
            </ActionForm>
          </div>
        </div>
      )}
    </section>
  );
}
