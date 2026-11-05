/**
 * refill-copy.ts — string Indonesia fitur Refill Center (port .my, handover §9).
 *
 * BUKAN copy.ts: guardrail APP V2 #1 melarang tambah key di sana. Objek lokal ini
 * menggantikan katalog i18n .my (`c.app.refill.*` / `c.app.pesanan.*`) sehingga
 * markup UI .my bisa dipakai tanpa perubahan lewat `const c = { app: refillCopy }`.
 */
export const refillCopy = {
  refill: {
    title: "Pusat Refill — socio.id | Panel SMM",
    metaDescription:
      "Lihat pesanan yang mendukung refill beserta estimasi jumlah yang turun dan bisa diisi ulang. Minta refill gratis sekali sentuh.",
    srHeading: "Pusat refill",
    pageHeading: "Pusat Refill",
    pageHelp:
      "Pesanan dengan layanan yang mendukung refill, plus estimasi jumlah yang turun dan bisa diisi ulang.",
    backToOrders: "Lihat semua pesanan",
    note: "Refill gratis untuk kamu. Permintaan dikirim ke penyedia dan jumlah yang turun diisi ulang otomatis.",
    tabs: { refillable: "Bisa refill", progress: "Diproses", all: "Semua" },
    summary: (n: string) => `${n} pesanan bisa di-refill`,
    card: {
      estimate: (n: string) => `≈ ${n} bisa diisi ulang`,
      remaining: "Sisa",
      ordered: "Dipesan",
      noDrop: "Belum ada penurunan — tidak perlu refill",
      button: "♻ Refill",
      requested: "Refill sedang diproses",
      upToDate: "Sudah penuh",
      nextIn: (when: string) => `Refill berikutnya: ${when}`,
      validUntil: (when: string) => `Bisa refill sampai ${when}`,
      expired: "Jendela refill order ini sudah tertutup",
      waiting: (left: string) => `Tunggu, bisa refill lagi ${left}`,
      dur: { d: "hari", h: "jam", m: "mnt" },
    },
    empty: {
      refillable: { title: "Tidak ada yang perlu di-refill", desc: "Semua pesanan sehat. Cek lagi nanti setelah jumlah berkurang." },
      progress: { title: "Belum ada refill berjalan", desc: "Minta refill dari tab 'Bisa refill' untuk memantaunya di sini." },
      all: { title: "Belum ada pesanan refill", desc: "Pesanan dengan layanan pendukung refill akan tampil di sini." },
    },
  },
  // Hanya bagian pesanan yang dipakai kartu /refill:
  pesanan: {
    timeAgo: { just: "baru saja", minutesAgo: (m: number) => `${m}m lalu`, hoursAgo: (h: number) => `${h}j lalu` },
    toast: { failed: "Gagal", refillOk: "Refill diajukan" },
    card: { refillBadge: "Bisa Refill" },
  },
} as const;

/** Pesan server aksi refill (/refill & /pesanan) — memenuhi RefillMsgs refill-request. */
export const refillServerMsgs = {
  invalidOrderId: "ID order tidak valid.",
  orderNotFound: "Order tidak ditemukan.",
  noRefillSupport: "Layanan ini tidak mendukung refill.",
  onlySuccessRefill: "Hanya order Berhasil yang bisa di-refill.",
  noAutoRefill: "Order ini tidak bisa refill otomatis (manual/legacy).",
  refillProcessing: "Refill sedang diproses.",
  refillFailed: (err: string) => `Gagal refill: ${err}`,
  refillOk: "Refill diajukan. Cek status dalam 5 menit.",
  refillWindowClosed: "Jendela refill untuk order ini sudah tertutup.",
  refillTooSoon: (when: string) => `Terlalu cepat. Kamu bisa minta refill lagi setelah ${when}.`,
} as const;
