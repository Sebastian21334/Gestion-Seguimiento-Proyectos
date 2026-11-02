import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_MARKDOWN_BYTES,
  markdownFileSchema,
  optionalMarkdownFile,
  startSessionSchema,
} from "@/modules/work-sessions/schemas";

const mocks = vi.hoisted(() => ({
  membership: vi.fn(),
  start: vi.fn(),
  active: vi.fn(),
  history: vi.fn(),
  finish: vi.fn(),
  findReport: vi.fn(),
  saveReport: vi.fn(),
  listReports: vi.fn(),
  removeReport: vi.fn(),
  reportHistory: vi.fn(),
  getSessionTask: vi.fn(),
  startSessionTask: vi.fn(),
}));
vi.mock("@/modules/teams", () => ({ requireMembership: mocks.membership }));
vi.mock("@/modules/users", () => ({ findUsersByIds: async () => [] }));
vi.mock("@/modules/gantt", () => ({
  getGantt: async () => ({ diagrams: [], tasks: [] }),
  getSessionTask: mocks.getSessionTask,
  startSessionTask: mocks.startSessionTask,
}));
vi.mock("@/modules/work-sessions/repository", () => ({
  start: mocks.start,
  active: mocks.active,
  history: mocks.history,
  finish: mocks.finish,
  findReport: mocks.findReport,
  saveReport: mocks.saveReport,
  listReports: mocks.listReports,
  removeReport: mocks.removeReport,
  reportHistory: mocks.reportHistory,
}));
import * as sessions from "@/modules/work-sessions/service";

const teamId = "00000000-0000-4000-8000-000000000001";
const sessionId = "00000000-0000-4000-8000-000000000002";
const userId = "00000000-0000-4000-8000-000000000003";

describe("tareas y archivo de cambios", () => {
  beforeEach(() => {
    mocks.membership.mockResolvedValue({ role: "member" });
    mocks.start.mockResolvedValue({ id: sessionId });
    mocks.active.mockResolvedValue([]);
    mocks.history.mockResolvedValue([]);
    mocks.finish.mockResolvedValue({ id: sessionId });
    mocks.saveReport.mockResolvedValue({ id: sessionId });
    mocks.listReports.mockResolvedValue([]);
    mocks.getSessionTask.mockResolvedValue({ status: "pending" });
    mocks.startSessionTask.mockResolvedValue(undefined);
  });
  it("exige título y descripción, sin aceptar el campo anterior área", () => {
    expect(
      startSessionSchema.safeParse({
        teamId,
        area: "archivo",
        description: "Cambio",
      }).success,
    ).toBe(false);
    expect(
      startSessionSchema.parse({
        teamId,
        title: " Filtros ",
        description: " Agregar búsqueda ",
        ganttTaskId: sessionId,
      }),
    ).toEqual({
      teamId,
      title: "Filtros",
      description: "Agregar búsqueda",
      ganttTaskId: sessionId,
    });
  });
  it("rechaza otra tarea activa sin cerrar la anterior", async () => {
    mocks.start.mockResolvedValue(null);
    await expect(
      sessions.startSession(
        {
          teamId,
          title: "Filtros",
          description: "Cambio",
          ganttTaskId: sessionId,
        },
        userId,
      ),
    ).rejects.toThrow("Primero cerrá tu tarea activa");
    expect(mocks.finish).not.toHaveBeenCalled();
    expect(mocks.startSessionTask).not.toHaveBeenCalled();
  });
  it("pone en curso la actividad vinculada después de iniciar la tarea", async () => {
    const input = { teamId, title: "Filtros", description: "Cambio", ganttTaskId: sessionId };
    await sessions.startSession(input, userId);
    expect(mocks.startSessionTask).toHaveBeenCalledWith(teamId, sessionId, userId);
    expect(mocks.start.mock.invocationCallOrder[0]).toBeLessThan(mocks.startSessionTask.mock.invocationCallOrder[0]);
  });
  it("no inicia ni cambia la actividad si está completada o no se puede trabajar en ella", async () => {
    mocks.getSessionTask.mockRejectedValueOnce(new Error("La tarea del Gantt ya está terminada."));
    await expect(sessions.startSession({ teamId, title: "Filtros", description: "Cambio", ganttTaskId: sessionId }, userId)).rejects.toThrow("ya está terminada");
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.startSessionTask).not.toHaveBeenCalled();
  });
  it("guarda el .md únicamente en una tarea propia, activa o finalizada", async () => {
    const report = {
      name: "cambios.md",
      content: "# Cambios\nFiltro agregado",
    };
    await sessions.uploadSessionReport(teamId, sessionId, userId, [report]);
    expect(mocks.saveReport).toHaveBeenCalledWith(teamId, sessionId, userId, [
      report,
    ]);
    mocks.saveReport.mockResolvedValue(undefined);
    await expect(
      sessions.uploadSessionReport(teamId, sessionId, userId, [report]),
    ).rejects.toThrow("tus propias tareas");
  });
  it("elimina únicamente el adjunto solicitado y rechaza una tarea ajena o un archivo inexistente", async () => {
    mocks.removeReport.mockResolvedValueOnce({ id: "report", name: "cambios.md" });
    await sessions.deleteSessionReport(teamId, sessionId, "report", userId);
    expect(mocks.removeReport).toHaveBeenCalledWith(teamId, sessionId, "report", userId);
    expect(mocks.finish).not.toHaveBeenCalled();
    expect(mocks.startSessionTask).not.toHaveBeenCalled();
    mocks.removeReport.mockResolvedValueOnce(undefined);
    await expect(sessions.deleteSessionReport(teamId, sessionId, "report", userId)).rejects.toThrow("no existe o la tarea no te pertenece");
  });
  it("deniega altas, eliminaciones y acceso al historial a quien no pertenece al equipo", async () => {
    mocks.membership.mockRejectedValue(new Error("Sin permiso"));
    await expect(sessions.uploadSessionReport(teamId, sessionId, userId, [{ name: "a.md", content: "Cambios" }])).rejects.toThrow("Sin permiso");
    await expect(sessions.deleteSessionReport(teamId, sessionId, "report", userId)).rejects.toThrow("Sin permiso");
    await expect(sessions.getReportHistory(teamId, sessionId, userId)).rejects.toThrow("Sin permiso");
    expect(mocks.saveReport).not.toHaveBeenCalled();
    expect(mocks.removeReport).not.toHaveBeenCalled();
    expect(mocks.reportHistory).not.toHaveBeenCalled();
  });
  it("conserva en el historial el nombre y la fecha de archivos eliminados", async () => {
    const removed = { id: "change", reportId: "report", name: "eliminado.md", action: "removed", userId, createdAt: new Date("2026-11-01T12:00:00Z") };
    mocks.reportHistory.mockResolvedValue([removed]);
    await expect(sessions.getReportHistory(teamId, sessionId, userId)).resolves.toEqual([{ ...removed, userName: "Exmiembro" }]);
    expect(mocks.reportHistory).toHaveBeenCalledWith(teamId, sessionId);
    expect(mocks.findReport).not.toHaveBeenCalled();
  });
  it("muestra todos los archivos de cada tarea sin incluir su contenido", async () => {
    mocks.active.mockResolvedValue([
      { id: sessionId, teamId, userId, title: "Tarea", description: "Cambios" },
    ]);
    mocks.listReports.mockResolvedValue([
      { id: "a", sessionId, name: "uno.md" },
      { id: "b", sessionId, name: "dos.md" },
    ]);
    const board = await sessions.getBoard(teamId, userId);
    expect(board.active[0].reports).toEqual([
      { id: "a", name: "uno.md" },
      { id: "b", name: "dos.md" },
    ]);
    expect(mocks.listReports).toHaveBeenCalledTimes(1);
    expect(mocks.listReports).toHaveBeenCalledWith([sessionId]);
  });
  it("cierra únicamente el ID de la tarea enviada y permite adjuntar el informe final", async () => {
    await sessions.finishSession(teamId, sessionId, userId);
    expect(mocks.finish).toHaveBeenCalledWith(teamId, sessionId, userId);
    mocks.finish.mockResolvedValue(undefined);
    await expect(
      sessions.finishSession(teamId, sessionId, userId),
    ).rejects.toThrow("ya está cerrada o no te pertenece");
  });
  it("impide descargar archivos de otro equipo", async () => {
    mocks.membership.mockRejectedValueOnce(new Error("Sin permiso"));
    await expect(
      sessions.getSessionReport(teamId, sessionId, sessionId, userId),
    ).rejects.toThrow("Sin permiso");
    expect(mocks.findReport).not.toHaveBeenCalled();
  });
  it("devuelve el archivo solo después de autorizar al miembro", async () => {
    mocks.findReport.mockResolvedValue({
      name: "cambios.md",
      content: "# Cambios",
    });
    await expect(
      sessions.getSessionReport(teamId, sessionId, sessionId, userId),
    ).resolves.toEqual({ name: "cambios.md", content: "# Cambios" });
    expect(mocks.findReport).toHaveBeenCalledWith(teamId, sessionId, sessionId);
    mocks.findReport.mockResolvedValue(undefined);
    await expect(
      sessions.getSessionReport(teamId, sessionId, sessionId, userId),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("validación de archivos Markdown", () => {
  it("acepta .md en UTF-8 y no confía en el MIME enviado por el navegador", async () => {
    await expect(
      markdownFileSchema.parseAsync(
        new File(["# Cambios\nAñadí filtros."], "cambios.MD", {
          type: "application/octet-stream",
        }),
      ),
    ).resolves.toEqual({
      name: "cambios.MD",
      content: "# Cambios\nAñadí filtros.",
    });
  });
  it("rechaza otras extensiones, nombres con rutas, vacíos, binarios y archivos grandes", async () => {
    for (const file of [
      new File(["texto"], "cambios.txt"),
      new File(["texto"], "cambios.md.exe"),
      new File(["texto"], "../cambios.md"),
      new File([], "cambios.md"),
      new File(["   "], "cambios.md"),
      new File([new Uint8Array([255, 254, 0])], "cambios.md"),
      new File(["# texto\u0000"], "cambios.md"),
      new File(["x".repeat(MAX_MARKDOWN_BYTES + 1)], "cambios.md"),
    ])
      await expect(markdownFileSchema.parseAsync(file)).rejects.toThrow();
  });
  it("permite no adjuntar un archivo", async () => {
    await expect(optionalMarkdownFile(null)).resolves.toBeUndefined();
    await expect(
      optionalMarkdownFile(new File([], "")),
    ).resolves.toBeUndefined();
    await expect(optionalMarkdownFile("archivo.md")).rejects.toThrow();
  });
});
