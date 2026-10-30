import { AuthShell } from "@/modules/auth/components/auth-shell";
import { RegistrationNotice } from "@/modules/auth/components/registration-notice";

export const metadata = { title: "Revisá tu correo" };

export default async function RegistrationEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ proveedor?: string | string[] }>;
}) {
  const { proveedor } = await searchParams;
  return (
    <AuthShell
      title="Revisá tu correo"
      description="Ya recibimos tu solicitud. El próximo paso está en tu bandeja de entrada."
    >
      <RegistrationNotice provider={proveedor} />
    </AuthShell>
  );
}
