"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/shared/session";
import { runAction } from "@/shared/errors/action";
import type { ActionState } from "@/shared/ui/action-state";
import * as service from "./service";
import {
  invitationIdSchema,
  invitationInputSchema,
  invitationTokenSchema,
} from "./schemas";

export async function pendingInvitationsAction() {
  return service.listPendingInvitations(await requireCurrentUser());
}
export async function teamInvitationsAction(teamId: unknown) {
  return service.listTeamInvitations(
    z.uuid().parse(teamId),
    (await requireCurrentUser()).id,
  );
}
export async function invitationPageAction(token: unknown) {
  const user = await requireCurrentUser();
  let invitation:
    | Awaited<ReturnType<typeof service.invitationPreview>>
    | undefined;
  const state = await runAction(async () => {
    invitation = await service.invitationPreview(
      invitationTokenSchema.parse(token),
      user,
    );
  });
  return { ...state, invitation };
}
export async function inviteAction(_previous: ActionState, form: FormData) {
  return runAction(async () => {
    await service.invite(
      invitationInputSchema.parse(Object.fromEntries(form)),
      (await requireCurrentUser()).id,
    );
    revalidatePath("/", "layout");
    return { success: true, message: "Invitación enviada." };
  });
}
export async function acceptInvitationAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    const team = await service.acceptInvitation(
      invitationIdSchema.parse(form.get("invitationId")),
      await requireCurrentUser(),
    );
    revalidatePath("/", "layout");
    redirect(`/t/${team.slug}`);
  });
}
export async function revokeInvitationAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    const data = z
      .object({ invitationId: invitationIdSchema, teamId: z.uuid() })
      .parse(Object.fromEntries(form));
    await service.revokeInvitation(
      data.invitationId,
      data.teamId,
      (await requireCurrentUser()).id,
    );
    revalidatePath("/", "layout");
  });
}
