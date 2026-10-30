import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ membership: vi.fn(), task: vi.fn(), update: vi.fn(), diagram: vi.fn(), create: vi.fn() }));
vi.mock("@/modules/teams", () => ({ requireMembership: mocks.membership }));
vi.mock("@/modules/users", () => ({ findUsersByIds: vi.fn() }));
vi.mock("@/modules/gantt/repository", () => ({ findTask: mocks.task, updateTask: mocks.update, findDiagram: mocks.diagram, createTask: mocks.create }));
import { moveTask, getSessionTask, addTask, editTask } from "@/modules/gantt/service";
const teamId = "00000000-0000-4000-8000-000000000001";
const taskId = "00000000-0000-4000-8000-000000000002";
const userId = "00000000-0000-4000-8000-000000000003";
const another = "00000000-0000-4000-8000-000000000004";
describe("permisos del Gantt", () => {
  beforeEach(() => { mocks.membership.mockResolvedValue({ role: "member" }); mocks.task.mockResolvedValue({ id: taskId, teamId, assigneeId: another, completed: false }); mocks.update.mockResolvedValue({ id: taskId }); });
  it("no permite que un tercero cambie ni empiece una tarea asignada", async () => {
    await expect(moveTask({ teamId, taskId, startDate: "2026-01-01", endDate: "2026-01-02" }, userId)).rejects.toMatchObject({ status: 403 });
    await expect(getSessionTask(teamId, taskId, userId)).rejects.toMatchObject({ status: 403 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("permite editar tareas sin responsable, propias o al dueño", async () => {
    for (const [role, assigneeId] of [["member", null], ["member", userId], ["owner", another]] as const) {
      mocks.membership.mockResolvedValue({ role }); mocks.task.mockResolvedValue({ id: taskId, teamId, assigneeId, completed: false });
      await expect(moveTask({ teamId, taskId, startDate: "2026-01-01", endDate: "2026-01-02" }, userId)).resolves.toBeUndefined();
    }
  });
  it("impide crear una actividad en un diagrama de otro equipo", async () => {
    mocks.diagram.mockResolvedValue(undefined);
    await expect(addTask({ teamId, diagramId: taskId, title: "Tarea", description: "", assigneeId: null, startDate: "2026-01-01", endDate: "2026-01-01", startTime: "09:00", endTime: "17:00" }, userId)).rejects.toMatchObject({ status: 404 });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("permite al dueño conservar un exmiembro al editar, pero exige pertenencia al asignar otro", async () => {
    const input = { teamId, taskId, diagramId: taskId, title: "Tarea", description: "", assigneeId: another, startDate: "2026-01-01", endDate: "2026-01-01", startTime: "09:00", endTime: "17:00" };
    mocks.membership.mockResolvedValue({ role: "owner" });
    mocks.task.mockResolvedValue({ id: taskId, teamId, diagramId: taskId, assigneeId: another });
    await expect(editTask(input, userId)).resolves.toBeUndefined();
    mocks.membership.mockResolvedValueOnce({ role: "owner" }).mockRejectedValueOnce(new Error("No es miembro"));
    await expect(editTask({ ...input, assigneeId: userId }, userId)).rejects.toThrow("No es miembro");
  });
});
