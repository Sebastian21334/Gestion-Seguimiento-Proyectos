import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Equipo · Un mismo tablero", template: "%s · Equipo" },
  description:
    "Tu equipo en la misma sintonía. Coordiná el trabajo, compartí documentos y avanzá en equipo.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
