/**
 * Midtrans Snap API helper.
 * Docs: https://docs.midtrans.com/reference/getting-started-1
 *
 * Snap token digunakan di client untuk load Snap payment page.
 * Setelah pembayaran, Midtrans kirim notification ke /api/webhook/midtrans.
 */
const SNAP_BASE =
  process.env.MIDTRANS_SNAP_URL ??
  (process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com/snap/v1"
    : "https://app.sandbox.midtrans.com/snap/v1");

interface SnapResponse {
  token: string;
  redirect_url: string;
}

export async function createSnapToken(params: {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  itemName?: string;
}): Promise<SnapResponse> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY not set");

  const body = {
    transaction_details: { order_id: params.orderId, gross_amount: params.amount },
    customer_details: {
      first_name: params.customerName.slice(0, 50),
      email: params.customerEmail,
    },
    item_details: [
      {
        id: "TOPUP",
        name: params.itemName ?? "Top Up Saldo Socio.id",
        price: params.amount,
        quantity: 1,
      },
    ],
    enabled_payments: ["bank_transfer", "gopay", "shopeepay", "qris"],
  };

  const res = await fetch(`${SNAP_BASE}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Basic " + Buffer.from(serverKey + ":").toString("base64"),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Midtrans Snap error ${res.status}: ${err.slice(0, 200)}`);
  }

  return (await res.json()) as SnapResponse;
}
