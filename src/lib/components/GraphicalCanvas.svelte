<!-- src/lib/components/GraphicalCanvas.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { GraphicalResult } from '$lib/types';

  let { result = null, numVars = 2 }: { 
    result?: GraphicalResult | null; 
    numVars?: number } = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);
  const PADDING = 40;
  const SIZE = 420;

  function draw() {
    if (!canvas || !result) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, SIZE, SIZE);

    let maxX = 10;
    let maxY = 10;
    result.feasibleVertices.forEach((p) => {
      maxX = Math.max(maxX, p.x * 1.3);
      maxY = Math.max(maxY, p.y * 1.3);
    });

    const scaleX = (SIZE - PADDING * 2) / maxX;
    const scaleY = (SIZE - PADDING * 2) / maxY;
    const toScreen = (x: number, y: number) => ({ sx: PADDING + x * scaleX, sy: SIZE - PADDING - y * scaleY });

    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING);
    ctx.lineTo(PADDING, SIZE - PADDING);
    ctx.lineTo(SIZE - PADDING, SIZE - PADDING);
    ctx.stroke();

    if (result.feasibleVertices.length >= 3) {
      ctx.beginPath();
      result.feasibleVertices.forEach((p, i) => {
        const { sx, sy } = toScreen(p.x, p.y);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(37, 99, 235, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.6)';
      ctx.stroke();
    }

    result.lines.forEach((line, idx) => {
      ctx.strokeStyle = ['#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'][idx % 5];
      ctx.lineWidth = 2;
      ctx.beginPath();

      const pts: { x: number; y: number }[] = [];
      if (Math.abs(line.b) > 1e-9) {
        pts.push({ x: 0, y: line.c / line.b });
        pts.push({ x: maxX, y: (line.c - line.a * maxX) / line.b });
      } else if (Math.abs(line.a) > 1e-9) {
        pts.push({ x: line.c / line.a, y: 0 });
        pts.push({ x: line.c / line.a, y: maxY });
      }

      if (pts.length === 2) {
        const p1 = toScreen(pts[0].x, pts[0].y);
        const p2 = toScreen(pts[1].x, pts[1].y);
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }
    });

    result.feasibleVertices.forEach((p) => {
      const { sx, sy } = toScreen(p.x, p.y);
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    if (result.optimalVertex) {
      const { sx, sy } = toScreen(result.optimalVertex.x, result.optimalVertex.y);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.font = '11px sans-serif';
      ctx.fillText(`(${result.optimalVertex.x.toFixed(2)}, ${result.optimalVertex.y.toFixed(2)})`, sx + 8, sy - 8);
    }
  }

  onMount(draw);
  $effect( ()=>{
    draw();
  })
</script>

<div class="bg-white rounded-xl shadow-sm p-6 h-full flex flex-col">
  <h2 class="text-lg font-semibold text-gray-800 mb-4">Método Gráfico</h2>

  {#if numVars !== 2}
    <p class="text-sm text-gray-400">El método gráfico solo aplica a problemas con 2 variables.</p>
  {:else if !result}
    <p class="text-sm text-gray-400">Ingresa los datos y presiona "Calcular".</p>
  {:else}
    <canvas bind:this={canvas} width={SIZE} height={SIZE} class="mx-auto"></canvas>

    {#if result.optimalVertex}
      <div class="mt-3 text-sm text-gray-700">
        <p>Vértice óptimo: ({result.optimalVertex.x.toFixed(3)}, {result.optimalVertex.y.toFixed(3)})</p>
        <p>Valor óptimo: {result.optimalValue?.toFixed(3)}</p>
      </div>
    {/if}
  {/if}
</div>