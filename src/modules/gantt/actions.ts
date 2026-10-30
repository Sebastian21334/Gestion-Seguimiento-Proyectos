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
    const data = schemas.taskSchema.parse(Object.fromEntries(form));
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
    const data = schemas.updateTaskSchema.parse(Object.fromEntries(form));
    await service.editTask(data, (await requireCurrentUser()).id);
    revalidatePath("/", "layout");
    return { success: true, message: "Tarea actualizada." };
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
