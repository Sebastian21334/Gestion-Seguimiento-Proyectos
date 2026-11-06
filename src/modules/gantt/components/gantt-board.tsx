"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/shared/ui/action-form";
import { Icon } from "@/shared/ui/icon";
import { createDiagramAction, moveGanttTaskAction } from "../actions";
import { TaskPanel } from "./task-panel";
import { PhasePanel } from "./phase-panel";
import { GanttChart } from "./gantt-chart";
import styles from "./gantt.module.css";
import type { Attachments, Gantt, Member, Session, Task } from "./types";

const DAY = 86400000;
const dayNumber = (value: string) =>
  Math.floor(Date.parse(`${value}T00:00:00Z`) / DAY);
const asDate = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
const todayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
export function GanttBoard({
  teamId,
  teamSlug,
  data,
  members,
  sessions,
  attachments,
}: {
  teamId: string;
  teamSlug: string;
  data: Gantt;
  members: Member[];
  sessions: Session[];
  attachments: Attachments;
}) {
  const router = useRouter();
  const [diagramId, setDiagramId] = useState(data.diagrams[0]?.id ?? "");
  const [start, setStart] = useState(todayDate);
  const [focusVersion, setFocusVersion] = useState(0);
  const [scale, setScale] = useState<"day" | "week" | "month">("day");
  const [periodDays, setPeriodDays] = useState(365);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState<string | "new" | null>(null);
  const [phasePanel, setPhasePanel] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const knownDiagrams = useRef(data.diagrams.map(diagram => diagram.id));
  const diagramMenu = useRef<HTMLDetailsElement>(null);
  const count = scale === "day" ? 60 : scale === "week" ? 140 : periodDays;
  const navigationDays = scale === "day" ? 7 : Math.floor(count / 2);
  const focusDay = dayNumber(start);
  // Dejar espacio antes de la fecha elegida para poder desplazarse al pasado.
  const first = focusDay - Math.floor(count / 2);
  const today = dayNumber(todayDate());
  const hasExportFiles = sessions.some((session) =>
    session.reports.length > 0 && data.tasks.some((task) =>
      task.id === session.ganttTaskId && task.diagramId === diagramId,
    ),
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
    setPhasePanel(null);
  }
  function openTask(id: string) { setPhasePanel(null); setPanel(id); }
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
    <section className={`g2-page ${styles.page}`}>
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
              Ir a fecha
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
              onClick={() => openTask("new")}
            >
              <Icon name="plus" size={17} /> Nueva tarea
            </button>
            <button type="button" className="g2-secondary" onClick={() => { setPanel(null); setPhasePanel("new"); }}><Icon name="plus" size={16} /> Nueva fase</button>
            <form
              action={`/t/${encodeURIComponent(teamSlug)}/gantt/exportar/${diagramId}`}
              method="post"
              onSubmit={(event) => {
                if (hasExportFiles && !window.confirm("Cualquiera que reciba el PDF podrá descargar los archivos .md incluidos. ¿Exportar el diagrama?")) {
                  event.preventDefault();
                }
              }}
            >
              <button type="submit" className="g2-secondary" disabled={!diagramId}>
                <Icon name="file" size={16} /> Exportar PDF
              </button>
            </form>
            <div className="g2-navigate">
              <button
                type="button"
                onClick={() => setStart(asDate(focusDay - navigationDays))}
              >
                ← <span>Anterior</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStart(todayDate());
                  setFocusVersion((version) => version + 1);
                }}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setStart(asDate(focusDay + navigationDays))}
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
          <div className={`g2-workspace ${panel || phasePanel ? "with-panel" : ""}`}>
            <GanttChart data={data} diagramId={diagramId} search={search} first={first} count={count} focusDay={focusDay} focusVersion={focusVersion} scale={scale} today={today} selectedId={panel} moving={moving} sessions={sessions} onSelect={openTask} onEditPhase={id => { setPanel(null); setPhasePanel(id); }} onMove={(task, days) => { void move(task, days); }} />
            {phasePanel && <PhasePanel key={phasePanel} teamId={teamId} diagramId={diagramId} phase={data.phases.find(phase => phase.id === phasePanel)} onClose={() => setPhasePanel(null)} onSaved={() => { setPhasePanel(null); refresh(); }} />}
            {panel && (panel === "new" || selected) && (
              <TaskPanel
                key={panel}
                teamId={teamId}
                diagramId={diagramId}
                task={selected}
                phases={data.phases.filter(phase => phase.diagramId === diagramId)}
                tasks={data.tasks.filter(task => task.diagramId === diagramId)}
                comments={data.comments.filter(comment => comment.taskId === selected?.id)}
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
