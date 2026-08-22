<script lang="ts">
  /* DataTable — pengganti DataTables jQuery dari admin PHP lama.
   * Presentational: sorting/pagination di-handle halaman (server-side).
   * Desktop = tabel; mobile = card-mode (mengikuti pola data-label
   * di admin/users PHP lama).
   */
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";
  import EmptyState from "./EmptyState.svelte";

  type Column = {
    key: string;
    label: string;
    align?: "left" | "right" | "center";
    /** kolom yang bisa di-sort (emit onsort) */
    sortable?: boolean;
    /** sembunyikan di card-mode mobile */
    hideOnMobile?: boolean;
  };

  let {
    columns,
    rows,
    cell,
    empty = "Belum ada data",
    sortKey = "",
    sortDir = "desc",
    onsort,
    page = 1,
    perPage = 25,
    total = 0,
    onpage,
  }: {
    columns: Column[];
    rows: Record<string, unknown>[];
    /** render isi sel: (row, colKey) */
    cell?: Snippet<[Record<string, unknown>, string]>;
    empty?: string;
    sortKey?: string;
    sortDir?: "asc" | "desc";
    onsort?: (key: string) => void;
    page?: number;
    perPage?: number;
    /** total baris di server — 0 berarti pagination disembunyikan */
    total?: number;
    onpage?: (page: number) => void;
  } = $props();

  const totalPages = $derived(total > 0 ? Math.ceil(total / perPage) : 0);
  const from = $derived(total === 0 ? 0 : (page - 1) * perPage + 1);
  const to = $derived(Math.min(page * perPage, total));

  const alignCls = { left: "text-left", right: "text-right", center: "text-center" };
</script>

<div class="overflow-hidden rounded-card border border-ink-100 bg-surface shadow-card">
  {#if rows.length === 0}
    <div class="p-6">
      <EmptyState title={empty} />
    </div>
  {:else}
    <!-- Desktop: tabel -->
    <div class="hidden overflow-x-auto md:block">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-ink-100 bg-ink-50">
            {#each columns as col}
              <th
                class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500 {alignCls[
                  col.align ?? 'left'
                ]}"
              >
                {#if col.sortable && onsort}
                  <button
                    class="inline-flex items-center gap-1 hover:text-ink-900"
                    onclick={() => onsort(col.key)}
                  >
                    {col.label}
                    {#if sortKey === col.key}
                      <Icon name={sortDir === "asc" ? "arrow_up" : "arrow_down"} size={12} stroke={2.5} />
                    {/if}
                  </button>
                {:else}
                  {col.label}
                {/if}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as row}
            <tr class="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
              {#each columns as col}
                <td class="px-4 py-3 text-ink-700 {alignCls[col.align ?? 'left']}">
                  {#if cell}
                    {@render cell(row, col.key)}
                  {:else}
                    {row[col.key] ?? "—"}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile: card-mode -->
    <ul class="divide-y divide-ink-100 md:hidden">
      {#each rows as row}
        <li class="space-y-1.5 p-4">
          {#each columns.filter((c) => !c.hideOnMobile) as col}
            <div class="flex items-start justify-between gap-3 text-sm">
              <span class="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-400"
                >{col.label}</span
              >
              <span class="min-w-0 text-right font-medium text-ink-800">
                {#if cell}
                  {@render cell(row, col.key)}
                {:else}
                  {row[col.key] ?? "—"}
                {/if}
              </span>
            </div>
          {/each}
        </li>
      {/each}
    </ul>
  {/if}

  <!-- Pagination -->
  {#if totalPages > 1 && onpage}
    <div class="flex items-center justify-between border-t border-ink-100 px-4 py-3">
      <p class="text-xs text-ink-400">
        {from}–{to} dari {total.toLocaleString("id-ID")}
      </p>
      <div class="flex items-center gap-1">
        <button
          class="grid h-8 w-8 place-items-center rounded-lg border border-ink-200 text-ink-600
            transition hover:bg-ink-100 disabled:opacity-40"
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
          onclick={() => onpage(page - 1)}
        >
          <Icon name="chevron_left" size={16} />
        </button>
        <span class="px-2 text-xs font-semibold text-ink-600">{page} / {totalPages}</span>
        <button
          class="grid h-8 w-8 place-items-center rounded-lg border border-ink-200 text-ink-600
            transition hover:bg-ink-100 disabled:opacity-40"
          disabled={page >= totalPages}
          aria-label="Halaman berikutnya"
          onclick={() => onpage(page + 1)}
        >
          <Icon name="chevron_right" size={16} />
        </button>
      </div>
    </div>
  {/if}
</div>
