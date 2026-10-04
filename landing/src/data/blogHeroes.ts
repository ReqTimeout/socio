// Blog hero images — Unsplash hotlink (images.unsplash.com, img-src https: OK).
// Semua ID di bawah DIVERIFIKASI manual 30 Sep 2026 (curl 200 + lihat isi foto):
//   ig-icon      1611262588024-d12430b98920  → ikon 3D Instagram (pink/chart)
//   social-apps  1611926653458-09294b3142bf  → folder "Social Media" (IG/YT/Twitter/FB)
//   cash         1553729459-efe14ef6055d     → tangan pegang cash USD (modal/untung)
//   checkout     1556742049-0cfed4f6a45d     → kasir + pembayaran HP (order/cara mulai)
//   analytics    1460925895917-afdab827c52f  → laptop dashboard analitik (definisi)
//   strategy     1533750349088-cd871a92f312  → flatlay "Marketing Strategy" (tips)
//   iphone       1511707171634-5f897ff02aa9  → iPhone aplikasi sosmed (TikTok/umum)
//   coffee       1499750310107-5fef28a66643  → kopi + laptop + catatan (default editorial)
// DITOLAK: 1611162617474 (logo Netflix — salah topik), 1579869847514 (404).

const U = "https://images.unsplash.com/photo-";

function url(id: string, w: number) {
  return `${U}${id}?auto=format&fit=crop&w=${w}&q=70`;
}

export interface BlogHero {
  id: string;
  alt: string;
}

const HEROES: Record<string, BlogHero> = {
  "ig-icon": { id: "1611262588024-d12430b98920", alt: "Ikon Instagram 3D" },
  "social-apps": {
    id: "1611926653458-09294b3142bf",
    alt: "Aplikasi media sosial di HP",
  },
  cash: {
    id: "1553729459-efe14ef6055d",
    alt: "Uang tunai hasil jualan followers",
  },
  checkout: { id: "1556742049-0cfed4f6a45d", alt: "Pembayaran order di kasir" },
  analytics: {
    id: "1460925895917-afdab827c52f",
    alt: "Dashboard analitik di laptop",
  },
  strategy: {
    id: "1533750349088-cd871a92f312",
    alt: "Catatan strategi marketing",
  },
  iphone: {
    id: "1511707171634-5f897ff02aa9",
    alt: "iPhone dengan aplikasi sosmed",
  },
  coffee: {
    id: "1499750310107-5fef28a66643",
    alt: "Laptop dan kopi — kerja dari mana saja",
  },
};

function pickKey(slug: string, category: string): keyof typeof HEROES {
  const s = `${slug} ${category}`.toLowerCase();
  // Sudut transaksi/pembayaran dulu (foto kasir), lalu sudut uang
  // (foto cash) — keduanya menang atas platform. Mis. "modal-jualan-followers"
  // = cash, "smm-panel-indonesia" (pembayaran lokal) = checkout.
  if (/(pembayaran|indonesia|daftar|order|checkout|cara-mulai)/.test(s))
    return "checkout";
  if (/(modal|untung|cuan|reseller|bisnis|uang|grosir)/.test(s)) return "cash";
  if (/(instagram|followers|likes|like-|reels|story)/.test(s)) return "ig-icon";
  if (/(youtube|views|subscribers)/.test(s)) return "social-apps";
  if (/(modal|untung|reseller|cuan|uang|harga-grosir|bisnis)/.test(s))
    return "cash";
  if (/(indonesia|pembayaran|daftar|order|checkout|cara-mulai|mulai)/.test(s))
    return "checkout";
  if (/(smm-panel|apa-itu|definisi|panel|api)/.test(s)) return "analytics";
  if (/(tiktok|spotify|telegram|facebook|twitter)/.test(s)) return "iphone";
  if (/(aman|risiko|tips|strategi|bot|refill|turun)/.test(s)) return "strategy";
  return "coffee";
}

/** URL hero (w=1200) + alt untuk slug artikel. */
export function heroFor(
  slug: string,
  category: string,
): { src: string; alt: string } {
  const h = HEROES[pickKey(slug, category)];
  return { src: url(h.id, 1200), alt: h.alt };
}

/** URL thumbnail (w=400) untuk ledger rows / related. */
export function thumbFor(
  slug: string,
  category: string,
): { src: string; alt: string } {
  const h = HEROES[pickKey(slug, category)];
  return { src: url(h.id, 400), alt: h.alt };
}
