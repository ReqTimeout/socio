/**
 * Register resolver hooks supaya selftest email bisa jalan di plain Node
 * (tanpa SvelteKit/Vite): alias `$app/*`/`$lib/*` diterjemahkan ke stub/modul
 * app asli, serta ekstensi `.js` (gaya import repo) dipetakan ke `.ts`.
 * Dipakai oleh test/email-guard, email-quota, email-activation-lanes —
 * test core lain murni relativ.
 */
import { register } from "node:module";

register("./email-resolve-hooks.mjs", import.meta.url);
