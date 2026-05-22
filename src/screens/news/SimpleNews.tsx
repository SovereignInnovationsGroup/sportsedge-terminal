import { useEffect, useMemo, useState } from "react";
import { Database, Newspaper, ShieldCheck } from "lucide-react";
import { cleanText, displayLabel, formatDate } from "../../core/format";
import { impactClass, newsContextText, newsOpenUrl, type NewsResponse } from "../../core/news";

const sportsEdgeMarketsLogo = "/images/sportsedge-markets-logo.png";

export default function SimpleNews() {
  const [sport, setSport] = useState("all");
  const [data, setData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (sport !== "all") params.set("sport", sport);
    params.set("limit", "80");
    return params.toString();
  }, [sport]);

  async function loadSimpleNews() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/news?${queryString}`);
      const payload = await response.json();
      if (!response.ok || payload.ok === false || !Array.isArray(payload.items)) {
        const details = [payload.message, payload.hint || payload.detail].filter(Boolean);
        throw new Error(details.join("\n") || "Unable to load news");
      }
      setData(payload);
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load news");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSimpleNews();
  }, [queryString]);

  const items = data?.items || [];
  const sports = data?.facets?.sports || [];

  return (
    <main className="simple-news-shell">
      <aside className="simple-news-rail">
        <a href="https://sportsedge.markets/" aria-label="SportsEdge Markets home">
          <img className="simple-news-logo" src={sportsEdgeMarketsLogo} alt="SportsEdge Markets logo" />
        </a>
        <nav>
          <a className="active" href="#simple-news">
            <Newspaper size={16} />
            News
          </a>
          <a href="#">
            <Database size={16} />
            Console
          </a>
          <a href="#login">
            <ShieldCheck size={16} />
            Login
          </a>
        </nav>
      </aside>

      <section className="simple-news-main">
        <header className="simple-news-header">
          <div>
            <h1>News</h1>
            <p>Latest SportsEdge stories by sport.</p>
          </div>
          <label className="simple-sport-select">
            <span>Sport</span>
            <select value={sport} onChange={(event) => setSport(event.target.value)}>
              <option value="all">All sports</option>
              {sports.map((option) => (
                <option key={option} value={option}>
                  {displayLabel(option)}
                </option>
              ))}
            </select>
          </label>
        </header>

        {loading && <div className="simple-news-state">Loading news...</div>}
        {error && !loading && <div className="simple-news-state error">{error}</div>}

        {!loading && !error && (
          <section className="simple-news-list" aria-label="News list">
            <div className="simple-news-count">{items.length} stories</div>
            {items.map((item) => (
              <article className="simple-story" key={item.id}>
                <a href={newsOpenUrl(item)} target="_blank" rel="noreferrer">
                  {cleanText(item.title)}
                </a>
                <p>{newsContextText(item) || "No display summary available."}</p>
                {item.impact_assessment && (
                  <div className={`simple-impact ${impactClass(item.impact_assessment)}`}>
                    <strong>{item.impact_assessment.impact_score}</strong>
                    <span>{displayLabel(item.impact_assessment.event_type, "impact")}</span>
                    <p>{cleanText(item.impact_assessment.trading_note)}</p>
                  </div>
                )}
                <div>
                  <span>{displayLabel(item.sport, "Sport")}</span>
                  <span>{displayLabel(item.source_name, "Source")}</span>
                  <time>{formatDate(item.published_at || item.discovered_at)}</time>
                </div>
              </article>
            ))}
            {items.length === 0 && <div className="simple-news-state">No news found for this sport.</div>}
          </section>
        )}
      </section>
    </main>
  );
}
