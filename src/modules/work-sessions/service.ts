import "server-only";
import { requireMembership } from "@/modules/teams";
import { findUsersByIds } from "@/modules/users";
import * as repository from "./repository";
import { NotFoundError, ValidationError } from "@/shared/errors";
import type { MarkdownReport } from "./schemas";
import { getGantt, getSessionTask } from "@/modules/gantt";

export function matchingTitle(left: string, right: string) {
  return (
    left.trim().toLocaleLowerCase("es") === right.trim().toLocaleLowerCase("es")
  );
}
async function withProfiles(
  rows: Awaited<ReturnType<typeof repository.active>>,
  gantt: Awaited<ReturnType<typeof getGantt>>,
) {
  const [users, reports] = await Promise.all([
    findUsersByIds([...new Set(rows.map((row) => row.userId))]),
    repository.listReports(rows.map((row) => row.id)),
  ]);
  return rows.map((row) => ({
    ...row,
    ganttTask: gantt.tasks.find((task) => task.id === row.ganttTaskId) ?? null,
    ganttDiagramName:
      gantt.diagrams.find(
        (diagram) =>
          diagram.id ===
          gantt.tasks.find((task) => task.id === row.ganttTaskId)?.diagramId,
      )?.name ?? null,
    reports: reports
      .filter((report) => report.sessionId === row.id)
      .map(({ id, name }) => ({ id, name })),
    user: users.find((user) => user.id === row.userId) ?? {
      id: row.userId,
      name: "Exmiembro",
      bio: null,
      githubUsername: null,
    },
  }));
}
export async function getBoard(teamId: string, userId: string) {
  await requireMembership(teamId, userId);
  const [active, history, gantt] = await Promise.all([
    repository.active(teamId),
    repository.history(teamId),
    getGantt(teamId, userId),
  ]);
  return {
    active: await withProfiles(active, gantt),
    history: await withProfiles(history, gantt),
    gantt,
  };
}
export async function startSession(
  data: {
    teamId: string;
    title: string;
    description: string;
    ganttTaskId: string;
  },
  userId: string,
) {
  await requireMembership(data.teamId, userId);
  await getSessionTask(data.teamId, data.ganttTaskId, userId);
  const started = await repository.start({
    ...data,
    userId,
  });
  if (!started)
    throw new ValidationError(
      "Primero cerrá tu tarea activa antes de empezar otra.",
    );
  const active = await repository.active(data.teamId);
  return {
    collision: active.some(
      (session) =>
        session.userId !== userId && matchingTitle(session.title, data.title),
    ),
  };
}
export async function uploadSessionReport(
  teamId: string,
  sessionId: string,
  userId: string,
  reports: MarkdownReport[],
) {
  await requireMembership(teamId, userId);
  if (!(await repository.saveReport(teamId, sessionId, userId, reports)))
    throw new ValidationError("Solo podés cargar archivos en tu tarea activa.");
}
export async function finishSession(
  teamId: string,
  sessionId: string,
  userId: string,
) {
  await requireMembership(teamId, userId);
  if (!(await repository.finish(teamId, sessionId, userId)))
    throw new ValidationError(
      "La tarea ya está cerrada o no te pertenece. Actualizá el tablero.",
    );
}
export async function getSessionReport(
  teamId: string,
  sessionId: string,
  reportId: string,
  userId: string,
) {
  await requireMembership(teamId, userId);
  const report = await repository.findReport(teamId, sessionId, reportId);
  if (!report?.name || !report.content)
    throw new NotFoundError("Esta sesión no tiene un archivo .md adjunto.");
  return { name: report.name, content: report.content };
}
export async function memberHistory(
  teamId: string,
  memberId: string,
  userId: string,
) {
  await requireMembership(teamId, userId);
  await requireMembership(teamId, memberId);
  const [rows, gantt] = await Promise.all([
    repository.history(teamId, memberId),
    getGantt(teamId, userId),
  ]);
  return withProfiles(rows, gantt);
}
export async function ganttSessions(teamId: string, userId: string) {
  await requireMembership(teamId, userId);
  const [rows, gantt] = await Promise.all([
    repository.allForGantt(teamId),
    getGantt(teamId, userId),
  ]);
  return withProfiles(rows, gantt);
}
