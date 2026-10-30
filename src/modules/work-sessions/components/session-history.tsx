"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Avatar } from "@/shared/ui/avatar";
import { EmptyState } from "@/shared/ui/empty-state";
import { Icon } from "@/shared/ui/icon";
import type { boardAction } from "../actions";
import { ReportDownload } from "./report-download";
import styles from "./board.module.css";

type Session = Awaited<ReturnType<typeof boardAction>>["history"][number];
const dateTime = (value: Date | string) =>
  new Date(value).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

function duration(session: Session, full = false) {
  const minutes = Math.max(
    1,
    Math.round(
      (new Date(session.endedAt ?? Date.now()).getTime() -
        new Date(session.startedAt).getTime()) / 60_000,
    ),
  );
  if (minutes < 60)
    return full
      ? `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`
      : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} ${full ? (hours === 1 ? "hora" : "horas") : "h"}${remainder ? ` ${remainder} min` : ""}`;
}

function ganttLabel(session: Session) {
  return session.ganttTask
    ? [session.ganttDiagramName, session.ganttTask.title].filter(Boolean).join(" · ")
    : "Sin asociación (sesión anterior)";
}

function Attachments({ session }: { session: Session }) {
  return session.reports.map((report) => (
    <ReportDownload
      key={report.id}
      teamId={session.teamId}
      sessionId={session.id}
      reportId={report.id}
      name={report.name}
    />
  ));
}

function DetailField({
  icon,
  label,
  children,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.detailField}>
      <span className={styles.detailIcon}><Icon name={icon} size={18} /></span>
      <div>
        <dt>{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}

function SessionDetail({
  session,
  slug,
  onClose,
}: {
  session: Session;
  slug: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={styles.detailDialog}
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      onClose={(event) => {
        // Strict Mode puede cerrar y reabrir el diálogo antes de emitir close.
        if (!event.currentTarget.open) onClose();
      }}
      onClick={(event) => {
        // El diálogo ocupa sólo la tarjeta; los clics fuera caen en el backdrop.
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom
          ) {
            event.currentTarget.close();
          }
        }
      }}
    >
      <header className={styles.detailHeader}>
        <span className={styles.detailHeaderIcon}><Icon name="file" size={24} /></span>
        <div>
          <h2 id={headingId}>Detalle de la tarea</h2>
          <p id={descriptionId}>Información completa de esta sesión de trabajo.</p>
        </div>
        <button type="button" className={styles.closeIcon} aria-label="Cerrar detalle" onClick={() => dialog.current?.close()}>
          <Icon name="close" size={20} />
        </button>
      </header>

      <div className={styles.completedNotice}>
        <span><Icon name="check" size={18} /></span>
        <div>
          <strong>Tarea finalizada</strong>
          <p>Esta sesión de trabajo ya fue completada.</p>
        </div>
      </div>

      <section className={styles.detailCard} aria-label="Datos de la sesión">
        <div className={styles.detailPerson}>
          <Avatar name={session.user.name} githubUsername={session.user.githubUsername} />
          <div>
            <Link href={`/t/${slug}/miembros/${session.userId}`}>{session.user.name}</Link>
            <p>terminó {session.title}</p>
          </div>
          <span className={styles.completedDuration}><Icon name="check" size={14} />{duration(session)}</span>
        </div>
        <dl className={styles.detailGrid}>
          <div className={styles.detailColumn}>
            <DetailField icon="calendar" label="Tarea del Gantt">{ganttLabel(session)}</DetailField>
            <DetailField icon="clock" label="Inicio">{dateTime(session.startedAt)}</DetailField>
            <DetailField icon="clock" label="Fin">{session.endedAt ? dateTime(session.endedAt) : "En curso"}</DetailField>
          </div>
          <div className={styles.detailColumn}>
            <DetailField icon="file" label="Duración">{duration(session, true)}</DetailField>
            <DetailField icon="list" label="Descripción"><span className={styles.description}>{session.description || "Sin descripción"}</span></DetailField>
            <DetailField icon="attachment" label={session.reports.length === 1 ? "Archivo adjunto" : "Archivos adjuntos"}>
              {session.reports.length ? <div className={styles.attachments}><Attachments session={session} /></div> : <span className="muted">Sin archivos adjuntos</span>}
            </DetailField>
          </div>
        </dl>
      </section>

      <footer className={styles.detailFooter}>
        <button type="button" className="button button-secondary" onClick={() => dialog.current?.close()}>Cerrar</button>
        <Link href={`/t/${slug}/gantt`} className={styles.ganttLink}><Icon name="arrow" size={17} />Ir al Gantt</Link>
      </footer>
    </dialog>
  );
}

export function SessionHistory({ sessions, slug }: { sessions: Session[]; slug: string }) {
  const [selected, setSelected] = useState<Session | null>(null);
  return (
    <section className={`panel ${styles.historyPanel}`}>
      <div className="section-heading">
        <div>
          <h2>Lo que ya avanzamos</h2>
          <p className="muted small">Las últimas 20 sesiones del equipo</p>
        </div>
        <span className="subtle-icon"><Icon name="clock" /></span>
      </div>
      {sessions.length ? (
        <div className={styles.historyList}>
          {sessions.map((session) => (
            <article key={session.id} className={`${styles.historyRow} ${selected?.id === session.id ? styles.selectedRow : ""}`}>
              <button
                type="button"
                className={styles.historyOpen}
                aria-label={`Ver detalle de ${session.title}, de ${session.user.name}`}
                aria-haspopup="dialog"
                onClick={() => setSelected(session)}
              />
              <Avatar name={session.user.name} githubUsername={session.user.githubUsername} />
              <div className={styles.historyMain}>
                <p><Link href={`/t/${slug}/miembros/${session.userId}`} className={styles.memberLink}>{session.user.name}</Link> terminó {session.title}</p>
                <p>Gantt: {ganttLabel(session)}</p>
                <p>Inicio: {dateTime(session.startedAt)} <span className={styles.dateSeparator}>·</span> Fin: {session.endedAt ? dateTime(session.endedAt) : "En curso"}</p>
                {session.reports.length > 0 && <div className={styles.attachments}><Attachments session={session} /></div>}
              </div>
              <span className={styles.historyDuration}><Icon name="clock" size={15} />{duration(session)}</span>
              <span className={styles.historyChevron}><Icon name="chevron" size={17} /></span>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="El historial empieza con ustedes" icon="clock">Las sesiones terminadas aparecerán acá.</EmptyState>
      )}
      {selected && <SessionDetail session={selected} slug={slug} onClose={() => setSelected(null)} />}
    </section>
  );
}
