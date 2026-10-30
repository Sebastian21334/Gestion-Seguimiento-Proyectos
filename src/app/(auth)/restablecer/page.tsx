import { AuthShell } from "@/modules/auth/components/auth-shell";
import { ResetPasswordForm } from "@/modules/auth/components/forms";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthShell
      title="Una nueva contraseña"
      description="Elegí una contraseña de al menos 10 caracteres. Después vas a iniciar sesión nuevamente."
    >
      <ResetPasswordForm
        token={typeof token === "string" ? token.slice(0, 2048) : ""}
      />
    </AuthShell>
  );
}
