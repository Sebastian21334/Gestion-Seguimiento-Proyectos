import "server-only";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/shared/db";
import { ganttDiagrams, ganttTasks } from "./schema";

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
export async function findTasks(teamId: string, ids: string[]) {
  return ids.length
    ? db
        .select()
        .from(ganttTasks)
        .where(and(eq(ganttTasks.teamId, teamId), inArray(ganttTasks.id, ids)))
    : [];
}
export async function createTask(data: typeof ganttTasks.$inferInsert) {
  return (await db.insert(ganttTasks).values(data).returning())[0];
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
    >
  >,
) {
  return (
    await db
      .update(ganttTasks)
      .set(data)
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
      .returning()
  )[0];
}
