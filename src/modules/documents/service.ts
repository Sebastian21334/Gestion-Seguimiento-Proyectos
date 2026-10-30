import "server-only";
import { requireMembership } from "@/modules/teams";
import { findUsersByIds } from "@/modules/users";
import { ForbiddenError, NotFoundError } from "@/shared/errors";
import type { documentInputSchema } from "./schemas";
import type { z } from "zod";
import * as repository from "./repository";

export async function listDocuments(
  teamId: string,
  userId: string,
  type?: "gantt" | "doc" | "other",
) {
  const member = await requireMembership(teamId, userId);
  const rows = await repository.list(teamId, type);
  const users = await findUsersByIds([
    ...new Set(rows.map((row) => row.createdBy)),
  ]);
  return rows.map((row) => ({
    ...row,
    creatorName:
      users.find((user) => user.id === row.createdBy)?.name ?? "Exmiembro",
    canDelete: member.role === "owner" || row.createdBy === userId,
  }));
}
export async function addDocument(
  data: z.infer<typeof documentInputSchema>,
  userId: string,
) {
  await requireMembership(data.teamId, userId);
  await repository.insert({
    ...data,
    createdBy: userId,
    description: data.description || null,
  });
}
export async function deleteDocument(
  teamId: string,
  documentId: string,
  userId: string,
) {
  const member = await requireMembership(teamId, userId);
  const doc = await repository.find(teamId, documentId);
  if (!doc) throw new NotFoundError();
  if (member.role !== "owner" && doc.createdBy !== userId)
    throw new ForbiddenError();
  await repository.remove(teamId, documentId);
}
