// src/lib/stores/pendingLoad.ts
import { writable } from 'svelte/store';
import type { LPProblem, SimplexMethod } from '$lib/types';

export interface PendingLoad {
  problem: LPProblem;
  method: SimplexMethod;
}

export const pendingLoad = writable<PendingLoad | null>(null);
