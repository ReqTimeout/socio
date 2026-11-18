<script lang="ts">
  /**
   * CategoryHealthBadge — SATU tampilan kesehatan kategori untuk rail
   * /admin/services, tabel /admin/categories, dan band konteks kategori.
   *
   * F13 (port .my 083d0271): dulu tiga tempat itu menghitung sendiri
   * `active < total` lintas SEMUA provider, jadi kategori yang katalog
   * serving-nya sudah ON semua tetap dilabel "Partial" karena baris provider
   * mati duduk di kategori yang sama. Sekarang semua membaca `health` yang
   * dihitung sekali di server ($lib/catalog-counts).
   *
   * compact = rail kiri (ruang sempit): satu chip angka berwarna + title penuh.
   * full    = tabel: pill label + angka + chip arsip + peringatan bocor.
   *
   * Admin .id = copy Indonesia inline (tanpa katalog i18n).
   */
  import { Icon } from "@socio/ui";
  import type { CategoryHealth } from "$lib/catalog-counts";

  let {
    health,
    servingActive,
    servingTotal,
    legacyTotal = 0,
    legacyActive = 0,
    compact = false,
  }: {
    health: CategoryHealth;
    servingActive: number;
    servingTotal: number;
    legacyTotal?: number;
    legacyActive?: number;
    compact?: boolean;
  } = $props();

  const fill = (t: string, v: Record<string, string>) =>
    t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");

  const tone: Record<CategoryHealth, { cls: string; dot: string; icon: string; label: string }> = {
    on: { cls: "bg-success-soft text-success", dot: "bg-success", icon: "check", label: "Aktif" },
    partial: {
      cls: "bg-warning-soft text-warning",
      dot: "bg-warning",
      icon: "alert",
      label: "Sebagian",
    },
    off: { cls: "bg-ink-100 text-ink-500", dot: "bg-ink-400", icon: "eye_off", label: "Mati" },
    archived: {
      cls: "bg-ink-50 text-ink-400 ring-1 ring-ink-200",
      dot: "bg-ink-300",
      icon: "package",
      label: "Arsip",
    },
    empty: { cls: "bg-ink-50 text-ink-300", dot: "bg-ink-200", icon: "x", label: "Kosong" },
  };

  const t = $derived(tone[health] ?? tone.empty);

  const title = $derived.by(() => {
    const base =
      health === "empty"
        ? "Tidak punya layanan — bisa dihapus."
        : health === "archived"
          ? "Semua layanan dari provider yang tidak melayani kategori ini — route atau hapus."
          : health === "off"
            ? fill("{t} layanan serving mati semua.", { t: String(servingTotal) })
            : health === "partial"
              ? fill("{a} dari {t} layanan serving hidup.", {
                  a: String(servingActive),
                  t: String(servingTotal),
                })
              : fill("Semua {t} layanan serving hidup.", { t: String(servingTotal) });
    const legacy =
      legacyTotal > 0
        ? " " + fill("+ {n} baris provider lain (arsip).", { n: String(legacyTotal) })
        : "";
    return `${t.label} — ${base}${legacy}`;
  });

  // Chip arsip hanya bermakna bila ada katalog serving; kalau tidak, pill
  // "Arsip" itu sendiri sudah menerangkan seluruh kategori.
  const showLegacy = $derived(!compact && legacyTotal > 0 && servingTotal > 0);
</script>

{#if compact}
  <span
    class="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums {t.cls}"
    {title}
  >
    <span class="h-1.5 w-1.5 rounded-full {t.dot}"></span>
    {#if servingTotal > 0}{servingActive}/{servingTotal}{:else}{t.label}{/if}
  </span>
{:else}
  <span class="inline-flex flex-wrap items-center gap-1">
    <span
      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold {t.cls}"
      {title}
    >
      <Icon name={t.icon} size={9} stroke={2.75} />
      {t.label}
    </span>
    {#if servingTotal > 0}
      <span
        class="text-[11px] font-semibold tabular-nums text-ink-500"
        title="Layanan aktif / total dari provider yang melayani kategori ini."
      >
        {servingActive}/{servingTotal}
      </span>
    {/if}
    {#if showLegacy}
      <span
        class="rounded-full bg-ink-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-ink-400"
        title={fill("+ {n} baris provider lain (arsip).", { n: String(legacyTotal) })}
      >
        {fill("{n} arsip", { n: String(legacyTotal) })}
      </span>
    {/if}
    {#if legacyActive > 0}
      <span
        class="inline-flex items-center gap-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger"
        title="Layanan provider yang tidak melayani masih aktif — order akan ditolak di checkout."
      >
        <Icon name="alert" size={9} stroke={2.75} />
        {fill("{n} bocor", { n: String(legacyActive) })}
      </span>
    {/if}
  </span>
{/if}
