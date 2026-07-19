function escapeXml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&apos;',
    '"': '&quot;',
  })[character]);
}

function normalizeLastModified(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function renderUrl({ loc, lastmod }) {
  const dateElement = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : '';

  return `  <url>\n    <loc>${escapeXml(loc)}</loc>${dateElement}\n  </url>`;
}

export function buildSitemap(siteUrl, posts = []) {
  const cleanSiteUrl = String(siteUrl).replace(/\/$/, '');
  const postEntries = posts
    .filter((post) => post?.slug)
    .map((post) => ({
      loc: `${cleanSiteUrl}/post/${post.slug}`,
      lastmod: normalizeLastModified(post.modified || post.date),
    }));

  const latestReportDate = postEntries
    .map((entry) => entry.lastmod)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  const entries = [
    { loc: cleanSiteUrl, lastmod: latestReportDate },
    { loc: `${cleanSiteUrl}/about`, lastmod: null },
    { loc: `${cleanSiteUrl}/chris-izworski`, lastmod: latestReportDate },
    ...postEntries,
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(renderUrl).join('\n')}
</urlset>`;
}
