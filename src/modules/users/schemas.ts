import { z } from "zod";

export const userIdSchema = z.uuid();
export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ingresá tu nombre.")
    .max(80, "El nombre admite hasta 80 caracteres."),
  bio: z.string().trim().max(500, "La biografía admite hasta 500 caracteres."),
  githubUsername: z
    .string()
    .trim()
    .max(39)
    .refine(
      (value) =>
        value === "" || /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(value),
      "El usuario de GitHub no es válido.",
    ),
});
