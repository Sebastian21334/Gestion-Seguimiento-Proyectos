import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { teams, teamMembers } from "./schema";

export async function findById(id: string) {
  return (await db.select().from(teams).where(eq(teams.id, id)).limit(1))[0];
}
export async function findIdBySlug(slug: string) {
  return (
    await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.slug, slug))
      .limit(1)
  )[0];
}
export async function findByIds(ids: string[]) {
  return ids.length
    ? db.select().from(teams).where(inArray(teams.id, ids))
    : [];
}
export async function membership(teamId: string, userId: string) {
  return (
    await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
      )
      .limit(1)
  )[0];
}
export async function memberships(userId: string) {
  return db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
}
export async function members(teamId: string) {
  return db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
}
export async function insert(
  data: { name: string; slug: string },
  userId: string,
) {
  return db.transaction(async (tx) => {
    const [team] = await tx
      .insert(teams)
      .values({ ...data, createdBy: userId })
      .onConflictDoNothing({ target: teams.slug })
      .returning();
    if (!team) return null;
    await tx
      .insert(teamMembers)
      .values({ teamId: team.id, userId, role: "owner" });
    return team;
  });
}
export async function rename(teamId: string, name: string) {
  await db.update(teams).set({ name }).where(eq(teams.id, teamId));
}
export async function remove(teamId: string) {
  await db.delete(teams).where(eq(teams.id, teamId));
}
export async function removeMember(teamId: string, userId: string) {
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
}
export async function insertMember(teamId: string, userId: string) {
  return db.transaction(async (tx) => {
    // Comparte bloqueo con la salida del último owner.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`team:${teamId}`}, 0))`,
    );
    await tx
      .insert(teamMembers)
      .values({ teamId, userId })
      .onConflictDoNothing();
  });
}
export async function leaveIfUnchanged(
  teamId: string,
  userId: string,
  expectedMemberIds: string[],
  deleteTeam: boolean,
) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`team:${teamId}`}, 0))`,
    );
    const rows = await tx
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));
    if (
      rows.length !== expectedMemberIds.length ||
      rows.some((row) => !expectedMemberIds.includes(row.userId))
    )
      return false;
    if (deleteTeam) await tx.delete(teams).where(eq(teams.id, teamId));
    else
      await tx
        .delete(teamMembers)
        .where(
          and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
        );
    return true;
  });
}
