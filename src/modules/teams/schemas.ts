import { z } from "zod";

export const teamIdSchema = z.uuid();
export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El equipo no es válido.");
export const createTeamSchema = z.object({
  name: z.string().trim().min(1, "Ingresá un nombre.").max(80),
  slug: slugSchema,
});
export const renameTeamSchema = z.object({
  teamId: teamIdSchema,
  name: z.string().trim().min(1).max(80),
});
export const memberInputSchema = z.object({
  teamId: teamIdSchema,
  userId: z.uuid(),
});
