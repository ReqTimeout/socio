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
  },
};

export default config;
