import { downloadSharedSessionReportAction } from "@/modules/work-sessions/actions";
import { logUnexpectedError } from "@/shared/errors/log";
import { downloadHeaders, privateResponse } from "@/shared/http/download";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const report = await downloadSharedSessionReportAction(token);
    if (!report) {
      return new Response("Este archivo ya no está disponible.", {
        status: 404,
        headers: privateResponse,
      });
    }
    return new Response(report.content, {
      headers: downloadHeaders("text/markdown; charset=utf-8", report.name, "archivo.md"),
    });
  } catch (error) {
    logUnexpectedError(error);
    return new Response("No pudimos descargar el archivo.", {
      status: 500,
      headers: privateResponse,
    });
  }
}
