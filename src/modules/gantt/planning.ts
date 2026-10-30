import { ValidationError } from "@/shared/errors";

export type Dependency = { taskId: string; dependsOnId: string };

export function validateDependencies(taskId: string, dependencyIds: string[], taskIds: string[], existing: Dependency[]) {
  const allowed = new Set(taskIds);
  if (dependencyIds.some(id => id === taskId))
    throw new ValidationError("Una tarea no puede depender de sí misma.");
  if (dependencyIds.some(id => !allowed.has(id)))
    throw new ValidationError("Las dependencias deben pertenecer al mismo diagrama.");
  const graph = new Map<string, string[]>();
  for (const edge of existing) {
    if (edge.taskId === taskId) continue;
    graph.set(edge.taskId, [...(graph.get(edge.taskId) ?? []), edge.dependsOnId]);
  }
  graph.set(taskId, dependencyIds);
  const visited = new Set<string>();
  const visiting = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw new ValidationError("Las dependencias no pueden formar un ciclo.");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const predecessor of graph.get(id) ?? []) visit(predecessor);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of graph.keys()) visit(id);
}

export function summarizePhase(tasks: { startDate: string; endDate: string; startTime: string; endTime: string; progress: number }[]) {
  if (!tasks.length) return { startDate: null, endDate: null, startTime: null, endTime: null, progress: 0, taskCount: 0, durationDays: 0 };
  const starts = tasks.map(task => `${task.startDate}T${task.startTime}`).sort();
  const ends = tasks.map(task => `${task.endDate}T${task.endTime}`).sort();
  return {
    startDate: starts[0].slice(0, 10),
    startTime: starts[0].slice(11),
    endDate: ends[ends.length - 1].slice(0, 10),
    endTime: ends[ends.length - 1].slice(11),
    progress: Math.round(tasks.reduce((total, task) => total + task.progress, 0) / tasks.length),
    taskCount: tasks.length,
    durationDays: Math.round((Date.parse(ends[ends.length - 1].slice(0, 10)) - Date.parse(starts[0].slice(0, 10))) / 86_400_000) + 1,
  };
}
