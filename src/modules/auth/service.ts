import "server-only";
import { compare, hash, hashSync } from "bcryptjs";
import { cookies } from "next/headers";
import {
  findUserById,
  findUserByEmail,
  createUser,
  verifyUserEmail,
  replaceUserPassword,
} from "@/modules/users";
import { env } from "@/shared/config/env";
import { UnauthorizedError, ValidationError } from "@/shared/errors";
import { escapeHtml, sendEmail } from "@/shared/mail";
import { brandedEmail } from "@/shared/mail/template";
import { releaseAuthAttempt, reserveAuthAttempt } from "@/shared/rate-limit";
import * as tokens from "./tokens";
import { SESSION_COOKIE } from "@/shared/session";
export { getCurrentUser, requireCurrentUser } from "@/shared/session";

const DUMMY_HASH = hashSync("not-a-real-user-password", 12);
export const GENERIC_MAIL_MESSAGE =
  "Si el mail es válido, te enviamos un correo";

async function verificationEmail(id: string, email: string, name: string) {
  const token = await tokens.createVerificationToken(id, email);
  const url = `${env.APP_URL}/verificar?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: "Verificá tu correo · Equipo",
    html: brandedEmail({
      name,
      eyebrow: "TU ESPACIO DE TRABAJO TE ESPERA",
      title: "Un paso más para empezar juntos.",
      paragraphs: [
        "Gracias por sumarte a equipo. Un lugar para coordinar el trabajo, compartir documentos y avanzar con tus compañeros.",
        "Confirmá tu correo para activar tu cuenta. Después vas a poder iniciar sesión y crear tu primer equipo o aceptar una invitación.",
      ],
      actionLabel: "Verificar mi correo",
      actionUrl: url,
      note: "Este enlace es válido durante 24 horas. Por seguridad, no lo compartas con otras personas.",
    }),
  });
}
// Los flujos públicos no revelan la existencia de una cuenta ante un fallo de ACS.
async function privateMail(work: () => Promise<void>) {
  try {
    await work();
  } catch {
    console.error("No se pudo solicitar un correo de autenticación.");
  }
}
export async function registerUser(
  data: { name: string; email: string; password: string },
  ip: string,
) {
  await reserveAuthAttempt("register", data.email, ip);
  const passwordHash = await hash(data.password, 12);
  if (
    env.ALLOWED_EMAIL_DOMAINS.length &&
    !env.ALLOWED_EMAIL_DOMAINS.includes(data.email.split("@")[1])
  )
    return;
  const user =
    (await createUser({ name: data.name, email: data.email, passwordHash })) ??
    (await findUserByEmail(data.email));
  if (!user) return;
  await privateMail(async () => {
    if (user.emailVerifiedAt)
      await sendEmail({
        to: data.email,
        subject: "Ya tenés una cuenta · Equipo",
        html: brandedEmail({
          name: user.name,
          eyebrow: "QUÉ BUENO VERTE DE NUEVO",
          title: "Tu espacio sigue acá.",
          paragraphs: [
            "Ya tenés una cuenta verificada con este correo. Podés iniciar sesión y seguir trabajando con tu equipo.",
            "Si no recordás tu contraseña, te ayudamos a recuperar el acceso.",
          ],
          actionLabel: "Recuperar mi contraseña",
          actionUrl: `${env.APP_URL}/olvide-contrasena`,
          note: "Tu cuenta y tus equipos siguen disponibles. No hace falta que vuelvas a registrarte.",
        }),
      });
    else await verificationEmail(user.id, user.email, user.name);
  });
}
export async function verifyEmail(token: string) {
  const claims = await tokens.readVerificationToken(token);
  if (!(await verifyUserEmail(claims.sub, claims.email)))
    throw new ValidationError("El enlace no es válido.");
}
export async function login(
  data: { email: string; password: string },
  ip: string,
) {
  const attempts = await reserveAuthAttempt("login", data.email, ip);
  const user = await findUserByEmail(data.email);
  const correct = await compare(
    data.password,
    user?.passwordHash ?? DUMMY_HASH,
  );
  if (!user || !correct || !user.emailVerifiedAt)
    throw new UnauthorizedError("Mail o contraseña incorrectos");
  const token = await tokens.createSessionToken(user.id, user.tokenVersion);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 604_800,
  });
  await releaseAuthAttempt(attempts);
}
export async function resendVerification(email: string, ip: string) {
  await reserveAuthAttempt("resend", email, ip);
  const user = await findUserByEmail(email);
  if (user && !user.emailVerifiedAt)
    await privateMail(() => verificationEmail(user.id, user.email, user.name));
}
export async function forgotPassword(email: string, ip: string) {
  await reserveAuthAttempt("forgot", email, ip);
  const user = await findUserByEmail(email);
  if (!user?.emailVerifiedAt) return;
  await privateMail(async () => {
    const token = await tokens.createResetToken(user.id, user.passwordHash);
    const url = `${env.APP_URL}/restablecer?token=${encodeURIComponent(token)}`;
    await sendEmail({
      to: email,
      subject: "Restablecé tu contraseña · Equipo",
      html: `<h1>Elegí una nueva contraseña</h1><p>El enlace vence en 30 minutos y funciona una sola vez. Si no lo pediste, ignorá este correo.</p><p><a href="${escapeHtml(url)}">Restablecer contraseña</a></p>`,
    });
  });
}
export async function resetPassword(token: string, password: string) {
  const claims = await tokens.readResetToken(token);
  const user = await findUserById(claims.sub);
  if (
    !user?.emailVerifiedAt ||
    tokens.passwordFingerprint(user.passwordHash) !== claims.pw
  )
    throw new ValidationError("El enlace no es válido o ya fue utilizado.");
  const passwordHash = await hash(password, 12);
  if (!(await replaceUserPassword(user.id, user.passwordHash, passwordHash)))
    throw new ValidationError("El enlace ya fue utilizado.");
  await logout();
}
export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
}
