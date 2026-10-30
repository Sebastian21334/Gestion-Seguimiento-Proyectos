import { z } from "zod";

export const documentTypeSchema = z.enum(["gantt", "doc", "other"]);
export const documentInputSchema = z.object({
  teamId: z.uuid(),
  title: z.string().trim().min(1, "Ingresá un título.").max(120),
  url: z
    .url("Ingresá una URL válida.")
    .max(2048)
    .refine(
      (value) => ["http:", "https:"].includes(new URL(value).protocol),
      "Solo se permiten enlaces http o https.",
    ),
  type: documentTypeSchema,
  description: z.string().trim().max(500).default(""),
});
export const documentListSchema = z.object({
  teamId: z.uuid(),
  type: documentTypeSchema.optional(),
});
export const deleteDocumentSchema = z.object({
  teamId: z.uuid(),
  documentId: z.uuid(),
});
