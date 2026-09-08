/**
 * PDF export — pdfmake (pure JS, no Chromium needed).
 * Shared doc-definition helpers for orders invoice / deposits report / reporting summary.
 */
import type { TDocumentDefinitions, TCreatedPdf } from "pdfmake/interfaces";

export function idr(n: number | null | undefined): string {
  return "Rp" + Math.round(Number(n ?? 0)).toLocaleString("id-ID");
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const dt = d instanceof Date ? d : new Date(String(d).replace(" ", "T"));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const dt = d instanceof Date ? d : new Date(String(d).replace(" ", "T"));
  if (Number.isNaN(dt.getTime())) return String(d);
  return (
    dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    dt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  );
}

export function pdfHeader(title: string, subtitle: string): any[] {
  return [
    {
      columns: [
        { text: "SOCIO.ID", style: "brand", width: "auto" },
        {
          text: "SMM Panel Indonesia — socio.id",
          style: "brandSub",
          width: "*",
          margin: [4, 5, 0, 0],
        },
      ],
      margin: [0, 0, 0, 8],
    },
    {
      text: title,
      style: "h1",
      margin: [0, 0, 0, 2],
    },
    { text: subtitle, style: "sub", margin: [0, 0, 0, 12] },
  ];
}

export function pdfFooter(): any {
  return {
    columns: [
      { text: "Dokumen ini dibuat otomatis oleh sistem Socio.id", style: "footerLeft" },
      { text: "Halaman ", style: "footerRight", alignment: "right" },
    ],
    margin: [0, 12, 0, 0],
  };
}

export function summaryRow(items: Array<{ label: string; value: string }>): any {
  return {
    table: {
      widths: ["auto", "*", "auto", "*"],
      body: items.reduce<any[][]>((acc, it, i) => {
        const slot = Math.floor(i / 2);
        if (i % 2 === 0) acc.push([it.label, it.value]);
        else acc[slot].push(it.label, it.value);
        return acc;
      }, []),
    },
    layout: "noBorders",
    style: "summaryTable",
    margin: [0, 0, 0, 12],
  };
}

export function tableLayout(totalCols: number, widths: number[] | "*"): any {
  return {
    hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 0.75 : 0),
    vLineWidth: () => 0,
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: (i: number) => (i === 0 ? 5 : 3),
    paddingBottom: (i: number) => (i === 0 ? 5 : 3),
    _totalCols: totalCols,
    _widths: widths,
  };
}

export const baseDoc = (content: any[], meta: { title: string; subtitle: string; fileName: string }): TDocumentDefinitions => ({
  pageOrientation: "portrait",
  pageMargins: [30, 30, 30, 40],
  info: { title: meta.title, author: "Socio.id", subject: meta.subtitle },
  defaultStyle: {
    font: "Helvetica",
    fontSize: 9,
  },
  styles: {
    brand: { fontSize: 16, bold: true, color: "#1f2a44" },
    brandSub: { fontSize: 8, color: "#8a93a6" },
    h1: { fontSize: 14, bold: true, color: "#1f2a44" },
    h2: { fontSize: 11, bold: true, color: "#1f2a44", margin: [0, 8, 0, 4] },
    sub: { fontSize: 9, color: "#5a6478" },
    tableHeader: { fontSize: 8.5, bold: true, color: "#ffffff", fillColor: "#1f2a44" },
    tableBody: { fontSize: 8.5, color: "#1f2a44" },
    summaryLabel: { fontSize: 8.5, color: "#5a6478" },
    summaryValue: { fontSize: 9, bold: true, color: "#1f2a44" },
    footerLeft: { fontSize: 7.5, color: "#8a93a6" },
    footerRight: { fontSize: 7.5, color: "#8a93a6" },
  },
  footer: (currentPage: number, pageCount: number) => [
    {
      columns: [
        { text: "Dibuat otomatis oleh Socio.id", fontSize: 7.5, color: "#8a93a6" },
        { text: `Halaman ${currentPage} / ${pageCount}`, fontSize: 7.5, color: "#8a93a6", alignment: "right" },
      ],
    },
  ],
  content: [...pdfHeader(meta.title, meta.subtitle), ...content, pdfFooter()],
});

let pdfmakeInit = false;

export async function sendPdf(doc: TDocumentDefinitions, filename: string): Promise<Response> {
  // pdfmake CJS singleton — standard PDF fonts (Helvetica) built-in, no vfs needed
  const mod: any = await import("pdfmake");
  const pdfmake = (mod.default ?? mod) as any;
  if (!pdfmakeInit) {
    pdfmake.setFonts({
      Helvetica: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique",
      },
    });
    // restrict external downloads; allow only pdfmake's own bundled standard fonts
    pdfmake.setUrlAccessPolicy(() => false);
    pdfmake.setLocalAccessPolicy((p: string) => p.includes("pdfmake"));
    pdfmakeInit = true;
  }

  const pdfDoc = pdfmake.createPdf(doc);
  const buf: Buffer = await pdfDoc.getBuffer();

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buf.length),
    },
  });
}
