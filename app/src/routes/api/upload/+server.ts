import { json } from "@sveltejs/kit";
import { uploadToR2 } from "$lib/server/r2";
import type { RequestHandler } from "./$types";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX = 4_000_000;

// POST multipart form-data field `file` → R2 → { url }
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user || locals.user.level !== "Admin") {
    return json({ error: "Hanya admin." }, { status: 403 });
  }
  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file || file.size === 0) return json({ error: "File wajib." }, { status: 400 });
  if (!ALLOWED.has(file.type))
    return json(
      { error: `Tipe ${file.type} tidak didukung. Pakai jpg/png/webp/gif.` },
      { status: 400 },
    );
  if (file.size > MAX)
    return json({ error: `Maksimal ${Math.round(MAX / 1_000_000)}MB.` }, { status: 400 });

  const ext = file.type.split("/")[1] ?? "jpg";
  const key = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const url = await uploadToR2(key, buf, file.type);
  return json({ url, key });
};
