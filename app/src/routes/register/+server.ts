import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// Alias lama → route daftar rebuild (landing lama pakai /register, SEO/link lama).
// Query string dipertahankan (mis. ?mode=reseller).
export const GET: RequestHandler = ({ url }) => {
  throw redirect(301, `/daftar${url.search}`);
};
