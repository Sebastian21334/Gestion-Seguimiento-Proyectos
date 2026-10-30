import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "./schema";

export async function findById(id: string) {
  return (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
}
export async function findByEmail(email: string) {
  return (
    await db.select().from(users).where(eq(users.email, email)).limit(1)
  )[0];
}
export async function findByIds(ids: string[]) {
  if (!ids.length) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      bio: users.bio,
      githubUsername: users.githubUsername,
    })
    .from(users)
    .where(inArray(users.id, ids));
}
export async function findContactDetailsByIds(ids: string[]) {
  if (!ids.length) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      bio: users.bio,
      githubUsername: users.githubUsername,
    })
    .from(users)
    .where(inArray(users.id, ids));
}
export async function insert(data: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  return (
    await db
      .insert(users)
      .values(data)
      .onConflictDoNothing({ target: users.email })
      .returning()
  )[0];
}
export async function markVerified(id: string, email: string) {
  return (
    await db
      .update(users)
      .set({ emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` })
      .where(and(eq(users.id, id), eq(users.email, email)))
      .returning({ id: users.id })
  )[0];
}
export async function replacePassword(
  id: string,
  previousHash: string,
  passwordHash: string,
) {
  return (
    await db
      .update(users)
      .set({ passwordHash, tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(and(eq(users.id, id), eq(users.passwordHash, previousHash)))
      .returning({ id: users.id })
  )[0];
}
export async function updateProfile(
  id: string,
  data: { name: string; bio: string; githubUsername: string },
) {
  return (
    await db
      .update(users)
      .set({
        ...data,
        bio: data.bio || null,
        githubUsername: data.githubUsername || null,
      })
      .where(eq(users.id, id))
      .returning({ id: users.id })
  )[0];
}
