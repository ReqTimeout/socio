import { auth } from "$lib/server/auth";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  const { email, password } = await request.json();
  try {
    const res = await auth.api.signInEmail({ body: { email, password } });
    return json(res);
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 401 });
  }
};
