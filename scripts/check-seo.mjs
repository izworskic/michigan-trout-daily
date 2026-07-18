import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
  seoHelpers.includes('excerpt: getExcerpt(post.excerpt || post.content, excerptLength)'),
  'Report summaries must preserve the existing excerpt fallback',
);
assert.ok(
  !homePage.includes('post.content') && !homePage.includes('post.tags'),
  'Homepage must render only precomputed summary fields',
);
assert.ok(
  !archivePage.includes('post.content') && !archivePage.includes('post.tags'),
  'Archive must render only precomputed summary fields',
);

console.log('SEO checks passed.');
