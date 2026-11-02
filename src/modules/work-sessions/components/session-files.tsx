"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ActionForm } from "@/shared/ui/action-form";
import { deleteSessionReportAction, reportHistoryAction, uploadSessionReportAction } from "../actions";
import { ReportDownload } from "./report-download";
import { ReportField } from "./report-field";
import styles from "./session-files.module.css";

const historyKey = (teamId: string, sessionId: string) => ["report-history", teamId, sessionId];

function ReportHistory({ teamId, sessionId }: { teamId: string; sessionId: string }) {
  const { data, error, mutate } = useSWR(historyKey(teamId, sessionId), () => reportHistoryAction({ teamId, sessionId }));
  if (error) return <div role="alert">No pudimos cargar el historial. <button type="button" className="button button-quiet" onClick={() => void mutate()}>Reintentar</button></div>;
  if (!data) return <p role="status" className="muted small">Cargando historial…</p>;
  return data.length ? <ol className={styles.history}>
    {data.map(change => <li key={change.id}>
      <p><strong>{change.userName}</strong> {change.action === "added" ? "agregó" : "eliminó"} <span>{change.name}</span></p>
      <time dateTime={new Date(change.createdAt).toISOString()}>{new Date(change.createdAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" })}</time>
    </li>)}
  </ol> : <p className="muted small">Todavía no hay cambios de archivos.</p>;
}

export function SessionFiles({ teamId, sessionId, reports, canEdit, onSaved }: {
  teamId: string;
  sessionId: string;
  reports: { id: string; name: string }[];
  canEdit: boolean;
  onSaved?: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const { mutate } = useSWRConfig();
  function saved() {
    void mutate(historyKey(teamId, sessionId));
    onSaved?.();
  }
  return <section className={styles.files} aria-label="Archivos de la tarea">
    {reports.length ? <div className={styles.list}>{reports.map(report => <div className={styles.file} key={report.id}>
      <ReportDownload teamId={teamId} sessionId={sessionId} reportId={report.id} name={report.name} />
      {canEdit && <ActionForm action={deleteSessionReportAction} submitLabel="Eliminar archivo" pendingLabel="Eliminando…" variant="danger" className={styles.remove} onSuccess={saved} confirmMessage={`¿Eliminar “${report.name}”? La eliminación quedará registrada en el historial.`}>
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="reportId" value={report.id} />
      </ActionForm>}
    </div>)}</div> : <p className="muted small">Sin archivos adjuntos</p>}
    {canEdit && <ActionForm action={uploadSessionReportAction} submitLabel="Agregar archivos .md" onSuccess={saved} resetOnSuccess>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <ReportField required />
    </ActionForm>}
    <details onToggle={event => setShowHistory(event.currentTarget.open)}>
      <summary>Historial de archivos</summary>
      {showHistory && <ReportHistory teamId={teamId} sessionId={sessionId} />}
    </details>
  </section>;
}
