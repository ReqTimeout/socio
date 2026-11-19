import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { bannerFor } from "./src/data/blogHeroes";

// J4: <image:image> di sitemap untuk tiap artikel blog — menunjuk banner hero
// yang SAMA dengan yang tampil di halaman (mapping slug→banner di blogHeroes).
// Kategori dibaca dari frontmatter MDX supaya hasil mapping identik dengan
// heroFor(post.id, cat) di [slug].astro (tanpa ini 2 artikel reseller beda).
const BLOG_DIR = fileURLToPath(new URL("./src/content/blog/", import.meta.url));
const BANNER_URL = "https://socio.id/img/banner";

function categoryOf(slug) {
  const p = join(BLOG_DIR, `${slug}.mdx`);
  if (!existsSync(p)) return "";
  const fm = readFileSync(p, "utf8").match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return "";
  const c = fm[1].match(/^category:\s*(.+)$/m);
  return c ? c[1].trim().replace(/^["']|["']$/g, "") : "";
}

// https://astro.build/config
export default defineConfig({
  site: "https://socio.id",
  integrations: [
    svelte(),
    mdx(),
    sitemap({
      serialize(item) {
        const m = item.url.match(/^https:\/\/socio\.id\/blog\/([^/]+)\/?$/);
        if (m && m[1] !== "page") {
          const base = bannerFor(m[1], categoryOf(m[1]));
          item.img = [{ url: `${BANNER_URL}/hero-${base}-en-1200x675.webp` }];
        }
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: "auto",
  },
});
