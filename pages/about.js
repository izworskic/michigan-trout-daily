import Head from 'next/head';
import Link from 'next/link';
import { SITE_URL, AUTHOR_NAME, AUTHOR_URL } from '../lib/seo';

export default function About() {
  return (
    <>
      <Head>
        <title>About Michigan Trout Daily — By {AUTHOR_NAME}</title>
        <meta name="description" content={`Michigan Trout Daily publishes daily trout stream conditions and hatch reports for Michigan anglers. Written by ${AUTHOR_NAME}.`} />
        <meta name="author" content={AUTHOR_NAME} />
        <link rel="canonical" href={`${SITE_URL}/about`} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'About Michigan Trout Daily',
          url: `${SITE_URL}/about`,
          author: { '@type': 'Person', name: AUTHOR_NAME, url: AUTHOR_URL },
        })}} />
      </Head>

      <div className="article-wrap">
        <Link href="/" className="article-back">&larr; All Reports</Link>
        <h1 className="article-title">About Michigan Trout Daily</h1>
        <div className="article-byline">
          Written and maintained by <a href={AUTHOR_URL} target="_blank" rel="noopener">{AUTHOR_NAME}</a>
        </div>

        <div className="article-body">
          <p>Michigan Trout Daily publishes one stream conditions report every morning during Michigan trout season. Each report covers a single river: current flow and water temperature from live USGS gauges, what insects are hatching given the water temperature and time of year, specific fly recommendations with hook sizes and presentation, and confirmed public access information.</p>
          <p>The site rotates through 40+ Michigan rivers with active USGS stream gauges — from the Au Sable's Holy Waters to remote Upper Peninsula brook trout water. Every major trout stream in the state eventually gets a report.</p>

          <h2>The Data</h2>
          <p>Flow and temperature data comes directly from USGS stream gauges. Hatch timing is keyed to water temperature, not just calendar date, because that is how hatches actually work. A 45-degree April river and a 45-degree October river fish very differently, even if the same insects are technically in season.</p>
          <p>The full river directory — 110+ rivers, historical conditions, hatch charts, and AI fly recommendations — lives at the <a href="https://trout.chrisizworski.com" target="_blank" rel="noopener">Michigan Trout Report</a>. That is the data engine behind this site.</p>

          <h2>Who Writes This</h2>
          <p>Michigan Trout Daily is written by <a href={AUTHOR_URL} target="_blank" rel="noopener">{AUTHOR_NAME}</a>, a Michigan angler and the founder of the Michigan Trout Report. Reports are grounded in verified USGS data and Michigan hatch knowledge accumulated across decades of published entomological research and angling literature. Nothing is invented. If gauge data is unavailable, the report says so.</p>
        </div>

        <div className="article-footer">
          <Link href="/" className="btn-outline">&larr; All Reports</Link>
          <a href="https://trout.chrisizworski.com" target="_blank" rel="noopener" className="btn-primary">Michigan Trout Report &rarr;</a>
        </div>
      </div>
    </>
  );
}
