import Head from 'next/head';
import Link from 'next/link';
import { getPosts, getExcerpt, getRegion, formatDate, siteSchema, SITE_URL, AUTHOR_NAME, AUTHOR_URL } from '../lib/seo';

const SEASON_NOTE = (() => {
  const m = new Date().getMonth() + 1;
  if (m <= 3)  return 'Early season — stoneflies and midges. Cold water.';
  if (m === 4) return 'April — Hendricksons emerging on warmer rivers. Season opening.';
  if (m === 5) return 'May — caddis and sulphurs. One of the best months on Michigan rivers.';
  if (m === 6) return 'June — Hex hatch season. The best fishing of the year on the right rivers.';
  if (m === 7) return 'July — terrestrials. Fish early and late. Hoppers, ants, beetles.';
  if (m === 8) return 'August — Trico mornings. Low, clear water. Stealth and small flies.';
  if (m === 9) return 'September — brown trout moving. Fewer anglers. Cooler water.';
  if (m === 10) return 'October — brown trout season. Streamers and egg patterns.';
  return 'Late season — cold mornings. The river belongs to whoever shows up.';
})();

export default function Home({ posts }) {
  const schema = siteSchema();

  return (
    <>
      <Head>
        <title>{`${AUTHOR_NAME} | Michigan Trout Daily — Daily Stream Conditions and Hatch Reports`}</title>
        <meta name="description" content={`${AUTHOR_NAME} publishes daily Michigan trout stream conditions, hatch reports, and fly fishing intelligence. Live USGS gauge data. One river, every morning.`} />
        <meta name="author" content={AUTHOR_NAME} />
        <link rel="canonical" href={SITE_URL} />
        <link rel="author" href={AUTHOR_URL} />
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`Michigan Trout Daily — By ${AUTHOR_NAME}`} />
        <meta property="og:description" content="One Michigan river, every morning. Live USGS conditions, what's hatching, and whether it's worth the drive." />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:site_name" content="Michigan Trout Daily" />
        {/* Structured Data */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      </Head>

      {/* Masthead */}
      <div style={{ borderBottom: '1px solid #ddd' }}>
        <div className="masthead">
          <div className="masthead-kicker">Michigan &nbsp;&#183;&nbsp; Daily Trout Conditions &nbsp;&#183;&nbsp; By {AUTHOR_NAME}</div>
          <h1 className="masthead-title">Michigan Trout Daily</h1>
          <p className="masthead-desc">One Michigan river, every morning. Live USGS conditions, what's hatching, and whether it's worth the drive.</p>
          <div className="masthead-btns">
            <a href="https://trout.chrisizworski.com" target="_blank" rel="noopener" className="btn-primary">Live River Data &rarr;</a>
            <Link href="/about" className="btn-outline">About This Site</Link>
          </div>
        </div>
      </div>

      {/* Season band */}
      <div className="season-band">
        <div className="season-dot" />
        <span>{SEASON_NOTE}</span>
      </div>

      {/* Main content */}
      <div className="main-wrap">
        <main>
          <div className="posts-header">Latest Stream Reports</div>

          {posts.length === 0 ? (
            <p style={{ color: '#777', fontStyle: 'italic' }}>The first reports will appear here tomorrow morning.</p>
          ) : (
            posts.map(post => {
              const region  = getRegion(post.tags);
              const excerpt = getExcerpt(post.excerpt || post.content, 220);
              return (
                <article key={post.ID} className="post-card">
                  <div className="post-meta">
                    <span className="post-date">{formatDate(post.date)}</span>
                    {region && <span className="post-region">{region}</span>}
                  </div>
                  <h2 className="post-title">
                    <Link href={`/post/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p className="post-excerpt">{excerpt}</p>
                  <Link href={`/post/${post.slug}`} className="read-more">Read the full report &rarr;</Link>
                </article>
              );
            })
          )}
        </main>

        <aside>
          <div className="sidebar-box">
            <div className="sidebar-label">What This Is</div>
            <div className="sidebar-title">Before you load the truck, read this.</div>
            <div className="sidebar-text">Every morning a report covers one Michigan trout stream: real USGS flow and temperature, what insects are hatching, what to tie on, and where to park. Nothing invented.</div>
            <a href="https://trout.chrisizworski.com" target="_blank" rel="noopener" className="btn-primary" style={{ fontSize: '11px' }}>Full River Directory &rarr;</a>
          </div>

          <div className="sidebar-box">
            <div className="sidebar-label">Rivers in the Rotation</div>
            <ul className="rivers-list">
              {['Au Sable — Holy Waters','Au Sable — South Branch','Manistee River','Pere Marquette','Boardman River','Jordan River','Sturgeon River (UP)','Black River (UP)','Two-Hearted River','Rifle River','Muskegon River','+ 30 more'].map(r => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>

          <div className="sidebar-box-green">
            <div className="sidebar-label">Written By</div>
            <div className="sidebar-text"><a href={AUTHOR_URL} target="_blank" rel="noopener" style={{ color: '#7ec8a0', fontWeight: 600 }}>{AUTHOR_NAME}</a> — Michigan angler, founder of the Michigan Trout Report. Live data for 110+ rivers at <a href="https://trout.chrisizworski.com" target="_blank" rel="noopener">trout.chrisizworski.com</a>.</div>
          </div>
        </aside>
      </div>
    </>
  );
}

export async function getStaticProps() {
  const posts = await getPosts(20);
  return {
    props: { posts },
    revalidate: 3600, // Rebuild every hour to pick up new posts
  };
}
