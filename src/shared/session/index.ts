import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { z } from "zod";
import { findUserById, publicCurrentUser } from "@/modules/users";
import { env } from "@/shared/config/env";
import { UnauthorizedError, ValidationError } from "@/shared/errors";

export const SESSION_COOKIE = "team_session";
const claimsSchema = z.object({
  sub: z.uuid(),
  purpose: z.literal("session"),
  tv: z.number().int().nonnegative(),
});
export async function readSessionClaims(token: string) {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(env.SESSION_SECRET),
      {
        algorithms: ["HS256"],
        issuer: env.APP_URL,
        audience: "team-board",
        requiredClaims: ["sub", "exp", "iat"],
      },
    );
    return claimsSchema.parse(payload);
  } catch {
    throw new ValidationError("La sesión no es válida o ya venció.");
  }
}
// Infraestructura compartida de la petición: evita dependencias de teams, users,
// invitations, documents y work-sessions hacia el módulo auth.
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  let claims;
  try {
    claims = await readSessionClaims(token);
  } catch {
    return null;
  }
  const user = await findUserById(claims.sub);
  if (!user?.emailVerifiedAt || user.tokenVersion !== claims.tv) return null;
  return publicCurrentUser(user);
});
export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
