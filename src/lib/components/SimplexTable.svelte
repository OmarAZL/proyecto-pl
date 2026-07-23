<!-- src/lib/components/SimplexTable.svelte -->
<script lang="ts">
  import type { SimplexResult } from '$lib/types';
  let { result = null }: { result?: SimplexResult | null } = $props();
</script>

<div class="bg-white rounded-xl shadow-sm p-6 h-full overflow-auto">
  <h2 class="text-lg font-semibold text-gray-800 mb-4">Método Simplex</h2>

  {#if !result}
    <p class="text-sm text-gray-400">Ingresa los datos y presiona "Calcular".</p>
  {:else}
    {#if result.status === 'infeasible'}
      <p class="text-sm text-red-600 font-medium mb-3">El problema no tiene solución factible.</p>
    {:else if result.status === 'unbounded'}
      <p class="text-sm text-amber-600 font-medium mb-3">El problema es no acotado.</p>
    {/if}

    {#each result.tableaus as t}
      <div class="mb-6">
        <p class="text-xs font-semibold text-gray-500 mb-2">Iteración {t.iteration}</p>
        <div class="overflow-x-auto">
          <table class="min-w-full text-xs border border-gray-200">
            <thead>
              <tr class="bg-gray-50">
                <th class="border border-gray-200 px-2 py-1">Base</th>
                {#each t.colLabels as label}
                  <th class="border border-gray-200 px-2 py-1">{label}</th>
                {/each}
                <th class="border border-gray-200 px-2 py-1">RHS</th>
              </tr>
            </thead>
            <tbody>
              {#each t.matrix as row, i}
                <tr class={t.pivotRow === i ? 'bg-blue-50' : ''}>
                  <td class="border border-gray-200 px-2 py-1 font-medium">{t.basisLabels[i]}</td>
                  {#each row as val, j}
                    <td class="border border-gray-200 px-2 py-1 text-center {t.pivotCol === j ? 'font-semibold text-blue-700' : ''}">{val.toFixed(2)}</td>
                  {/each}
                  <td class="border border-gray-200 px-2 py-1 text-center">{t.rhs[i].toFixed(2)}</td>
                </tr>
              {/each}
              <tr class="bg-gray-50 font-medium">
                <td class="border border-gray-200 px-2 py-1">Cj-Zj</td>
                {#each t.netEvalRow as val}
                  <td class="border border-gray-200 px-2 py-1 text-center">{val.toFixed(2)}</td>
                {/each}
                <td class="border border-gray-200 px-2 py-1 text-center">{t.zValue.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    {/each}

    {#if result.status === 'optimal'}
      <div class="mt-4 p-3 rounded-lg bg-green-50 text-green-800 text-sm">
        <p class="font-semibold mb-1">Solución óptima</p>
        {#each result.solution as val, i}
          <span class="mr-3">x{i + 1} = {val.toFixed(3)}</span>
        {/each}
        <p class="mt-1">Z = {result.objectiveValue.toFixed(3)}</p>
      </div>
    {/if}
  {/if}
</div>