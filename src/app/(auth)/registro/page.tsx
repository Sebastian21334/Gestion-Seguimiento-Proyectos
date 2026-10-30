import { AuthShell } from "@/modules/auth/components/auth-shell";
import { RegisterForm } from "@/modules/auth/components/forms";

export default function RegisterPage() {
  return (
    <AuthShell
      title="El próximo paso, juntos"
      description="Creá tu cuenta y empezá a trabajar en sintonía."
    >
      <RegisterForm />
    </AuthShell>
  );
}
