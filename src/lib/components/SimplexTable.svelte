<!-- src/lib/components/SimplexTable.svelte -->
<script lang="ts">
  import type { SimplexResult, SolutionKind } from '$lib/types';

  let { result }: { result: SimplexResult | null } = $props();

  function orderedIndices(colLabels: string[]): number[] {
    const xCols: { idx: number; n: number }[] = [];
    const otherCols: number[] = [];
    colLabels.forEach((label, idx) => {
      if (label.startsWith('x')) xCols.push({ idx, n: parseInt(label.slice(1), 10) });
      else otherCols.push(idx);
    });
    xCols.sort((a, b) => a.n - b.n);
    return [...xCols.map((c) => c.idx), ...otherCols];
  }

  function splitLabel(label: string): { letter: string; sub: string } {
    const match = label.match(/^([a-zA-Z]+)(\d+)$/);
    if (match) return { letter: match[1], sub: match[2] };
    return { letter: label, sub: '' };
  }

  const kindLabels: Record<SolutionKind, string> = {
    'optimal-unica': 'Óptima única',
    'optima-multiple': 'Óptima múltiple (soluciones alternas)',
    degenerada: 'Degenerada',
    'no-acotada': 'No acotada',
    infactible: 'Infactible'
  };

  const kindStyles: Record<SolutionKind, string> = {
    'optimal-unica': 'bg-green-50 text-green-800',
    'optima-multiple': 'bg-indigo-50 text-indigo-800',
    degenerada: 'bg-amber-50 text-amber-800',
    'no-acotada': 'bg-red-50 text-red-800',
    infactible: 'bg-red-50 text-red-800'
  };

  function phaseHeading(phase: 1 | 2): string {
    return phase === 1
      ? 'Fase I — minimizar W (suma de variables artificiales)'
      : 'Fase II — optimizar la función objetivo original';
  }

  function isNewPhaseHeader(idx: number): boolean {
    if (!result) return false;
    const t = result.tableaus[idx];
    if (t.phase === undefined) return false;
    const prev = idx > 0 ? result.tableaus[idx - 1] : null;
    return !prev || prev.phase !== t.phase;
  }
</script>

<div class="bg-white rounded-xl shadow-sm p-6 h-full overflow-auto">
  <h2 class="text-lg font-semibold text-gray-800 mb-4">
    {result?.method === 'dos-fases' ? 'Método de las Dos Fases' : 'Método Simplex (Gran M)'}
  </h2>

  {#if !result}
    <p class="text-sm text-gray-400">Ingresa los datos y presiona "Calcular".</p>
  {:else}
    {#if result.method === 'dos-fases' && result.phase1Skipped}
      <p class="text-xs text-gray-500 mb-3">
        No se necesitaron variables artificiales, así que la Fase I no aplica y se resuelve
        directamente en la Fase II.
      </p>
    {/if}

    {#if result.status === 'infeasible'}
      <p class="text-sm text-red-600 font-medium mb-3">
        El problema no tiene solución factible.
        {#if result.method === 'dos-fases'}
          La Fase I no logra anular las variables artificiales (W &gt; 0).
        {/if}
      </p>
    {:else if result.status === 'unbounded'}
      <p class="text-sm text-amber-600 font-medium mb-3">El problema es no acotado.</p>
    {/if}

    {#each result.tableaus as t, tIdx}
      {@const order = orderedIndices(t.colLabels)}
      {#if isNewPhaseHeader(tIdx)}
        <p class="text-sm font-semibold text-blue-800 bg-blue-50 rounded-lg px-3 py-1.5 mb-3 mt-2">
          {phaseHeading(t.phase as 1 | 2)}
        </p>
      {/if}
      <div class="mb-6">
        <p class="text-xs font-semibold text-gray-500 mb-2">Iteración {t.iteration}</p>
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs border border-gray-200">
            <thead>
              <tr class="bg-gray-50">
                <th class="border border-gray-200 px-2 py-1">VB</th>
                <th class="border border-gray-200 px-2 py-1">Z</th>
                {#each order as colIdx}
                  {@const parts = splitLabel(t.colLabels[colIdx])}
                  <th class="border border-gray-200 px-2 py-1">{parts.letter}{#if parts.sub}<sub>{parts.sub}</sub>{/if}</th>
                {/each}
                <th class="border border-gray-200 px-2 py-1">Sol</th>
              </tr>
            </thead>
            <tbody>
              <tr class="bg-gray-50 font-medium">
                <td class="border border-gray-200 px-2 py-1">Z</td>
                <td class="border border-gray-200 px-2 py-1 text-center">1</td>
                {#each order as colIdx}
                  <td class="border border-gray-200 px-2 py-1 text-center">{(-t.netEvalRow[colIdx]).toFixed(2)}</td>
                {/each}
                <td class="border border-gray-200 px-2 py-1 text-center">{t.zValue.toFixed(2)}</td>
              </tr>
              {#each t.matrix as row, i}
                {@const bParts = splitLabel(t.basisLabels[i])}
                <tr class={t.pivotRow === i ? 'bg-blue-50' : ''}>
                  <td class="border border-gray-200 px-2 py-1 font-medium">{bParts.letter}{#if bParts.sub}<sub>{bParts.sub}</sub>{/if}</td>
                  <td class="border border-gray-200 px-2 py-1 text-center">0</td>
                  {#each order as colIdx}
                    <td class="border border-gray-200 px-2 py-1 text-center {t.pivotCol === colIdx ? 'font-semibold text-blue-700' : ''}">
                      {row[colIdx].toFixed(2)}
                    </td>
                  {/each}
                  <td class="border border-gray-200 px-2 py-1 text-center">{t.rhs[i].toFixed(2)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/each}

    <div class="mt-4 p-3 rounded-lg text-sm font-medium {kindStyles[result.solutionKind]}">
      Tipo de solución: {kindLabels[result.solutionKind]}
    </div>

    {#if result.status === 'optimal'}
      <div class="mt-3 p-3 rounded-lg bg-green-50 text-green-800 text-sm">
        <p class="font-semibold mb-1">Solución óptima</p>
        {#each result.solution as val, i}
          <span class="mr-3">x<sub>{i + 1}</sub> = {val.toFixed(3)}</span>
        {/each}
        <p class="mt-1">Z = {result.objectiveValue.toFixed(3)}</p>
      </div>
    {/if}
  {/if}
</div>
