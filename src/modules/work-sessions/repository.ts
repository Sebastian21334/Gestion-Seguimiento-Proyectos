import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  workSessions,
  workSessionReports,
  workSessionReportChanges,
} from "./schema";
import type { MarkdownReport } from "./schemas";

// El contenido del archivo solo se consulta al descargarlo, no en cada polling.
const sessionFields = {
  id: workSessions.id,
  teamId: workSessions.teamId,
  userId: workSessions.userId,
  title: workSessions.title,
  description: workSessions.description,
  ganttTaskId: workSessions.ganttTaskId,
  status: workSessions.status,
  startedAt: workSessions.startedAt,
  endedAt: workSessions.endedAt,
};

export async function active(teamId: string) {
  return db
    .select(sessionFields)
    .from(workSessions)
    .where(
      and(eq(workSessions.teamId, teamId), eq(workSessions.status, "active")),
    )
    .orderBy(desc(workSessions.startedAt));
}
export async function history(teamId: string, userId?: string) {
  return db
    .select(sessionFields)
    .from(workSessions)
    .where(
      and(
        eq(workSessions.teamId, teamId),
        eq(workSessions.status, "done"),
        userId ? eq(workSessions.userId, userId) : undefined,
      ),
    )
    .orderBy(desc(workSessions.endedAt))
    .limit(20);
}
export async function allForGantt(teamId: string) {
  return db
    .select(sessionFields)
    .from(workSessions)
    .where(eq(workSessions.teamId, teamId))
    .orderBy(desc(workSessions.startedAt));
}
export async function start(data: {
  teamId: string;
  userId: string;
  title: string;
  description: string;
  ganttTaskId: string;
}) {
  return db.transaction(async (tx) => {
    // Un lock por equipo/usuario serializa dos inicios simultáneos, incluso si
    // aún no existe una fila activa que bloquear con SELECT FOR UPDATE.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${data.teamId}:${data.userId}`}, 0))`,
    );
    const existing = await tx
      .select({ id: workSessions.id })
      .from(workSessions)
      .where(
        and(
          eq(workSessions.teamId, data.teamId),
          eq(workSessions.userId, data.userId),
          eq(workSessions.status, "active"),
        ),
      )
      .limit(1);
    if (existing.length) return null;
    return (
      await tx
        .insert(workSessions)
        .values(data)
        .onConflictDoNothing()
        .returning({ id: workSessions.id })
    )[0];
  });
}
export async function saveReport(
  teamId: string,
  sessionId: string,
  userId: string,
  reports: MarkdownReport[],
) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${teamId}:${userId}`}, 0))`,
    );
    const [session] = await tx
      .select({ id: workSessions.id })
      .from(workSessions)
      .where(
        and(
          eq(workSessions.teamId, teamId),
          eq(workSessions.id, sessionId),
          eq(workSessions.userId, userId),
        ),
      )
      .limit(1);
    if (!session) return undefined;
    const added = await tx
      .insert(workSessionReports)
      .values(
        reports.map((report) => ({
          sessionId,
          name: report.name,
          content: report.content,
        })),
      )
      .returning({ id: workSessionReports.id, name: workSessionReports.name });
    await tx.insert(workSessionReportChanges).values(
      added.map((report) => ({
        sessionId,
        reportId: report.id,
        name: report.name,
        userId,
        action: "added" as const,
      })),
    );
    return session;
  });
}
export async function removeReport(
  teamId: string,
  sessionId: string,
  reportId: string,
  userId: string,
) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${teamId}:${userId}`}, 0))`,
    );
    const [session] = await tx
      .select({ id: workSessions.id })
      .from(workSessions)
      .where(and(
        eq(workSessions.teamId, teamId),
        eq(workSessions.id, sessionId),
        eq(workSessions.userId, userId),
      ))
      .limit(1);
    if (!session) return undefined;
    const [removed] = await tx
      .delete(workSessionReports)
      .where(and(
        eq(workSessionReports.sessionId, sessionId),
        eq(workSessionReports.id, reportId),
      ))
      .returning({ id: workSessionReports.id, name: workSessionReports.name });
    if (!removed) return undefined;
    await tx.insert(workSessionReportChanges).values({
      sessionId,
      reportId: removed.id,
      name: removed.name,
      userId,
      action: "removed",
    });
    return removed;
  });
}
export async function reportHistory(teamId: string, sessionId: string) {
  return db
    .select({
      id: workSessionReportChanges.id,
      reportId: workSessionReportChanges.reportId,
      name: workSessionReportChanges.name,
      action: workSessionReportChanges.action,
      userId: workSessionReportChanges.userId,
      createdAt: workSessionReportChanges.createdAt,
    })
    .from(workSessionReportChanges)
    .innerJoin(workSessions, eq(workSessionReportChanges.sessionId, workSessions.id))
    .where(and(eq(workSessions.teamId, teamId), eq(workSessions.id, sessionId)))
    .orderBy(desc(workSessionReportChanges.createdAt), desc(workSessionReportChanges.id));
}
export async function finish(
  teamId: string,
  sessionId: string,
  userId: string,
) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${teamId}:${userId}`}, 0))`,
    );
    const [closed] = await tx
      .update(workSessions)
      .set({
        status: "done",
        endedAt: new Date(),
      })
      .where(
        and(
          eq(workSessions.teamId, teamId),
          eq(workSessions.id, sessionId),
          eq(workSessions.userId, userId),
          eq(workSessions.status, "active"),
        ),
      )
      .returning({ id: workSessions.id });
    return closed;
  });
}
export async function listReports(sessionIds: string[]) {
  if (!sessionIds.length) return [];
  return db
    .select({
      id: workSessionReports.id,
      sessionId: workSessionReports.sessionId,
      name: workSessionReports.name,
    })
    .from(workSessionReports)
    .where(inArray(workSessionReports.sessionId, sessionIds))
    .orderBy(workSessionReports.createdAt, workSessionReports.id);
}
export async function findReport(
  teamId: string,
  sessionId: string,
  reportId: string,
) {
  return (
    await db
      .select({
        name: workSessionReports.name,
        content: workSessionReports.content,
      })
      .from(workSessionReports)
      .innerJoin(
        workSessions,
        eq(workSessionReports.sessionId, workSessions.id),
      )
      .where(
        and(
          eq(workSessions.teamId, teamId),
          eq(workSessions.id, sessionId),
          eq(workSessionReports.id, reportId),
        ),
      )
      .limit(1)
  )[0];
}
