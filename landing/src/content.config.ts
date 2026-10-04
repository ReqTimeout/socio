import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";
import { resolve } from "node:path";

// D7: content collection blog — draft:true dikecualikan dari build (gate SEO §1)
// SEO_CONTENT_DIR env: path absolut ke repo konten terpisah (Sprint 0 plan).
// Default: landing/src/content/blog (monorepo mode, backward compatible).
const blogDir = process.env.SEO_CONTENT_DIR
  ? resolve(process.env.SEO_CONTENT_DIR)
  : "./src/content/blog";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: blogDir }),
  schema: z.object({
    title: z.string().max(70, "Judul ≤70 karakter (CTR SERP)"),
    description: z.string().max(160),
    pubDate: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.enum(["Followers", "TikTok", "Reseller", "Lainnya"]),
    draft: z.boolean().default(true),
    faq: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .min(5)
      .max(5, "FAQ tepat 5 item (gate format)"),
    related: z.array(reference("blog")).max(3).default([]),
  }),
});

export const collections = { blog };
