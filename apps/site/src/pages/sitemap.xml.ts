import type { APIRoute } from "astro";

/** Les pages à indexer. Les pages de parcours (confirmation, désinscription…) sont en noindex. */
const PAGES = ["/", "/mentions-legales/", "/confidentialite/"];

export const GET: APIRoute = ({ site }) => {
  const urls = PAGES.map((path) => `  <url><loc>${new URL(path, site)}</loc></url>`).join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
