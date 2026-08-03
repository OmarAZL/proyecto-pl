<!-- src/routes/historial/+page.svelte -->
<script lang="ts">
  import { history } from '$lib/stores/history';
  import { goto } from '$app/navigation';
  import { pendingLoad } from '$lib/stores/pendingLoad';
  import type { SolutionKind } from '$lib/types';

  const kindLabels: Record<SolutionKind, string> = {
    'optimal-unica': 'Óptima única',
    'optima-multiple': 'Óptima múltiple',
    degenerada: 'Degenerada',
    'no-acotada': 'No acotada',
    infactible: 'Infactible'
  };

  function loadEntry(id: string) {
    const entry = $history.find((e) => e.id === id);
    if (!entry) return;
    pendingLoad.set(entry.problem);
    goto('/');
  }

  function removeEntry(id: string) {
    history.remove(id);
  }

  function clearAll() {
    if (confirm('¿Eliminar todo el historial?')) history.clear();
  }
</script>

<svelte:head>
  <title>Historial · El Patrón del Vértice</title>
</svelte:head>

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-semibold text-gray-800">Historial</h1>
    {#if $history.length > 0}
      <button onclick={clearAll} class="text-sm px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
        Limpiar historial
      </button>
    {/if}
  </div>

  {#if $history.length === 0}
    <div class="bg-white rounded-xl shadow-sm p-6 text-sm text-gray-400">
      No hay problemas resueltos aún.
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each $history as entry}
        <div class="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleString()}</span>
            <div class="flex items-center gap-2">
              {#if entry.count > 1}
                <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                  ×{entry.count}
                </span>
              {/if}
              <button onclick={() => removeEntry(entry.id)} class="text-xs text-red-500 hover:text-red-700">✕</button>
            </div>
          </div>
          <p class="text-sm text-gray-700">
            {entry.problem.objective === 'max' ? 'Maximizar' : 'Minimizar'} Z =
            {#each entry.problem.objectiveCoeffs as c, i}
              {c}x<sub>{i + 1}</sub>{i < entry.problem.objectiveCoeffs.length - 1 ? ' + ' : ''}
            {/each}
          </p>
          <p class="text-xs text-gray-500">{entry.problem.constraints.length} restricciones</p>
          <p class="text-xs font-medium text-gray-500">{kindLabels[entry.simplexResult.solutionKind]}</p>
          <p class="text-sm font-medium {entry.simplexResult.status === 'optimal' ? 'text-green-600' : 'text-amber-600'}">
            {entry.simplexResult.status === 'optimal'
              ? `Z = ${entry.simplexResult.objectiveValue.toFixed(3)}`
              : entry.simplexResult.status}
          </p>
          <button
            onclick={() => loadEntry(entry.id)}
            class="mt-1 text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 self-start"
          >
            Cargar
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
