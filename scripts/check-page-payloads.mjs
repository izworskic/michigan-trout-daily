import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const MAX_PAGE_DATA_BYTES = 128 * 1024;
const pages = [
  ['Homepage', '.next/server/pages/index.json'],
  ['Archive', '.next/server/pages/chris-izworski.json'],
];

for (const [label, file] of pages) {
  const [{ size }, source] = await Promise.all([
    stat(file),
    readFile(file, 'utf8'),
  ]);
  const data = JSON.parse(source);
  const posts = data.pageProps?.posts || [];

  assert.ok(
    size < MAX_PAGE_DATA_BYTES,
    `${label} page data is ${size} bytes; expected less than ${MAX_PAGE_DATA_BYTES}`,
  );
  assert.ok(
    posts.every((post) => !Object.hasOwn(post, 'content') && !Object.hasOwn(post, 'tags')),
    `${label} page data must not serialize full content or WordPress tag objects`,
  );

  console.log(`${label} page data: ${(size / 1024).toFixed(1)} KB across ${posts.length} reports.`);
}
