import "server-only";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/shared/db";
import { teamInvitations } from "./schema";

export async function insert(data: typeof teamInvitations.$inferInsert) {
  return (await db.insert(teamInvitations).values(data).returning())[0];
}
export async function findByHash(hash: string) {
  return (
    await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.tokenHash, hash))
      .limit(1)
  )[0];
}
export async function findById(id: string) {
  return (
    await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.id, id))
      .limit(1)
  )[0];
}
export async function pendingForEmail(email: string) {
  return db
    .select({
      id: teamInvitations.id,
      teamId: teamInvitations.teamId,
      expiresAt: teamInvitations.expiresAt,
    })
    .from(teamInvitations)
    .where(
      and(
        eq(teamInvitations.email, email),
        isNull(teamInvitations.acceptedAt),
        gt(teamInvitations.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(teamInvitations.createdAt));
}
export async function pendingForTeam(teamId: string) {
  return db
    .select({
      id: teamInvitations.id,
      email: teamInvitations.email,
      expiresAt: teamInvitations.expiresAt,
    })
    .from(teamInvitations)
    .where(
      and(
        eq(teamInvitations.teamId, teamId),
        isNull(teamInvitations.acceptedAt),
        gt(teamInvitations.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(teamInvitations.createdAt));
}
export async function claim(id: string, email: string) {
  return (
    await db
      .update(teamInvitations)
      .set({ acceptedAt: new Date() })
      .where(
        and(
          eq(teamInvitations.id, id),
          eq(teamInvitations.email, email),
          isNull(teamInvitations.acceptedAt),
          gt(teamInvitations.expiresAt, new Date()),
        ),
      )
      .returning()
  )[0];
}
export async function releaseClaim(id: string, acceptedAt: Date) {
  await db
    .update(teamInvitations)
    .set({ acceptedAt: null })
    .where(
      and(
        eq(teamInvitations.id, id),
        eq(teamInvitations.acceptedAt, acceptedAt),
      ),
    );
}
export async function remove(id: string, teamId: string) {
  await db
    .delete(teamInvitations)
    .where(
      and(
        eq(teamInvitations.id, id),
        eq(teamInvitations.teamId, teamId),
        isNull(teamInvitations.acceptedAt),
      ),
    );
}
