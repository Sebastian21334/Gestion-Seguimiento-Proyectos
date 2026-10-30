import type { ReactNode } from "react";
import type { ganttPageAction } from "../actions";

export type Gantt = Awaited<ReturnType<typeof ganttPageAction>>;
export type Task = Gantt["tasks"][number];
export type Phase = Gantt["phases"][number];
export type Session = {
  id: string;
  ganttTaskId: string | null;
  title: string;
  startedAt: Date | string;
  endedAt: Date | string | null;
  status: "active" | "done";
  user: { name: string };
  reports: { id: string; name: string }[];
};
export type Member = { userId: string; user: { name: string } };
export type Attachments = Record<string, ReactNode>;
