import "server-only";
import { createHash } from "node:crypto";
import { RateLimitError } from "@/shared/errors";
import * as repository from "./repository";

export type AuthOperation = "login" | "register" | "resend" | "forgot";
export async function reserveAuthAttempt(
  operation: AuthOperation,
  email: string,
  ip: string,
) {
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  const login = operation === "login";
  const rows = await repository.reserve([
    {
      key: `${operation}:email:${digest(email)}`,
      limit: login ? 5 : 3,
      windowMs: login ? 900_000 : 3_600_000,
    },
    {
      key: `${operation}:ip:${digest(ip)}`,
      limit: login ? 20 : 10,
      windowMs: login ? 900_000 : 3_600_000,
    },
  ]);
  if (!rows) throw new RateLimitError();
  return rows.map((row) => row.id);
}
export const releaseAuthAttempt = repository.release;
