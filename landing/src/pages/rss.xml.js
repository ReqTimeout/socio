import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

// B9: RSS feed 20 artikel terakhir — sinyal freshness untuk Bing,
// agregator, dan AI crawler. Auto-discovery via <link rel="alternate"> di Layout.
export async function GET(context) {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
  return rss({
    title: "Blog Socio.id — Tips SMM & Panduan Reseller",
    description:
      "Harga real dari katalog, panduan aman beli followers, dan hitung-hitung bisnis reseller sosmed.",
    site: context.site ?? "https://socio.id",
    items: posts.slice(0, 20).map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
      categories: [post.data.category],
    })),
  });
}
