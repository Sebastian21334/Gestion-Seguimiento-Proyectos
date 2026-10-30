"use server";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/shared/session";
import { runAction } from "@/shared/errors/action";
import type { ActionState } from "@/shared/ui/action-state";
import * as schemas from "./schemas";
import * as service from "./service";

export async function ganttPageAction(teamId: unknown) {
  return service.getGantt(
    schemas.teamSchema.parse({ teamId }).teamId,
    (await requireCurrentUser()).id,
  );
}
export async function createDiagramAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    const data = schemas.createDiagramSchema.parse(Object.fromEntries(form));
    await service.addDiagram(
      data.teamId,
      data.name,
      (await requireCurrentUser()).id,
    );
    revalidatePath("/", "layout");
    return { success: true, message: "Diagrama creado." };
  });
}
export async function createGanttTaskAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    const data = schemas.taskSchema.parse({ ...Object.fromEntries(form), dependencyIds: form.getAll("dependencyIds") });
    await service.addTask(data, (await requireCurrentUser()).id);
    revalidatePath("/", "layout");
    return { success: true, message: "Tarea agregada." };
  });
}
export async function editGanttTaskAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    const data = schemas.updateTaskSchema.parse({ ...Object.fromEntries(form), dependencyIds: form.getAll("dependencyIds") });
    await service.editTask(data, (await requireCurrentUser()).id);
    revalidatePath("/", "layout");
    return { success: true, message: "Tarea actualizada." };
  });
}

export async function createGanttPhaseAction(_previous: ActionState, form: FormData) {
  return runAction(async () => {
    await service.addPhase(schemas.phaseSchema.parse(Object.fromEntries(form)), (await requireCurrentUser()).id);
    revalidatePath("/", "layout");
    return { success: true, message: "Fase creada." };
  });
}
export async function editGanttPhaseAction(_previous: ActionState, form: FormData) {
  return runAction(async () => {
    await service.editPhase(schemas.updatePhaseSchema.parse(Object.fromEntries(form)), (await requireCurrentUser()).id);
    revalidatePath("/", "layout");
    return { success: true, message: "Fase actualizada." };
  });
}
export async function deleteGanttPhaseAction(_previous: ActionState, form: FormData) {
  return runAction(async () => {
    const data = schemas.phaseIdSchema.parse(Object.fromEntries(form));
    await service.removePhase(data.teamId, data.phaseId, (await requireCurrentUser()).id);
    revalidatePath("/", "layout");
    return { success: true, message: "Fase eliminada. Sus tareas se conservaron sin fase." };
  });
}
export async function deleteGanttTaskAction(_previous: ActionState, form: FormData) {
  return runAction(async () => {
    const data = schemas.taskIdSchema.parse(Object.fromEntries(form));
    await service.removeTask(data.teamId, data.taskId, (await requireCurrentUser()).id);
    revalidatePath("/", "layout");
    return { success: true, message: "Tarea eliminada." };
  });
}
export async function addGanttCommentAction(_previous: ActionState, form: FormData) {
  return runAction(async () => {
    await service.addComment(schemas.commentSchema.parse(Object.fromEntries(form)), (await requireCurrentUser()).id);
    revalidatePath("/", "layout");
    return { success: true, message: "Comentario agregado." };
  });
}
export async function moveGanttTaskAction(input: unknown) {
  return runAction(async () => {
    await service.moveTask(
      schemas.moveSchema.parse(input),
      (await requireCurrentUser()).id,
    );
    revalidatePath("/", "layout");
    return { success: true, message: "Fechas actualizadas." };
  });
}
export async function setGanttTaskCompletedAction(input: unknown) {
  return runAction(async () => {
    const data = schemas.statusSchema.parse(input);
    await service.setTaskCompleted(
      data.teamId,
      data.taskId,
      (await requireCurrentUser()).id,
      data.completed,
    );
    revalidatePath("/", "layout");
    return { success: true, message: "Estado actualizado." };
  });
}
