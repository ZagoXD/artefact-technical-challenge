import type { Task } from "../lib/task";

export type TaskStore = {
  tasks: Map<string, { task: Task; sequence: number }>;
  sequence: number;
};
export const createStore = (): TaskStore => ({ tasks: new Map(), sequence: 0 });

// Share memory across route bundles and development hot reloads in this Node.js process.
const globalStore = globalThis as typeof globalThis & { taskStore?: TaskStore };
export const store = (globalStore.taskStore ??= createStore());
