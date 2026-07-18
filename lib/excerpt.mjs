const HTML_ENTITIES = {
  amp: '&',
  apos: "'",
  hellip: '…',
  ldquo: '“',
  lsquo: '‘',
  mdash: '—',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  rdquo: '”',
  rsquo: '’',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].join('|');

const LEADING_BYLINE = new RegExp(
  `^By\\s+Chris Izworski\\s*(?:[|·•—–-]\\s*)?` +
  `Michigan Trout Daily\\s*(?:[|·•—–-]\\s*)?` +
  `(?:${MONTHS})\\s+\\d{1,2},\\s+\\d{4}\\s*`,
  'i',
);

function decodeHtmlEntities(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z][\w]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const isHex = entity[1]?.toLowerCase() === 'x';
      const value = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);

      if (Number.isFinite(value) && value > 0 && value <= 0x10ffff) {
        return String.fromCodePoint(value);
      }

      return ' ';
    }

    return HTML_ENTITIES[entity.toLowerCase()] ?? ' ';
  });
}

function truncateAtWord(text, length) {
  if (text.length <= length) return text;

  const candidate = text.slice(0, length + 1);
  const lastSpace = candidate.lastIndexOf(' ');
  const cutAt = lastSpace >= Math.floor(length * 0.65) ? lastSpace : length;

  return `${candidate.slice(0, cutAt).trimEnd()}…`;
}

// Convert WordPress HTML into useful, human-readable card and metadata copy.
// The publisher prefix is removed only when it appears as the exact dated
// leading byline; mentions of Chris Izworski in the report itself are retained.
export function getExcerpt(html = '', length = 200) {
  const normalized = decodeHtmlEntities(String(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/```html?/gi, ' ')
    .replace(/```/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

  const text = normalized
    .replace(LEADING_BYLINE, '')
    .replace(/\[\s*…\s*\]\s*$/u, '')
    .trim();

  if (!text) return '';

  return truncateAtWord(text, length);
}

export function getPostExcerpt(post = {}, length = 200) {
  return getExcerpt(post.excerpt, length) || getExcerpt(post.content, length);
}

export function getMetaDescription(excerpt = '') {
  const text = String(excerpt).trim();

  if (!text || text.toLowerCase().startsWith('chris izworski')) return text;

  return `Chris Izworski reports: ${text}`;
}
