import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ membership: vi.fn(), task: vi.fn(), update: vi.fn(), diagram: vi.fn(), create: vi.fn(), activate: vi.fn(), remove: vi.fn() }));
vi.mock("@/modules/teams", () => ({ requireMembership: mocks.membership }));
vi.mock("@/modules/users", () => ({ findUsersByIds: vi.fn() }));
vi.mock("@/modules/gantt/repository", () => ({ findTask: mocks.task, updateTask: mocks.update, findDiagram: mocks.diagram, createTask: mocks.create, activatePendingTask: mocks.activate, deleteTask: mocks.remove }));
import { taskSchema, updateTaskSchema } from "@/modules/gantt/schemas";
import { moveTask, getSessionTask, startSessionTask, addTask, editTask, removeTask } from "@/modules/gantt/service";
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
  it("exige pertenencia antes de activar la actividad vinculada", async () => {
    mocks.membership.mockRejectedValueOnce(new Error("No sos miembro de este equipo."));
    await expect(startSessionTask(teamId, taskId, userId)).rejects.toThrow("No sos miembro");
    expect(mocks.activate).not.toHaveBeenCalled();
    await startSessionTask(teamId, taskId, userId);
    expect(mocks.activate).toHaveBeenCalledWith(teamId, taskId, userId);
  });
  it("permite editar tareas sin responsable, propias o al dueño", async () => {
    for (const [role, assigneeId] of [["member", null], ["member", userId], ["owner", another]] as const) {
      mocks.membership.mockResolvedValue({ role }); mocks.task.mockResolvedValue({ id: taskId, teamId, assigneeId, completed: false });
      await expect(moveTask({ teamId, taskId, startDate: "2026-01-01", endDate: "2026-01-02" }, userId)).resolves.toBeUndefined();
    }
  });
  it("permite eliminar tareas propias, sin responsable o al dueño del equipo", async () => {
    mocks.remove.mockResolvedValue({ id: taskId });
    for (const [role, assigneeId] of [["member", null], ["member", userId], ["owner", another]] as const) {
      mocks.membership.mockResolvedValue({ role });
      mocks.task.mockResolvedValue({ id: taskId, teamId, assigneeId });
      await expect(removeTask(teamId, taskId, userId)).resolves.toBeUndefined();
      expect(mocks.remove).toHaveBeenLastCalledWith(teamId, taskId, userId, role === "owner");
    }
  });
  it("rechaza eliminar una tarea asignada a otra persona", async () => {
    await expect(removeTask(teamId, taskId, userId)).rejects.toMatchObject({ status: 403 });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("exige pertenencia al equipo antes de buscar o eliminar una tarea", async () => {
    mocks.membership.mockRejectedValueOnce(new Error("No sos miembro de este equipo."));
    await expect(removeTask(teamId, taskId, userId)).rejects.toThrow("No sos miembro");
    expect(mocks.task).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("no elimina una tarea inexistente o de otro equipo", async () => {
    mocks.task.mockResolvedValue(undefined);
    await expect(removeTask(teamId, taskId, userId)).rejects.toMatchObject({ status: 404 });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("informa el rechazo si los permisos cambian antes de completar la eliminación", async () => {
    mocks.task.mockResolvedValue({ id: taskId, teamId, assigneeId: userId });
    mocks.remove.mockResolvedValue(undefined);
    await expect(removeTask(teamId, taskId, userId)).rejects.toMatchObject({ status: 403 });
  });
  it("impide crear una actividad en un diagrama de otro equipo", async () => {
    mocks.diagram.mockResolvedValue(undefined);
    await expect(addTask(taskSchema.parse({ teamId, diagramId: taskId, title: "Tarea", description: "", assigneeId: null, startDate: "2026-01-01", endDate: "2026-01-01", startTime: "09:00", endTime: "17:00" }), userId)).rejects.toMatchObject({ status: 404 });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("permite al dueño conservar un exmiembro al editar, pero exige pertenencia al asignar otro", async () => {
    const input = updateTaskSchema.parse({ teamId, taskId, diagramId: taskId, title: "Tarea", description: "", assigneeId: another, startDate: "2026-01-01", endDate: "2026-01-01", startTime: "09:00", endTime: "17:00" });
    mocks.membership.mockResolvedValue({ role: "owner" });
    mocks.task.mockResolvedValue({ id: taskId, teamId, diagramId: taskId, assigneeId: another });
    await expect(editTask(input, userId)).resolves.toBeUndefined();
    mocks.membership.mockResolvedValueOnce({ role: "owner" }).mockRejectedValueOnce(new Error("No es miembro"));
    await expect(editTask({ ...input, assigneeId: userId }, userId)).rejects.toThrow("No es miembro");
  });
});
