/**
 * G1 lifecycle — template email marketing. SATU-SATUNYA perakit konten lifecycle.
 *
 * WAJIB pakai komponen DNA di `../email/render.js` (bukan HTML mentah): tema
 * cyan-teal + mango, header socio.id, CTA accent-ink, maskot Sparko (PNG).
 * Copy 100% BAHASA INDONESIA natural ("enakeun"), bukan terjemahan kaku .my.
 *
 * Anti-pattern budget (looks-expensive): eyebrow pill maks 1 (di hero), grid
 * layanan = item NYATA dari kategori terlaris, statistik pakai strip tipografis
 * (bukan kartu), tak ada 4-col stat generik.
 */
import {
  emailShell,
  emailHero,
  emailCta,
  emailServiceGrid,
  emailStatStrip,
  emailAbsoluteUrl,
  emailFooterMarketing,
  DEFAULT_MARKETING_ADDRESS,
  escapeHtml,
  type SparkoPose,
} from "$lib/server/email/render.js";
import type { GridItem, SegmentKey } from "./segments.js";

export interface LifecycleTemplateArgs {
  name: string;
  /** URL halaman konfirmasi manusia (/u/...) untuk link footer. */
  unsubscribeUrl: string;
  preferencesUrl: string;
  grid: GridItem[];
  /** balance_low: saldo tersisa dalam Rupiah. */
  balanceRp?: number;
  /** winback: jendela hari (30/60/90). */
  daysSince?: number;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

/** Sapaan nama — kalau nama kosong, pakai "Kak". */
function greet(name: string): string {
  const n = name.trim();
  return n ? escapeHtml(n) : "Kak";
}

const POSE: Record<SegmentKey, SparkoPose> = {
  activation: "wave",
  winback_30: "sad",
  winback_60: "sad",
  winback_90: "sad",
  balance_low: "idle",
};

const CTA_ORDER = emailAbsoluteUrl("/pesan");
const CTA_TOPUP = emailAbsoluteUrl("/saldo/top-up");

function gridBlock(grid: GridItem[]): string {
  if (!grid.length) return "";
  return (
    `<div style="padding:14px 0 0 0">` +
    `<p style="margin:0 0 2px 0;font-family:inherit;font-size:13px;color:inherit">` +
    `Layanan yang paling ramai dipakai orang:</p>` +
    emailServiceGrid(grid) +
    `</div>`
  );
}

export function buildLifecycleEmail(trigger: SegmentKey, a: LifecycleTemplateArgs): BuiltEmail {
  const hi = greet(a.name);
  let subject = "";
  let heading = "";
  let eyebrow: string | undefined;
  let intro = "";
  let cta = { label: "Mulai pesan sekarang", href: CTA_ORDER };
  let extra = "";

  switch (trigger) {
    case "activation": {
      subject = "Sparko nyapa — pesanan pertama di Socio.id cuma 1 menit";
      eyebrow = "Buat kamu yang baru";
      heading = `Halo ${hi}, siap coba pesanan pertama?`;
      intro =
        "Kamu udah daftar tapi belum sempat nyoba. Isi saldo, pilih layanan, tempel link — " +
        "prosesnya otomatis dan harganya transparan. Nih beberapa layanan yang paling laris:";
      extra = gridBlock(a.grid);
      break;
    }
    case "winback_30":
    case "winback_60":
    case "winback_90": {
      const d = a.daysSince ?? 30;
      subject = `Kita kangen, ${hi} — ada yang baru di Socio.id`;
      eyebrow = "Sudah lama gak mampir";
      heading = `${d} hari tanpa pesanan? Yuk lanjut lagi`;
      intro =
        "Katalog kami makin lengkap dan harganya terus dikawal biar tetap masuk akal. " +
        "Pesanan sebelumnya udah selesai semua — tinggal mulai yang baru:";
      cta = { label: "Lihat layanan terbaru", href: CTA_ORDER };
      extra = gridBlock(a.grid);
      break;
    }
    case "balance_low": {
      const rp = a.balanceRp ?? 0;
      subject = "Saldo kamu tinggal sedikit, nih";
      heading = `Saldo ${hi} tinggal ${new Intl.NumberFormat("id-ID").format(rp)}`;
      intro =
        "Biar pesanan berikutnya gak tertahan, isi saldo dulu ya. Top up manual, " +
        "langsung diproses begitu kami verifikasi.";
      cta = { label: "Top up saldo", href: CTA_TOPUP };
      extra = `<div style="padding:8px 0 0 0">${emailStatStrip([
        { value: new Intl.NumberFormat("id-ID").format(rp), label: "Saldo sekarang" },
        { value: "Instan", label: "Proses verifikasi" },
      ])}</div>`;
      break;
    }
  }

  const content =
    emailHero({ eyebrow, heading, sub: intro }) +
    `<div style="height:4px"></div>` +
    extra +
    emailCta(cta);

  const html = emailShell({
    lang: "id",
    maxWidth: 600,
    mascot: POSE[trigger],
    preheader: subject,
    headerSub: "Socio.id",
    content,
    footer: emailFooterMarketing({
      unsubscribeUrl: a.unsubscribeUrl,
      preferencesUrl: a.preferencesUrl,
      address: DEFAULT_MARKETING_ADDRESS,
    }),
  });

  const text = `${heading}\n\n${intro}\n\n${cta.label}: ${cta.href}`;

  return { subject, html, text };
}
