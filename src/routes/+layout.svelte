<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  let { children } = $props();
</script>

<svelte:head>
  <title>El Patrón del Vértice</title>
</svelte:head>

<div class="flex h-screen w-screen bg-gray-100 overflow-hidden">
  <aside class="w-20 md:w-56 bg-blue-700 text-white flex flex-col py-6 px-2 md:px-4 gap-2 shrink-0">
    <div class="flex items-center gap-2 px-2 mb-8">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 3l8 14H4L12 3z" />
        <circle cx="12" cy="3" r="1.8" fill="currentColor" stroke="none" />
      </svg>
      <span class="hidden md:inline font-bold text-base leading-tight">El Patrón<br/>del Vértice</span>
    </div>

    <a
      href="/"
      class="flex items-center gap-3 px-3 py-2 rounded-lg transition {$page.url.pathname === '/' ? 'bg-blue-800/60' : 'hover:bg-blue-800/40'}"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
      <span class="hidden md:inline text-sm font-medium">Calculadora</span>
    </a>

    <a
      href="/historial"
      class="flex items-center gap-3 px-3 py-2 rounded-lg transition {$page.url.pathname === '/historial' ? 'bg-blue-800/60' : 'hover:bg-blue-800/40'}"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
      <span class="hidden md:inline text-sm font-medium">Historial</span>
    </a>
  </aside>

  <main class="flex-1 overflow-y-auto p-4 md:p-8">
    {@render children()}
  </main>
</div>