import { z } from "zod";

const id = z.uuid();
const nullableId = z.union([id, z.literal(""), z.null()]).transform(value => value || null);
const date = z.iso.date("Ingresá una fecha válida.");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ingresá una hora válida.");
export const teamSchema = z.object({ teamId: id });
export const createDiagramSchema = teamSchema.extend({
  name: z.string().trim().min(1, "Ingresá un nombre.").max(100),
});
const taskFields = teamSchema.extend({
  diagramId: id,
  title: z.string().trim().min(1, "Ingresá un título.").max(120),
  description: z.string().trim().max(1000).default(""),
  assigneeId: nullableId,
  phaseId: nullableId.default(null),
  status: z.enum(["pending", "active", "done"]).default("pending"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dependencyIds: z.array(id).max(100).refine(ids => new Set(ids).size === ids.length, "Hay dependencias repetidas.").default([]),
  startDate: date,
  endDate: date,
  startTime: time,
  endTime: time,
});
const validateTask = (value: z.output<typeof taskFields>, ctx: z.RefinementCtx) => {
  if (value.endDate < value.startDate)
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "La fecha final debe ser igual o posterior al inicio." });
  if (value.startDate === value.endDate && value.endTime <= value.startTime)
    ctx.addIssue({ code: "custom", path: ["endTime"], message: "La hora final debe ser posterior a la inicial." });
  if ((value.status === "done") !== (value.progress === 100) || (value.status === "pending" && value.progress !== 0))
    ctx.addIssue({ code: "custom", path: ["progress"], message: "Una tarea completada debe tener 100% de progreso y una pendiente, 0%." });
};
export const taskSchema = taskFields.superRefine(validateTask);
export const taskIdSchema = teamSchema.extend({ taskId: id });
export const updateTaskSchema = taskFields.extend({ taskId: id }).superRefine(validateTask);
export const moveSchema = taskIdSchema.extend({ startDate: date, endDate: date })
  .refine(value => value.endDate >= value.startDate, { message: "La fecha final debe ser igual o posterior al inicio." });
export const statusSchema = taskIdSchema.extend({ completed: z.boolean() });
export const phaseSchema = teamSchema.extend({
  diagramId: id,
  name: z.string().trim().min(1, "Ingresá un nombre para la fase.").max(120),
  color: z.enum(["violet", "amber", "green", "pink", "blue"]).default("violet"),
});
export const updatePhaseSchema = phaseSchema.extend({ phaseId: id });
export const phaseIdSchema = teamSchema.extend({ phaseId: id });
export const commentSchema = taskIdSchema.extend({ content: z.string().trim().min(1, "Escribí un comentario.").max(2000) });
