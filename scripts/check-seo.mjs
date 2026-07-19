import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getExcerpt, getMetaDescription, getPostExcerpt } from '../lib/excerpt.mjs';
import { buildSitemap } from '../lib/sitemap.mjs';

const aboutPage = readFileSync('pages/about.js', 'utf8');
const homePage = readFileSync('pages/index.js', 'utf8');
const archivePage = readFileSync('pages/chris-izworski/index.js', 'utf8');
const seoHelpers = readFileSync('lib/seo.js', 'utf8');

assert.ok(
  aboutPage.includes('<title>{`About Michigan Trout Daily, by ${AUTHOR_NAME}`}</title>'),
  'About page title must be rendered as one complete string',
);
assert.ok(
  !aboutPage.includes('<title>About Michigan Trout Daily, by {AUTHOR_NAME}</title>'),
  'About page must not split title text across multiple React children',
);

assert.ok(
  homePage.includes('getPostSummaries(20, {'),
  'Homepage must return lean report summaries',
);
assert.ok(
  archivePage.includes('getPostSummaries(100, { excerptLength: 180 })'),
  'Archive must return lean report summaries',
);
assert.ok(
  seoHelpers.includes('excerpt: getPostExcerpt(post, excerptLength)'),
  'Report summaries must use the tested WordPress excerpt fallback',
);
assert.ok(
  !homePage.includes('post.content') && !homePage.includes('post.tags'),
  'Homepage must render only precomputed summary fields',
);
assert.ok(
  !archivePage.includes('post.content') && !archivePage.includes('post.tags'),
  'Archive must render only precomputed summary fields',
);

const wordpressExcerpt = '<p>By Chris Izworski &nbsp;|&nbsp; Michigan Trout Daily &nbsp;|&nbsp; July 18, 2026 Chris Izworski, reporting from Michigan on the current state of the Black River this Saturday morning. The gauge reads 21 cubic feet per second and the clarity is exceptional. [&hellip;]</p>';
const cleanedExcerpt = getExcerpt(wordpressExcerpt, 220);

assert.ok(
  cleanedExcerpt.startsWith('Chris Izworski, reporting from Michigan'),
  'WordPress excerpts must retain the report after removing the dated byline',
);
assert.ok(
  !cleanedExcerpt.startsWith('By Chris Izworski'),
  'Card copy must not repeat the publisher byline prefix',
);
assert.ok(
  cleanedExcerpt.includes('clarity is exceptional.'),
  'WordPress trailing excerpt markers must be removed without deleting report copy',
);

assert.equal(
  getExcerpt('<p>The UP&#8217;s rivers are fishing well.</p>'),
  'The UP’s rivers are fishing well.',
  'Numeric WordPress entities must remain readable',
);

assert.equal(
  getExcerpt('<p>Michigan Trout Daily reports verified conditions.</p>'),
  'Michigan Trout Daily reports verified conditions.',
  'Non-byline mentions of the publication must be retained',
);

assert.equal(
  getPostExcerpt({
    excerpt: '<p>By Chris Izworski | Michigan Trout Daily | July 18, 2026</p>',
    content: '<p>By Chris Izworski | Michigan Trout Daily | July 18, 2026</p><p>Stable flow and cool water make this a good morning window.</p>',
  }),
  'Stable flow and cool water make this a good morning window.',
  'Full post content must provide a fallback when WordPress returns a byline-only excerpt',
);

const truncatedExcerpt = getExcerpt(
  '<p>This deliberately long report sentence verifies that descriptions stop cleanly at a word boundary instead of cutting through a word in search results.</p>',
  80,
);
assert.ok(truncatedExcerpt.endsWith('…'), 'Long excerpts must use one clean ellipsis');
assert.ok(!truncatedExcerpt.endsWith(' ...'), 'Long excerpts must not append duplicate periods');

assert.equal(
  getMetaDescription('Chris Izworski, reporting from Michigan on the Black River.'),
  'Chris Izworski, reporting from Michigan on the Black River.',
  'Article descriptions must not repeat the author name',
);
assert.equal(
  getMetaDescription('Stable flows make this a good morning window.'),
  'Chris Izworski reports: Stable flows make this a good morning window.',
  'Article descriptions must retain the author signal when the report copy omits it',
);

const sitemap = buildSitemap('https://daily.michigantroutreport.com/', [
  {
    slug: 'older-report',
    date: '2026-07-17T09:31:36-04:00',
    modified: '2026-07-17T10:00:00-04:00',
  },
  {
    slug: 'newer-&-report',
    date: '2026-07-18T10:31:05-04:00',
  },
]);

assert.equal(
  (sitemap.match(/<url>/g) || []).length,
  5,
  'Sitemap must include three index pages plus every report',
);
assert.equal(
  (sitemap.match(/<lastmod>/g) || []).length,
  4,
  'Sitemap must date rolling pages and reports without inventing an About-page date',
);
assert.ok(
  sitemap.includes('<lastmod>2026-07-18T14:31:05.000Z</lastmod>'),
  'Rolling pages must use the newest report timestamp',
);
assert.ok(
  sitemap.includes('<lastmod>2026-07-17T14:00:00.000Z</lastmod>'),
  'Report URLs must prefer the WordPress modification timestamp',
);
assert.ok(
  sitemap.includes('/post/newer-&amp;-report'),
  'Sitemap URLs must be XML escaped',
);
assert.ok(!sitemap.includes('<changefreq>'), 'Sitemap must not emit ignored changefreq hints');
assert.ok(!sitemap.includes('<priority>'), 'Sitemap must not emit ignored priority hints');

console.log('SEO checks passed.');
