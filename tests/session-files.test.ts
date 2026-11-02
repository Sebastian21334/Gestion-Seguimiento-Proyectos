import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/work-sessions/actions", () => ({
  deleteSessionReportAction: vi.fn(),
  uploadSessionReportAction: vi.fn(),
  downloadSessionReportAction: vi.fn(),
  reportHistoryAction: vi.fn(),
}));

import { SessionFiles } from "@/modules/work-sessions/components/session-files";

function renderFiles(canEdit: boolean, reports = [{ id: "report", name: "cambios.md" }]) {
  return renderToStaticMarkup(createElement(SessionFiles, { teamId: "team", sessionId: "session", reports, canEdit }));
}

describe("administración de archivos de la tarea", () => {
  it("permite agregar y eliminar únicamente adjuntos y ofrece consultar el historial", () => {
    const html = renderFiles(true);
    expect(html).toContain("Agregar archivos .md");
    expect(html).toContain("Eliminar archivo");
    expect(html).toContain("Historial de archivos");
    expect(html).toContain('name="reportId" value="report"');
    for (const field of ["title", "description", "status", "startedAt", "endedAt", "userId"]) {
      expect(html).not.toContain(`name="${field}"`);
    }
  });

  it("los demás miembros solo pueden descargar y consultar el historial", () => {
    const html = renderFiles(false);
    expect(html).toContain("cambios.md");
    expect(html).toContain("Historial de archivos");
    expect(html).not.toContain("Eliminar archivo");
    expect(html).not.toContain('type="file"');
  });

  it("permite agregar el primer adjunto y ver el historial cuando ya no quedan archivos", () => {
    const html = renderFiles(true, []);
    expect(html).toContain("Sin archivos adjuntos");
    expect(html).toContain("Agregar archivos .md");
    expect(html).toContain("Historial de archivos");
  });
});
