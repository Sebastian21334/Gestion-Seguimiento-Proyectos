import { ActionForm } from "@/shared/ui/action-form";
import { deleteSessionAction } from "../actions";
import styles from "./board.module.css";

export function SessionDelete({ session, onDeleted }: {
  session: { id: string; teamId: string; title: string };
  onDeleted: () => void;
}) {
  return (
    <ActionForm
      action={deleteSessionAction}
      className={`form-stack ${styles.deleteActivity}`}
      submitLabel="Eliminar actividad"
      pendingLabel="Eliminando…"
      variant="danger"
      confirmMessage={`¿Eliminar la actividad «${session.title}»? También se eliminarán sus archivos adjuntos y su historial de archivos.`}
      onSuccess={onDeleted}
    >
      <input type="hidden" name="teamId" value={session.teamId} />
      <input type="hidden" name="sessionId" value={session.id} />
    </ActionForm>
  );
}
