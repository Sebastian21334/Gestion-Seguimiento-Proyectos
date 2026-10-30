import "server-only";
import { NotFoundError } from "@/shared/errors";
import * as repository from "./repository";
import type { profileSchema } from "./schemas";
import type { z } from "zod";

export type User = NonNullable<Awaited<ReturnType<typeof repository.findById>>>;
export type CurrentUser = Omit<User, "passwordHash" | "tokenVersion">;
// Estas operaciones son internas al servidor. Ninguna se exporta como Server Action.
export const findUserById = repository.findById;
export const findUserByEmail = repository.findByEmail;
export const findUsersByIds = repository.findByIds;
export const findUserContactsByIds = repository.findContactDetailsByIds;
export const createUser = repository.insert;
export const verifyUserEmail = repository.markVerified;
export const replaceUserPassword = repository.replacePassword;

export function publicCurrentUser(user: User): CurrentUser {
  const { passwordHash: _password, tokenVersion: _version, ...profile } = user;
  return profile;
}
export async function editProfile(
  userId: string,
  data: z.infer<typeof profileSchema>,
) {
  if (!(await repository.updateProfile(userId, data)))
    throw new NotFoundError();
}
