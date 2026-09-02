import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";

// D7: content collection blog — draft:true dikecualikan dari build (gate SEO §1)
const blog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/blog" }),
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
