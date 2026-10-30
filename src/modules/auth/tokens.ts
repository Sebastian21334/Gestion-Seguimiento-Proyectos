import "server-only";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { env } from "@/shared/config/env";
import { ValidationError } from "@/shared/errors";

const encoder = new TextEncoder();
const identity = z.object({ sub: z.uuid() });
const verificationClaims = identity.extend({
  purpose: z.literal("verify_email"),
  email: z.email(),
});
const resetClaims = identity.extend({
  purpose: z.literal("reset_password"),
  pw: z.string().regex(/^[a-f0-9]{16}$/),
});
type Purpose = "session" | "verify_email" | "reset_password";

function secret(purpose: Purpose) {
  return encoder.encode(
    purpose === "session" ? env.SESSION_SECRET : env.EMAIL_TOKEN_SECRET,
  );
}
async function sign(
  purpose: Purpose,
  sub: string,
  claims: Record<string, unknown>,
  expires: string,
) {
  return new SignJWT({ ...claims, purpose })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(sub)
    .setIssuer(env.APP_URL)
    .setAudience("team-board")
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secret(purpose));
}
async function verify(token: string, purpose: Purpose) {
  try {
    const { payload } = await jwtVerify(token, secret(purpose), {
      algorithms: ["HS256"],
      issuer: env.APP_URL,
      audience: "team-board",
      requiredClaims: ["sub", "exp", "iat"],
    });
    if (payload.purpose !== purpose) throw new Error("Purpose mismatch");
    return payload;
  } catch {
    throw new ValidationError(
      "El enlace o la sesión no es válido o ya venció.",
    );
  }
}
export const passwordFingerprint = (hash: string) =>
  createHash("sha256").update(hash).digest("hex").slice(0, 16);
export const createSessionToken = (id: string, tokenVersion: number) =>
  sign("session", id, { tv: tokenVersion }, "7d");
export const createVerificationToken = (id: string, email: string) =>
  sign("verify_email", id, { email }, "24h");
export const createResetToken = (id: string, passwordHash: string) =>
  sign("reset_password", id, { pw: passwordFingerprint(passwordHash) }, "30m");
export { readSessionClaims as readSessionToken } from "@/shared/session";
export async function readVerificationToken(token: string) {
  return verificationClaims.parse(await verify(token, "verify_email"));
}
export async function readResetToken(token: string) {
  return resetClaims.parse(await verify(token, "reset_password"));
}
