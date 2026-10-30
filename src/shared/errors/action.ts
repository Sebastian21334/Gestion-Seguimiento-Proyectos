import "server-only";
import { z } from "zod";
import { unstable_rethrow } from "next/navigation";
import { DomainError } from "./index";
import { logUnexpectedError } from "./log";
import type { ActionState } from "@/shared/ui/action-state";

export async function runAction(
  work: () => Promise<ActionState | void>,
): Promise<ActionState> {
  try {
    return (await work()) ?? { success: true, message: "Cambios guardados." };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof z.ZodError)
      return {
        success: false,
        message: error.issues[0]?.message ?? "Revisá los datos.",
      };
    if (error instanceof DomainError)
      return { success: false, message: error.message };
    logUnexpectedError(error);
    return {
      success: false,
      message: "No pudimos completar la operación. Intentá nuevamente.",
    };
  }
}
