import { AuthShell } from "@/modules/auth/components/auth-shell";
import { RegisterForm } from "@/modules/auth/components/forms";

export default async function RegisterPage({ searchParams }: {
  searchParams: Promise<{ invitacion?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell
      title="El próximo paso, juntos"
      description="Creá tu cuenta y empezá a trabajar en sintonía."
    >
      <RegisterForm invitation={params.invitacion === "1"} />
    </AuthShell>
  );
}
