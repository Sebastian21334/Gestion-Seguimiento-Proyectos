import Link from "next/link";

export default function NotFound() {
  return (
    <main className="standalone-message">
      <span className="eyebrow">404 · NO ENCONTRADO</span>
      <h1>Por acá no es.</h1>
      <p>El espacio no existe o no tenés acceso con esta cuenta.</p>
      <Link href="/" className="button button-primary">
        Volver a mis equipos
      </Link>
    </main>
  );
}
