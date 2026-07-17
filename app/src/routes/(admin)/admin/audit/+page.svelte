<script lang="ts">
  import type { PageData } from "./$types";
  let { data } = $props();
  function timeAgo(d: Date | string) {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<section class="space-y-4">
  <h1 class="font-display text-xl font-bold">Audit Log</h1>
  {#if data.logs.length === 0}
    <p class="text-sm text-ink-400">Belum ada log.</p>
  {:else}
    <ul class="space-y-2">
      {#each data.logs as l (l.id)}
        <li class="rounded-2xl border border-ink-100 bg-surface p-3 text-sm">
          <div class="flex items-center justify-between">
            <span
              ><span class="font-semibold">Admin</span>
              <span class="text-ink-500">{l.action}</span>
              <span class="text-ink-400">{l.entity} #{l.entityId}</span></span
            >
            <span class="text-xs text-ink-400">{timeAgo(l.createdAt)}</span>
          </div>
          {#if l.detail}<div class="mt-1 text-xs text-ink-500">Detail: {l.detail}</div>{/if}
          <div class="text-xs text-ink-400">IP: {l.ip}</div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
