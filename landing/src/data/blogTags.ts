// Tag topik portal blog — deterministik dari slug/judul/kategori (tanpa ubah schema).
// Dipakai: tag cloud sidebar, filter grid, chip kartu.

const PLATFORM_TAGS = [
  "instagram",
  "tiktok",
  "youtube",
  "telegram",
  "facebook",
  "spotify",
  "twitter",
] as const;

const ANGLE_TAGS: Array<[RegExp, string]> = [
  [/(reseller|modal|untung|cuan|bisnis|grosir|agen)/, "Reseller"],
  [/(aman|risiko|bot|refill|turun|scam|verifikasi)/, "Aman"],
  [/(harga|murah|bayar|deposit|topup|top-up)/, "Harga"],
  [/(cara|panduan|tips|strategi|tutorial|mulai)/, "Panduan"],
  [/(api|smm-panel|panel)/, "SMM Panel"],
];

/** Tag untuk satu artikel (maks 4, urutan: platform → angle). */
export function tagsFor(
  slug: string,
  title: string,
  category: string,
): string[] {
  const s = `${slug} ${title}`.toLowerCase();
  const tags: string[] = [];
  for (const p of PLATFORM_TAGS) {
    const label =
      p === "twitter" ? "Twitter/X" : p[0].toUpperCase() + p.slice(1);
    if (s.includes(p) && !tags.includes(label)) tags.push(label);
  }
  for (const [re, label] of ANGLE_TAGS) {
    if (re.test(s) && !tags.includes(label)) tags.push(label);
  }
  if (!tags.includes(category)) tags.push(category);
  return tags.slice(0, 4);
}

/** Cloud tag: [{ tag, count }] urut abjad, untuk sidebar. */
export function tagCloud(
  posts: Array<{ id: string; title: string; category: string }>,
): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const t of tagsFor(p.id, p.title, p.category)) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, "id"));
}
