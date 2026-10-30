"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/shared/session";
import { runAction } from "@/shared/errors/action";
import type { ActionState } from "@/shared/ui/action-state";
import * as schemas from "./schemas";
import * as service from "./service";

export async function documentsPageAction(teamId: unknown, type?: unknown) {
  const data = schemas.documentListSchema.parse({ teamId, type });
  return service.listDocuments(
    data.teamId,
    (await requireCurrentUser()).id,
    data.type,
  );
}
export async function addDocumentAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    await service.addDocument(
      schemas.documentInputSchema.parse(Object.fromEntries(form)),
      (await requireCurrentUser()).id,
    );
    revalidatePath("/", "layout");
  });
}
export async function deleteDocumentAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    const data = schemas.deleteDocumentSchema.parse(Object.fromEntries(form));
    await service.deleteDocument(
      data.teamId,
      data.documentId,
      (await requireCurrentUser()).id,
    );
    revalidatePath("/", "layout");
  });
}
