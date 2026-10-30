"use client";

import { useState } from "react";
import { Icon } from "@/shared/ui/icon";
import { downloadSessionReportAction } from "../actions";

export function ReportDownload({
  teamId,
  sessionId,
  reportId,
  name,
}: {
  teamId: string;
  sessionId: string;
  reportId: string;
  name: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setPending(true);
    setError("");
    try {
      const result = await downloadSessionReportAction({
        teamId,
        sessionId,
        reportId,
      });
      if (!result.success || !result.report) {
        setError(result.message);
        return;
      }
      const url = URL.createObjectURL(
        new Blob([result.report.content], {
          type: "text/markdown;charset=utf-8",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = result.report.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("No pudimos descargar el archivo. Volvé a intentar.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        className="session-report-download"
        onClick={download}
        disabled={pending}
        title={name}
      >
        <Icon name="file" size={14} />
        {pending ? "Preparando…" : name}
      </button>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
