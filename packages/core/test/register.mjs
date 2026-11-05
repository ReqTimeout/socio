/**
 * Register resolver hooks supaya selftest email bisa jalan di plain Node
 * (tanpa SvelteKit/Vite): alias `$app/*` diterjemahkan ke stub, serta
 * ekstensi `.js` (gaya import repo) dipetakan ke `.ts`. Dipakai hanya oleh
 * test/email-guard.test.ts — test core lain murni relativ.
 */
import { register } from "node:module";

register("./email-resolve-hooks.mjs", import.meta.url);
