import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/shared/ui/icon";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-layout">
      <aside className="auth-story">
        <Link href="/login" className="brand">
          <span className="brand-mark">
            <Icon name="code" size={24} />
          </span>
          equipo<span className="brand-dot">.</span>
        </Link>
        <div className="auth-story-content">
          <span className="eyebrow light">MENOS FRICCIÓN. MÁS EQUIPO.</span>
          <h1>
            Tu equipo,
            <br />
            en la misma
            <br />
            <span>sintonía.</span>
          </h1>
          <p>
            Un lugar para saber quién está haciendo qué, compartir documentos y
            avanzar juntos.
          </p>
          <div className="story-card">
            <span className="live-dot" />
            <span>Todo el equipo. Un mismo tablero.</span>
            <Icon name="arrow" />
          </div>
        </div>
        <small>Hecho para trabajar mejor, juntos.</small>
      </aside>
      <section className="auth-main">
        <div className="auth-form-card">
          <span className="eyebrow">TU ESPACIO DE TRABAJO</span>
          <h2>{title}</h2>
          <p className="muted auth-description">{description}</p>
          {children}
        </div>
        <p className="auth-footer">Simple, organizado y siempre en equipo.</p>
      </section>
    </main>
  );
}
