import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    // Inline tiny route styles to avoid extra render-blocking requests. Keep the
    // shared Tailwind sheet external so it remains cacheable across admin pages.
    inlineStyleThreshold: 4096,
    // Cek origin CSRF bawaan framework dimatikan; proteksi yang sama dipindah
    // ke csrfGuardHook di hooks.server.ts supaya /api/v1 (API mesin berbasis
    // key, bukan cookie) bisa menerima POST form tanpa header Origin dari
    // klien panel SMM. Route browser tetap dilindungi persis seperti bawaan.
    csrf: { checkOrigin: false },
  },
};

export default config;
