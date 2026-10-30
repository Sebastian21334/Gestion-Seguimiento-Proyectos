import { AuthShell } from "@/modules/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/modules/auth/components/forms";

export default function ForgotPage() {
  return (
    <AuthShell
      title="Volvamos a conectar"
      description="Ingresá tu correo y te enviaremos un enlace para restablecer tu contraseña."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
