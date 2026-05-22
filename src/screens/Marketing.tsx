import { useEffect, useState } from "react";

type AdminBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  status: "draft" | "published" | "archived";
  tags: string[];
  author_email?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const loginSportsImage = "/images/login-sports-montage.webp";
const sportsEdgeMarketsLogo = "/images/sportsedge-markets-logo.png";
const sportsEdgeMark = "/images/sportsedge-markets-mark.png";

const FALLBACK_BLOG_ARTICLES = [
  { title: "Market structure", excerpt: "Why exchange liquidity, bookmaker anchors and news timing need one screen." },
  { title: "Football coverage", excerpt: "How SportsEdge separates fixture truth from venue-specific market availability." },
  { title: "Bias signals", excerpt: "Turning fragmented prices into a readable institutional market picture." }
];

function sportsEdgeApiUrl(path: string) {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return path;
  return `https://api.sportsedge.markets${path}`;
}

export default function MarketingLandingPage({ section = "home" }: { section?: "home" | "signup" | "about" | "terms" | "privacy" }) {
  const [accessOpen, setAccessOpen] = useState(section === "signup");
  const [blogPosts, setBlogPosts] = useState<AdminBlogPost[]>([]);
  const policyCopy = section === "terms"
    ? "Terminal access is permissioned, data is source-attributed, and production trading features are subject to venue terms, account approval and risk controls."
    : "SportsEdge collects only the account, session and operational data required to run the terminal, secure access, and improve market intelligence workflows.";
  const articles = blogPosts.length ? blogPosts.slice(0, 3) : FALLBACK_BLOG_ARTICLES;

  useEffect(() => {
    let cancelled = false;
    async function loadBlogPosts() {
      try {
        const response = await fetch(sportsEdgeApiUrl("/blog-posts"), { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.posts)) return;
        if (!cancelled) setBlogPosts(payload.posts);
      } catch {
        // Static landing notes remain available if the CMS endpoint is not live.
      }
    }
    loadBlogPosts();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="landing-page">
      <header className="landing-topbar">
        <a className="landing-brand" href="/" aria-label="SportsEdge landing">
          <img src={sportsEdgeMarketsLogo} alt="SportsEdge" />
        </a>
        <nav aria-label="SportsEdge site navigation">
          <a className={section === "about" ? "active" : ""} href="#about">About</a>
          <a href="#blog">Blog</a>
          <a href="#login">Login</a>
          <button className="primary" type="button" onClick={() => setAccessOpen(true)}>Sign up</button>
        </nav>
      </header>

      <section className="landing-hero" aria-label="SportsEdge terminal overview">
        <img src={loginSportsImage} alt="" />
        <div className="landing-hero-overlay" />
        <div className="landing-hero-content">
          <span>SportsEdge Terminal</span>
          <h1>One market picture for sports trading intelligence.</h1>
          <p>Exchange-backed fixtures, liquidity, news context and bias signals in a professional terminal built for fast scanning.</p>
          <div className="landing-actions">
            <a href="#login">Login</a>
            <button type="button" onClick={() => setAccessOpen(true)}>Request access</button>
          </div>
        </div>
        <div className="landing-terminal-stage" aria-hidden="true">
          <div className="landing-terminal-duo">
            <div className="landing-terminal-mockup primary-screen">
              <div className="landing-terminal-top">
                <span>SportsEdge Football</span>
                <span>BF / MB / SX</span>
                <strong>Live</strong>
              </div>
              <div className="landing-terminal-tabs">
                {["Today", "UK", "UEFA", "Bias Matrix", "Arbs"].map((item) => <span key={item}>{item}</span>)}
              </div>
              <div className="landing-terminal-kpis">
                {[
                  ["Markets", "1974"],
                  ["Live", "312"],
                  ["Liquidity", "£4.8m"],
                  ["Fresh", "1.2s"]
                ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
              </div>
              <div className="landing-terminal-grid">
                <div className="landing-terminal-head">
                  <span>Time</span><span>Fixture</span><span>Coverage</span><span>Bias</span><span>Liquidity</span>
                </div>
                {[
                  ["15:00", "Brighton vs Manchester United", "BF MB SX", "Consensus +0.8", "£470k"],
                  ["15:00", "Crystal Palace vs Arsenal", "BF MB", "Away pressure", "£318k"],
                  ["17:30", "Hull City vs Southampton", "MB", "Single route", "£113k"],
                  ["20:00", "SC Freiburg vs Aston Villa", "BF MB", "Watch spread", "£82k"],
                  ["20:30", "Palermo vs Catanzaro", "MB", "Book drift", "£44k"]
                ].map((row) => (
                  <div className="landing-terminal-row" key={row.join("-")}>
                    <span>{row[0]}</span>
                    <strong>{row[1]}</strong>
                    <em>{row[2]}</em>
                    <span>{row[3]}</span>
                    <b>{row[4]}</b>
                  </div>
                ))}
              </div>
              <div className="landing-terminal-panel-row">
                <div>
                  <span>Bias Matrix</span>
                  <strong>ARS 1.84 / 1.87</strong>
                  <small>Spread 0.03 • £142k usable</small>
                </div>
                <div>
                  <span>Route Quality</span>
                  <strong>2/3 venues</strong>
                  <small>BF fresh • MB fresh • SX watch</small>
                </div>
              </div>
            </div>
            <div className="landing-terminal-mockup secondary-screen">
              <div className="landing-terminal-top">
                <span>Intelligence Rail</span>
                <span>News / Profiles / Risk</span>
                <strong>WSS</strong>
              </div>
              <div className="landing-terminal-profile">
                <div>
                  <span>Team Profile</span>
                  <strong>Arsenal</strong>
                  <small>Venue, squad, staff, form, injuries</small>
                </div>
                <div>
                  <span>Market Signal</span>
                  <strong>Home price firming</strong>
                  <small>News sensitivity high</small>
                </div>
              </div>
              <div className="landing-terminal-news-list">
                {[
                  ["1m", "INJURY", "Saka returns to full training", "impact 68"],
                  ["3m", "LINEUP", "United rotate midfield", "impact 51"],
                  ["7m", "TRANSFER", "Villa striker bid rejected", "watch"],
                  ["12m", "VENUE", "Weather risk easing", "low"]
                ].map((item) => (
                  <div key={item.join("-")}>
                    <span>{item[0]}</span>
                    <em>{item[1]}</em>
                    <strong>{item[2]}</strong>
                    <small>{item[3]}</small>
                  </div>
                ))}
              </div>
              <div className="landing-terminal-depth">
                <span>Exchange Depth</span>
                <div><b>Back</b><i style={{ width: "72%" }} /><strong>£84k</strong></div>
                <div><b>Lay</b><i style={{ width: "58%" }} /><strong>£61k</strong></div>
                <div><b>News</b><i style={{ width: "86%" }} /><strong>High</strong></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-band landing-metrics" aria-label="Platform highlights">
        {[
          ["Exchange feeds", "Betfair, Matchbook and extensible venue coverage"],
          ["Market spine", "Football-first fixture identity and liquidity ranking"],
          ["News rail", "Team, player and sport-aware intelligence stream"],
          ["Bias matrix", "Consensus, freshness and routing context"]
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="landing-content" id="about">
        <div>
          <span>About</span>
          <h2>Built for the moment before a price becomes obvious.</h2>
        </div>
        <p>SportsEdge combines fixture truth, venue coverage, live prices and news into a single operating surface. The goal is not another odds table; it is a clean read on where attention, liquidity and risk are moving.</p>
      </section>

      <section className="landing-content" id="blog">
        <div>
          <span>Latest</span>
          <h2>Research notes and product thinking.</h2>
        </div>
        <div className="landing-articles">
          {articles.map((article) => (
            <article key={article.title}>
              <strong>{article.title}</strong>
              <p>{article.excerpt}</p>
            </article>
          ))}
        </div>
        <a className="landing-text-link" href="#blog">Open the blog</a>
      </section>

      {(section === "terms" || section === "privacy") && (
        <section className="landing-content landing-policy">
          <div>
            <span>{section === "terms" ? "Terms & Conditions" : "Privacy Policy"}</span>
            <h2>{section === "terms" ? "Access and usage terms." : "Privacy and data handling."}</h2>
          </div>
          <p>{policyCopy}</p>
        </section>
      )}

      <footer className="landing-footer">
        <div>
          <img src={sportsEdgeMark} alt="" />
          <span>SportsEdge Markets</span>
        </div>
        <nav aria-label="Legal links">
          <a href="#terms">T&C</a>
          <a href="#privacy">Privacy Policy</a>
          <a href="#about">About</a>
          <a href="#blog">Blog</a>
        </nav>
        <div className="landing-socials" aria-label="Social channels inactive">
          <span>X</span>
          <span>LinkedIn</span>
          <span>YouTube</span>
        </div>
      </footer>

      {accessOpen && (
        <div className="landing-modal-backdrop" role="presentation" onMouseDown={() => setAccessOpen(false)}>
          <section className="landing-modal" role="dialog" aria-modal="true" aria-labelledby="access-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="landing-modal-close" type="button" aria-label="Close request access" onClick={() => setAccessOpen(false)}>×</button>
            <div>
              <span>Sign up</span>
              <h2 id="access-title">Request terminal access.</h2>
              <p>Tell us who you are and what you want to use SportsEdge for. New accounts are reviewed before terminal access is enabled.</p>
            </div>
            <form>
              <label>
                <span>Email</span>
                <input type="email" placeholder="you@example.com" />
              </label>
              <label>
                <span>Use case</span>
                <input type="text" placeholder="Trading, research, operations..." />
              </label>
              <label>
                <span>Organisation</span>
                <input type="text" placeholder="Company or desk name" />
              </label>
              <button type="button">Request invite</button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
