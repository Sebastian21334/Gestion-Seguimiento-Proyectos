import Link from "next/link";
import { ActionForm } from "@/shared/ui/action-form";
import { RegistrationPasswordFields } from "./registration-password-fields";
import {
  registerAction,
  loginAction,
  forgotPasswordAction,
  resetPasswordAction,
  resendVerificationAction,
} from "../actions";

function EmailField() {
  return (
    <label>
      Correo electrónico
      <input
        name="email"
        type="email"
        autoComplete="email"
        placeholder="vos@ejemplo.com"
        required
        maxLength={254}
      />
    </label>
  );
}
function PasswordField({ newPassword = false }: { newPassword?: boolean }) {
  return (
    <label>
      {newPassword ? "Nueva contraseña" : "Contraseña"}
      <input
        name="password"
        type="password"
        autoComplete={newPassword ? "new-password" : "current-password"}
        required
        minLength={newPassword ? 10 : 1}
        maxLength={72}
        placeholder={newPassword ? "Al menos 10 caracteres" : "Tu contraseña"}
      />
    </label>
  );
}
export function LoginForm({ reset = false }: { reset?: boolean }) {
  return (
    <>
      {reset && (
        <p className="notice notice-success" role="status">
          Contraseña actualizada. Iniciá sesión nuevamente.
        </p>
      )}
      <ActionForm
        action={loginAction}
        submitLabel="Entrar a mi espacio"
        pendingLabel="Ingresando…"
      >
        <EmailField />
        <PasswordField />
        <Link href="/olvide-contrasena" className="form-link">
          Olvidé mi contraseña
        </Link>
      </ActionForm>
      <p className="auth-switch">
        ¿Primera vez por acá? <Link href="/registro">Creá tu cuenta</Link>
      </p>
      <details className="resend-details">
        <summary>¿Todavía no verificaste tu correo?</summary>
        <p className="muted">
          Revisá también la carpeta de spam o pedí un nuevo enlace.
        </p>
        <ResendForm />
      </details>
    </>
  );
}
export function RegisterForm() {
  return (
    <>
      <ActionForm
        action={registerAction}
        submitLabel="Crear mi cuenta"
        pendingLabel="Preparando tu registro…"
      >
        <label>
          Tu nombre
          <input
            name="name"
            autoComplete="name"
            required
            maxLength={80}
            placeholder="¿Cómo te llamás?"
          />
        </label>
        <EmailField />
        <RegistrationPasswordFields />
        <span className="field-hint">
          Entre 10 y 72 caracteres. Te enviaremos un correo para verificar tu
          cuenta.
        </span>
      </ActionForm>
      <p className="auth-switch">
        ¿Ya tenés cuenta? <Link href="/login">Iniciá sesión</Link>
      </p>
    </>
  );
}
export function ForgotPasswordForm() {
  return (
    <>
      <ActionForm
        action={forgotPasswordAction}
        submitLabel="Enviar enlace"
        pendingLabel="Enviando…"
      >
        <EmailField />
      </ActionForm>
      <p className="auth-switch">
        <Link href="/login">Volver a iniciar sesión</Link>
      </p>
    </>
  );
}
export function ResetPasswordForm({ token }: { token: string }) {
  return (
    <>
      <ActionForm
        action={resetPasswordAction}
        submitLabel="Guardar nueva contraseña"
      >
        <input type="hidden" name="token" value={token} />
        <PasswordField newPassword />
      </ActionForm>
      <p className="auth-switch">
        <Link href="/olvide-contrasena">Pedir un nuevo enlace</Link>
      </p>
    </>
  );
}
export function ResendForm() {
  return (
    <ActionForm
      action={resendVerificationAction}
      submitLabel="Reenviar verificación"
      variant="secondary"
    >
      <EmailField />
    </ActionForm>
  );
}
