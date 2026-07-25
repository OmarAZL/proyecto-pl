// src/lib/stores/pendingLoad.ts
import { writable } from 'svelte/store';
import type { LPProblem } from '$lib/types';

export const pendingLoad = writable<LPProblem | null>(null);