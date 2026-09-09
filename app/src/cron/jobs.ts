/**
 * Registry terpusat semua cron job — SATU sumber kebenaran untuk:
 *  - penjadwalan di index.ts (expr)
 *  - halaman /admin/cron (label, jadwal, tombol Jalankan)
 *  - health metrics (intervalMin untuk next-run)
 *
 * Tambah job baru = tambah 1 entry di sini, otomatis muncul di UI.
 */
import { runAllProviderSync } from "./provider-sync";
import { runAllServiceSync } from "./service-sync";
import { runStatusPolling, runRefillPolling } from "./status-polling";
import { runAutoRefund } from "./refund";
import { runEmailQueue } from "./email-queue";
import { runLightCron } from "./light";
import { runBackup } from "../lib/server/backup";
import { refreshFxRate } from "../lib/server/fx";
import { runReconcile } from "./reconcile";

export interface CronJobDef {
  key: string;
  label: string;
  /** node-cron expression */
  expr: string;
  /** label jadwal untuk UI (id) */
  scheduleLabel: string;
  /** menit antar run — untuk hitung next run */
  intervalMin: number;
  note: string;
  run: (triggeredBy: number) => Promise<unknown>;
}

export const CRON_JOBS: CronJobDef[] = [
  {
    key: "provider-sync",
    label: "Provider Sync",
    expr: "0 * * * *",
    scheduleLabel: "Tiap jam (mnt 00)",
    intervalMin: 60,
    note: "Katalog provider 8268 layanan (diff hash) + saldo",
    run: () => runAllProviderSync(),
  },
  {
    key: "service-catalog",
    label: "Katalog Layanan",
    expr: "chained",
    scheduleLabel: "Otomatis setelah Provider Sync",
    intervalMin: 60,
    note: "Create/update harga/enable/disable layanan + kategori",
    run: () => runAllServiceSync(),
  },
  {
    key: "status-poll",
    label: "Status Poll",
    expr: "* * * * *",
    scheduleLabel: "Tiap menit",
    intervalMin: 1,
    note: "Cek status order Pending/In progress ke provider",
    run: () => runStatusPolling(),
  },
  {
    key: "refill-poll",
    label: "Refill Poll",
    expr: "*/5 * * * *",
    scheduleLabel: "Tiap 5 menit",
    intervalMin: 5,
    note: "Cek status refill order Refilling",
    run: () => runRefillPolling(),
  },
  {
    key: "auto-refund",
    label: "Auto Refund",
    expr: "*/15 * * * *",
    scheduleLabel: "Tiap 15 menit",
    intervalMin: 15,
    note: "Refund otomatis order Error/Partial/Canceled",
    run: () => runAutoRefund(),
  },
  {
    key: "email-queue",
    label: "Email Queue",
    expr: "*/5 * * * *",
    scheduleLabel: "Tiap 5 menit",
    intervalMin: 5,
    note: "Kirim antrian email via Resend (batch 30)",
    run: () => runEmailQueue(),
  },
  {
    key: "light",
    label: "Light Housekeeping",
    expr: "*/15 * * * *",
    scheduleLabel: "Tiap 15 menit",
    intervalMin: 15,
    note: "Expire deposit pending + seed next_poll_at",
    run: () => runLightCron(),
  },
  {
    key: "backup",
    label: "Backup DB",
    expr: "0 3 * * *",
    scheduleLabel: "Tiap hari 03:00",
    intervalMin: 1440,
    note: "mysqldump + gzip ke /app/storage/backups",
    run: (triggeredBy: number) => runBackup(triggeredBy),
  },
  {
    key: "fx-rate",
    label: "Kurs USD→IDR",
    expr: "5 0 * * *",
    scheduleLabel: "Tiap hari 00:05",
    intervalMin: 1440,
    note: "Fetch kurs live (efektif = max(live, floor))",
    run: () => refreshFxRate(),
  },
  {
    key: "reconcile",
    label: "Rekonsiliasi Uang",
    expr: "30 4 * * *",
    scheduleLabel: "Tiap hari 04:30",
    intervalMin: 1440,
    note: "Cek unrefunded + saldo negatif (alert only)",
    run: () => runReconcile(),
  },
];

export function getJobDef(key: string): CronJobDef | undefined {
  return CRON_JOBS.find((j) => j.key === key);
}
