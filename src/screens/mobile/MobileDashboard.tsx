import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { MobileBottomNav } from "../../app/MobileBottomNav";
import { eventHasPassed, localDateKey, localEventTime } from "../../core/format";
import { terminalNewsHeadline, terminalNewsTag, terminalNewsTimeLabel, uniqueNewsItems, type NewsItem } from "../../core/news";

type MobileEvent = {
  id: string;
  provider: string;
  sport: string;
  sportLabel: string;
  competition?: string | null;
  name: string;
  startAt?: string | null;
  statusGroup?: string | null;
  statusShort?: string | null;
  completed?: boolean;
  home?: { score?: string | null } | null;
  away?: { score?: string | null } | null;
};

export default function MobileDashboard() {
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const timezone = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London");
        const [eventsResponse, newsResponse] = await Promise.all([
          fetch(`/api/sports/events?timezone=${timezone}&limit=800`, { cache: "no-store" }),
          fetch("/api/news?limit=30", { cache: "no-store" })
        ]);
        const eventsPayload = await eventsResponse.json().catch(() => ({}));
        const newsPayload = await newsResponse.json().catch(() => ({}));
        if (!cancelled) {
          setEvents(Array.isArray(eventsPayload.items) ? eventsPayload.items : []);
          setNews(uniqueNewsItems(Array.isArray(newsPayload.items) ? newsPayload.items : []).slice(0, 20));
        }
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
  }, []);

  const todayKey = localDateKey(new Date());
  const tomorrowKey = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return localDateKey(date);
  }, []);
  const today = events.filter((event) => localDateKey(event.startAt || null) === todayKey);
  const tomorrow = events.filter((event) => localDateKey(event.startAt || null) === tomorrowKey);
  const live = events.filter((event) => event.statusGroup === "live");
  const next = [...today, ...tomorrow]
    .filter((event) => !event.completed && !eventHasPassed(event.startAt || null))
    .sort((a, b) => new Date(a.startAt || "").getTime() - new Date(b.startAt || "").getTime())
    .slice(0, 14);

  return (
    <>
      <TerminalTopbar active="dashboard" searchPlaceholder="Search SportsEdge..." />
      <main className="mobile-terminal-page">
        <section className="mobile-hero">
          <span>SportsEdge Mobile</span>
          <h1>Today</h1>
          <p>All captured sport events and live intelligence.</p>
        </section>
        <section className="mobile-kpi-grid">
          <article><span>Today</span><strong>{today.length}</strong></article>
          <article><span>Tomorrow</span><strong>{tomorrow.length}</strong></article>
          <article><span>Live</span><strong>{live.length}</strong></article>
        </section>
        <section className="mobile-card-list">
          <header><span>Next Events</span><strong>{next.length}</strong></header>
          {next.map((event) => (
            <button className="mobile-event-card" key={event.id} type="button" onClick={() => { window.location.hash = `#${event.sport}`; }}>
              <time>{localEventTime(event.startAt || null)}</time>
              <div>
                <strong>{event.name}</strong>
                <span>{event.sportLabel} / {event.competition || event.provider.toUpperCase()}</span>
              </div>
              <em>{event.statusGroup === "live" ? "Live" : event.statusShort || "Next"}</em>
            </button>
          ))}
          {!loading && next.length === 0 && <p className="mobile-empty">No upcoming captured events.</p>}
          {loading && next.length === 0 && <p className="mobile-empty">Loading events.</p>}
        </section>
        <section className="mobile-card-list">
          <header><span>News</span><strong>{news.length}</strong></header>
          {news.slice(0, 8).map((item) => (
            <article className="mobile-news-card" key={item.id || item.title}>
              <div><time>{terminalNewsTimeLabel(item)}</time><b>{terminalNewsTag(item)}</b></div>
              <strong>{terminalNewsHeadline(item)}</strong>
            </article>
          ))}
        </section>
      </main>
      <MobileBottomNav active="dashboard" />
    </>
  );
}
