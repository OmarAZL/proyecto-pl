<!-- src/lib/components/InputCard.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { ConstraintType, LPProblem, ObjectiveType } from '$lib/types';
  import { pendingLoad } from '$lib/stores/pendingLoad';

  let { onsolve, onclear }: { onsolve: (p: LPProblem) => void; onclear: () => void } = $props();

  const defaultObjectiveCoeffs = [3, 5];
  const defaultConstraints: { coeffs: number[]; type: ConstraintType; rhs: number }[] = [
    { coeffs: [1, 0], type: '<=', rhs: 4 },
    { coeffs: [0, 2], type: '<=', rhs: 12 },
    { coeffs: [3, 2], type: '<=', rhs: 18 }
  ];

  let objective = $state<ObjectiveType>('max');
  let objectiveCoeffs = $state<number[]>([...defaultObjectiveCoeffs]);
  let constraints = $state(defaultConstraints.map((c) => ({ ...c, coeffs: [...c.coeffs] })));

  onMount(() => {
    const unsub = pendingLoad.subscribe((problem) => {
      if (!problem) return;
      objective = problem.objective;
      objectiveCoeffs = [...problem.objectiveCoeffs];
      constraints = problem.constraints.map((c) => ({ ...c, coeffs: [...c.coeffs] }));
      pendingLoad.set(null);
      onsolve(problem);
    });
    return unsub;
  });

  function addVariable() {
    objectiveCoeffs = [...objectiveCoeffs, 0];
    constraints = constraints.map((c) => ({ ...c, coeffs: [...c.coeffs, 0] }));
  }

  function removeVariable() {
    if (objectiveCoeffs.length <= 2) return;
    objectiveCoeffs = objectiveCoeffs.slice(0, -1);
    constraints = constraints.map((c) => ({ ...c, coeffs: c.coeffs.slice(0, -1) }));
  }

  function addConstraint() {
    constraints = [...constraints, { coeffs: new Array(objectiveCoeffs.length).fill(0), type: '<=' as ConstraintType, rhs: 0 }];
  }

  function removeConstraint(idx: number) {
    constraints = constraints.filter((_, i) => i !== idx);
  }

  function solve() {
    onsolve({
      objective,
      objectiveCoeffs: [...objectiveCoeffs],
      constraints: constraints.map((c) => ({ ...c, coeffs: [...c.coeffs] }))
    });
  }

  function clearAll() {
    objective = 'max';
    objectiveCoeffs = [0, 0];
    constraints = [{ coeffs: [0, 0], type: '<=', rhs: 0 }];
    onclear();
  }
</script>

<div class="bg-white rounded-xl shadow-sm p-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-gray-800">Función Objetivo</h2>
    <button onclick={clearAll} class="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
      Limpiar todo
    </button>
  </div>

  <div class="flex flex-wrap items-center gap-3 mb-4">
    <select bind:value={objective} class="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium">
      <option value="max">Maximizar</option>
      <option value="min">Minimizar</option>
    </select>
    <span class="text-gray-500 text-sm">Z =</span>

    {#each objectiveCoeffs as _, i}
      <div class="flex items-center gap-1">
        <input type="number" bind:value={objectiveCoeffs[i]} class="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
        <span class="text-sm text-gray-500">x<sub>{i + 1}</sub>{i < objectiveCoeffs.length - 1 ? ' +' : ''}</span>
      </div>
    {/each}

    <button onclick={addVariable} class="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100">+ variable</button>
    <button onclick={removeVariable} class="text-xs px-2 py-1 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100">- variable</button>
  </div>

  <h3 class="text-sm font-semibold text-gray-700 mb-3">Restricciones</h3>

  <div class="flex flex-col gap-2">
    {#each constraints as constraint, ci}
      <div class="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
        {#each constraint.coeffs as _, vi}
          <div class="flex items-center gap-1">
            <input type="number" bind:value={constraint.coeffs[vi]} class="w-14 border border-gray-300 rounded-md px-2 py-1 text-sm" />
            <span class="text-xs text-gray-500">x<sub>{vi + 1}</sub>{vi < constraint.coeffs.length - 1 ? ' +' : ''}</span>
          </div>
        {/each}

        <select bind:value={constraint.type} class="border border-gray-300 rounded-md px-2 py-1 text-sm">
          <option value="<=">&le;</option>
          <option value=">=">&ge;</option>
          <option value="=">=</option>
        </select>

        <input type="number" bind:value={constraint.rhs} class="w-16 border border-gray-300 rounded-md px-2 py-1 text-sm" />

        <button onclick={() => removeConstraint(ci)} class="ml-auto text-xs text-red-500 hover:text-red-700 px-2">✕</button>
      </div>
    {/each}
  </div>

  <div class="flex gap-3 mt-4">
    <button onclick={addConstraint} class="text-sm px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">+ Restricción</button>
    <button onclick={solve} class="text-sm px-4 py-2 rounded-lg bg-blue-700 text-white font-medium hover:bg-blue-800 ml-auto">Calcular</button>
  </div>
</div>