import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { documents } from "./schema";

export async function list(teamId: string, type?: "gantt" | "doc" | "other") {
  return db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.teamId, teamId),
        type ? eq(documents.type, type) : undefined,
      ),
    )
    .orderBy(desc(documents.createdAt));
}
export async function find(teamId: string, id: string) {
  return (
    await db
      .select()
      .from(documents)
      .where(and(eq(documents.teamId, teamId), eq(documents.id, id)))
      .limit(1)
  )[0];
}
export async function insert(data: typeof documents.$inferInsert) {
  await db.insert(documents).values(data);
}
export async function remove(teamId: string, id: string) {
  await db
    .delete(documents)
    .where(and(eq(documents.teamId, teamId), eq(documents.id, id)));
}
