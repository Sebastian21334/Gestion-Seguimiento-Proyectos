import { z } from "zod";

export const teamIdSchema = z.uuid();
export const startSessionSchema = z.object({
  teamId: teamIdSchema,
  title: z.string().trim().min(1, "Ingresá un título para la tarea.").max(120),
  description: z.string().trim().min(1, "Contanos qué vas a hacer.").max(1000),
  ganttTaskId: z.uuid("Elegí una tarea del diagrama de Gantt."),
});
export const finishSessionSchema = z.object({
  teamId: teamIdSchema,
  sessionId: z.uuid(),
});
export const reportRequestSchema = z.object({
  teamId: teamIdSchema,
  sessionId: z.uuid(),
});
export const downloadReportSchema = reportRequestSchema.extend({
  reportId: z.uuid(),
});
export const MAX_MARKDOWN_BYTES = 256 * 1024;
export const markdownFileSchema = z
  .file()
  .min(1, "El archivo .md no puede estar vacío.")
  .max(MAX_MARKDOWN_BYTES, "El archivo .md admite hasta 256 KB.")
  .refine(
    (file) =>
      file.name.length > 3 &&
      file.name.length <= 160 &&
      /\.md$/i.test(file.name) &&
      !/[\\/\u0000-\u001f]/.test(file.name),
    "Adjuntá únicamente un archivo con extensión .md y un nombre de hasta 160 caracteres.",
  )
  .transform(async (file, ctx) => {
    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      );
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "El archivo .md debe contener texto UTF-8 válido.",
      });
      return z.NEVER;
    }
    if (
      !content.trim() ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(content)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "El archivo .md debe contener texto legible que describa los cambios de la sesión.",
      });
      return z.NEVER;
    }
    return { name: file.name, content };
  });
export type MarkdownReport = z.output<typeof markdownFileSchema>;

export async function optionalMarkdownFile(value: FormDataEntryValue | null) {
  if (
    value === null ||
    (value instanceof File && value.name === "" && value.size === 0)
  )
    return undefined;
  return markdownFileSchema.parseAsync(value);
}
export const memberHistorySchema = z.object({
  teamId: teamIdSchema,
  userId: z.uuid(),
});
