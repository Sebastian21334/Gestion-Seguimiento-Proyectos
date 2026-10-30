"use server";

import { redirect } from "next/navigation";
import { runAction } from "@/shared/errors/action";
import type { ActionState } from "@/shared/ui/action-state";
import * as schemas from "./schemas";
import * as service from "./service";
import { clientIp } from "./request";
import {
  mailboxProviderForEmail,
  type MailboxProvider,
} from "./components/mailbox-options";

export async function registerAction(_previous: ActionState, form: FormData) {
  let provider: MailboxProvider = "other";
  const result = await runAction(async () => {
    const data = schemas.registerSchema.parse(Object.fromEntries(form));
    provider = mailboxProviderForEmail(data.email);
    await service.registerUser(data, await clientIp());
    return { success: true, message: service.GENERIC_MAIL_MESSAGE };
  });
  if (result.success) redirect(`/registro/correo?proveedor=${provider}`);
  return result;
}
export async function loginAction(_previous: ActionState, form: FormData) {
  return runAction(async () => {
    await service.login(
      schemas.loginSchema.parse(Object.fromEntries(form)),
      await clientIp(),
    );
    redirect("/");
  });
}
export async function resendVerificationAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    const { email } = schemas.emailInputSchema.parse(Object.fromEntries(form));
    await service.resendVerification(email, await clientIp());
    return { success: true, message: service.GENERIC_MAIL_MESSAGE };
  });
}
export async function forgotPasswordAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    const { email } = schemas.emailInputSchema.parse(Object.fromEntries(form));
    await service.forgotPassword(email, await clientIp());
    return { success: true, message: service.GENERIC_MAIL_MESSAGE };
  });
}
export async function resetPasswordAction(
  _previous: ActionState,
  form: FormData,
) {
  return runAction(async () => {
    const data = schemas.resetSchema.parse(Object.fromEntries(form));
    await service.resetPassword(data.token, data.password);
    redirect("/login?restablecida=1");
  });
}
export async function verifyEmailAction(token: unknown) {
  return runAction(async () => {
    await service.verifyEmail(schemas.tokenSchema.parse(token));
    return {
      success: true,
      message: "Tu correo ya está verificado. Podés iniciar sesión.",
    };
  });
}
export async function logoutAction() {
  await service.logout();
  redirect("/login");
}
export async function currentUserAction() {
  return service.getCurrentUser();
}
export async function authenticatedPageAction() {
  const user = await service.getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
