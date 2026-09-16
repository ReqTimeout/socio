/**
 * copy.ts — Single source of truth microcopy user-facing socio.id.
 *
 * Voice: playful-human, "teman yang jago sosmed" (APP V2 §4.1). "kamu", verb-first,
 * angka konkret. Jenaka HANYA di subtitle/empty/toast sukses (max 1 per layar);
 * tombol & label fungsional TETAP jelas. Tanpa emoji baru (✦ = dingbat, OK).
 * Rules:
 *  - CTA = verb. Tanpa buzzword.
 *  - Toast sukses = apa yang terjadi + langkah berikutnya.
 *  - Error = penyebab + solusi (bukan menyalahkan user).
 *  - Empty state = empati + 1 CTA.
 *  - DILARANG tambah/hapus/rename key (guardrail APP V2 #1) — hanya nilai string.
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
      `${n} pesanan lagi jalan — duduk manis, kami proses sampai beres.`,
    subtitleIdle: "Meja kerjamu siap. Hari ini mau nge-boost apa? ✦",
  },
  empty: {
    orders: {
      title: "Masih bersih nih",
      desc: "Order pertamamu cuma 2 tap lagi — sistem jalan otomatis setelah bayar.",
      cta: "Buat Pesanan",
    },
    services: {
      title: "Gak ketemu nih",
      desc: "Coba kata lain, misal 'IG followers' — atau ganti kategori. Katalognya ribuan, wajar kalau nyasar.",
    },
    tickets: {
      title: "Belum ada tiket",
      desc: "Berarti semuanya lancar. Kalau macet, tim kami balas < 5 menit — manusia beneran.",
      cta: "Buat Tiket",
    },
    notif: {
      title: "Belum ada notifikasi",
      desc: "Update pesanan dan promo buatmu bakal nongol di sini.",
    },
    balance: {
      title: "Riwayat masih kosong",
      desc: "Top up pertamamu bakal tercatat di sini — biasanya masuk ±5 menit.",
      cta: "Top Up Sekarang",
    },
    affiliate: {
      title: "Belum ada downline",
      desc: "Belum ada yang join lewat linkmu. Bagikan — tiap order downline, komisimu jalan otomatis.",
    },
  },
  order: {
    cta: "Pesan Sekarang",
    ctaWithTotal: (total: string) => `Pesan Sekarang · ${total}`,
    pickServiceFirst: "Pilih Layanan Dulu",
    notEnough: (gap: string) => `Saldo kurang ${gap}`,
    notEnoughHint:
      "Saldonya kurang dikit — top up dulu biar pesanan langsung jalan.",
    successTitle: "Order masuk! Mulai proses < 1 menit ✦",
    successDesc: "Duduk manis — statusnya update real-time di halaman Pesanan.",
    linkHelper: "Tempel link publik — jangan private, biar prosesnya lancar.",
    processing: "Memproses…",
  },
  topup: {
    title: "Top up berapa?",
    successTitle: "Saldo masuk! ✦",
    successDesc: (amount: string) =>
      `Saldo kamu +${amount}. Langsung bisa dipakai buat order.`,
  },
  ticket: {
    cta: "Kirim Tiket",
    replyEstimate:
      "Tim kami balas < 5 menit (24/7) — manusia beneran, bukan bot.",
  },
  account: {
    logoutConfirm: "Keluar dari akun ini?",
    apiCopied: "API Key tersalin",
    avatarOk: "Foto baru terpasang. Ganteng/cantik banget ✦",
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
