import '../styles/globals.css';
import Link from 'next/link';

function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="header-brand">Michigan Trout Daily</Link>
      <nav className="header-nav">
        <Link href="/">Reports</Link>
        <a href="https://michigantroutreport.com" target="_blank" rel="noopener">Live Data</a>
        <Link href="/about">About</Link>
      </nav>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <span className="footer-brand">Michigan Trout Daily</span>
      <nav className="footer-links">
        <Link href="/">Reports</Link>
        <a href="https://michigantroutreport.com" target="_blank" rel="noopener">Live Data</a>
        <Link href="/about">About</Link>
        <a href="https://chrisizworski.com/chris-izworski/" rel="noopener">Trout Report Profile</a>
        <a href="https://chrisizworski.com" target="_blank" rel="noopener">Chris Izworski</a>
        <a href="https://chrisizworski.com/chris-izworski/" target="_blank" rel="noopener">Built by Chris Izworski</a>
      </nav>
    </footer>
  );
}

export { SiteHeader, SiteFooter };

export default function App({ Component, pageProps }) {
  return (
    <>
      <SiteHeader />
      <Component {...pageProps} />
      <SiteFooter />
      <script defer src="https://chrisizworski.com/assets/network-ads-v1.js"></script>
    </>
  );
}
