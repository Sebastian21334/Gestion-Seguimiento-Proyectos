"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="standalone-message">
      <h1>Algo no salió como esperábamos.</h1>
      <p>No pudimos cargar este espacio. Intentá nuevamente.</p>
      <button className="button button-primary" onClick={reset}>
        Volver a intentar
      </button>
      <a href="/login" className="text-link">
        Ir a iniciar sesión
      </a>
    </div>
  );
}
