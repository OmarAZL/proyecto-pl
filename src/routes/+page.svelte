<!-- src/routes/+page.svelte -->
<script lang="ts">
  import InputCard from '$lib/components/InputCard.svelte';
  import SimplexTable from '$lib/components/SimplexTable.svelte';
  import GraphicalCanvas from '$lib/components/GraphicalCanvas.svelte';
  import { solveSimplex } from '$lib/simplex';
  import { solveGraphical } from '$lib/graphical';
  import type { GraphicalResult, LPProblem, SimplexResult } from '$lib/types';

  let simplexResult = $state<SimplexResult | null>(null);
  let graphicalResult = $state<GraphicalResult | null>(null);
  let numVars = $state<number>(2);

  function handleSolve(e: CustomEvent<LPProblem>) {
    const problem = e.detail;
    numVars = problem.objectiveCoeffs.length;
    simplexResult = solveSimplex(problem);
    graphicalResult = numVars === 2 ? solveGraphical(problem) : null;
  }
</script>

<div class="flex flex-col gap-6">
  <InputCard on:solve={handleSolve} />

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <SimplexTable result={simplexResult} />
    <GraphicalCanvas result={graphicalResult} {numVars} />
  </div>
</div>