<script lang="ts">
  import { haptic } from "../haptic.js";
  import Icon from "./Icon.svelte";

  function fixMojibake(s: string): string {
    if (!s || !s.includes("ð")) return s;
    try {
      const raw = Uint8Array.from(s, (ch) => ch.charCodeAt(0) & 0xff);
      const dec = new TextDecoder("utf-8", { fatal: false }).decode(raw);
      if (dec !== s && !dec.includes("ð")) return dec;
      if (/\p{Extended_Pictographic}/u.test(dec) || dec.includes("🇮"))
        return dec;
    } catch {}
    return s;
  }
  function displayName(v: string): string {
    const f = fixMojibake(v);
    const h = (f.split("[")[0] ?? f).trim();
    return h.replace(/\s{2,}/g, " ").trim() || f.trim();
  }

  let {
    name,
    category,
    platform,
    pricePer1k,
    min,
    max,
    refill = false,
    href,
    onSelect,
  }: {
    name: string;
    category: string;
    platform?: string; // nama kategori lengkap → dipakai deteksi ikon platform
    pricePer1k: number;
    min: number;
    max: number;
    refill?: boolean;
    href?: string;
    onSelect?: () => void;
  } = $props();

  const fmt = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");

  // Deteksi platform dari nama kategori → ikon + gradient + label pendek.
  // Class gradient ditulis literal utuh supaya ke-scan Tailwind.
  type Plat = { icon: string; grad: string; label: string };
  function resolve(src: string): Plat {
    const c = (src || "").toLowerCase();
    if (c.includes("instagram"))
      return {
        icon: "instagram",
        grad: "from-pink-500 to-fuchsia-600",
        label: "Instagram",
      };
    if (c.includes("tiktok") || c.includes("tik tok"))
      return {
        icon: "music",
        grad: "from-slate-800 to-slate-950",
        label: "TikTok",
      };
    if (c.includes("youtube"))
      return {
        icon: "youtube",
        grad: "from-red-500 to-red-600",
        label: "YouTube",
      };
    if (c.includes("facebook"))
      return {
        icon: "facebook",
        grad: "from-blue-500 to-blue-700",
        label: "Facebook",
      };
    if (c.includes("twitter") || c.includes("bluesky") || /\bx\b/.test(c))
      return {
        icon: "twitter",
        grad: "from-sky-400 to-sky-600",
        label: "Twitter/X",
      };
    if (c.includes("telegram"))
      return {
        icon: "telegram",
        grad: "from-sky-500 to-blue-600",
        label: "Telegram",
      };
    if (c.includes("whatsapp"))
      return {
        icon: "whatsapp",
        grad: "from-emerald-500 to-green-600",
        label: "WhatsApp",
      };
    if (c.includes("discord") || c.includes("clubhouse"))
      return {
        icon: "message",
        grad: "from-indigo-500 to-violet-600",
        label: "Discord",
      };
    if (
      c.includes("spotify") ||
      c.includes("apple music") ||
      c.includes("deezer") ||
      c.includes("audiomack") ||
      c.includes("boomplay") ||
      c.includes("datpiff") ||
      c.includes("music")
    )
      return {
        icon: "music",
        grad: "from-green-500 to-emerald-600",
        label: "Music",
      };
    if (
      c.includes("crypto") ||
      c.includes("coinmarketcap") ||
      c.includes("opensea") ||
      c.includes("coingecko") ||
      c.includes("rarible")
    )
      return {
        icon: "trending_up",
        grad: "from-amber-500 to-yellow-600",
        label: "Crypto",
      };
    if (
      c.includes("google") ||
      c.includes("seo") ||
      c.includes("backlink") ||
      c.includes("web traffic") ||
      c.includes("visitor")
    )
      return {
        icon: "search",
        grad: "from-amber-500 to-orange-600",
        label: "SEO / Web",
      };
    // Fallback berdasar jenis layanan
    if (
      c.includes("follow") ||
      c.includes("subscriber") ||
      c.includes("member") ||
      c.includes("friend")
    )
      return {
        icon: "users",
        grad: "from-primary-500 to-accent-500",
        label: "",
      };
    if (c.includes("like") || c.includes("love"))
      return { icon: "heart", grad: "from-rose-500 to-pink-600", label: "" };
    if (c.includes("view") || c.includes("play") || c.includes("stream"))
      return {
        icon: "play",
        grad: "from-violet-500 to-primary-600",
        label: "",
      };
    if (c.includes("comment"))
      return {
        icon: "message",
        grad: "from-amber-500 to-orange-600",
        label: "",
      };
    return {
      icon: "sparkles",
      grad: "from-primary-500 to-accent-500",
      label: "",
    };
  }

  const plat = $derived(resolve(platform || name || category));
  const subtitle = $derived(plat.label || category);

  const handle = () => {
    haptic();
    onSelect?.();
  };
</script>

<svelte:element
  this={href ? "a" : "button"}
  {href}
  onclick={handle}
  class="group block w-full rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-card
    transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-card-hover active:scale-[0.98] focus-ring"
>
  <div class="flex items-start gap-3">
    <span
      class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br {plat.grad}
        text-white shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6"
    >
      <Icon name={plat.icon} size={21} stroke={2} />
    </span>
    <div class="min-w-0 flex-1 pr-8">
      <p class="truncate text-sm font-bold leading-snug text-ink-900">
        {displayName(name)}
      </p>
      <p class="mt-0.5 truncate text-xs text-ink-500">{subtitle}</p>
    </div>
  </div>

  <div class="mt-3 flex items-center justify-between gap-2">
    <span class="truncate text-[11px] text-ink-500">
      Min {min.toLocaleString("id-ID")} · Max {max.toLocaleString("id-ID")}
      {#if refill}
        <span
          class="ml-1 rounded-full bg-success/10 px-1.5 py-0.5 font-bold text-success"
          >Refill</span
        >
      {/if}
    </span>
    <span
      class="shrink-0 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-bold tabular-nums text-accent-700"
    >
      {fmt(pricePer1k)}<span class="font-medium text-accent-700">/1k</span>
    </span>
  </div>
</svelte:element>
