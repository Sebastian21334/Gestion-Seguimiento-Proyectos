import "server-only";
import { cache } from "react";
import { findUserContactsByIds } from "@/modules/users";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/shared/errors";
import * as repository from "./repository";

export async function requireMembership(teamId: string, userId: string) {
  const member = await repository.membership(teamId, userId);
  if (!member) throw new ForbiddenError("No sos miembro de este equipo.");
  return member;
}
export async function requireOwner(teamId: string, userId: string) {
  const member = await requireMembership(teamId, userId);
  if (member.role !== "owner")
    throw new ForbiddenError("Esta acción está reservada al owner.");
  return member;
}
export async function getTeam(teamId: string, userId: string) {
  await requireMembership(teamId, userId);
  const team = await repository.findById(teamId);
  if (!team) throw new NotFoundError();
  return team;
}
export const getTeamBySlug = cache(async (slug: string, userId: string) => {
  const reference = await repository.findIdBySlug(slug);
  if (!reference) throw new NotFoundError();
  const member = await requireMembership(reference.id, userId);
  const team = await repository.findById(reference.id);
  if (!team) throw new NotFoundError();
  return { ...team, role: member.role };
});
export async function listMyTeams(userId: string) {
  const memberships = await repository.memberships(userId);
  await Promise.all(
    memberships.map((member) => requireMembership(member.teamId, userId)),
  );
  return repository.findByIds(memberships.map((member) => member.teamId));
}
export async function createTeam(
  data: { name: string; slug: string },
  userId: string,
) {
  const team = await repository.insert(data, userId);
  if (!team)
    throw new ValidationError("Ese identificador de equipo ya está en uso.");
  return team;
}
export async function listMembers(teamId: string, userId: string) {
  await requireMembership(teamId, userId);
  const members = await repository.members(teamId);
  const profiles = await findUserContactsByIds(
    members.map((member) => member.userId),
  );
  return members.map((member) => ({
    ...member,
    user: profiles.find((profile) => profile.id === member.userId)!,
  }));
}
export async function getMemberProfile(
  teamId: string,
  memberId: string,
  userId: string,
) {
  await requireMembership(teamId, userId);
  await requireMembership(teamId, memberId);
  const [profile] = await findUserContactsByIds([memberId]);
  if (!profile) throw new NotFoundError();
  return profile;
}
export async function renameTeam(teamId: string, name: string, userId: string) {
  await requireOwner(teamId, userId);
  await repository.rename(teamId, name);
}
export async function deleteTeam(teamId: string, userId: string) {
  await requireOwner(teamId, userId);
  await repository.remove(teamId);
}
export async function removeTeamMember(
  teamId: string,
  memberId: string,
  userId: string,
) {
  await requireOwner(teamId, userId);
  const member = await requireMembership(teamId, memberId);
  if (member.role === "owner")
    throw new ValidationError(
      "El owner debe usar la opción de abandonar equipo.",
    );
  await repository.removeMember(teamId, memberId);
}
export async function leaveTeam(teamId: string, userId: string) {
  await requireMembership(teamId, userId);
  for (let attempt = 0; attempt < 3; attempt++) {
    const members = await repository.members(teamId);
    const member = members.find((row) => row.userId === userId);
    if (!member) throw new ForbiddenError();
    if (member.role === "owner" && members.length > 1)
      throw new ValidationError(
        "No podés abandonar el equipo mientras haya otros miembros.",
      );
    if (
      await repository.leaveIfUnchanged(
        teamId,
        userId,
        members.map((row) => row.userId),
        member.role === "owner",
      )
    )
      return;
  }
  throw new ValidationError(
    "El equipo cambió mientras intentabas salir. Volvé a intentar.",
  );
}
// Solo invitations lo invoca después de validar token, correo y verificación.
export async function joinInvitedTeam(teamId: string, userId: string) {
  await repository.insertMember(teamId, userId);
}
