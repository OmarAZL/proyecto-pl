// src/lib/types.ts
export type ConstraintType = '<=' | '>=' | '=';
export type ObjectiveType = 'max' | 'min';

export interface Constraint {
  coeffs: number[];
  type: ConstraintType;
  rhs: number;
}

export interface LPProblem {
  objective: ObjectiveType;
  objectiveCoeffs: number[];
  constraints: Constraint[];
}

export interface TableauSnapshot {
  iteration: number;
  colLabels: string[];
  basisLabels: string[];
  matrix: number[][];
  rhs: number[];
  netEvalRow: number[];
  zValue: number;
  pivotRow: number | null;
  pivotCol: number | null;
}

export type SolutionKind = 'optimal-unica' | 'optima-multiple' | 'degenerada' | 'no-acotada' | 'infactible';

export interface SimplexResult {
  tableaus: TableauSnapshot[];
  status: 'optimal' | 'unbounded' | 'infeasible';
  solution: number[];
  objectiveValue: number;
  solutionKind: SolutionKind;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface GraphicalResult {
  feasibleVertices: Point2D[];
  optimalVertex: Point2D | null;
  optimalValue: number | null;
  lines: { a: number; b: number; c: number; label: string }[];
}
