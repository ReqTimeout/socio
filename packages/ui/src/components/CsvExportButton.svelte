<script lang="ts">
  /**
   * CSV Export Button — preserve current page filter in the export URL.
   *
   * Usage:
   *   <CsvExportButton href="/admin/users/export" label="Export Users" />
   *
   * Automatically copies the current page's query string (q, level, status,
   * verified, p, etc) so the CSV reflects exactly what the admin sees in
   * the table.
   */
  import { page } from "$app/state";
  import Icon from "./Icon.svelte";

  let {
    href,
    label = "Export CSV",
    size = "md",
    class: extraClass = "",
  }: {
    /** Export endpoint URL (relative or absolute). */
    href: string;
    /** Button label — visible text. */
    label?: string;
    /** Size variant. */
    size?: "sm" | "md";
    /** Extra classes untuk container positioning. */
    class?: string;
  } = $props();

  // Bangun URL export dengan semua query param dari halaman saat ini
  const exportUrl = $derived.by(() => {
    const base = href.split("?")[0];
    // Pakai page.url untuk live query string
    const currentQs = page.url?.searchParams;
    if (!currentQs) return base;
    const qs = new URLSearchParams(currentQs);
    // Hapus pagination — export selalu full dataset
    qs.delete("p");
    const tail = qs.toString();
    return tail ? `${base}?${tail}` : base;
  });

  const sizeCls = $derived(
    size === "sm"
      ? "min-h-[32px] gap-1 px-2.5 py-1 text-[11px]"
      : "min-h-[36px] gap-1.5 px-3 py-1.5 text-xs",
  );
</script>

<a
  href={exportUrl}
  download
  class="inline-flex items-center rounded-full border border-ink-200 bg-surface font-bold text-ink-700 transition-all hover:border-primary hover:bg-primary-soft hover:text-primary-700 active:scale-95
    {sizeCls} {extraClass}"
  aria-label={label}
>
  <Icon name="download" size={size === "sm" ? 11 : 12} stroke={2.5} />
  <span class="hidden sm:inline">{label}</span>
</a>
