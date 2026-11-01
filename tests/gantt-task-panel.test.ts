import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Task } from "@/modules/gantt/components/types";

vi.mock("@/modules/gantt/actions", () => ({
  addGanttCommentAction: vi.fn(),
  createGanttTaskAction: vi.fn(),
  deleteGanttTaskAction: vi.fn(),
  editGanttTaskAction: vi.fn(),
}));

import { TaskPanel } from "@/modules/gantt/components/task-panel";

const task: Task = {
  id: "00000000-0000-4000-8000-000000000001",
  teamId: "00000000-0000-4000-8000-000000000002",
  diagramId: "00000000-0000-4000-8000-000000000003",
  title: "Revisar el diseño",
  description: "",
  assigneeId: null,
  assigneeName: null,
  assigneeGithubUsername: null,
  phaseId: null,
  status: "pending",
  progress: 0,
  priority: "medium",
  startDate: "2026-11-01",
  endDate: "2026-11-02",
  startTime: "09:00",
  endTime: "17:00",
  completed: false,
  createdBy: "00000000-0000-4000-8000-000000000004",
  createdAt: new Date("2026-11-01T12:00:00Z"),
  creatorName: "Ana",
  dependencyIds: [],
  canEdit: true,
};

function renderPanel(selected?: Task) {
  return renderToStaticMarkup(createElement(TaskPanel, {
    teamId: task.teamId,
    diagramId: task.diagramId,
    task: selected,
    tasks: [task],
    phases: [],
    comments: [],
    members: [],
    sessions: [],
    attachments: {},
    onClose: () => {},
    onSaved: () => {},
  }));
}

describe("eliminación desde el panel del Gantt", () => {
  it("ofrece eliminar antes de las pestañas y del formulario de edición", () => {
    const html = renderPanel(task);
    expect(html).toContain("Eliminar tarea");
    const deletePosition = html.indexOf("Eliminar tarea");
    expect(deletePosition).toBeLessThan(html.indexOf('aria-label="Información de la tarea"'));
    const deleteForm = html.match(/<form\b[^>]*>[\s\S]*?Eliminar tarea[\s\S]*?<\/form>/)?.[0];
    expect(deleteForm).toContain(`name="taskId" value="${task.id}"`);
    expect(deleteForm).toContain(`name="teamId" value="${task.teamId}"`);
    expect(deleteForm).not.toContain('name="title"');
  });
  it("no ofrece eliminar una tarea sin permiso", () => {
    expect(renderPanel({ ...task, canEdit: false })).not.toContain("Eliminar tarea");
  });
  it("no ofrece eliminar al crear una tarea nueva", () => {
    expect(renderPanel()).not.toContain("Eliminar tarea");
  });
});
