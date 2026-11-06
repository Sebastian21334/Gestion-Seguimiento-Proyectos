import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/shared/config/env";

const scope = z.tuple([z.uuid(), z.uuid(), z.uuid()]);

function signature(value: string) {
  return createHmac("sha256", env.EMAIL_TOKEN_SECRET)
    .update(`gantt-report-download:v1\n${value}`)
    .digest("base64url");
}

export function sessionReportLink(teamId: string, sessionId: string, reportId: string) {
  const value = `${teamId}.${sessionId}.${reportId}`;
  return new URL(`/descargas/gantt/${value}.${signature(value)}`, env.APP_URL).href;
}

export function readSessionReportLink(token: string) {
  if (token.length !== 154) return null;
  const [teamId, sessionId, reportId, provided] = token.split(".");
  const ids = scope.safeParse([teamId, sessionId, reportId]);
  if (!ids.success || !provided || !/^[A-Za-z0-9_-]{43}$/.test(provided)) return null;
  const expected = signature(ids.data.join("."));
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected)) ? ids.data : null;
}
