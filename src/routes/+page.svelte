<!-- src/routes/+page.svelte -->
<script lang="ts">
  import InputCard from '$lib/components/InputCard.svelte';
  import SimplexTable from '$lib/components/SimplexTable.svelte';
  import GraphicalCanvas from '$lib/components/GraphicalCanvas.svelte';
  import { solveSimplex, solveTwoPhase } from '$lib/simplex';
  import { solveGraphical } from '$lib/graphical';
  import { history } from '$lib/stores/history';
  import type { GraphicalResult, LPProblem, SimplexMethod, SimplexResult } from '$lib/types';

  let simplexResult = $state<SimplexResult | null>(null);
  let graphicalResult = $state<GraphicalResult | null>(null);
  let numVars = $state(2);

  function handleSolve(problem: LPProblem, method: SimplexMethod) {
    numVars = problem.objectiveCoeffs.length;
    simplexResult = method === 'dos-fases' ? solveTwoPhase(problem) : solveSimplex(problem);
    graphicalResult = numVars === 2 ? solveGraphical(problem) : null;

    history.add({
      problem,
      simplexResult,
      graphicalResult
    });
  }

  function handleClear() {
    simplexResult = null;
    graphicalResult = null;
    numVars = 2;
  }
</script>

<div class="flex flex-col gap-6">
  <InputCard onsolve={handleSolve} onclear={handleClear} />

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <SimplexTable result={simplexResult} />
    <GraphicalCanvas result={graphicalResult} {numVars} />
  </div>
</div>