import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { MobileBottomNav } from "../../app/MobileBottomNav";
import { terminalNewsHeadline, terminalNewsTag, terminalNewsTimeLabel, uniqueNewsItems, type NewsItem } from "../../core/news";

export default function MobileNews({ initialSport = "all" }: { initialSport?: string }) {
  const [sport, setSport] = useState(initialSport);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "80", include_context: "1" });
        if (sport !== "all") params.set("sport", sport);
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/news?${params.toString()}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!cancelled) setItems(uniqueNewsItems(Array.isArray(payload.items) ? payload.items : []).slice(0, 80));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const timer = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [query, sport]);

  const filters = useMemo(() => ["all", "football", "tennis", "golf", "basketball", "baseball"], []);

  return (
    <>
      <TerminalTopbar active="news" onSearchChange={setQuery} searchPlaceholder="Search news..." />
      <main className="mobile-terminal-page">
        <section className="mobile-hero">
          <span>SportsEdge News</span>
          <h1>News Tape</h1>
          <p>Compact mobile intelligence feed.</p>
        </section>
        <section className="mobile-filter-pills" aria-label="News sport filters">
          {filters.map((item) => (
            <button className={sport === item ? "active" : ""} key={item} type="button" onClick={() => setSport(item)}>
              {item}
            </button>
          ))}
        </section>
        <section className="mobile-card-list">
          <header><span>Headlines</span><strong>{items.length}</strong></header>
          {items.map((item) => (
            <article className="mobile-news-card" key={item.id || `${item.title}-${item.discovered_at || item.published_at}`}>
              <div><time>{terminalNewsTimeLabel(item)}</time><b>{terminalNewsTag(item)}</b></div>
              <strong>{terminalNewsHeadline(item)}</strong>
              <p>{item.display_summary || item.impact_assessment?.trading_note || "No summary available."}</p>
            </article>
          ))}
          {!loading && items.length === 0 && <p className="mobile-empty">No headlines returned for this filter.</p>}
          {loading && items.length === 0 && <p className="mobile-empty">Loading news.</p>}
        </section>
      </main>
      <MobileBottomNav active="news" />
    </>
  );
}
