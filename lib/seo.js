// lib/seo.js — shared SEO utilities

export const SITE_URL = 'https://troutdaily.chrisizworski.com';
export const SITE_NAME = 'Michigan Trout Daily';
export const AUTHOR_NAME = 'Chris Izworski';
export const AUTHOR_URL = 'https://chrisizworski.com';
export const WP_SITE_ID = '254267068';
export const WP_API = `https://public-api.wordpress.com/rest/v1.1/sites/${WP_SITE_ID}`;

// Fetch all posts (server-side)
export async function getPosts(count = 20) {
  const res = await fetch(
    `${WP_API}/posts/?number=${count}&type=post&fields=ID,title,slug,date,excerpt,tags,content`,
    { next: { revalidate: 3600 } }
  );
  const data = await res.json();
  return (data.posts || []).filter(p => p.slug !== 'hello-world');
}

// Fetch single post by slug (server-side)
export async function getPost(slug) {
  const res = await fetch(`${WP_API}/posts/slug:${slug}`);
  return res.json();
}

// Clean model artifacts from content
export function cleanContent(html = '') {
  return html
    .replace(/^```html?\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}

// Extract clean text excerpt
export function getExcerpt(html = '', length = 200) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/&#\d+;/gi, ' ')
    .replace(/```html?/g, '')
    .replace(/```/g, '')
    .replace(/By Chris Izworski[^\n]*/i, '')
    .replace(/Michigan Trout Daily[^\n]*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, length) + '...';
}

// Extract region from tags
export function getRegion(tags = {}) {
  const names = Object.values(tags).map(t => t.name);
  if (names.some(n => n.includes('Upper Peninsula'))) return 'Upper Peninsula';
  if (names.some(n => n.includes('Northern Lower'))) return 'Northern Lower Peninsula';
  if (names.some(n => n.includes('Au Sable'))) return 'Au Sable';
  if (names.some(n => n.includes('Manistee'))) return 'West Michigan';
  return null;
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
}

// Article JSON-LD schema
export function articleSchema({ title, slug, date, excerpt, riverName }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: excerpt,
    datePublished: date,
    dateModified: date,
    url: `${SITE_URL}/post/${slug}`,
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: AUTHOR_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    about: riverName ? { '@type': 'Place', name: riverName } : undefined,
    keywords: `${riverName}, michigan trout fishing, fly fishing michigan, trout stream conditions, USGS stream gauge, ${AUTHOR_NAME}`,
  };
}

// WebSite + Person schema for homepage
export function siteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: `Daily Michigan trout stream conditions, hatch reports, and fly fishing intelligence. By ${AUTHOR_NAME}.`,
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: AUTHOR_URL,
      sameAs: [
        AUTHOR_URL,
        'https://trout.chrisizworski.com',
        'https://troutdaily.chrisizworski.com',
        'https://freighterviewfarms.com',
        'https://www.wikidata.org/wiki/Q138283432',
      ],
    },
  };
}
