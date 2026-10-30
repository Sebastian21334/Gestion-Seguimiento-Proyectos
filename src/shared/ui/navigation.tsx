"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./icon";

export function TeamSelector({
  teams,
}: {
  teams: { id: string; name: string; slug: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const slug = pathname.match(/^\/t\/([^/]+)/)?.[1] ?? "";
  return (
    <label className="team-selector">
      <span className="sr-only">Cambiar equipo</span>
      <select
        value={slug}
        onChange={(event) =>
          router.push(event.target.value ? `/t/${event.target.value}` : "/")
        }
      >
        <option value="">Todos mis equipos</option>
        {teams.map((team) => (
          <option key={team.id} value={team.slug}>
            {team.name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function WorkspaceLinks() {
  const pathname = usePathname();
  return (
    <nav className="workspace-links" aria-label="Navegación principal">
      <Link href="/" className={pathname === "/" ? "selected" : ""}>
        <Icon name="grid" />
        Mis equipos
      </Link>
      <Link href="/perfil" className={pathname === "/perfil" ? "selected" : ""}>
        <Icon name="users" />
        Mi perfil
      </Link>
    </nav>
  );
}
export function TeamNavigation({ slug }: { slug: string }) {
  const pathname = usePathname();
  const root = `/t/${slug}`;
  return (
    <nav className="team-tabs" aria-label="Navegación del equipo">
      {[
        { href: root, label: "Tablero", icon: "grid" as const },
        {
          href: `${root}/gantt`,
          label: "Gantt",
          icon: "file" as const,
        },
        { href: `${root}/miembros`, label: "Miembros", icon: "users" as const },
      ].map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            (
              link.href === root
                ? pathname === root
                : pathname.startsWith(link.href)
            )
              ? "active"
              : ""
          }
        >
          <Icon name={link.icon} size={17} />
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
