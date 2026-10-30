import { describe, expect, it } from "vitest";
import { summarizePhase, validateDependencies } from "@/modules/gantt/planning";
import { taskSchema, updateTaskSchema } from "@/modules/gantt/schemas";

const id = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const base = { teamId: id(1), diagramId: id(2), title: "Plan de trabajo", assigneeId: "", startDate: "2026-10-30", endDate: "2026-10-31", startTime: "09:00", endTime: "17:00" };

describe("planificación del Gantt", () => {
  it("calcula la fase desde sus extremos, sin sumar duraciones que se superponen", () => {
    expect(summarizePhase([
      { startDate: "2026-10-30", endDate: "2026-11-04", startTime: "10:00", endTime: "15:00", progress: 60 },
      { startDate: "2026-10-30", endDate: "2026-11-02", startTime: "08:00", endTime: "17:00", progress: 100 },
    ])).toEqual({ startDate: "2026-10-30", startTime: "08:00", endDate: "2026-11-04", endTime: "15:00", progress: 80, taskCount: 2, durationDays: 6 });
  });
  it("recalcula al mover o quitar tareas y representa una fase vacía sin fechas ficticias", () => {
    const task = { startDate: "2026-11-01", endDate: "2026-11-10", startTime: "09:00", endTime: "17:00", progress: 30 };
    expect(summarizePhase([task])).toMatchObject({ startDate: "2026-11-01", endDate: "2026-11-10", progress: 30 });
    expect(summarizePhase([])).toMatchObject({ startDate: null, endDate: null, progress: 0, taskCount: 0 });
  });
  it("admite varias predecesoras y reemplaza las dependencias al editar", () => {
    expect(() => validateDependencies("C", ["A", "B"], ["A", "B", "C"], [{ taskId: "B", dependsOnId: "A" }])).not.toThrow();
    expect(() => validateDependencies("B", [], ["A", "B"], [{ taskId: "B", dependsOnId: "A" }])).not.toThrow();
  });
  it("rechaza autorreferencias y dependencias de otro diagrama", () => {
    expect(() => validateDependencies("A", ["A"], ["A"], [])).toThrow(/sí misma/);
    expect(() => validateDependencies("A", ["OTHER"], ["A", "B"], [])).toThrow(/mismo diagrama/);
  });
  it("rechaza ciclos directos e indirectos, también entre fases distintas", () => {
    expect(() => validateDependencies("A", ["B"], ["A", "B"], [{ taskId: "B", dependsOnId: "A" }])).toThrow(/ciclo/);
    expect(() => validateDependencies("A", ["C"], ["A", "B", "C"], [{ taskId: "B", dependsOnId: "A" }, { taskId: "C", dependsOnId: "B" }])).toThrow(/ciclo/);
  });
  it("da valores compatibles a las tareas sin campos nuevos", () => {
    expect(taskSchema.parse(base)).toMatchObject({ phaseId: null, status: "pending", progress: 0, priority: "medium", dependencyIds: [] });
  });
  it("acepta progreso y prioridad y valida las mismas reglas al crear y editar", () => {
    for (const schema of [taskSchema, updateTaskSchema]) {
      const input = { ...base, taskId: id(3), status: "active", progress: "60", priority: "high", phaseId: id(4), dependencyIds: [id(5)] };
      expect(schema.parse(input)).toMatchObject({ progress: 60, priority: "high" });
      for (const changes of [{ progress: -1 }, { progress: 101 }, { progress: 2.5 }, { priority: "invalid" }, { status: "done", progress: 50 }, { status: "pending", progress: 25 }, { status: "active", progress: 100 }, { dependencyIds: [id(5), id(5)] }])
        expect(schema.safeParse({ ...input, ...changes }).success).toBe(false);
      expect(schema.safeParse({ ...input, status: "done", progress: 100 }).success).toBe(true);
    }
  });
  it("conserva la validación de fechas y horas", () => {
    expect(taskSchema.safeParse({ ...base, endDate: "2026-10-29" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...base, endDate: base.startDate, endTime: "08:00" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...base, startTime: "25:00" }).success).toBe(false);
  });
});
