import "server-only";
import { requireMembership } from "@/modules/teams";
import { findUsersByIds } from "@/modules/users";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/shared/errors";
import * as repository from "./repository";
import type { z } from "zod";
import type { taskSchema, updateTaskSchema } from "./schemas";

export async function getGantt(teamId: string, userId: string) {
  const member = await requireMembership(teamId, userId);
  const [diagrams, tasks] = await Promise.all([
    repository.diagrams(teamId),
    repository.tasks(teamId),
  ]);
  const users = await findUsersByIds([
    ...new Set(
      tasks.flatMap((task) => [
        task.createdBy,
        ...(task.assigneeId ? [task.assigneeId] : []),
      ]),
    ),
  ]);
  return {
    diagrams,
    tasks: tasks.map((task) => ({
      ...task,
      assigneeName:
        users.find((user) => user.id === task.assigneeId)?.name ?? null,
      assigneeGithubUsername:
        users.find((user) => user.id === task.assigneeId)?.githubUsername ??
        null,
      creatorName:
        users.find((user) => user.id === task.createdBy)?.name ?? "Exmiembro",
      canEdit:
        member.role === "owner" ||
        !task.assigneeId ||
        task.assigneeId === userId,
    })),
  };
}
export async function getTasksByIds(
  teamId: string,
  userId: string,
  ids: string[],
) {
  await requireMembership(teamId, userId);
  return repository.findTasks(teamId, ids);
}
export async function getSessionTask(
  teamId: string,
  taskId: string,
  userId: string,
) {
  await requireMembership(teamId, userId);
  const task = await repository.findTask(teamId, taskId);
  if (!task) throw new NotFoundError("No encontramos la tarea del Gantt.");
  if (task.completed)
    throw new ValidationError("La tarea del Gantt ya está terminada.");
  if (task.assigneeId && task.assigneeId !== userId)
    throw new ForbiddenError("Esta tarea está asignada a otra persona.");
  return task;
}
export async function addDiagram(teamId: string, name: string, userId: string) {
  await requireMembership(teamId, userId);
  return repository.createDiagram(teamId, name, userId);
}
export async function addTask(
  data: z.output<typeof taskSchema>,
  userId: string,
) {
  await requireMembership(data.teamId, userId);
  if (!(await repository.findDiagram(data.teamId, data.diagramId)))
    throw new NotFoundError("No encontramos el diagrama.");
  if (data.assigneeId) await requireMembership(data.teamId, data.assigneeId);
  return repository.createTask({ ...data, createdBy: userId });
}
async function writable(teamId: string, taskId: string, userId: string) {
  const member = await requireMembership(teamId, userId);
  const task = await repository.findTask(teamId, taskId);
  if (!task) throw new NotFoundError();
  if (member.role !== "owner" && task.assigneeId && task.assigneeId !== userId)
    throw new ForbiddenError(
      "Solo el responsable o el dueño pueden modificar esta tarea.",
    );
  return { task, owner: member.role === "owner" };
}
export async function editTask(
  data: z.output<typeof updateTaskSchema>,
  userId: string,
) {
  const { task, owner } = await writable(data.teamId, data.taskId, userId);
  if (task.diagramId !== data.diagramId)
    throw new ValidationError("El diagrama no coincide con la tarea.");
  if (data.assigneeId && data.assigneeId !== task.assigneeId)
    await requireMembership(data.teamId, data.assigneeId);
  const { teamId, taskId, diagramId: _diagramId, ...changes } = data;
  if (!(await repository.updateTask(teamId, taskId, userId, owner, changes)))
    throw new ForbiddenError(
      "La tarea cambió de responsable. Actualizá el diagrama.",
    );
}
export async function moveTask(
  data: { teamId: string; taskId: string; startDate: string; endDate: string },
  userId: string,
) {
  const { owner } = await writable(data.teamId, data.taskId, userId);
  if (
    !(await repository.updateTask(data.teamId, data.taskId, userId, owner, {
      startDate: data.startDate,
      endDate: data.endDate,
    }))
  )
    throw new ForbiddenError(
      "La tarea cambió de responsable. Actualizá el diagrama.",
    );
}
export async function setTaskCompleted(
  teamId: string,
  taskId: string,
  userId: string,
  completed: boolean,
) {
  const { owner } = await writable(teamId, taskId, userId);
  if (
    !(await repository.updateTask(teamId, taskId, userId, owner, { completed }))
  )
    throw new ForbiddenError();
}
