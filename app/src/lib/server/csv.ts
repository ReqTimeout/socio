/**
 * CSV export utility — generate RFC 4180-compliant CSV dengan UTF-8 BOM
 * (supaya Excel Indonesia render karakter dengan benar).
 *
 * Usage:
 *   import { toCsv, sendCsv } from "$lib/server/csv";
 *
 *   const csv = toCsv(rows, [
 *     { header: "ID", value: (r) => r.id },
 *     { header: "Username", value: (r) => r.username },
 *   ]);
 *   sendCsv(csv, "users-2026-09-04.csv");
 *
 * @security
 *   - Jangan terima header dinamis dari URL (CSV injection / formula execution
 *     di Excel — prefix '=' / '+' / '-' / '@' harus di-escape).
 *   - Rate-limit per-IP (export endpoint mahal).
 */
export type CsvColumn<T> = {
  /** Display name di header row. */
  header: string;
  /** Value extractor untuk cell. Function dipanggil per row. */
  value: (row: T) => string | number | boolean | null | undefined;
  /** Optional: format numeric/date string. */
  format?: (v: unknown) => string;
};

/** Escape satu cell value (quote kalau mengandung koma, quote, atau newline). */
function escapeCell(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  const s = String(raw);
  // CSV injection guard — Excel formula execution prevention
  // Jika cell mulai dengan =, +, -, @ → prefix dengan apostrof + quote
  const needsFormulaGuard = /^[=+\-@\t\r]/.test(s);
  const needsQuote = /[",\r\n]/.test(s) || needsFormulaGuard;
  const safe = needsFormulaGuard ? "'" + s : s;
  if (!needsQuote) return safe;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Generate CSV body string (tanpa BOM). */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const v = c.value(row);
          return escapeCell(c.format ? c.format(v) : v);
        })
        .join(","),
    )
    .join("\r\n");
  return `${header}\r\n${body}`;
}

/** Generate CSV dengan UTF-8 BOM prefix (supaya Excel render UTF-8 dengan benar). */
export function toCsvUtf8<T>(rows: T[], columns: CsvColumn<T>[]): string {
  return "\uFEFF" + toCsv(rows, columns);
}

/** Return SvelteKit Response untuk download CSV. */
export function sendCsv(csv: string, filename: string, init?: ResponseInit): Response {
  return new Response(csv, {
    ...init,
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });
}

/** Format ISO date → YYYY-MM-DD untuk filename suffix. */
export function dateStamp(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
