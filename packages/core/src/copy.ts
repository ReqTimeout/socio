/**
 * copy.ts — Single source of truth microcopy user-facing socio.id.
 *
 * Voice: santai-profesional, "kamu", verb-first, angka konkret.
 * Rules:
 *  - CTA = verb. Tanpa buzzword.
 *  - Toast sukses = apa yang terjadi + langkah berikutnya.
 *  - Error = penyebab + solusi (bukan menyalahkan user).
 *  - Empty state = empati + 1 CTA.
 */

export const copy = {
  greeting: {
    dawn: "Selamat pagi",
    day: "Selamat siang",
    dusk: "Selamat sore",
    night: "Selamat malam",
  },
  dashboard: {
    subtitleActive: (n: number) =>
      `${n} pesanan berjalan — kami proses otomatis hingga selesai.`,
    subtitleIdle: "Siap bantu naikin performa sosmed — cepat & aman.",
  },
  empty: {
    orders: {
      title: "Pesanan pertama menunggu",
      desc: "Pilih layanan favorit — sistem kami proses otomatis setelah bayar.",
      cta: "Buat Pesanan",
    },
    services: {
      title: "Layanan tidak ditemukan",
      desc: "Coba kata kunci lain, misal 'IG followers' — atau ganti kategori.",
    },
    tickets: {
      title: "Belum ada tiket",
      desc: "Berarti semuanya lancar. Kalau macet, kami balas < 5 menit.",
      cta: "Buat Tiket",
    },
    notif: {
      title: "Belum ada notifikasi",
      desc: "Nanti muncul di sini kalau ada update pesanan atau promo buatmu.",
    },
    balance: {
      title: "Riwayat masih kosong",
      desc: "Top up pertama bakal tampil di sini — ±5 menit.",
      cta: "Top Up Sekarang",
    },
    affiliate: {
      title: "Belum ada downline",
      desc: "Bagikan link referral — tiap order downline, komisimu jalan otomatis.",
    },
  },
  order: {
    cta: "Pesan Sekarang",
    ctaWithTotal: (total: string) => `Pesan Sekarang · ${total}`,
    pickServiceFirst: "Pilih Layanan Dulu",
    notEnough: (gap: string) => `Saldo kurang ${gap}`,
    notEnoughHint: "Top up dulu biar pesanan langsung jalan.",
    successTitle: "Pesanan masuk antrean!",
    successDesc:
      "Sistem kami proses otomatis — cek statusnya real-time di halaman Pesanan.",
    linkHelper: "Tempel link publik — jangan private, biar prosesnya lancar.",
    processing: "Memproses…",
  },
  topup: {
    title: "Top up berapa?",
    successTitle: "Saldo bertambah!",
    successDesc: (amount: string) =>
      `Saldo kamu +${amount}. Langsung bisa dipakai untuk pesanan pertamamu.`,
  },
  ticket: {
    cta: "Kirim Tiket",
    replyEstimate: "Kami balas < 5 menit (24/7)",
  },
  account: {
    logoutConfirm: "Keluar dari akun ini?",
    apiCopied: "API Key tersalin",
    avatarOk: "Avatar diperbarui",
    passwordOk: "Password diperbarui — ingat yang baru ya.",
    profileOk: "Profil tersimpan.",
  },
  affiliate: {
    copied: "Link tersalin — tinggal bagikan!",
    cta: "Bagikan Link",
  },
  error: {
    generic: "Ada yang berubah di jalur data — coba lagi ya.",
    network: "Koneksi tersendat — periksa internetmu lalu coba lagi.",
  },
} as const;
