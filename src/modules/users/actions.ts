"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/shared/errors/action";
import { requireCurrentUser } from "@/shared/session";
import type { ActionState } from "@/shared/ui/action-state";
import { profileSchema } from "./schemas";
import { editProfile } from "./service";

export async function updateProfileAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    const user = await requireCurrentUser();
    await editProfile(user.id, profileSchema.parse(Object.fromEntries(form)));
    revalidatePath("/", "layout");
  });
}
