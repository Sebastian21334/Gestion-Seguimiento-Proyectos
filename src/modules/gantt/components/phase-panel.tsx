"use client";

import { ActionForm } from "@/shared/ui/action-form";
import { Icon } from "@/shared/ui/icon";
import { createGanttPhaseAction, deleteGanttPhaseAction, editGanttPhaseAction } from "../actions";
import type { Phase } from "./types";
import styles from "./gantt.module.css";

export function PhasePanel({ teamId, diagramId, phase, onClose, onSaved }: {
  teamId: string; diagramId: string; phase?: Phase; onClose: () => void; onSaved: () => void;
}) {
  const editable = !phase || phase.canEdit;
  return <aside className="g2-panel" aria-label={phase ? `Fase ${phase.name}` : "Nueva fase"}>
    <header className="g2-panel-top"><div><span className="g2-panel-kicker">FASE DEL DIAGRAMA</span><h2>{phase?.name ?? "Nueva fase"}</h2></div><button type="button" className="g2-icon-button" onClick={onClose} aria-label="Cerrar panel"><Icon name="close" /></button></header>
    <div className="g2-panel-content">
      <p className={styles.phaseHint}>Las fechas y la duración se calculan desde el inicio de la primera tarea hasta el fin de la última. El progreso es el promedio de sus tareas.</p>
      {phase && <dl className={styles.phaseSummary}><div><dt>Inicio</dt><dd>{phase.startDate ?? "Sin tareas"}</dd></div><div><dt>Fin</dt><dd>{phase.endDate ?? "Sin tareas"}</dd></div><div><dt>Duración</dt><dd>{phase.durationDays ? `${phase.durationDays} ${phase.durationDays === 1 ? "día" : "días"}` : "Sin tareas"}</dd></div><div><dt>Tareas</dt><dd>{phase.taskCount}</dd></div><div><dt>Progreso</dt><dd>{phase.progress}%</dd></div></dl>}
      {editable ? <ActionForm action={phase ? editGanttPhaseAction : createGanttPhaseAction} submitLabel={phase ? "Guardar fase" : "Crear fase"} onSuccess={onSaved} footerActions={<button type="button" className="button button-secondary" onClick={onClose}>Cancelar</button>}>
        <input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="diagramId" value={diagramId} />{phase && <input type="hidden" name="phaseId" value={phase.id} />}
        <fieldset className="g2-fields" disabled={!editable}>
          <label>Nombre de la fase<input name="name" required maxLength={120} defaultValue={phase?.name} placeholder="Ej. Fase 1 – Planificación" /></label>
          <label>Color<select name="color" defaultValue={phase?.color ?? "violet"}>{[["violet", "Violeta"], ["amber", "Naranja"], ["green", "Verde"], ["pink", "Rosa"], ["blue", "Azul"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </fieldset>
      </ActionForm> : <div className="g2-fields"><label>Nombre de la fase<input value={phase?.name ?? ""} disabled /></label><label>Color<input value={phase?.color ?? ""} disabled /></label><button type="button" className="button button-secondary" onClick={onClose}>Cerrar</button></div>}
      {phase?.canEdit && <div className={styles.phaseDelete}><ActionForm action={deleteGanttPhaseAction} submitLabel="Eliminar fase" variant="danger" confirmMessage="¿Eliminar esta fase? Sus tareas se conservarán sin fase." onSuccess={onSaved}><input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="phaseId" value={phase.id} /></ActionForm></div>}
      {!editable && <p className="g2-permission">Solo el creador o el dueño pueden modificar esta fase.</p>}
    </div>
  </aside>;
}
