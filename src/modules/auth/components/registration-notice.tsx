import Link from "next/link";
import { Icon } from "@/shared/ui/icon";
import { ResendForm } from "./forms";
import { mailboxes } from "./mailbox-options";

export function RegistrationNotice({ provider }: { provider: unknown }) {
  // Solo se elige entre URLs fijas. El parámetro nunca se usa como enlace.
  const preferred = mailboxes.find((mailbox) => mailbox.id === provider);
  return (
    <div className="registration-notice">
      <div className="registration-mail-icon">
        <Icon name="mail" size={34} />
        <span>
          <Icon name="check" size={12} />
        </span>
      </div>
      <p className="notice notice-success" role="status">
        Si el mail es válido, te enviamos un correo con el próximo paso.
      </p>
      <ol className="registration-steps">
        <li>
          <span>01</span>
          <div>
            <strong>Abrí tu bandeja de entrada</strong>
            <p>
              Buscá un correo de equipo. Revisá también spam o correo no
              deseado.
            </p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>Verificá tu correo</strong>
            <p>
              Presioná «Verificar mi correo» en el mensaje. El enlace dura 24
              horas.
            </p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>Entrá a tu espacio</strong>
            <p>
              Iniciá sesión para ir al inicio y empezar a trabajar con tu
              equipo.
            </p>
          </div>
        </li>
      </ol>
      {preferred ? (
        <>
          <a
            className="button button-primary mailbox-primary"
            href={preferred.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir mi correo en {preferred.label}
            <Icon name="arrow" size={17} />
          </a>
          <p className="field-hint mailbox-hint">
            Se abre en otra pestaña. Esta pantalla queda disponible para
            continuar.
          </p>
          <details className="mailbox-alternatives">
            <summary>Uso otro servicio de correo</summary>
            <MailboxLinks />
          </details>
        </>
      ) : (
        <div className="mailbox-chooser">
          <p className="small muted">Elegí dónde querés abrir tu correo:</p>
          <MailboxLinks />
          <p className="field-hint">
            Si usás otro servicio, abrí su web o tu aplicación de correo
            habitual.
          </p>
        </div>
      )}
      <Link href="/" className="button button-secondary mailbox-primary">
        Ya verifiqué mi correo · Continuar
        <Icon name="arrow" size={16} />
      </Link>
      <p className="field-hint mailbox-hint">
        Para entrar a la página principal, primero tenés que verificar tu correo
        e iniciar sesión.
      </p>
      <details className="resend-details">
        <summary>¿No llegó el correo?</summary>
        <p className="muted">
          Puede demorar unos minutos. Si hace falta, ingresá tu correo para
          pedir otro enlace. Si ya tenés cuenta, podés iniciar sesión o
          recuperar tu contraseña.
        </p>
        <ResendForm />
        <Link href="/olvide-contrasena" className="text-link">
          Recuperar mi contraseña
        </Link>
      </details>
      <p className="auth-switch">
        <Link href="/registro">Corregir mi correo o volver al registro</Link>
      </p>
    </div>
  );
}

function MailboxLinks() {
  return (
    <div className="mailbox-links">
      {mailboxes.map((mailbox) => (
        <a
          key={mailbox.id}
          href={mailbox.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {mailbox.label}
          <Icon name="arrow" size={14} />
        </a>
      ))}
    </div>
  );
}
