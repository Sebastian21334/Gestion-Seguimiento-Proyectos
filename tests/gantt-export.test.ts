import { describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "@/shared/errors";
import { POST } from "@/app/(workspace)/t/[slug]/gantt/exportar/[diagramId]/route";

const mocks = vi.hoisted(() => ({
  team: vi.fn(),
  gantt: vi.fn(),
  sessions: vi.fn(),
  render: vi.fn(),
}));
vi.mock("@/modules/teams/actions", () => ({ teamForRequestAction: mocks.team }));
vi.mock("@/modules/gantt/actions", () => ({ ganttPageAction: mocks.gantt }));
vi.mock("@/modules/work-sessions/actions", () => ({ ganttSessionsAction: mocks.sessions }));
vi.mock("@/app/(workspace)/t/[slug]/gantt/exportar/[diagramId]/pdf", () => ({
  renderGanttPdf: mocks.render,
}));

const diagramId = "00000000-0000-4000-8000-000000000001";
const otherDiagram = "00000000-0000-4000-8000-000000000002";
const slug = "mi-equipo";

const exportDiagram = () => POST(new Request("https://equipo.test", { method: "POST" }), {
  params: Promise.resolve({ slug, diagramId }),
});

describe("exportación del Gantt", () => {
  it("deniega la exportación antes de consultar datos si falta la sesión", async () => {
    mocks.team.mockRejectedValueOnce(new UnauthorizedError());
    expect((await exportDiagram()).status).toBe(401);
    expect(mocks.gantt).not.toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it("exporta solo las tareas y adjuntos del diagrama elegido", async () => {
    const diagram = { id: diagramId, name: "Planificación" };
    const task = { id: "task-1", diagramId };
    const otherTask = { id: "task-2", diagramId: otherDiagram };
    const phase = { id: "phase-1", diagramId };
    const comment = { taskId: task.id };
    const session = { ganttTaskId: task.id, reports: [{ id: "report-1", name: "cambios.md" }] };
    mocks.team.mockResolvedValueOnce({ id: "team", name: "Equipo" });
    mocks.gantt.mockResolvedValueOnce({
      diagrams: [diagram, { id: otherDiagram, name: "Otro diagrama" }],
      tasks: [task, otherTask],
      phases: [phase, { id: "phase-2", diagramId: otherDiagram }],
      comments: [comment, { taskId: otherTask.id }],
    });
    mocks.sessions.mockResolvedValueOnce([session, { ganttTaskId: otherTask.id }, { ganttTaskId: null }]);
    mocks.render.mockResolvedValueOnce(new TextEncoder().encode("%PDF"));

    const response = await exportDiagram();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(await response.text()).toBe("%PDF");
    expect(mocks.render).toHaveBeenCalledWith(expect.objectContaining({
      diagram, tasks: [task], phases: [phase], comments: [comment], sessions: [session],
    }));
  });
});
