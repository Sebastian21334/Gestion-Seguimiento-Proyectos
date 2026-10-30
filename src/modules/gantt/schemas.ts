import { z } from "zod";

const id = z.uuid();
const date = z.iso.date("Ingresá una fecha válida.");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ingresá una hora válida.");
export const teamSchema = z.object({ teamId: id });
export const createDiagramSchema = teamSchema.extend({
  name: z.string().trim().min(1, "Ingresá un nombre.").max(100),
});
export const taskSchema = teamSchema
  .extend({
    diagramId: id,
    title: z.string().trim().min(1, "Ingresá un título.").max(120),
    description: z.string().trim().max(1000).default(""),
    assigneeId: z
      .union([id, z.literal("")])
      .transform((value) => value || null),
    startDate: date,
    endDate: date,
    startTime: time,
    endTime: time,
  })
  .refine(value => value.startDate !== value.endDate || value.endTime > value.startTime, { message: "La hora final debe ser posterior a la inicial.", path: ["endTime"] })
  .refine((value) => value.endDate >= value.startDate, {
    message: "La fecha final debe ser igual o posterior al inicio.",
    path: ["endDate"],
  });
export const taskIdSchema = teamSchema.extend({ taskId: id });
export const updateTaskSchema = z
  .object({
    teamId: id,
    taskId: id,
    diagramId: id,
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).default(""),
    assigneeId: z
      .union([id, z.literal("")])
      .transform((value) => value || null),
    startDate: date,
    endDate: date,
    startTime: time,
    endTime: time,
  })
  .refine(
    (value) =>
      value.endDate >= value.startDate,
    { message: "La fecha final debe ser igual o posterior al inicio." },
  ).refine(value => value.startDate !== value.endDate || value.endTime > value.startTime, { message: "La hora final debe ser posterior a la inicial.", path: ["endTime"] });
export const moveSchema = taskIdSchema
  .extend({ startDate: date, endDate: date })
  .refine(
    (value) =>
      value.endDate >= value.startDate,
    { message: "La fecha final debe ser igual o posterior al inicio." },
  );
export const statusSchema = taskIdSchema.extend({ completed: z.boolean() });
