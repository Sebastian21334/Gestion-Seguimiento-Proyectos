import { z } from "zod";
import { ganttPageAction } from "@/modules/gantt/actions";
import { teamForRequestAction } from "@/modules/teams/actions";
import { ganttSessionsAction } from "@/modules/work-sessions/actions";
import { DomainError, NotFoundError } from "@/shared/errors";
import { logUnexpectedError } from "@/shared/errors/log";
import { downloadHeaders, privateResponse } from "@/shared/http/download";
import { renderGanttPdf } from "./pdf";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string; diagramId: string }> },
) {
  try {
    const { slug, diagramId } = await params;
    const team = await teamForRequestAction(slug);
    if (!z.uuid().safeParse(diagramId).success) throw new NotFoundError();

    const gantt = await ganttPageAction(team.id);
    const diagram = gantt.diagrams.find((item) => item.id === diagramId);
    if (!diagram) throw new NotFoundError("No encontramos el diagrama.");

    const tasks = gantt.tasks.filter((task) => task.diagramId === diagram.id);
    const taskIds = new Set(tasks.map((task) => task.id));
    const sessions = tasks.length ? await ganttSessionsAction(team.id) : [];
    const pdf = await renderGanttPdf({
      team,
      diagram,
      tasks,
      phases: gantt.phases.filter((phase) => phase.diagramId === diagram.id),
      comments: gantt.comments.filter((comment) => taskIds.has(comment.taskId)),
      sessions: sessions.filter((session) => session.ganttTaskId && taskIds.has(session.ganttTaskId)),
    });
    return new Response(pdf, {
      headers: downloadHeaders("application/pdf", `${diagram.name}.pdf`, "diagrama-gantt.pdf"),
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return new Response(error.message, { status: error.status, headers: privateResponse });
    }
    logUnexpectedError(error);
    return new Response("No pudimos exportar el diagrama.", {
      status: 500,
      headers: privateResponse,
    });
  }
}
