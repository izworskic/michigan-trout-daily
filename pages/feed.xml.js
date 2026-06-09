import { getPosts, getExcerpt, SITE_URL, SITE_NAME, AUTHOR_NAME } from '../lib/seo';

export default function Feed() { return null; }

const esc = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function getServerSideProps({ res }) {
  const posts = await getPosts(30);

  const items = posts.map((p) => {
    const url = `${SITE_URL}/post/${p.slug}`;
    const title = esc((p.title || '').replace(/&[a-z#0-9]+;/gi, ' ').trim());
    const desc = esc(getExcerpt(p.content || p.excerpt || '', 300));
    const pub = new Date(p.date).toUTCString();
    return `    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pub}</pubDate>
      <dc:creator>${AUTHOR_NAME}</dc:creator>
      <description>${desc}</description>
    </item>`;
  }).join('\n');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}/</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Daily Michigan trout stream reports: live USGS flows, water temperature, weather, and hatch conditions, by ${AUTHOR_NAME}.</description>
    <language>en-us</language>
    <lastBuildDate>${posts.length ? new Date(posts[0].date).toUTCString() : new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
  res.write(feed);
  res.end();

  return { props: {} };
}
