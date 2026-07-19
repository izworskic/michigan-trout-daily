import { getSitemapPosts, SITE_URL } from '../lib/seo';
import { buildSitemap } from '../lib/sitemap.mjs';

export default function Sitemap() { return null; }

export async function getServerSideProps({ res }) {
  const posts = await getSitemapPosts(100);
  const sitemap = buildSitemap(SITE_URL, posts);

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
  res.end(sitemap);

  return { props: {} };
}
