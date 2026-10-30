import "server-only";
import { createHash, randomBytes } from "node:crypto";
import {
  getTeam,
  joinInvitedTeam,
  requireOwner,
  listMembers,
} from "@/modules/teams";
import type { CurrentUser } from "@/modules/users";
import { ForbiddenError, ValidationError } from "@/shared/errors";
import { escapeHtml, sendEmail } from "@/shared/mail";
import { env } from "@/shared/config/env";
import * as repository from "./repository";

const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function invite(
  data: { teamId: string; email: string },
  userId: string,
) {
  await requireOwner(data.teamId, userId);
  const members = await listMembers(data.teamId, userId);
  if (members.some((member) => member.user.email === data.email))
    throw new ValidationError("Esa persona ya forma parte del equipo.");
  const team = await getTeam(data.teamId, userId);
  const token = randomBytes(32).toString("hex");
  const invitation = await repository.insert({
    ...data,
    tokenHash: tokenHash(token),
    invitedBy: userId,
    expiresAt: new Date(Date.now() + 7 * 86_400_000),
  });
  try {
    await sendEmail({
      to: data.email,
      subject: `Te invitaron a ${team.name}`,
      html: `<h1>Sumate a ${escapeHtml(team.name)}</h1><p>La invitación vence en 7 días. Iniciá sesión con este correo para aceptarla.</p><p><a href="${escapeHtml(env.APP_URL)}/invitaciones/${token}">Ver invitación</a></p>`,
    });
  } catch (error) {
    await repository.remove(invitation.id, data.teamId);
    throw error;
  }
}
export async function listPendingInvitations(user: CurrentUser) {
  return repository.pendingForEmail(user.email);
}
export async function listTeamInvitations(teamId: string, userId: string) {
  await requireOwner(teamId, userId);
  return repository.pendingForTeam(teamId);
}
export async function revokeInvitation(
  id: string,
  teamId: string,
  userId: string,
) {
  await requireOwner(teamId, userId);
  await repository.remove(id, teamId);
}
export async function invitationPreview(token: string, user: CurrentUser) {
  const row = await repository.findByHash(tokenHash(token));
  if (!row || row.acceptedAt || row.expiresAt <= new Date())
    throw new ValidationError(
      "La invitación venció, fue revocada o ya se utilizó.",
    );
  if (!user.emailVerifiedAt || row.email !== user.email)
    throw new ForbiddenError(
      "Iniciá sesión con el correo verificado al que se envió la invitación.",
    );
  return { id: row.id, expiresAt: row.expiresAt };
}
export async function acceptInvitation(id: string, user: CurrentUser) {
  const invitation = await repository.findById(id);
  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.expiresAt <= new Date()
  )
    throw new ValidationError(
      "La invitación venció, fue revocada o ya se utilizó.",
    );
  if (!user.emailVerifiedAt || invitation.email !== user.email)
    throw new ForbiddenError("La invitación pertenece a otro correo.");
  const claimed = await repository.claim(id, user.email);
  if (!claimed)
    throw new ValidationError("La invitación ya no está disponible.");
  try {
    await joinInvitedTeam(claimed.teamId, user.id);
  } catch (error) {
    await repository.releaseClaim(id, claimed.acceptedAt!);
    throw error;
  }
  return getTeam(claimed.teamId, user.id);
}
