"use server";

import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/shared/session";
import { runAction } from "@/shared/errors/action";
import { DomainError } from "@/shared/errors";
import type { ActionState } from "@/shared/ui/action-state";
import * as schemas from "./schemas";
import * as service from "./service";

export async function myTeamsAction() {
  return service.listMyTeams((await requireCurrentUser()).id);
}
export async function teamPageAction(slug: unknown) {
  const user = await requireCurrentUser();
  const parsed = schemas.slugSchema.safeParse(slug);
  if (!parsed.success) notFound();
  try {
    return await service.getTeamBySlug(parsed.data, user.id);
  } catch (error) {
    if (error instanceof DomainError && [403, 404].includes(error.status))
      notFound();
    throw error;
  }
}
export async function membersPageAction(teamId: unknown) {
  return service.listMembers(
    schemas.teamIdSchema.parse(teamId),
    (await requireCurrentUser()).id,
  );
}
export async function memberProfileAction(teamId: unknown, userId: unknown) {
  const data = schemas.memberInputSchema.parse({ teamId, userId });
  return service.getMemberProfile(
    data.teamId,
    data.userId,
    (await requireCurrentUser()).id,
  );
}
export async function createTeamAction(_previous: ActionState, form: FormData) {
  return runAction(async () => {
    const team = await service.createTeam(
      schemas.createTeamSchema.parse(Object.fromEntries(form)),
      (await requireCurrentUser()).id,
    );
    revalidatePath("/", "layout");
    redirect(`/t/${team.slug}`);
  });
}
export async function renameTeamAction(_previous: ActionState, form: FormData) {
  return runAction(async () => {
    const data = schemas.renameTeamSchema.parse(Object.fromEntries(form));
    await service.renameTeam(
      data.teamId,
      data.name,
      (await requireCurrentUser()).id,
    );
    revalidatePath("/", "layout");
  });
}
export async function removeMemberAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    const data = schemas.memberInputSchema.parse(Object.fromEntries(form));
    await service.removeTeamMember(
      data.teamId,
      data.userId,
      (await requireCurrentUser()).id,
    );
    revalidatePath("/", "layout");
  });
}
export async function leaveTeamAction(_previous: ActionState, form: FormData) {
  return runAction(async () => {
    await service.leaveTeam(
      schemas.teamIdSchema.parse(form.get("teamId")),
      (await requireCurrentUser()).id,
    );
    revalidatePath("/", "layout");
    redirect("/");
  });
}
export async function deleteTeamAction(_previous: ActionState, form: FormData) {
  return runAction(async () => {
    await service.deleteTeam(
      schemas.teamIdSchema.parse(form.get("teamId")),
      (await requireCurrentUser()).id,
    );
    revalidatePath("/", "layout");
    redirect("/");
  });
}
