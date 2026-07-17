export function formatRupiah(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export function formatNumber(n: number): string {
  return n.toLocaleString("id-ID");
}
