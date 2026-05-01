import { useSyncExternalStore } from "react";
import { OpsTask } from "./types";
import { opsTasks as seed } from "./mockData";

let tasks: OpsTask[] = [...seed];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const tasksStore = {
  get: () => tasks,
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  add: (t: OpsTask) => { tasks = [t, ...tasks]; emit(); },
  update: (id: string, patch: Partial<OpsTask>) => {
    tasks = tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    emit();
  },
  nextCode: () => {
    const max = tasks.reduce((acc, t) => {
      const n = parseInt(t.code.replace(/\D/g, ""), 10);
      return isNaN(n) ? acc : Math.max(acc, n);
    }, 0);
    return `T-${String(max + 1).padStart(3, "0")}`;
  },
};

export const useTasks = () =>
  useSyncExternalStore(tasksStore.subscribe, tasksStore.get, tasksStore.get);
