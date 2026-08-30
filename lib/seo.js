// lib/seo.js: shared SEO utilities

import { getExcerpt, getPostExcerpt, decodeHtmlEntities } from './excerpt.mjs';

export { getExcerpt, getMetaDescription, getPostExcerpt, decodeHtmlEntities } from './excerpt.mjs';

export const SITE_URL = 'https://daily.michigantroutreport.com';
export const SITE_NAME = 'Michigan Trout Daily';
export const AUTHOR_NAME = 'Chris Izworski';
export const AUTHOR_URL = 'https://chrisizworski.com/chris-izworski/';
export const WP_SITE_ID = '254267068';
export const WP_API = `https://public-api.wordpress.com/rest/v1.1/sites/${WP_SITE_ID}`;

// An empty post is not a report. On 2026-07-22 an external publisher began
// posting stubs with a title and a completely empty body, and those stubs were
// rendered on the homepage, listed in the sitemap, and served as 200s at their
// own URLs. Publishing is now guarded in scripts/publish.py, but the display
// layer refuses them too, so a stub from any source can never surface again.
// A real report runs 500 to 1300 words, so 100 is a safe floor.
export const MIN_BODY_WORDS = 100;

export function hasRealBody(post = {}) {
  if (typeof post.content === 'string') {
    const plain = post.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return plain.split(' ').filter(Boolean).length >= MIN_BODY_WORDS;
  }
  // Sitemap requests deliberately skip the body to stay light. WordPress derives
  // the excerpt from the content, so an empty excerpt means an empty post.
  if (typeof post.excerpt === 'string') {
    return post.excerpt.replace(/<[^>]+>/g, '').trim().length > 0;
  }
  return true;
}

// Fetch all posts (server-side)

export async function getPosts(count = 20) {
  const res = await fetch(
    `${WP_API}/posts/?number=${count}&type=post&fields=ID,title,slug,date,excerpt,tags,content`,
    { next: { revalidate: 3600 } }
  );
  const data = await res.json();
  return (data.posts || [])
    .filter(p => p.slug !== 'hello-world')
    .filter(hasRealBody)
    .map(p => ({ ...p, title: decodeHtmlEntities(p.title || '') }));
}

// Fetch only the fields a sitemap needs. Avoid loading every report body on
// crawler requests and prefer WordPress's true modification time when present.
export async function getSitemapPosts(count = 100) {
  const res = await fetch(
    `${WP_API}/posts/?number=${count}&type=post&fields=slug,date,modified,excerpt`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) {
    throw new Error(`WordPress sitemap fetch failed with status ${res.status}`);
  }

  const data = await res.json();
  return (data.posts || [])
    .filter((post) => post.slug !== 'hello-world')
    .filter(hasRealBody);
}

// Build lean page props for report lists. WordPress post content and tag
// objects are useful while deriving the card copy, but should not be repeated
// in Next.js page-data JSON when the list only renders a short excerpt.
export async function getPostSummaries(
  count = 20,
  { excerptLength = 200, includeRegion = false } = {}
) {
  const posts = await getPosts(count);

  return posts.map((post) => ({
    date: post.date,
    title: post.title,
    slug: post.slug,
    excerpt: getPostExcerpt(post, excerptLength),
    ...(includeRegion ? { region: getRegion(post.tags) } : {}),
  }));
}

// Fetch single post by slug (server-side)
export async function getPost(slug) {
  const res = await fetch(`${WP_API}/posts/slug:${slug}`);
  const post = await res.json();
  // WordPress returns titles with HTML entities (for example an apostrophe as
  // &#8217;). Those are rendered as React text, which escapes the ampersand and
  // shows the raw entity to the reader. Decode once here so every consumer,
  // including the h1, the document title, Open Graph, and schema, gets clean text.
  if (post && typeof post.title === 'string') {
    post.title = decodeHtmlEntities(post.title);
  }
  return post;
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
    headline: `${AUTHOR_NAME}: ${title}`,
    description: excerpt,
    datePublished: date,
    dateModified: date,
    url: `${SITE_URL}/post/${slug}`,
    author: {
      '@type': 'Person',
      '@id': 'https://chrisizworski.com/#person',
      name: AUTHOR_NAME,
      url: AUTHOR_URL,
      sameAs: [
        AUTHOR_URL,
        'https://michigantroutreport.com',
        'https://ausable.chrisizworski.com',
        'https://troutdaily.chrisizworski.com',
        'https://birding.chrisizworski.com',
        'https://birdingdaily.chrisizworski.com',
        'https://gazette.chrisizworski.com',
        'https://lawn.chrisizworski.com',
        'https://freighterviewfarms.com',
        'https://www.wikidata.org/wiki/Q138283432',
      ],
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
      '@id': 'https://chrisizworski.com/#person',
      name: AUTHOR_NAME,
      url: AUTHOR_URL,
      sameAs: [
        AUTHOR_URL,
        'https://michigantroutreport.com',
        'https://ausable.chrisizworski.com',
        'https://troutdaily.chrisizworski.com',
        'https://birding.chrisizworski.com',
        'https://birdingdaily.chrisizworski.com',
        'https://gazette.chrisizworski.com',
        'https://lawn.chrisizworski.com',
        'https://freighterviewfarms.com',
        'https://www.wikidata.org/wiki/Q138283432',
      ],
    },
  };
}
