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
import type { commentSchema, phaseSchema, taskSchema, updatePhaseSchema, updateTaskSchema } from "./schemas";
import { summarizePhase } from "./planning";

export async function getGantt(teamId: string, userId: string) {
  const member = await requireMembership(teamId, userId);
  const [diagrams, tasks, phases, dependencies, comments] = await Promise.all([
    repository.diagrams(teamId),
    repository.tasks(teamId),
    repository.phases(teamId),
    repository.dependencies(teamId),
    repository.comments(teamId),
  ]);
  const users = await findUsersByIds([
    ...new Set(
      [...comments.map(comment => comment.userId), ...tasks.flatMap((task) => [
        task.createdBy,
        ...(task.assigneeId ? [task.assigneeId] : []),
      ])],
    ),
  ]);
  return {
    diagrams,
    phases: phases.map(phase => ({ ...phase, ...summarizePhase(tasks.filter(task => task.phaseId === phase.id)), canEdit: member.role === "owner" || phase.createdBy === userId })),
    comments: comments.map(comment => ({ ...comment, authorName: users.find(user => user.id === comment.userId)?.name ?? "Exmiembro" })),
    dependencies,
    tasks: tasks.map((task) => ({
      ...task,
      dependencyIds: dependencies.filter(edge => edge.taskId === task.id).map(edge => edge.dependsOnId),
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
  return repository.createTask({ ...data, completed: data.status === "done", createdBy: userId });
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
  if (!(await repository.updateTask(teamId, taskId, userId, owner, { ...changes, completed: data.status === "done" })))
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
    !(await repository.updateTask(teamId, taskId, userId, owner, { completed, status: completed ? "done" : "pending", progress: completed ? 100 : 0 }))
  )
    throw new ForbiddenError();
}

export async function addPhase(data: z.output<typeof phaseSchema>, userId: string) {
  await requireMembership(data.teamId, userId);
  if (!(await repository.findDiagram(data.teamId, data.diagramId))) throw new NotFoundError("No encontramos el diagrama.");
  return repository.createPhase({ ...data, createdBy: userId });
}
export async function editPhase(data: z.output<typeof updatePhaseSchema>, userId: string) {
  const member = await requireMembership(data.teamId, userId);
  const phase = await repository.findPhase(data.teamId, data.phaseId);
  if (!phase || phase.diagramId !== data.diagramId) throw new NotFoundError("No encontramos la fase.");
  if (!(await repository.updatePhase(data.teamId, data.phaseId, userId, member.role === "owner", { name: data.name, color: data.color }))) throw new ForbiddenError("Solo el creador o el dueño pueden modificar la fase.");
}
export async function removePhase(teamId: string, phaseId: string, userId: string) {
  const member = await requireMembership(teamId, userId);
  if (!(await repository.deletePhase(teamId, phaseId, userId, member.role === "owner"))) throw new ForbiddenError("Solo el creador o el dueño pueden eliminar la fase.");
}
export async function removeTask(teamId: string, taskId: string, userId: string) {
  const { owner } = await writable(teamId, taskId, userId);
  if (!(await repository.deleteTask(teamId, taskId, userId, owner))) throw new ForbiddenError();
}
export async function addComment(data: z.output<typeof commentSchema>, userId: string) {
  await requireMembership(data.teamId, userId);
  if (!(await repository.findTask(data.teamId, data.taskId))) throw new NotFoundError("No encontramos la tarea.");
  return repository.createComment({ ...data, userId });
}
