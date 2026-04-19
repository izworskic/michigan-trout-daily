import Head from 'next/head';
import Link from 'next/link';
import { getPosts, getPost, cleanContent, getExcerpt, articleSchema, formatDate, SITE_URL, AUTHOR_NAME, AUTHOR_URL, SITE_NAME } from '../../lib/seo';

export default function PostPage({ post, schema, excerpt }) {
  if (!post) return <div style={{ padding: '60px 24px', textAlign: 'center', color: '#777' }}>Report not found.</div>;

  // Clean cron byline and ALL JSON-LD artifacts WordPress encoded into content
  const content = cleanContent(post.content || '')
    .replace(/<p[^>]*>By <a[^>]*>Chris Izworski<\/a>[^<]*<\/p>/i, '')
    .replace(/<p[^>]*>&#8220;`[\s\S]*?<\/p>/gi, '')
    .replace(/<p[^>]*>\{&#8220;@context[\s\S]*?<\/p>/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  return (
    <>
      <Head>
        <title>{`${AUTHOR_NAME}: ${post.title} | Michigan Trout Daily`}</title>
        <meta name="description" content={`${AUTHOR_NAME} reports on ${excerpt}`} />
        <meta name="author" content={AUTHOR_NAME} />
        <link rel="canonical" href={`${SITE_URL}/post/${post.slug}`} />
        <link rel="author" href={AUTHOR_URL} />
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${AUTHOR_NAME}: ${post.title}`} />
        <meta property="og:description" content={excerpt} />
        <meta property="og:url" content={`${SITE_URL}/post/${post.slug}`} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="article:author" content={AUTHOR_URL} />
        <meta property="article:published_time" content={post.date} />
        {/* Article Schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        {/* Breadcrumb Schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Chris Izworski', item: AUTHOR_URL },
            { '@type': 'ListItem', position: 2, name: 'Michigan Trout Daily', item: SITE_URL },
            { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/post/${post.slug}` },
          ]
        })}} />
      </Head>

      <div className="article-wrap">
        <Link href="/" className="article-back">&larr; All Reports</Link>

        <div className="article-date">{formatDate(post.date)}</div>
        <h1 className="article-title">{post.title}</h1>
        <div className="article-byline">
          By <a href={AUTHOR_URL} target="_blank" rel="noopener">{AUTHOR_NAME}</a>
          &nbsp;&#183;&nbsp; Michigan Trout Daily
          &nbsp;&#183;&nbsp; <a href="https://trout.chrisizworski.com" target="_blank" rel="noopener">Live River Data</a>
        </div>

        <div
          className="article-body"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        <div className="article-footer">
          <Link href="/" className="btn-outline">&larr; All Reports</Link>
          <a href="https://trout.chrisizworski.com" target="_blank" rel="noopener" className="btn-primary">Live River Data &rarr;</a>
        </div>
      </div>
    </>
  );
}

export async function getStaticPaths() {
  const posts = await getPosts(50);
  return {
    paths: posts.map(p => ({ params: { slug: p.slug } })),
    fallback: 'blocking', // New posts auto-generate on first request
  };
}

export async function getStaticProps({ params }) {
  const post = await getPost(params.slug);
  if (post.error) return { notFound: true };

  const excerpt = getExcerpt(post.excerpt || post.content, 200);
  const schema  = articleSchema({
    title:     post.title,
    slug:      post.slug,
    date:      post.date,
    excerpt,
    riverName: post.title.split(':')[0].replace('The ', '').trim(),
  });

  return {
    props: { post, schema, excerpt },
    revalidate: 86400, // Recheck daily
  };
}
