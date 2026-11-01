"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icon";

const STORAGE_KEY = "equipo:sidebar-hidden";

export function WorkspaceFrame({ sidebar, header, children }: {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try { setHidden(localStorage.getItem(STORAGE_KEY) === "true"); } catch { /* La vista funciona sin almacenamiento. */ }
  }, []);

  function toggleSidebar() {
    const next = !hidden;
    setHidden(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* Conserva la preferencia durante esta navegación. */ }
  }

  return (
    <div className={`workspace${hidden ? " sidebar-hidden" : ""}`}>
      <a className="skip-link" href="#contenido">Ir al contenido</a>
      <aside id="workspace-sidebar" className="sidebar" hidden={hidden}>{sidebar}</aside>
      <div className="workspace-body">
        <header className="topbar">
          <button type="button" className="icon-button sidebar-toggle" aria-controls="workspace-sidebar" aria-expanded={!hidden} aria-label={hidden ? "Mostrar barra lateral" : "Ocultar barra lateral"} title={hidden ? "Mostrar barra lateral" : "Ocultar barra lateral"} onClick={toggleSidebar}>
            <Icon name="sidebar" size={21} />
          </button>
          {header}
        </header>
        <main id="contenido" className="main-content">{children}</main>
        <footer className="workspace-footer">Un mismo equipo. Un mismo rumbo.</footer>
      </div>
    </div>
  );
}
