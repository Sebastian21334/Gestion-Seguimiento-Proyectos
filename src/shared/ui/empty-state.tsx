import type { ReactNode } from "react";
import { Icon } from "./icon";

export function EmptyState({
  title,
  children,
  icon = "grid",
}: {
  title: string;
  children: ReactNode;
  icon?: Parameters<typeof Icon>[0]["name"];
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
