import Link from "next/link";
import { AuthShell } from "@/modules/auth/components/auth-shell";
import { ResendForm } from "@/modules/auth/components/forms";
import { verifyEmailAction } from "@/modules/auth/actions";

export const dynamic = "force-dynamic";
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = await verifyEmailAction(token);
  return (
    <AuthShell
      title={result.success ? "Ya está todo listo" : "Revisemos ese enlace"}
      description={result.message}
    >
      {result.success ? (
        <Link className="button button-primary" href="/login">
          Iniciar sesión
        </Link>
      ) : (
        <ResendForm />
      )}
    </AuthShell>
  );
}
