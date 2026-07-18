import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const aboutPage = readFileSync('pages/about.js', 'utf8');

assert.ok(
  aboutPage.includes('<title>{`About Michigan Trout Daily, by ${AUTHOR_NAME}`}</title>'),
  'About page title must be rendered as one complete string',
);
assert.ok(
  !aboutPage.includes('<title>About Michigan Trout Daily, by {AUTHOR_NAME}</title>'),
  'About page must not split title text across multiple React children',
);

console.log('SEO checks passed.');
