import Head from 'next/head';
import Link from 'next/link';
import { getPosts, getExcerpt, formatDate, SITE_URL, AUTHOR_NAME, AUTHOR_URL, SITE_NAME } from '../../lib/seo';

export default function ChrisIzworskiArchive({ posts }) {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          '@id': 'https://chrisizworski.com/#person',
          name: AUTHOR_NAME,
          url: AUTHOR_URL,
          sameAs: [
            AUTHOR_URL,
            'https://trout.chrisizworski.com',
            'https://troutdaily.chrisizworski.com',
            'https://gazette.chrisizworski.com',
            'https://freighterviewfarms.com',
            'https://www.wikidata.org/wiki/Q138283432',
          ],
        },
      },
      {
        '@type': 'CollectionPage',
        url: `${SITE_URL}/chris-izworski/`,
        name: `Daily Michigan Trout Reports by ${AUTHOR_NAME}`,
        description: `Complete archive of daily Michigan trout stream reports by ${AUTHOR_NAME}.`,
        author: { '@id': 'https://chrisizworski.com/#person' },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: posts.length,
          itemListElement: posts.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE_URL}/post/${p.slug}`,
            name: p.title,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: AUTHOR_NAME, item: AUTHOR_URL },
          { '@type': 'ListItem', position: 2, name: 'Michigan Trout Daily', item: SITE_URL },
          { '@type': 'ListItem', position: 3, name: 'Daily Reports Archive', item: `${SITE_URL}/chris-izworski/` },
        ],
      },
    ],
  };

  return (
    <>
      <Head>
        <title>{`${AUTHOR_NAME} — Daily Michigan Trout Reports Archive | Michigan Trout Daily`}</title>
        <meta name="description" content={`Complete archive of daily Michigan trout stream conditions and hatch reports written by ${AUTHOR_NAME}. ${posts.length} reports from across Michigan rivers.`} />
        <meta name="author" content={AUTHOR_NAME} />
        <link rel="canonical" href={`${SITE_URL}/chris-izworski/`} />
        <link rel="author" href={AUTHOR_URL} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={`${AUTHOR_NAME} — Daily Michigan Trout Reports`} />
        <meta property="og:description" content={`${posts.length} daily Michigan trout reports by ${AUTHOR_NAME}.`} />
        <meta property="og:url" content={`${SITE_URL}/chris-izworski/`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      </Head>

      <main className="main-wrap">
        <header style={{ borderBottom: '2px solid #111', paddingBottom: 24, marginBottom: 32 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#777', marginBottom: 8 }}>
            <a href={AUTHOR_URL} style={{ color: '#777' }}>{AUTHOR_NAME}</a> &nbsp;&rsaquo;&nbsp; <Link href="/">Michigan Trout Daily</Link> &nbsp;&rsaquo;&nbsp; Daily Reports Archive
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 36, fontWeight: 700, color: '#111', marginBottom: 12 }}>
            {AUTHOR_NAME}
          </h1>
          <p style={{ fontSize: 18, color: '#444', fontStyle: 'italic', marginBottom: 8 }}>
            Daily Michigan trout stream reports — {posts.length} entries.
          </p>
          <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7 }}>
            {AUTHOR_NAME} is a Michigan angler and the founder of the <a href="https://trout.chrisizworski.com">Michigan Trout Report</a>. This page is the complete archive of his daily stream condition reports, published every morning during trout season. Each report covers one Michigan river: live USGS gauge data, what is hatching, fly recommendations, and whether the river is worth the drive that day.
          </p>
        </header>

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {posts.map(post => (
            <li key={post.slug} style={{ borderBottom: '1px solid #ddd', paddingBottom: 18, marginBottom: 18 }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.12em', color: '#888', marginBottom: 4 }}>
                {formatDate(post.date)}
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                <Link href={`/post/${post.slug}`} style={{ color: '#111', textDecoration: 'none' }}>
                  {AUTHOR_NAME}: {post.title}
                </Link>
              </h2>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>
                {getExcerpt(post.excerpt || post.content, 180)}
              </p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}

export async function getStaticProps() {
  const posts = await getPosts(100);
  return { props: { posts: posts || [] }, revalidate: 3600 };
}
