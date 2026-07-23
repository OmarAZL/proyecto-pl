// src/lib/simplex.ts
import type { Constraint, ConstraintType, LPProblem, SimplexResult, TableauSnapshot } from './types';

const BIG_M = 1e6;
const EPS = 1e-9;
const MAX_ITER = 100;

interface ColumnMeta {
  label: string;
  kind: 'original' | 'slack' | 'surplus' | 'artificial';
}

export function solveSimplex(problem: LPProblem): SimplexResult {
  const isMin = problem.objective === 'min';
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

  const cVec: number[] = columns.map((col, j) => {
    if (col.kind === 'original') {
      const raw = problem.objectiveCoeffs[j];
      return isMin ? -raw : raw;
    }
    if (col.kind === 'artificial') return -BIG_M;
    return 0;
  });

  const tableaus: TableauSnapshot[] = [];
  let status: SimplexResult['status'] = 'optimal';

  const snapshot = (iteration: number, pivotRow: number | null, pivotCol: number | null): TableauSnapshot => {
    const zj = new Array(totalCols).fill(0);
    for (let j = 0; j < totalCols; j++) {
      let sum = 0;
      for (let i = 0; i < nRows; i++) sum += cVec[basis[i]] * matrix[i][j];
      zj[j] = sum;
    }
    const netEvalRow = columns.map((_, j) => cVec[j] - zj[j]);
    let zValue = 0;
    for (let i = 0; i < nRows; i++) zValue += cVec[basis[i]] * rhs[i];

    return {
      iteration,
      colLabels: columns.map((c) => c.label),
      basisLabels: basis.map((b) => columns[b].label),
      matrix: matrix.map((row) => [...row]),
      rhs: [...rhs],
      netEvalRow,
      zValue,
      pivotRow,
      pivotCol
    };
  };

  let iter = 0;
  while (iter < MAX_ITER) {
    const zj = new Array(totalCols).fill(0);
    for (let j = 0; j < totalCols; j++) {
      let sum = 0;
      for (let i = 0; i < nRows; i++) sum += cVec[basis[i]] * matrix[i][j];
      zj[j] = sum;
    }
    const netEval = columns.map((_, j) => cVec[j] - zj[j]);

    let enterCol = -1;
    let best = EPS;
    for (let j = 0; j < totalCols; j++) {
      if (netEval[j] > best) {
        best = netEval[j];
        enterCol = j;
      }
    }

    if (enterCol === -1) {
      tableaus.push(snapshot(iter, null, null));
      status = 'optimal';
      break;
    }

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

    if (leaveRow === -1) {
      tableaus.push(snapshot(iter, null, enterCol));
      status = 'unbounded';
      break;
    }

    tableaus.push(snapshot(iter, leaveRow, enterCol));

    const pivotVal = matrix[leaveRow][enterCol];
    for (let j = 0; j < totalCols; j++) matrix[leaveRow][j] /= pivotVal;
    rhs[leaveRow] /= pivotVal;

    for (let i = 0; i < nRows; i++) {
      if (i === leaveRow) continue;
      const factor = matrix[i][enterCol];
      if (Math.abs(factor) < EPS) continue;
      for (let j = 0; j < totalCols; j++) matrix[i][j] -= factor * matrix[leaveRow][j];
      rhs[i] -= factor * rhs[leaveRow];
    }

    basis[leaveRow] = enterCol;
    iter++;
  }

  if (iter >= MAX_ITER && tableaus.length === 0) {
    tableaus.push(snapshot(iter, null, null));
  }

  for (let i = 0; i < nRows; i++) {
    if (columns[basis[i]].kind === 'artificial' && rhs[i] > EPS) {
      status = 'infeasible';
    }
  }

  const solution = new Array(nOrig).fill(0);
  for (let i = 0; i < nRows; i++) {
    if (basis[i] < nOrig) solution[basis[i]] = rhs[i];
  }

  let objectiveValue = 0;
  for (let j = 0; j < nOrig; j++) objectiveValue += problem.objectiveCoeffs[j] * solution[j];

  return { tableaus, status, solution, objectiveValue };
}