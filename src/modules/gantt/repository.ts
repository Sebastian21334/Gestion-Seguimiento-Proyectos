import "server-only";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { ganttComments, ganttDependencies, ganttDiagrams, ganttPhases, ganttTasks } from "./schema";
import { ValidationError } from "@/shared/errors";
import { validateDependencies } from "./planning";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function lockDiagram(tx: Transaction, teamId: string, diagramId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`gantt:${teamId}:${diagramId}`}, 0))`);
}
async function validateLinks(tx: Transaction, teamId: string, diagramId: string, taskId: string, phaseId: string | null | undefined, dependencyIds: string[] | undefined) {
  if (phaseId) {
    const [phase] = await tx.select().from(ganttPhases).where(and(eq(ganttPhases.id, phaseId), eq(ganttPhases.teamId, teamId), eq(ganttPhases.diagramId, diagramId)));
    if (!phase) throw new ValidationError("La fase debe pertenecer al mismo diagrama.");
  }
  if (dependencyIds) {
    const tasks = await tx.select({ id: ganttTasks.id }).from(ganttTasks).where(and(eq(ganttTasks.teamId, teamId), eq(ganttTasks.diagramId, diagramId)));
    const edges = await tx.select().from(ganttDependencies).where(and(eq(ganttDependencies.teamId, teamId), eq(ganttDependencies.diagramId, diagramId)));
    validateDependencies(taskId, dependencyIds, tasks.map(task => task.id), edges);
  }
}
async function replaceDependencies(tx: Transaction, teamId: string, diagramId: string, taskId: string, dependencyIds: string[]) {
  await tx.delete(ganttDependencies).where(and(eq(ganttDependencies.teamId, teamId), eq(ganttDependencies.taskId, taskId)));
  if (dependencyIds.length) await tx.insert(ganttDependencies).values(dependencyIds.map(dependsOnId => ({ teamId, diagramId, taskId, dependsOnId })));
}

export async function diagrams(teamId: string) {
  return db
    .select()
    .from(ganttDiagrams)
    .where(eq(ganttDiagrams.teamId, teamId))
    .orderBy(ganttDiagrams.createdAt);
}
export async function findDiagram(teamId: string, id: string) {
  return (
    await db
      .select()
      .from(ganttDiagrams)
      .where(and(eq(ganttDiagrams.teamId, teamId), eq(ganttDiagrams.id, id)))
      .limit(1)
  )[0];
}
export async function createDiagram(
  teamId: string,
  name: string,
  createdBy: string,
) {
  return (
    await db
      .insert(ganttDiagrams)
      .values({ teamId, name, createdBy })
      .returning()
  )[0];
}
export async function tasks(teamId: string) {
  return db
    .select()
    .from(ganttTasks)
    .where(eq(ganttTasks.teamId, teamId))
    .orderBy(ganttTasks.startDate, ganttTasks.createdAt);
}
export async function findTask(teamId: string, id: string) {
  return (
    await db
      .select()
      .from(ganttTasks)
      .where(and(eq(ganttTasks.teamId, teamId), eq(ganttTasks.id, id)))
      .limit(1)
  )[0];
}
export async function activatePendingTask(teamId: string, id: string, userId: string) {
  return db
    .update(ganttTasks)
    .set({ status: "active" })
    .where(and(
      eq(ganttTasks.teamId, teamId),
      eq(ganttTasks.id, id),
      eq(ganttTasks.status, "pending"),
      eq(ganttTasks.completed, false),
      or(isNull(ganttTasks.assigneeId), eq(ganttTasks.assigneeId, userId)),
    ));
}
export async function findTasks(teamId: string, ids: string[]) {
  return ids.length
    ? db
        .select()
        .from(ganttTasks)
        .where(and(eq(ganttTasks.teamId, teamId), inArray(ganttTasks.id, ids)))
    : [];
}
export async function createTask(data: typeof ganttTasks.$inferInsert & { dependencyIds?: string[] }) {
  const { dependencyIds = [], ...values } = data;
  return db.transaction(async tx => {
    await lockDiagram(tx, data.teamId, data.diagramId);
    await validateLinks(tx, data.teamId, data.diagramId, "new", data.phaseId, dependencyIds);
    const [task] = await tx.insert(ganttTasks).values(values).returning();
    await replaceDependencies(tx, data.teamId, data.diagramId, task.id, dependencyIds);
    return task;
  });
}
export async function updateTask(
  teamId: string,
  id: string,
  userId: string,
  owner: boolean,
  data: Partial<
    Pick<
      typeof ganttTasks.$inferInsert,
      | "title"
      | "description"
      | "assigneeId"
      | "startDate"
      | "endDate"
      | "startTime"
      | "endTime"
      | "completed"
      | "phaseId"
      | "status"
      | "progress"
      | "priority"
    >
  > & { dependencyIds?: string[] },
) {
  return db.transaction(async tx => {
    const { dependencyIds, ...values } = data;
    const [task] = await tx.select().from(ganttTasks).where(and(eq(ganttTasks.teamId, teamId), eq(ganttTasks.id, id)));
    if (!task) return undefined;
    await lockDiagram(tx, teamId, task.diagramId);
    await validateLinks(tx, teamId, task.diagramId, id, values.phaseId, dependencyIds);
    const [updated] = await tx
      .update(ganttTasks)
      .set(values)
      .where(
        and(
          eq(ganttTasks.teamId, teamId),
          eq(ganttTasks.id, id),
          owner
            ? undefined
            : or(
                isNull(ganttTasks.assigneeId),
                eq(ganttTasks.assigneeId, userId),
              ),
        ),
      )
      .returning();
    if (updated && dependencyIds) await replaceDependencies(tx, teamId, task.diagramId, id, dependencyIds);
    return updated;
  });
}

export async function phases(teamId: string) {
  return db.select().from(ganttPhases).where(eq(ganttPhases.teamId, teamId)).orderBy(ganttPhases.position, ganttPhases.createdAt);
}
export async function dependencies(teamId: string) {
  return db.select().from(ganttDependencies).where(eq(ganttDependencies.teamId, teamId));
}
export async function comments(teamId: string) {
  return db.select().from(ganttComments).where(eq(ganttComments.teamId, teamId)).orderBy(desc(ganttComments.createdAt)).limit(200);
}
export async function createPhase(data: typeof ganttPhases.$inferInsert) {
  return (await db.insert(ganttPhases).values(data).returning())[0];
}
export async function findPhase(teamId: string, phaseId: string) {
  return (await db.select().from(ganttPhases).where(and(eq(ganttPhases.teamId, teamId), eq(ganttPhases.id, phaseId))))[0];
}
export async function updatePhase(teamId: string, phaseId: string, userId: string, owner: boolean, values: { name: string; color: string }) {
  return (await db.update(ganttPhases).set(values).where(and(eq(ganttPhases.teamId, teamId), eq(ganttPhases.id, phaseId), owner ? undefined : eq(ganttPhases.createdBy, userId))).returning())[0];
}
export async function deletePhase(teamId: string, phaseId: string, userId: string, owner: boolean) {
  return db.transaction(async tx => {
    const [phase] = await tx.select().from(ganttPhases).where(and(eq(ganttPhases.teamId, teamId), eq(ganttPhases.id, phaseId)));
    if (!phase) return undefined;
    await lockDiagram(tx, teamId, phase.diagramId);
    return (await tx.delete(ganttPhases).where(and(eq(ganttPhases.teamId, teamId), eq(ganttPhases.id, phaseId), owner ? undefined : eq(ganttPhases.createdBy, userId))).returning())[0];
  });
}
export async function deleteTask(teamId: string, taskId: string, userId: string, owner: boolean) {
  return db.transaction(async tx => {
    const [task] = await tx.select().from(ganttTasks).where(and(eq(ganttTasks.teamId, teamId), eq(ganttTasks.id, taskId)));
    if (!task) return undefined;
    await lockDiagram(tx, teamId, task.diagramId);
    return (await tx.delete(ganttTasks).where(and(eq(ganttTasks.teamId, teamId), eq(ganttTasks.id, taskId), owner ? undefined : or(isNull(ganttTasks.assigneeId), eq(ganttTasks.assigneeId, userId)))).returning())[0];
  });
}
export async function createComment(data: typeof ganttComments.$inferInsert) {
  return (await db.insert(ganttComments).values(data).returning())[0];
}
