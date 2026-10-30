import { authenticatedPageAction } from "@/modules/auth/actions";
import { ProfileForm } from "@/modules/users/components/profile";

export default async function ProfilePage() {
  const user = await authenticatedPageAction();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU LUGAR EN EL EQUIPO</span>
          <h1>
            Mi perfil<span className="heading-dot">.</span>
          </h1>
          <p>Dale un poco de contexto a tus compañeros.</p>
        </div>
      </div>
      <ProfileForm user={user} />
    </>
  );
}
