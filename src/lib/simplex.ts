// src/lib/simplex.ts
import type {
  Constraint,
  ConstraintType,
  LPProblem,
  SimplexResult,
  SolutionKind,
  TableauSnapshot
} from './types';

const BIG_M = 1e6;
const EPS = 1e-9;
const DEGEN_EPS = 1e-7;
const MAX_ITER = 100;

interface ColumnMeta {
  label: string;
  kind: 'original' | 'slack' | 'surplus' | 'artificial';
}

interface StandardForm {
  columns: ColumnMeta[];
  matrix: number[][];
  rhs: number[];
  basis: number[];
  nOrig: number;
  nRows: number;
  totalCols: number;
}

/**
 * Normaliza las restricciones (RHS >= 0) y construye la forma estándar del problema:
 * agrega variable de holgura para "<=", variable de exceso + artificial para ">=",
 * y variable artificial para "=".
 */
function buildStandardForm(problem: LPProblem): StandardForm {
  const nOrig = problem.objectiveCoeffs.length;

  const normalized: Constraint[] = problem.constraints.map((c) => {
    if (c.rhs < 0) {
      const flip: Record<ConstraintType, ConstraintType> = { '<=': '>=', '>=': '<=', '=': '=' };
      return { coeffs: c.coeffs.map((v) => -v), type: flip[c.type], rhs: -c.rhs };
    }
    return c;
  });

  const columns: ColumnMeta[] = [];
  for (let j = 0; j < nOrig; j++) columns.push({ label: `x${j + 1}`, kind: 'original' });

  const rowExtraCols: number[][] = normalized.map(() => []);

  normalized.forEach((c, i) => {
    if (c.type === '<=') {
      columns.push({ label: `s${i + 1}`, kind: 'slack' });
      rowExtraCols[i].push(columns.length - 1);
    } else if (c.type === '>=') {
      columns.push({ label: `e${i + 1}`, kind: 'surplus' });
      rowExtraCols[i].push(columns.length - 1);
      columns.push({ label: `a${i + 1}`, kind: 'artificial' });
      rowExtraCols[i].push(columns.length - 1);
    } else {
      columns.push({ label: `a${i + 1}`, kind: 'artificial' });
      rowExtraCols[i].push(columns.length - 1);
    }
  });

  const totalCols = columns.length;
  const nRows = normalized.length;

  const matrix: number[][] = Array.from({ length: nRows }, () => new Array(totalCols).fill(0));
  const rhs: number[] = new Array(nRows).fill(0);
  const basis: number[] = new Array(nRows).fill(-1);

  normalized.forEach((c, i) => {
    for (let j = 0; j < nOrig; j++) matrix[i][j] = c.coeffs[j] ?? 0;
    rhs[i] = c.rhs;

    if (c.type === '<=') {
      const slackCol = rowExtraCols[i][0];
      matrix[i][slackCol] = 1;
      basis[i] = slackCol;
    } else if (c.type === '>=') {
      const surplusCol = rowExtraCols[i][0];
      const artCol = rowExtraCols[i][1];
      matrix[i][surplusCol] = -1;
      matrix[i][artCol] = 1;
      basis[i] = artCol;
    } else {
      const artCol = rowExtraCols[i][0];
      matrix[i][artCol] = 1;
      basis[i] = artCol;
    }
  });

  return { columns, matrix, rhs, basis, nOrig, nRows, totalCols };
}

function computeNetEval(
  cVec: number[],
  matrix: number[][],
  rhs: number[],
  basis: number[],
  nRows: number,
  totalCols: number
): { netEvalRow: number[]; zValue: number } {
  const zj = new Array(totalCols).fill(0);
  for (let j = 0; j < totalCols; j++) {
    let sum = 0;
    for (let i = 0; i < nRows; i++) sum += cVec[basis[i]] * matrix[i][j];
    zj[j] = sum;
  }
  const netEvalRow = cVec.map((c, j) => c - zj[j]);
  let zValue = 0;
  for (let i = 0; i < nRows; i++) zValue += cVec[basis[i]] * rhs[i];
  return { netEvalRow, zValue };
}

function buildSnapshot(
  iteration: number,
  phase: 1 | 2 | undefined,
  columns: ColumnMeta[],
  basis: number[],
  matrix: number[][],
  rhs: number[],
  netEvalRow: number[],
  zValue: number,
  pivotRow: number | null,
  pivotCol: number | null
): TableauSnapshot {
  return {
    iteration,
    phase,
    colLabels: columns.map((c) => c.label),
    basisLabels: basis.map((b) => columns[b].label),
    matrix: matrix.map((row) => [...row]),
    rhs: [...rhs],
    netEvalRow: [...netEvalRow],
    zValue,
    pivotRow,
    pivotCol
  };
}

/** Selecciona la columna que entra a la base (regla del coeficiente positivo más grande). */
function chooseEnteringColumn(netEvalRow: number[], totalCols: number, excluded?: Set<number>): number {
  let enterCol = -1;
  let best = EPS;
  for (let j = 0; j < totalCols; j++) {
    if (excluded?.has(j)) continue;
    if (netEvalRow[j] > best) {
      best = netEvalRow[j];
      enterCol = j;
    }
  }
  return enterCol;
}

/** Selecciona la fila que sale de la base (regla de la razón mínima). */
function chooseLeavingRow(matrix: number[][], rhs: number[], enterCol: number, nRows: number): number {
  let leaveRow = -1;
  let bestRatio = Infinity;
  for (let i = 0; i < nRows; i++) {
    if (matrix[i][enterCol] > EPS) {
      const ratio = rhs[i] / matrix[i][enterCol];
      if (ratio < bestRatio - EPS) {
        bestRatio = ratio;
        leaveRow = i;
      }
    }
  }
  return leaveRow;
}

/** Elimina Gauss-Jordan sobre la celda pivote (leaveRow, enterCol), mutando matrix/rhs/basis. */
function pivotOn(
  matrix: number[][],
  rhs: number[],
  basis: number[],
  leaveRow: number,
  enterCol: number,
  totalCols: number
) {
  const pivotVal = matrix[leaveRow][enterCol];
  for (let j = 0; j < totalCols; j++) matrix[leaveRow][j] /= pivotVal;
  rhs[leaveRow] /= pivotVal;

  for (let i = 0; i < matrix.length; i++) {
    if (i === leaveRow) continue;
    const factor = matrix[i][enterCol];
    if (Math.abs(factor) < EPS) continue;
    for (let j = 0; j < totalCols; j++) matrix[i][j] -= factor * matrix[leaveRow][j];
    rhs[i] -= factor * rhs[leaveRow];
  }

  basis[leaveRow] = enterCol;
}

/**
 * Ejecuta las iteraciones simplex (maximización) hasta encontrar el óptimo o detectar
 * solución no acotada. Guarda un snapshot del tablero ANTES de cada pivoteo (con la celda
 * pivote marcada) y un snapshot final al llegar al óptimo.
 */
function runSimplex(
  cVec: number[],
  matrix: number[][],
  rhs: number[],
  basis: number[],
  columns: ColumnMeta[],
  nRows: number,
  totalCols: number,
  phase: 1 | 2 | undefined,
  tableaus: TableauSnapshot[],
  excludedFromEntering?: Set<number>
): { status: 'optimal' | 'unbounded'; finalNetEval: number[]; finalZValue: number } {
  let iter = 0;
  let finalNetEval: number[] = new Array(totalCols).fill(0);
  let finalZValue = 0;

  while (iter < MAX_ITER) {
    const { netEvalRow, zValue } = computeNetEval(cVec, matrix, rhs, basis, nRows, totalCols);
    finalNetEval = netEvalRow;
    finalZValue = zValue;

    const enterCol = chooseEnteringColumn(netEvalRow, totalCols, excludedFromEntering);

    if (enterCol === -1) {
      tableaus.push(buildSnapshot(iter, phase, columns, basis, matrix, rhs, netEvalRow, zValue, null, null));
      return { status: 'optimal', finalNetEval, finalZValue };
    }

    const leaveRow = chooseLeavingRow(matrix, rhs, enterCol, nRows);

    if (leaveRow === -1) {
      tableaus.push(buildSnapshot(iter, phase, columns, basis, matrix, rhs, netEvalRow, zValue, null, enterCol));
      return { status: 'unbounded', finalNetEval, finalZValue };
    }

    tableaus.push(buildSnapshot(iter, phase, columns, basis, matrix, rhs, netEvalRow, zValue, leaveRow, enterCol));
    pivotOn(matrix, rhs, basis, leaveRow, enterCol, totalCols);
    iter++;
  }

  return { status: 'optimal', finalNetEval, finalZValue };
}

function extractSolution(nOrig: number, nRows: number, basis: number[], rhs: number[]): number[] {
  const solution = new Array(nOrig).fill(0);
  for (let i = 0; i < nRows; i++) {
    if (basis[i] < nOrig) solution[basis[i]] = rhs[i];
  }
  return solution;
}

function classifySolution(
  columns: ColumnMeta[],
  basis: number[],
  rhs: number[],
  finalNetEval: number[]
): SolutionKind {
  const isDegenerate = basis.some((b, i) => rhs[i] < DEGEN_EPS && columns[b].kind !== 'artificial');
  const hasAltOptimal = columns.some((col, j) => {
    const isBasic = basis.includes(j);
    return !isBasic && col.kind !== 'artificial' && Math.abs(finalNetEval[j]) < DEGEN_EPS;
  });

  if (isDegenerate) return 'degenerada';
  if (hasAltOptimal) return 'optima-multiple';
  return 'optimal-unica';
}

/** Resuelve el problema con el método de la Gran M (penalización de variables artificiales). */
export function solveSimplex(problem: LPProblem): SimplexResult {
  const isMin = problem.objective === 'min';
  const { columns, matrix, rhs, basis, nOrig, nRows, totalCols } = buildStandardForm(problem);

  const cVec: number[] = columns.map((col, j) => {
    if (col.kind === 'original') {
      const raw = problem.objectiveCoeffs[j];
      return isMin ? -raw : raw;
    }
    if (col.kind === 'artificial') return -BIG_M;
    return 0;
  });

  const tableaus: TableauSnapshot[] = [];
  const { status, finalNetEval } = runSimplex(cVec, matrix, rhs, basis, columns, nRows, totalCols, undefined, tableaus);

  let finalStatus: SimplexResult['status'] = status;
  for (let i = 0; i < nRows; i++) {
    if (columns[basis[i]].kind === 'artificial' && rhs[i] > EPS) finalStatus = 'infeasible';
  }

  const solution = extractSolution(nOrig, nRows, basis, rhs);
  let objectiveValue = 0;
  for (let j = 0; j < nOrig; j++) objectiveValue += problem.objectiveCoeffs[j] * solution[j];

  let solutionKind: SolutionKind;
  if (finalStatus === 'infeasible') solutionKind = 'infactible';
  else if (finalStatus === 'unbounded') solutionKind = 'no-acotada';
  else solutionKind = classifySolution(columns, basis, rhs, finalNetEval);

  return { method: 'gran-m', tableaus, status: finalStatus, solution, objectiveValue, solutionKind };
}

/**
 * Resuelve el problema con el método de las Dos Fases:
 *
 * Fase I: minimiza la suma de las variables artificiales (W). Si W no llega a 0,
 * el problema original es infactible.
 *
 * Fase II: partiendo de la base factible obtenida en la Fase I (sin columnas artificiales),
 * optimiza la función objetivo original.
 */
export function solveTwoPhase(problem: LPProblem): SimplexResult {
  const isMin = problem.objective === 'min';
  const { columns, matrix, rhs, basis, nOrig, nRows, totalCols } = buildStandardForm(problem);

  const tableaus: TableauSnapshot[] = [];
  const hasArtificial = columns.some((c) => c.kind === 'artificial');

  if (hasArtificial) {
    // --- Fase I: minimizar W = suma de variables artificiales ---
    const cVecPhase1 = columns.map((col) => (col.kind === 'artificial' ? -1 : 0));

    const artificialCols = new Set<number>();
    columns.forEach((c, j) => {
      if (c.kind === 'artificial') artificialCols.add(j);
    });

    // Las artificiales nunca deben volver a entrar a la base: solo sirven para salir.
    const { finalZValue: w1 } = runSimplex(
      cVecPhase1,
      matrix,
      rhs,
      basis,
      columns,
      nRows,
      totalCols,
      1,
      tableaus,
      artificialCols
    );

    const sumArtificial = -w1;

    if (sumArtificial > DEGEN_EPS) {
      // La Fase I no logra anular las variables artificiales -> infactible.
      return {
        method: 'dos-fases',
        tableaus,
        status: 'infeasible',
        solution: new Array(nOrig).fill(0),
        objectiveValue: 0,
        solutionKind: 'infactible'
      };
    }

    // Caso degenerado: alguna artificial queda en la base con valor 0. Se intenta sacarla
    // pivoteando sobre cualquier columna no artificial con coeficiente distinto de 0 en su fila.
    for (let i = 0; i < nRows; i++) {
      if (columns[basis[i]].kind === 'artificial') {
        for (let j = 0; j < totalCols; j++) {
          if (columns[j].kind === 'artificial') continue;
          if (Math.abs(matrix[i][j]) > EPS) {
            pivotOn(matrix, rhs, basis, i, j, totalCols);
            break;
          }
        }
      }
    }
  }

  // --- Preparar Fase II: quitar columnas artificiales (y filas redundantes, si quedó alguna) ---
  const keepColIdx: number[] = [];
  columns.forEach((c, j) => {
    if (c.kind !== 'artificial') keepColIdx.push(j);
  });

  const keepRowIdx: number[] = [];
  for (let i = 0; i < nRows; i++) {
    // Si tras el intento anterior una artificial sigue en la base, la restricción es redundante.
    if (columns[basis[i]].kind === 'artificial') continue;
    keepRowIdx.push(i);
  }

  const colIndexMap = new Map<number, number>();
  keepColIdx.forEach((oldIdx, newIdx) => colIndexMap.set(oldIdx, newIdx));

  const columns2: ColumnMeta[] = keepColIdx.map((j) => columns[j]);
  const matrix2: number[][] = keepRowIdx.map((i) => keepColIdx.map((j) => matrix[i][j]));
  const rhs2: number[] = keepRowIdx.map((i) => rhs[i]);
  const basis2: number[] = keepRowIdx.map((i) => colIndexMap.get(basis[i])!);
  const nRows2 = keepRowIdx.length;
  const totalCols2 = columns2.length;

  // Las columnas originales conservan su posición (0..nOrig-1) porque solo se quitaron artificiales.
  const cVec2: number[] = columns2.map((col, idx) => {
    if (col.kind === 'original') {
      const raw = problem.objectiveCoeffs[idx];
      return isMin ? -raw : raw;
    }
    return 0;
  });

  // --- Fase II: optimizar la función objetivo original ---
  const { status, finalNetEval: finalNetEval2 } = runSimplex(
    cVec2,
    matrix2,
    rhs2,
    basis2,
    columns2,
    nRows2,
    totalCols2,
    2,
    tableaus
  );

  const solution = extractSolution(nOrig, nRows2, basis2, rhs2);
  let objectiveValue = 0;
  for (let j = 0; j < nOrig; j++) objectiveValue += problem.objectiveCoeffs[j] * solution[j];

  const solutionKind: SolutionKind =
    status === 'unbounded' ? 'no-acotada' : classifySolution(columns2, basis2, rhs2, finalNetEval2);

  return {
    method: 'dos-fases',
    tableaus,
    status,
    solution,
    objectiveValue,
    solutionKind,
    phase1Skipped: !hasArtificial
  };
}
