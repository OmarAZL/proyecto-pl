// src/lib/graphical.ts
import type { Constraint, GraphicalResult, LPProblem, Point2D } from './types';

const EPS = 1e-9;

function satisfies(c: Constraint, p: Point2D): boolean {
  const val = c.coeffs[0] * p.x + c.coeffs[1] * p.y;
  if (c.type === '<=') return val <= c.rhs + 1e-6;
  if (c.type === '>=') return val >= c.rhs - 1e-6;
  return Math.abs(val - c.rhs) < 1e-6;
}

function intersect(
  a1: number, b1: number, c1: number,
  a2: number, b2: number, c2: number
): Point2D | null {
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < EPS) return null;
  return { x: (c1 * b2 - c2 * b1) / det, y: (a1 * c2 - a2 * c1) / det };
}

export function solveGraphical(problem: LPProblem): GraphicalResult {
  const lines = problem.constraints.map((c, i) => ({
    a: c.coeffs[0],
    b: c.coeffs[1],
    c: c.rhs,
    label: `R${i + 1}`
  }));

  const boundaryLines = [
    { a: 1, b: 0, c: 0 },
    { a: 0, b: 1, c: 0 },
    ...lines
  ];

  const candidates: Point2D[] = [];
  for (let i = 0; i < boundaryLines.length; i++) {
    for (let j = i + 1; j < boundaryLines.length; j++) {
      const p = intersect(
        boundaryLines[i].a, boundaryLines[i].b, boundaryLines[i].c,
        boundaryLines[j].a, boundaryLines[j].b, boundaryLines[j].c
      );
      if (p && p.x >= -1e-6 && p.y >= -1e-6) {
        candidates.push({ x: Math.max(0, p.x), y: Math.max(0, p.y) });
      }
    }
  }

  const feasible: Point2D[] = [];
  for (const p of candidates) {
    const ok = problem.constraints.every((c) => satisfies(c, p));
    if (ok) {
      const dup = feasible.some((f) => Math.abs(f.x - p.x) < 1e-6 && Math.abs(f.y - p.y) < 1e-6);
      if (!dup) feasible.push(p);
    }
  }

  if (feasible.length > 0) {
    const cx = feasible.reduce((s, p) => s + p.x, 0) / feasible.length;
    const cy = feasible.reduce((s, p) => s + p.y, 0) / feasible.length;
    feasible.sort((p1, p2) => Math.atan2(p1.y - cy, p1.x - cx) - Math.atan2(p2.y - cy, p2.x - cx));
  }

  let optimalVertex: Point2D | null = null;
  let optimalValue: number | null = null;

  for (const p of feasible) {
    const val = problem.objectiveCoeffs[0] * p.x + problem.objectiveCoeffs[1] * p.y;
    if (optimalValue === null) {
      optimalValue = val;
      optimalVertex = p;
    } else if (problem.objective === 'max' && val > optimalValue) {
      optimalValue = val;
      optimalVertex = p;
    } else if (problem.objective === 'min' && val < optimalValue) {
      optimalValue = val;
      optimalVertex = p;
    }
  }

  return { feasibleVertices: feasible, optimalVertex, optimalValue, lines };
}