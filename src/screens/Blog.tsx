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

const sportsEdgeMarketsLogo = "/images/sportsedge-markets-logo.png";
const sportsEdgeMark = "/images/sportsedge-markets-mark.png";

type BlogArticle = Pick<AdminBlogPost, "title" | "excerpt"> & Partial<AdminBlogPost>;

const FALLBACK_BLOG_ARTICLES: BlogArticle[] = [
  { title: "Market structure", excerpt: "Why exchange liquidity, bookmaker anchors and news timing need one screen." },
  { title: "Football coverage", excerpt: "How SportsEdge separates fixture truth from venue-specific market availability." },
  { title: "Bias signals", excerpt: "Turning fragmented prices into a readable institutional market picture." }
];

function sportsEdgeApiUrl(path: string) {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return path;
  return `https://api.sportsedge.markets${path}`;
}

function formatDate(value: string | null) {
  if (!value) return "Undated";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function BlogPage() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadPosts() {
      setLoading(true);
      try {
        const response = await fetch(sportsEdgeApiUrl("/blog-posts"), { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.posts)) throw new Error(payload.detail || "Blog posts unavailable");
        if (!cancelled) {
          setPosts(payload.posts);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Blog posts unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPosts();
    return () => {
      cancelled = true;
    };
  }, []);

  const articles: BlogArticle[] = posts.length ? posts : FALLBACK_BLOG_ARTICLES;

  return (
    <main className="landing-page blog-page">
      <header className="landing-topbar">
        <a className="landing-brand" href="/" aria-label="SportsEdge landing">
          <img src={sportsEdgeMarketsLogo} alt="SportsEdge" />
        </a>
        <nav aria-label="SportsEdge site navigation">
          <a href="#about">About</a>
          <a className="active" href="#blog">Blog</a>
          <a href="#login">Login</a>
          <a className="primary" href="#signup">Sign up</a>
        </nav>
      </header>

      <section className="blog-hero">
        <span>SportsEdge Blog</span>
        <h1>Market structure, product notes, and trading intelligence.</h1>
        <p>Longer-form notes on fixture truth, exchange liquidity, news timing, and the SportsEdge terminal build-out.</p>
      </section>

      <section className="blog-list" aria-label="SportsEdge blog posts">
        {loading && <div className="blog-state">Loading blog posts.</div>}
        {error && <div className="blog-state error">{error}</div>}
        {!loading && articles.map((post) => (
          <article className="blog-card" key={post.title}>
            <div>
              <span>{post.status || "research"}</span>
              {"published_at" in post && post.published_at ? <time>{formatDate(post.published_at)}</time> : null}
            </div>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
            {post.tags?.length ? (
              <footer>{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</footer>
            ) : null}
          </article>
        ))}
      </section>

      <footer className="landing-footer">
        <div>
          <img src={sportsEdgeMark} alt="" />
          <span>SportsEdge Markets</span>
        </div>
        <nav>
          <a href="#about">About</a>
          <a href="#blog">Blog</a>
          <a href="#terms">T&amp;C</a>
          <a href="#privacy">Privacy Policy</a>
        </nav>
        <div className="landing-socials" aria-label="Social channels inactive">
          <span>X</span>
          <span>LinkedIn</span>
          <span>YouTube</span>
        </div>
      </footer>
    </main>
  );
}
