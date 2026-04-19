import { getPosts, SITE_URL } from '../lib/seo';

export default function Sitemap() { return null; }

export async function getServerSideProps({ res }) {
  const posts = await getPosts(100);

  const staticPages = ['', '/about'];
  const postUrls = posts.map(p => `/post/${p.slug}`);
  const allUrls  = [...staticPages, ...postUrls];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(url => `  <url>
    <loc>${SITE_URL}${url}</loc>
    <changefreq>${url === '' ? 'daily' : 'weekly'}</changefreq>
    <priority>${url === '' ? '1.0' : url.includes('/post/') ? '0.8' : '0.6'}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
  res.write(sitemap);
  res.end();

  return { props: {} };
}
