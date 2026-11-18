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
  emailPriceCard,
  emailServiceGrid,
  emailStatStrip,
  emailAbsoluteUrl,
  emailFooterMarketing,
  DEFAULT_MARKETING_ADDRESS,
  escapeHtml,
  type SparkoPose,
} from "$lib/server/email/render.js";
import { EMAIL_COLORS as C, EMAIL_FONTS as F } from "$lib/server/email/tokens.js";
import {
  formatRupiah,
  getDepositBonusRate,
  getTopupMin,
  getResellerBonus,
  getResellerActivationAmount,
} from "$lib/format";
import { resellerActivationHours } from "$lib/server/signup.js";
import type { GridItem, SegmentKey } from "./segments.js";

export interface LifecycleTemplateArgs {
  name: string;
  /** URL halaman konfirmasi manusia (/u/...) untuk link footer. */
  unsubscribeUrl: string;
  preferencesUrl: string;
  grid: GridItem[];
  /** Saldo dalam Rupiah — balance_low DAN activation (WP7: saldo 0 = belum
   *  pernah deposit → copy/CTA top-up dulu, bukan order). */
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
  deposit_canceled: "wave",
  reseller_unpaid: "celebrate",
};

const CTA_ORDER = emailAbsoluteUrl("/pesan");
const CTA_TOPUP = emailAbsoluteUrl("/saldo/top-up");
const CTA_RESELLER = emailAbsoluteUrl("/reseller");

/** Langkah bernomor (tabel HTML inline, warna dari token DNA). */
function steps(items: { title: string; desc: string }[]): string {
  const rows = items
    .map(
      (it, i) => `<tr>
        <td width="28" valign="top" style="padding:6px 8px 6px 0">
          <div style="font-family:${F.display};font-size:15px;font-weight:800;color:${C.accentInk}">${i + 1}</div>
        </td>
        <td valign="top" style="padding:6px 0">
          <div style="font-family:${F.sans};font-size:14px;font-weight:700;color:${C.inkTitle}">${it.title}</div>
          <div style="font-family:${F.sans};font-size:13px;line-height:1.55;color:${C.inkBody};margin-top:2px">${it.desc}</div>
        </td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:14px 0">${rows}</table>`;
}

/** Kartu bonus deposit dari env (jangan janji bila rate 0). */
function bonusCard(): string {
  const pct = Math.round(getDepositBonusRate() * 100);
  const min = formatRupiah(getTopupMin());
  if (pct <= 0) {
    return `<p style="margin:12px 0 0;font-family:${F.sans};font-size:13px;line-height:1.6;color:${C.inkBody}">Minimum top-up ${min}. Bayar via transfer BCA — tanpa kartu, tanpa langganan.</p>`;
  }
  return emailPriceCard({
    label: "Bonus deposit",
    price: `+${pct}%`,
    note: `Ditambahkan ke setiap top-up yang terkonfirmasi. Minimum top-up ${min}.`,
  });
}

/** Tiga langkah top-up yang sama dengan UI app (WP6): nominal PAS + kode unik
 *  3 digit, konfirmasi manual admin via mutasi BCA. */
function topupSteps(): string {
  return steps([
    {
      title: "Top up via transfer BCA",
      desc: "Pilih nominal, transfer pas sesuai total — termasuk 3 digit terakhir (kode unik) supaya transfernya cocok ke akunmu.",
    },
    {
      title: "Saldo kami kredit",
      desc: "Begitu admin verifikasi mutasi, saldo plus bonus masuk dan kami kabari via email. Upload bukti opsional.",
    },
    {
      title: "Buat pesanan pertama",
      desc: "Pilih layanan, tempel link, bayar dari saldo — kamu hanya bayar sesuai yang dipesan.",
    },
  ]);
}

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
      // WP7 — activation sadar deposit: saldo 0 = belum pernah deposit →
      // arahkan ke top-up DULU. Mengirim mereka ke /pesan adalah jalan buntu
      // (tanpa saldo, order tidak bisa dibuat).
      const needsDeposit = Number(a.balanceRp ?? 0) <= 0;
      if (needsDeposit) {
        subject = "Tinggal satu top-up lagi menuju pesanan pertamamu";
        eyebrow = "Mulai dari sini";
        heading = `Akunmu sudah siap, ${hi} — isi saldo untuk mulai`;
        intro =
          "Kamu tinggal satu top-up lagi dari pesanan pertama. Transfer BCA nominal pas — " +
          "saldo masuk begitu admin verifikasi, lalu pilih layanan dan tempel link.";
        cta = { label: "Top up & mulai", href: CTA_TOPUP };
        extra = topupSteps() + bonusCard() + gridBlock(a.grid);
        break;
      }
      subject = "Sparko nyapa — pesanan pertama di Socio.id cuma 1 menit";
      eyebrow = "Buat kamu yang baru";
      heading = `Halo ${hi}, siap coba pesanan pertama?`;
      intro =
        "Kamu udah daftar tapi belum sempat nyoba. Isi saldo, pilih layanan, tempel link — " +
        "prosesnya otomatis dan harganya transparan. Nih beberapa layanan yang paling laris:";
      extra = gridBlock(a.grid);
      break;
    }
    case "deposit_canceled": {
      // WP7 — winback deposit BATAL. Copy JUJUR: jangan klaim "tidak ada
      // tagihan" — user mungkin sudah transfer tapi belum cocok. Yang benar:
      // saldo tidak bertambah, dan bukti transfer bisa dikirim untuk dicocokkan.
      subject = "Invoice top-up kamu kedaluwarsa — buat baru dalam 1 menit";
      eyebrow = "Lanjutkan yang tertunda";
      heading = `Yuk bereskan saldo kamu, ${hi}`;
      intro =
        "Invoice top-up sebelumnya kedaluwarsa sebelum transfernya cocok, jadi saldo tidak " +
        "bertambah. Bikin invoice baru kurang dari semenit:";
      cta = { label: "Buat top-up baru", href: CTA_TOPUP };
      extra =
        topupSteps() +
        bonusCard() +
        `<p style="margin:12px 0 0;font-family:${F.sans};font-size:13px;line-height:1.6;color:${C.inkBody}">Sudah terlanjur transfer? Balas email ini dengan bukti transfer — kami cocokkan ke akunmu.</p>`;
      break;
    }
    case "reseller_unpaid": {
      // WP7 — reseller belum bayar aktivasi. Nilai bersih dari env (base −
      // saldo termasuk), bukan hardcode. Invoice hidup TIDAK masuk segmen ini
      // (reminder transaksional H-2/H-1 sedang jalan) → copy mengajak TERBITKAN
      // invoice aktivasi baru di /reseller, bukan bayar invoice lama.
      const base = getResellerActivationAmount();
      const bonus = getResellerBonus();
      const net = Math.max(0, base - bonus);
      const hasBonus = bonus > 0;
      const hours = resellerActivationHours();
      subject = hasBonus
        ? `Selesaikan aktivasi reseller — bersih ${formatRupiah(net)} setelah saldo ${formatRupiah(bonus)}`
        : `Selesaikan aktivasi reseller kamu, ${hi}`;
      eyebrow = "Aktivasi Reseller";
      heading = `Harga grosir tinggal selangkah lagi, ${hi}`;
      intro = hasBonus
        ? `Aktivasi sekali bayar ${formatRupiah(base)} dan saldo ${formatRupiah(bonus)} sudah termasuk — bersih ${formatRupiah(net)} untuk harga reseller di semua layanan, permanen.`
        : `Aktivasi sekali bayar ${formatRupiah(base)} dan dapatkan harga reseller di semua layanan, permanen.`;
      cta = { label: "Selesaikan aktivasi", href: CTA_RESELLER };
      extra =
        `<div style="padding:8px 0 0 0">${emailStatStrip([
          { value: formatRupiah(base), label: "Aktivasi sekali bayar" },
          ...(hasBonus ? [{ value: formatRupiah(bonus), label: "Saldo termasuk" }] : []),
          { value: formatRupiah(net), label: "Biaya bersih" },
        ])}</div>` +
        steps([
          {
            title: "Terbitkan invoice aktivasi",
            desc: `Buka halaman reseller dan minta invoice — berlaku ${hours} jam dan instruksinya dikirim ke emailmu.`,
          },
          {
            title: "Transfer sesuai nominal",
            desc: "Transfer BCA pas sesuai nominal, termasuk 3 digit terakhir (kode unik pencocokan).",
          },
          {
            title: "Mulai order dengan harga reseller",
            desc: hasBonus
              ? `Akunmu aktif otomatis begitu pembayaran diterima, dan saldo ${formatRupiah(bonus)} siap dipakai.`
              : "Akunmu aktif otomatis begitu pembayaran diterima — harga reseller berlaku di semua layanan.",
          },
        ]);
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
