// src/lib/types.ts
export type ConstraintType = '<=' | '>=' | '=';
export type ObjectiveType = 'max' | 'min';

/** Método usado para resolver el modelo simplex. */
export type SimplexMethod = 'gran-m' | 'dos-fases';

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
  /** Presente solo en el método de dos fases: indica a qué fase pertenece este tablero. */
  phase?: 1 | 2;
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
  method: SimplexMethod;
  tableaus: TableauSnapshot[];
  status: 'optimal' | 'unbounded' | 'infeasible';
  solution: number[];
  objectiveValue: number;
  solutionKind: SolutionKind;
  /** Solo aplica al método de dos fases: true si no hubo variables artificiales y la Fase I se omitió. */
  phase1Skipped?: boolean;
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
