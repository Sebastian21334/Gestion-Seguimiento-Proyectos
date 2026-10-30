import { AuthShell } from "@/modules/auth/components/auth-shell";
import { LoginForm } from "@/modules/auth/components/forms";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ restablecida?: string; invitacion?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell
      title="Qué bueno verte de nuevo"
      description="Entrá a tu espacio y ponete al día con tu equipo."
    >
      <LoginForm reset={params.restablecida === "1"} invitation={params.invitacion === "1"} />
    </AuthShell>
  );
}
