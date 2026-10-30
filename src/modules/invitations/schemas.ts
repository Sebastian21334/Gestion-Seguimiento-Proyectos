import { z } from "zod";

export const invitationInputSchema = z.object({
  teamId: z.uuid(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Ingresá un correo válido.").max(254)),
});
export const invitationIdSchema = z.uuid();
export const invitationTokenSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "La invitación no es válida.");
