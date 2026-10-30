"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/shared/session";
import { runAction } from "@/shared/errors/action";
import type { ActionState } from "@/shared/ui/action-state";
import * as schemas from "./schemas";
import * as service from "./service";
import { ValidationError } from "@/shared/errors";

export async function boardAction(teamId: unknown) {
  return service.getBoard(
    schemas.teamIdSchema.parse(teamId),
    (await requireCurrentUser()).id,
  );
}
export async function ganttSessionsAction(teamId: unknown) {
  return service.ganttSessions(
    schemas.teamIdSchema.parse(teamId),
    (await requireCurrentUser()).id,
  );
}
export async function memberHistoryAction(teamId: unknown, userId: unknown) {
  const data = schemas.memberHistorySchema.parse({ teamId, userId });
  return service.memberHistory(
    data.teamId,
    data.userId,
    (await requireCurrentUser()).id,
  );
}
export async function startSessionAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    const user = await requireCurrentUser();
    const data = schemas.startSessionSchema.parse(Object.fromEntries(form));
    if (form.has("report"))
      throw new ValidationError(
        "El archivo se carga después de iniciar la tarea.",
      );
    const result = await service.startSession(data, user.id);
    revalidatePath("/", "layout");
    return {
      success: true,
      message: result.collision
        ? "Tarea iniciada. Atención: otra persona tiene una tarea activa con el mismo título."
        : "Tarea iniciada. ¡Buen trabajo!",
    };
  });
}
export async function uploadSessionReportAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    const user = await requireCurrentUser();
    const data = schemas.reportRequestSchema.parse(Object.fromEntries(form));
    const files = form.getAll("report");
    if (!files.length || files.length > 3)
      throw new ValidationError("Seleccioná entre 1 y 3 archivos por carga.");
    const reports = await Promise.all(
      files.map((file) => schemas.markdownFileSchema.parseAsync(file)),
    );
    await service.uploadSessionReport(
      data.teamId,
      data.sessionId,
      user.id,
      reports,
    );
    revalidatePath("/", "layout");
    return { success: true, message: "Archivo guardado en la tarea." };
  });
}
export async function finishSessionAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    const user = await requireCurrentUser();
    const data = schemas.finishSessionSchema.parse(Object.fromEntries(form));
    await service.finishSession(data.teamId, data.sessionId, user.id);
    revalidatePath("/", "layout");
    return { success: true, message: "Tarea cerrada." };
  });
}
export async function downloadSessionReportAction(input: unknown) {
  let report: { name: string; content: string } | undefined;
  const state = await runAction(async () => {
    const data = schemas.downloadReportSchema.parse(input);
    report = await service.getSessionReport(
      data.teamId,
      data.sessionId,
      data.reportId,
      (await requireCurrentUser()).id,
    );
  });
  return { ...state, report };
}
