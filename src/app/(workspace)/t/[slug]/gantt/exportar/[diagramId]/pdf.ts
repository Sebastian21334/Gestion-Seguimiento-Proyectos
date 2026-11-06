import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import type { ganttPageAction } from "@/modules/gantt/actions";
import type { ganttSessionsAction } from "@/modules/work-sessions/actions";
import { sessionReportLink } from "@/shared/session-report-links";

type Gantt = Awaited<ReturnType<typeof ganttPageAction>>;
type Session = Awaited<ReturnType<typeof ganttSessionsAction>>[number];
type ExportData = Pick<Gantt, "tasks" | "phases" | "comments"> & {
  diagram: Gantt["diagrams"][number];
  team: { id: string; name: string };
  sessions: Session[];
};
type Task = Gantt["tasks"][number];
type Row = { phase: Gantt["phases"][number] } | { task: Task };

const MARGIN = 42;
const TOP = 76;
const BOTTOM = 50;
const ROW_HEIGHT = 25;
const DAY = 86_400_000;
const ink = "#172742";
const muted = "#536783";
const line = "#DCE6F2";
const paper = "#F2F6FC";
const blue = "#2659A5";
const teal = "#087D77";

const statuses = {
  pending: { label: "Pendiente", color: "#607691", light: "#E2E9F4" },
  active: { label: "En curso", color: "#3062D5", light: "#DAE5FF" },
  done: { label: "Completada", color: teal, light: "#DDF4EF" },
};
const priorities: Record<string, string> = {
  low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente",
};
const phaseColors: Record<string, string> = {
  violet: "#7458CB", blue, green: teal, amber: "#AD6917", pink: "#B24374",
};

const dateOnly = new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric",
});
const dateTime = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short",
});
const tickDate = new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC", day: "numeric", month: "short",
});
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY;
const formatDate = (date: string) => dateOnly.format(dayNumber(date) * DAY);
const timeOfDay = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours * 60 + minutes) / 1440;
};
const statusOf = (task: Task) => statuses[task.completed ? "done" : task.status === "active" ? "active" : "pending"];
const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

export async function renderGanttPdf({ team, diagram, tasks, phases, comments, sessions }: ExportData) {
  const regular = readFileSync(join(process.cwd(), "node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff"));
  const bold = readFileSync(join(process.cwd(), "node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff"));
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: TOP, bottom: BOTTOM, left: MARGIN, right: MARGIN },
    bufferPages: true,
    autoFirstPage: false,
    info: { Title: diagram.name, Author: "equipo.", Subject: "Diagrama de Gantt" },
  });
  doc.registerFont("Regular", regular).registerFont("Bold", bold);
  const generated = new Date();
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const byDate = [...tasks].sort((a, b) =>
    a.startDate.localeCompare(b.startDate) ||
    a.startTime.localeCompare(b.startTime) ||
    a.title.localeCompare(b.title, "es-AR"),
  );
  const rows: Row[] = [];
  for (const phase of phases) {
    rows.push({ phase });
    for (const task of byDate.filter((item) => item.phaseId === phase.id)) rows.push({ task });
  }
  const phaseNames = new Map(phases.map((phase) => [phase.id, phase.name]));
  for (const task of byDate) {
    if (!task.phaseId || !phaseNames.has(task.phaseId)) rows.push({ task });
  }
  const orderedTasks = rows.flatMap((row) => "task" in row ? [row.task] : []);
  const numbered = new Map(orderedTasks.map((task, i) => [task.id, {
    number: String(i + 1).padStart(2, "0"), title: task.title,
  }]));
  const fileCount = sessions.reduce((total, session) => total + session.reports.length, 0);
  const first = byDate.length ? dayNumber(byDate[0].startDate) : 0;
  const last = byDate.reduce((latest, task) => Math.max(latest, dayNumber(task.endDate)), first);
  const span = last - first + 1;

  let section = "CRONOGRAMA";
  let continuation = "";
  const sections: string[] = [];
  doc.on("pageAdded", () => sections.push(continuation || section));
  doc.addPage();
  const width = doc.page.width - 2 * MARGIN;
  const right = MARGIN + width;
  const limit = doc.page.height - BOTTOM;

  function font(size: number, color = ink, strong = false) {
    return doc.font(strong ? "Bold" : "Regular").fontSize(size).fillColor(color);
  }

  function single(text: string, x: number, y: number, width: number, align: "left" | "right" | "center" = "left") {
    doc.text(oneLine(text), x, y, { width, height: doc.currentLineHeight(true) + 1, align, ellipsis: true });
  }

  function ensure(height: number) {
    if (doc.y + height > limit) doc.addPage();
  }

  function flow(text: string, size = 11, color = ink, strong = false) {
    font(size, color, strong).text(text, MARGIN, doc.y, { width, lineGap: 2 });
  }

  function heading(text: string) {
    ensure(43);
    doc.y += 7;
    flow(text.toLocaleUpperCase("es-AR"), 9, blue, true);
    doc.y += 4;
  }

  function cover() {
    const titleWidth = width - 70;
    const title = oneLine(diagram.name);
    font(29, "#FFFFFF", true);
    const titleHeight = doc.heightOfString(title, { width: titleWidth, lineGap: 0 });
    const height = titleHeight + 74;
    doc.roundedRect(MARGIN, TOP, width, height, 12).fill(ink);
    doc.roundedRect(MARGIN + 20, TOP + 19, 26, 4, 2).fill("#63DBCA");
    font(9, "#A4E9DF", true);
    single("PLANIFICACIÓN DEL EQUIPO", MARGIN + 20, TOP + 29, titleWidth);
    font(29, "#FFFFFF", true).text(title, MARGIN + 20, TOP + 47, { width: titleWidth });
    font(10, "#D6E4F7");
    single(team.name, MARGIN + 20, TOP + height - 22, titleWidth);

    const metrics = [
      [String(tasks.length), "TAREAS"],
      [String(tasks.filter((task) => task.completed).length), "COMPLETADAS"],
      [String(phases.length), "FASES"],
      [String(fileCount), "ARCHIVOS .MD"],
    ];
    const gap = 10;
    const card = (width - gap * (metrics.length - 1)) / metrics.length;
    const y = TOP + height + 12;
    for (const [i, [value, label]] of metrics.entries()) {
      const x = MARGIN + i * (card + gap);
      doc.roundedRect(x, y, card, 50, 7).fill(paper);
      font(20, ink, true);
      single(value, x + 12, y + 3, card - 24);
      font(8, muted, true);
      single(label, x + 12, y + 31, card - 24);
    }
    return y + 65;
  }

  function chart(y: number, offset: number) {
    const labelWidth = 253;
    const axisLeft = MARGIN + labelWidth;
    const trackWidth = right - axisLeft - 10;
    const position = (day: number) => axisLeft + (day - first) * trackWidth / span;
    font(16, ink, true);
    single(offset ? "Cronograma (continuación)" : "Cronograma", MARGIN, y, 280);
    font(9, muted);
    if (tasks.length) {
      const period = `${dateOnly.format(first * DAY)} - ${dateOnly.format(last * DAY)}`;
      single(period, axisLeft, y + 6, right - axisLeft, "right");
    }
    y += 26;
    for (const [i, status] of Object.values(statuses).entries()) {
      const x = MARGIN + i * 105;
      doc.circle(x + 4, y + 6, 3.5).fill(status.color);
      font(9, muted);
      single(status.label, x + 12, y, 93);
    }
    if (tasks.length) single("Seleccioná una tarea para ir a su ficha", axisLeft, y, right - axisLeft, "right");
    y += 22;

    if (!rows.length) {
      font(11, muted);
      single("Este diagrama todavía no tiene tareas ni fases.", MARGIN, y, width);
      return 0;
    }
    doc.roundedRect(MARGIN, y, width, 24, 5).fill(ink);
    font(8, "#FFFFFF", true);
    single("FASES / TAREAS", MARGIN + 10, y + 6, labelWidth - 20);
    const tickCount = Math.min(7, span);
    const ticks = tasks.length ? Array.from({ length: tickCount }, (_, i) =>
      first + (tickCount === 1 ? 0 : Math.round(i * (span - 1) / (tickCount - 1))),
    ) : [];
    for (const tick of ticks) {
      const x = position(tick);
      const left = Math.min(Math.max(x - 29, axisLeft), right - 60);
      single(tickDate.format(tick * DAY), left, y + 6, 57, tick === first ? "left" : "center");
    }
    y += 24;
    const available = Math.max(1, Math.floor((limit - y) / ROW_HEIGHT));
    const slice = rows.slice(offset, offset + available);
    const placements = new Map<string, { left: number; right: number; center: number }>();
    for (const [i, row] of slice.entries()) {
      const top = y + i * ROW_HEIGHT;
      if ("phase" in row) {
        doc.rect(MARGIN, top, width, ROW_HEIGHT).fill(paper);
        doc.circle(MARGIN + 14, top + ROW_HEIGHT / 2, 3.5).fill(phaseColors[row.phase.color] ?? muted);
        font(9, ink, true);
        single(row.phase.name, MARGIN + 24, top + 6, labelWidth - 32);
        font(8, muted);
        single(`${row.phase.taskCount} tareas  /  ${row.phase.progress}%`, axisLeft + 5, top + 7, 155);
        continue;
      }
      const { task } = row;
      if (i % 2 === 0) doc.rect(MARGIN, top, width, ROW_HEIGHT).fill("#FAFCFF");
      for (const tick of ticks) {
        const x = position(tick);
        doc.moveTo(x, top).lineTo(x, top + ROW_HEIGHT).strokeColor(line).lineWidth(0.5).stroke();
      }
      doc.moveTo(MARGIN, top + ROW_HEIGHT).lineTo(right, top + ROW_HEIGHT).strokeColor(line).lineWidth(0.5).stroke();
      const start = position(dayNumber(task.startDate) + timeOfDay(task.startTime));
      const end = position(dayNumber(task.endDate) + timeOfDay(task.endTime));
      placements.set(task.id, { left: start, right: Math.max(start + 4, end), center: top + ROW_HEIGHT / 2 });
      font(8, blue, true);
      single(numbered.get(task.id)!.number, MARGIN + 10, top + 7, 22);
      font(9);
      single(task.title, MARGIN + 35, top + 6, labelWidth - 42);
      doc.goTo(MARGIN, top, labelWidth, ROW_HEIGHT, task.id);
    }
    for (const row of slice) {
      if (!("task" in row)) continue;
      const target = placements.get(row.task.id)!;
      for (const id of row.task.dependencyIds) {
        const source = placements.get(id);
        if (!source) continue;
        const bend = (source.right + target.left) / 2;
        doc.moveTo(source.right, source.center).lineTo(bend, source.center)
          .lineTo(bend, target.center).lineTo(target.left, target.center)
          .strokeColor("#7E91AE").lineWidth(0.8).stroke();
      }
    }
    for (const row of slice) {
      if (!("task" in row)) continue;
      const bar = placements.get(row.task.id)!;
      const status = statusOf(row.task);
      const length = bar.right - bar.left;
      doc.roundedRect(bar.left, bar.center - 5, length, 10, 3).fill(status.light);
      const filled = Math.min(length, Math.max(3, length * row.task.progress / 100));
      doc.roundedRect(bar.left, bar.center - 5, filled, 10, 2).fill(status.color);
    }
    return offset + slice.length;
  }

  let offset = chart(cover(), 0);
  while (offset < rows.length) {
    doc.addPage();
    offset = chart(TOP, offset);
  }

  function taskDetails(task: Task) {
    const number = numbered.get(task.id)!.number;
    const status = statusOf(task);
    const title = oneLine(task.title);
    font(17, ink, true);
    const titleHeight = doc.heightOfString(title, { width: width - 144, lineGap: 0 });
    const headerHeight = titleHeight + 37;
    ensure(headerHeight + 107);
    const y = doc.y;
    continuation = `TAREA ${number}  /  CONTINUACIÓN`;
    doc.addNamedDestination(task.id, "XYZ", MARGIN, y - 8, null);
    doc.roundedRect(MARGIN, y, width, headerHeight, 7).fill(paper);
    doc.roundedRect(MARGIN + 12, y + 12, 35, 25, 5).fill(ink);
    font(10, "#FFFFFF", true);
    single(number, MARGIN + 12, y + 17, 35, "center");
    font(8, muted, true);
    single(phaseNames.get(task.phaseId ?? "") ?? "SIN FASE", MARGIN + 58, y + 8, width - 205);
    font(17, ink, true).text(title, MARGIN + 58, y + 22, { width: width - 144 });
    doc.roundedRect(right - 79, y + 12, 67, 19, 8).fill(status.light);
    font(8, status.color, true);
    single(status.label, right - 79, y + 15, 67, "center");
    doc.y = y + headerHeight + 10;
    flow(`${formatDate(task.startDate)}  ${task.startTime}  -  ${formatDate(task.endDate)}  ${task.endTime}  |  ${task.progress}% de avance  |  Prioridad ${priorities[task.priority] ?? task.priority}`, 10, ink, true);
    flow(`Responsable: ${task.assigneeName ?? (task.assigneeId ? "Exmiembro" : "Sin responsable")}  |  Creada por ${task.creatorName} el ${dateTime.format(task.createdAt)}`, 10, muted);
    heading("Descripción");
    flow(task.description || "Sin descripción.");

    const dependencies = task.dependencyIds.flatMap((id) => {
      const item = numbered.get(id);
      return item ? [`${item.number}  ${item.title}`] : [];
    });
    const taskComments = comments.filter((comment) => comment.taskId === task.id);
    const taskSessions = sessions.filter((session) => session.ganttTaskId === task.id);
    const emptySections = [
      !dependencies.length && "Sin dependencias",
      !taskComments.length && "Sin comentarios",
      !taskSessions.length && "Sin sesiones asociadas",
    ].filter(Boolean);
    if (emptySections.length) {
      doc.y += 5;
      flow(emptySections.join("  ·  "), 9, muted);
    }
    if (dependencies.length) {
      heading("Dependencias");
      flow(dependencies.join("\n"), 10);
    }
    if (taskComments.length) heading(`Comentarios (${taskComments.length})`);
    for (const comment of taskComments) {
      ensure(35);
      flow(`${comment.authorName}  |  ${dateTime.format(comment.createdAt)}`, 10, ink, true);
      flow(comment.content);
      doc.y += 5;
    }

    if (taskSessions.length) heading(`Sesiones de trabajo (${taskSessions.length})`);
    for (const session of taskSessions) {
      ensure(50);
      flow(session.title, 11, ink, true);
      const end = session.endedAt ? dateTime.format(session.endedAt) : "En curso";
      const elapsed = (session.endedAt ?? generated).getTime() - session.startedAt.getTime();
      const minutes = Math.max(1, Math.round(elapsed / 60_000));
      const duration = minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
      flow(`${session.user.name}  |  ${dateTime.format(session.startedAt)}  -  ${end}  |  ${duration}`, 10, muted);
      if (session.description) flow(session.description);
      for (const report of session.reports) {
        const label = `Descargar .md  /  ${report.name}`;
        font(10, blue, true);
        ensure(doc.heightOfString(label, { width, lineGap: 1 }) + 5);
        font(10, blue, true).text(label, MARGIN, doc.y, {
          width, lineGap: 1, underline: true,
          link: sessionReportLink(team.id, session.id, report.id),
        });
      }
      doc.y += 7;
    }
    doc.y += 15;
    continuation = "";
  }

  if (orderedTasks.length) {
    section = "DETALLE DE TAREAS";
    doc.addPage();
    flow("Detalle de tareas", 23, ink, true);
    flow(fileCount
      ? "Los enlaces de los archivos .md funcionan sin iniciar sesión."
      : "Descripción, planificación y actividad de cada tarea.", 10, muted);
    doc.y += 15;
    for (const task of orderedTasks) taskDetails(task);
  }

  for (const [index, label] of sections.entries()) {
    doc.switchToPage(index);
    font(16, ink, true);
    single("equipo.", MARGIN, 22, 100);
    font(8, blue, true);
    single(label, MARGIN + 110, 29, width - 110, "right");
    doc.moveTo(MARGIN, 51).lineTo(right, 51).strokeColor(line).lineWidth(0.7).stroke();
    doc.moveTo(MARGIN, limit + 8).lineTo(right, limit + 8).strokeColor(line).lineWidth(0.7).stroke();
    font(8, muted);
    const footerY = limit + 17;
    // El pie está en el margen de impresión, fuera del flujo de texto.
    doc.text(`Exportado el ${dateTime.format(generated)}  ·  Hora de Buenos Aires`, MARGIN, footerY, { lineBreak: false });
    const page = `${index + 1} / ${sections.length}`;
    doc.text(page, right - doc.widthOfString(page), footerY, { lineBreak: false });
  }

  const result = new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
    doc.once("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.once("error", reject);
  });
  doc.end();
  return result;
}
