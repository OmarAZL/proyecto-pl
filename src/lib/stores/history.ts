// src/lib/stores/history.ts
import { writable } from 'svelte/store';
import type { LPProblem, SimplexResult, GraphicalResult, SimplexMethod } from '$lib/types';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  count: number;
  problem: LPProblem;
  simplexResult: SimplexResult;
  graphicalResult: GraphicalResult | null;
}

function signature(p: LPProblem, method: SimplexMethod): string {
  return JSON.stringify({
    objective: p.objective,
    objectiveCoeffs: p.objectiveCoeffs,
    constraints: p.constraints,
    method
  });
}

function createHistoryStore() {
  const isBrowser = typeof window !== 'undefined';
  const initial: HistoryEntry[] = isBrowser
    ? JSON.parse(localStorage.getItem('lp-history') ?? '[]')
    : [];

  const { subscribe, update, set } = writable<HistoryEntry[]>(initial);

  function persist(entries: HistoryEntry[]) {
    if (isBrowser) localStorage.setItem('lp-history', JSON.stringify(entries));
  }

  return {
    subscribe,
    add(entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'count'>) {
      update((entries) => {
        const sig = signature(entry.problem, entry.simplexResult.method);
        const existingIdx = entries.findIndex(
          (e) => signature(e.problem, e.simplexResult.method) === sig
        );

        let next: HistoryEntry[];
        if (existingIdx !== -1) {
          const updated: HistoryEntry = {
            ...entries[existingIdx],
            timestamp: Date.now(),
            count: entries[existingIdx].count + 1,
            simplexResult: entry.simplexResult,
            graphicalResult: entry.graphicalResult
          };
          next = [updated, ...entries.filter((_, i) => i !== existingIdx)];
        } else {
          next = [
            { ...entry, id: crypto.randomUUID(), timestamp: Date.now(), count: 1 },
            ...entries
          ];
        }

        next = next.slice(0, 50);
        persist(next);
        return next;
      });
    },
    remove(id: string) {
      update((entries) => {
        const next = entries.filter((e) => e.id !== id);
        persist(next);
        return next;
      });
    },
    clear() {
      set([]);
      persist([]);
    }
  };
}

export const history = createHistoryStore();