<script lang="ts">
  /**
   * Popup detail satu pengumuman (source='manual' dari /admin/news).
   * Dipakai dashboard (box "Pengumuman") dan halaman /berita supaya satu
   * pengalaman saja: Sheet yang sama seperti sheet detail pesanan + chip
   * kategori neo-brutalist — mengikuti bahasa visual app, tanpa komponen modal
   * baru. Label Indonesia inline (konvensi .id, tanpa i18n).
   *
   * Konten TIDAK di-cleanNewsText(): baris manual ditulis admin (boleh emoji,
   * baris baru). Pencacah mojibake hanya diperlukan untuk teks sync.
   */
  import { Sheet, Icon } from "@socio/ui";
  import { newsCategory } from "$lib/news-meta";

  type NewsDetail = {
    id: number;
    title?: string | null;
    kategori?: string | null;
    content: string;
    createdAt: Date | string;
  };

  let {
    open = $bindable(false),
    item = null,
  }: {
    open?: boolean;
    item?: NewsDetail | null;
  } = $props();

  const cat = $derived(item ? newsCategory(item.kategori) : null);
  const heading = $derived(
    item ? String(item.title ?? "").trim() || (cat?.label ?? "Pengumuman") : "",
  );
  const when = $derived.by(() => {
    if (!item) return "";
    const d = new Date(item.createdAt as string | Date);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  });
</script>

<Sheet bind:open title={heading}>
  {#if item && cat}
    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="inline-flex items-center gap-1 rounded-full border-2 border-ink-900 px-2.5 py-0.5 text-[11px] font-extrabold shadow-[1.5px_1.5px_0_var(--color-ink-900)] {cat.chipBg} {cat.chipInk}"
        >
          <Icon name={cat.icon} size={12} stroke={2.5} />
          {cat.label}
        </span>
        <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-500">
          <Icon name="clock" size={12} />
          Diterbitkan · {when}
        </span>
      </div>
      <p class="whitespace-pre-line text-sm leading-relaxed text-ink-700">{item.content}</p>
    </div>
  {/if}
</Sheet>
