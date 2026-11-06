/**
 * G1 lifecycle/winback — konfigurasi gerbang + irama kirim email MARKETING.
 *
 * `EMAIL_MARKETING_ENABLED` = saklar global untuk SEMUA email marketing
 * (campaign manual + cron lifecycle). DEFAULT OFF sampai fondasi kepatuhan
 * (unsubscribe + suppression) terverifikasi di produksi. Email TRANSAKSIONAL
 * (reset/deposit/refund/tiket) TIDAK pernah membaca flag ini — selalu jalan.
 *
 * Angka di bawah = preset "Konservatif" (keputusan owner 6-Nov-2026): pelajaran
 * insiden Gmail 421-4.7.28 — jangan blast. Semuanya bisa dinaikkan bertahap
 * setelah Postmaster Tools menunjukkan spam rate <0.1%.
 */

/** Kill switch global. Default OFF (aman) — aktifkan dengan env = 1/true/on/yes. */
export function marketingEnabled(): boolean {
  const v = (process.env.EMAIL_MARKETING_ENABLED ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

/** Batas ATAS email lifecycle terkirim per hari (guard blast). */
export const DAILY_CAP = 25;

/** Satu user paling sering dapat 1 email lifecycle per N hari (cooldown). */
export const PER_USER_COOLDOWN_DAYS = 7;

/** Ambang "saldo hampir habis" untuk segmen balance_low — dalam RUPIAH (bukan sen). */
export const LOW_BALANCE_RP = 10_000;

/** Jendela kirim (jam WIB, inkluif start, eksklusi end). Di luar ini cron skip. */
export const SEND_WINDOW_WIB = { start: 8, end: 20 } as const;

/** Zona waktu resmi operasi — quiet hours dihitung WIB, bukan server/UTC. */
const WIB = "Asia/Jakarta";

/** Jam saat ini di WIB (0-23). Independen dari timezone server VPS. */
export function hourInWib(now: Date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone: WIB,
    hour: "numeric",
    hour12: false,
  }).format(now);
  return Number.parseInt(h, 10) % 24;
}

/** Apakah sekarang boleh kirim (di dalam jendela 08:00–20:00 WIB)? */
export function withinSendWindow(now: Date = new Date()): boolean {
  const h = hourInWib(now);
  return h >= SEND_WINDOW_WIB.start && h < SEND_WINDOW_WIB.end;
}

/**
 * Token periode untuk klaim idempotensi. Mingguan (ISO-ish "YYYY-Www") supaya
 * cooldown 7 hari ditegakkan oleh UNIQUE(user,trigger,periode) — dua run cron
 * di minggu yang sama tidak mengirim ulang ke user yang sama.
 */
export function weekPeriodKey(now: Date = new Date()): string {
  // Minggu kalender sederhana: tahun + nomor minggu (1..53) berbasis hari/tahun.
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - startOfYear) /
      86_400_000,
  );
  const week = Math.floor((dayOfYear + new Date(startOfYear).getUTCDay()) / 7) + 1;
  return `${now.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Hari kalender WIB sebagai "YYYY-MM-DD" — untuk bucket budget harian. */
export function dayKeyWib(now: Date = new Date()): string {
  // yyyy-MM-dd di zona WIB via Intl (bukan UTC server).
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: WIB }).format(now);
  return parts; // "2026-11-06"
}
