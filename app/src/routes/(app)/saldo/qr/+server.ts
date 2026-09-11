import type { RequestHandler } from "./$types";
import QRCode from "qrcode";

/**
 * QR pembayaran lokal (pengganti api.qrserver.com pihak ketiga).
 * Alasan: privasi (norek+nominal tidak bocor ke eksternal) + reliabilitas
 * (tidak mati bila API eksternal down) + SVG tajam di semua DPI.
 */
export const GET: RequestHandler = async ({ url }) => {
  const text = String(url.searchParams.get("data") ?? "").slice(0, 200);
  if (!text) return new Response("missing data", { status: 400 });
  try {
    const svg = await QRCode.toString(text, {
      type: "svg",
      margin: 0,
      width: 360,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("qr failed", { status: 500 });
  }
};
