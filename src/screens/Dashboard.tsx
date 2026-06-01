import { useEffect, useMemo, useRef, useState } from "react";
import { TerminalTopbar } from "../app/TerminalTopbar";
import { eventHasPassed, localDateKey, localEventTime } from "../core/format";
import { terminalNewsHeadline, terminalNewsTag, terminalNewsTimeLabel, uniqueNewsItems, type NewsItem } from "../core/news";
import { readSnapshot, refreshJsonSnapshot } from "../core/snapshotCache";

const DASHBOARD_NEWS_WIDTH_KEY = "sportsedge.dashboard.newsRailWidth.v1";
const DEFAULT_NEWS_WIDTH = 330;
const MIN_NEWS_WIDTH = 260;
const MAX_NEWS_WIDTH = 560;
const DASHBOARD_SPORT_ROUTES: Record<string, string> = {
  football: "#football",
  tennis: "#tennis",
  golf: "#golf",
  basketball: "#basketball",
  baseball: "#baseball",
  "american-football": "#american-football",
  hockey: "#hockey",
  motorsport: "#motorsport",
  rugby: "#rugby",
  cricket: "#cricket"
};

type DashboardSportEvent = {
  id: string;
  provider: string;
  providerEventId?: string | null;
  sport: string;
  sportLabel: string;
  league?: string | null;
  competition?: string | null;
  country?: string | null;
  name: string;
  shortName?: string | null;
  startAt?: string | null;
  statusShort?: string | null;
  statusLong?: string | null;
  statusState?: string | null;
  statusGroup?: string | null;
  completed?: boolean;
  home?: { name?: string | null; score?: string | null } | null;
  away?: { name?: string | null; score?: string | null } | null;
  venue?: string | null;
  syncedAt?: string | null;
  updatedAt?: string | null;
};

type DashboardEventsPayload = {
  items?: DashboardSportEvent[];
  generatedAt?: string;
  detail?: string;
};

type DashboardNewsPayload = {
  items?: NewsItem[];
};

function clampNewsWidth(value: number) {
  return Math.min(MAX_NEWS_WIDTH, Math.max(MIN_NEWS_WIDTH, Math.round(value)));
}

function readNewsRailWidth() {
  try {
    const stored = Number(window.localStorage.getItem(DASHBOARD_NEWS_WIDTH_KEY) || "");
    return Number.isFinite(stored) && stored > 0 ? clampNewsWidth(stored) : DEFAULT_NEWS_WIDTH;
  } catch {
    return DEFAULT_NEWS_WIDTH;
  }
}

export default function Dashboard() {
  const cachedEvents = readSnapshot<DashboardEventsPayload>("dashboard.events", 2 * 60 * 1000);
  const cachedNews = readSnapshot<DashboardNewsPayload>("dashboard.news", 60 * 1000);
  const [dashboardNews, setDashboardNews] = useState<NewsItem[]>(() => uniqueNewsItems(cachedNews?.items || []).slice(0, 60));
  const [events, setEvents] = useState<DashboardSportEvent[]>(() => cachedEvents?.items || []);
  const [eventsGeneratedAt, setEventsGeneratedAt] = useState(cachedEvents?.generatedAt || "");
  const [eventsLoading, setEventsLoading] = useState(!cachedEvents?.items?.length);
  const [eventsError, setEventsError] = useState("");
  const [newsRailWidth, setNewsRailWidth] = useState(readNewsRailWidth);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const alerts = [
    ["10:42", "FOOTBALL", "Arsenal lineup sensitivity elevated before London derby"],
    ["10:38", "TENNIS", "Liquidity building on Sinner-Alcaraz moneyline"],
    ["10:31", "RACING", "Going update pushed two Ascot markets into watch"],
    ["10:26", "MEDIA", "Official team-news windows opening for evening fixtures"],
    ["10:19", "SOCIAL", "Basketball beat reporters flag questionable starters"]
  ];

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboardEvents() {
      setEventsLoading(true);
      try {
        const params = new URLSearchParams({
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London",
          limit: "1200"
        });
        const payload = await refreshJsonSnapshot<DashboardEventsPayload>("dashboard.events", `/api/sports/events?${params.toString()}`, {
          signal: controller.signal,
          timeoutMs: 5_000
        });
        if (!Array.isArray(payload.items)) throw new Error(payload.detail || "events unavailable");
        setEvents(payload.items as DashboardSportEvent[]);
        setEventsGeneratedAt(String(payload.generatedAt || ""));
        setEventsError("");
      } catch (err) {
        if (!controller.signal.aborted) {
          setEvents((current) => current);
          setEventsGeneratedAt((current) => current);
          setEventsError(err instanceof Error ? err.message : "events unavailable");
        }
      } finally {
        if (!controller.signal.aborted) setEventsLoading(false);
      }
    }
    loadDashboardEvents();
    const timer = window.setInterval(loadDashboardEvents, 60000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboardNews() {
      try {
        const params = new URLSearchParams({ limit: "60" });
        const payload = await refreshJsonSnapshot<DashboardNewsPayload>("dashboard.news", `/api/news?${params.toString()}`, {
          signal: controller.signal,
          timeoutMs: 4_000
        });
        if (Array.isArray(payload.items)) setDashboardNews(uniqueNewsItems(payload.items as NewsItem[]).slice(0, 60));
      } catch {
        if (!controller.signal.aborted) setDashboardNews((current) => current);
      }
    }
    loadDashboardNews();
    const timer = window.setInterval(loadDashboardNews, 30000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DASHBOARD_NEWS_WIDTH_KEY, String(newsRailWidth));
    } catch {
      // Layout preference only.
    }
  }, [newsRailWidth]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const resize = resizeRef.current;
      if (!resize) return;
      const nextWidth = clampNewsWidth(resize.startWidth - (event.clientX - resize.startX));
      setNewsRailWidth(nextWidth);
    }

    function handlePointerUp() {
      resizeRef.current = null;
      document.body.classList.remove("bb-news-resizing");
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.classList.remove("bb-news-resizing");
    };
  }, []);

  function startNewsResize(event: React.PointerEvent<HTMLButtonElement>) {
    resizeRef.current = {
      startX: event.clientX,
      startWidth: newsRailWidth
    };
    document.body.classList.add("bb-news-resizing");
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  const todayKey = localDateKey(new Date());
  const tomorrowKey = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return localDateKey(date);
  }, []);

  const todayRows = useMemo(() => events.filter((event) => localDateKey(event.startAt || null) === todayKey), [events, todayKey]);
  const tomorrowRows = useMemo(() => events.filter((event) => localDateKey(event.startAt || null) === tomorrowKey), [events, tomorrowKey]);
  const sportRows = useMemo(() => {
    const grouped = new Map<string, DashboardSportEvent[]>();
    events.forEach((event) => {
      const key = event.sport || "sport";
      grouped.set(key, [...(grouped.get(key) || []), event]);
    });
    return Array.from(grouped.entries())
      .map(([sport, rows]) => {
        const live = rows.filter((row) => row.statusGroup === "live").length;
        const today = rows.filter((row) => localDateKey(row.startAt || null) === todayKey).length;
        const tomorrow = rows.filter((row) => localDateKey(row.startAt || null) === tomorrowKey).length;
        const latest = rows
          .map((row) => new Date(row.updatedAt || row.syncedAt || row.startAt || "").getTime())
          .filter((value) => Number.isFinite(value) && value > 0)
          .sort((a, b) => b - a)[0];
        return {
          sport,
          label: rows[0]?.sportLabel || sport,
          today,
          tomorrow,
          total: rows.length,
          live,
          latest
        };
      })
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  }, [events, todayKey, tomorrowKey]);
  const prioritySportRows = useMemo(() => {
    const priority = ["football", "tennis", "baseball", "basketball", "golf"];
    const bySport = new Map(sportRows.map((row) => [row.sport, row]));
    return priority
      .map((sport) => bySport.get(sport))
      .filter(Boolean)
      .concat(sportRows.filter((row) => !priority.includes(row.sport)).slice(0, 3)) as typeof sportRows;
  }, [sportRows]);
  const focusEvents = useMemo(() => {
    const rows = [...todayRows, ...tomorrowRows]
      .filter((event) => !event.completed && !eventHasPassed(event.startAt || null))
      .sort((a, b) => {
        const aLive = a.statusGroup === "live" ? 0 : 1;
        const bLive = b.statusGroup === "live" ? 0 : 1;
        if (aLive !== bLive) return aLive - bLive;
        return new Date(a.startAt || "").getTime() - new Date(b.startAt || "").getTime();
      });
    return rows.slice(0, 8);
  }, [todayRows, tomorrowRows]);
  const liveCount = useMemo(() => events.filter((event) => event.statusGroup === "live").length, [events]);

  function rowStatus(event: DashboardSportEvent) {
    if (event.completed || event.statusGroup === "complete") return "Complete";
    if (event.statusGroup === "live") return "Live";
    if (eventHasPassed(event.startAt || null)) return "Past";
    return event.statusShort || event.statusLong || "Upcoming";
  }

  function eventScore(event: DashboardSportEvent) {
    const home = event.home?.score;
    const away = event.away?.score;
    if (home == null || away == null || home === "" || away === "") return "-";
    return `${home}-${away}`;
  }

  function renderEventTable(title: string, rows: DashboardSportEvent[]) {
    return (
      <>
        <div className="bb-demo-strip"><span>{title}</span><strong>{rows.length} captured events</strong><em>{eventsLoading ? "refreshing" : eventsGeneratedAt ? `updated ${localEventTime(eventsGeneratedAt)}` : "real cache"}</em></div>
        <table className="bb-demo-table bb-today-events-table">
          <thead><tr>{["Time", "Event", "Sport", "Competition", "Status", "Score", "Source"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
          <tbody>
            {rows.slice(0, 80).map((event) => (
              <tr
                className={event.completed || eventHasPassed(event.startAt || null) ? "bb-event-past" : event.statusGroup === "live" ? "bb-event-live" : ""}
                key={event.id || `${event.provider}-${event.providerEventId}`}
                onDoubleClick={() => {
                  const route = DASHBOARD_SPORT_ROUTES[event.sport];
                  if (route) window.location.hash = route;
                }}
              >
                <td>{localEventTime(event.startAt || null)}</td>
                <td title={event.name}>{event.name}</td>
                <td>{event.sportLabel}</td>
                <td title={event.competition || ""}>{event.competition || "-"}</td>
                <td className={event.statusGroup === "live" ? "bb-pos" : "bb-flag"}>{rowStatus(event)}</td>
                <td className="bb-mono">{eventScore(event)}</td>
                <td className="bb-mono">{event.provider.toUpperCase()}</td>
              </tr>
            ))}
            {!eventsLoading && rows.length === 0 && (
              <tr><td colSpan={7}>No captured events returned for {title.toLowerCase()}.</td></tr>
            )}
            {eventsLoading && rows.length === 0 && (
              <tr><td colSpan={7}>Loading captured events.</td></tr>
            )}
          </tbody>
        </table>
      </>
    );
  }

  return (
    <>
      <TerminalTopbar active="today-demo" searchPlaceholder="TODAY, TOMORROW, FOOTBALL, TENNIS, LIQUIDITY, NEWS..." />
      <main className="agtest-page bb-today-page">
        <section className="agtest-subbar bb-demo-subbar" aria-label="Today dashboard controls">
          <nav aria-label="Today views">
            {["Today", "Live", "Upcoming", "Liquidity", "Alerts", "Diagnostics"].map((item, index) => (
              <button className={index === 0 ? "active" : ""} type="button" key={item}>{item}</button>
            ))}
          </nav>
          <div>
            <span>Client login view</span>
            <span>All news</span>
            <span>SportsEdge today</span>
          </div>
        </section>

        <div
          className="bb-today-layout"
          style={{ gridTemplateColumns: `178px minmax(0, 1fr) ${newsRailWidth}px` }}
        >
          <aside className="bb-news-filters">
            <strong>Market Menu</strong>
            {["All Sports", "High Liquidity", "Starting Soon", "Live Now", "My Watchlist", "Sharp Moves", "News Alerts", "Saved Screens"].map((item, index) => (
              <button className={index === 0 ? "active" : ""} type="button" key={item}>{item}</button>
            ))}
            <div className="bb-news-filter-card">
              <span>Session</span>
              <b>Today Overview</b>
              <em>First screen after login: where money and attention are concentrated now.</em>
            </div>
          </aside>

          <section className="bb-today-main">
            <div className="bb-today-hero">
              <div>
                <span>SportsEdge Today</span>
                <h1>Captured events across every sport today and tomorrow</h1>
              </div>
              <div className="bb-today-clock">
                <span>As of</span>
                <strong>{eventsGeneratedAt ? localEventTime(eventsGeneratedAt) : localEventTime(new Date())}</strong>
                <em>{eventsLoading ? "refreshing events" : eventsError ? "events warning" : "local event time"}</em>
              </div>
            </div>

            <div className="bb-profile-kpis bb-today-kpis">
              {[
                ["Sports Captured", String(sportRows.length), "today/tomorrow"],
                ["Today Events", String(todayRows.length), todayKey],
                ["Tomorrow Events", String(tomorrowRows.length), tomorrowKey],
                ["Live Now", String(liveCount), "captured"],
                ["Feed Health", eventsError ? "Warn" : "Live", eventsError || "Postgres + API"]
              ].map(([label, value, delta]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <em>{delta}</em>
                </div>
              ))}
            </div>

            {eventsError && <div className="agtest-error">{eventsError}</div>}

            <section className="bb-today-command-grid" aria-label="SportsEdge all sports command overview">
              <div>
                <div className="bb-demo-strip"><span>SportsEdge Picture</span><strong>Priority sports today and coming</strong><em>Client login screen: markets first, news as intelligence.</em></div>
                <table className="bb-demo-table bb-today-priority-table">
                  <thead><tr>{["Sport", "Today", "Coming", "Live", "Latest", "Route"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
                  <tbody>
                    {prioritySportRows.slice(0, 8).map((row) => (
                      <tr
                        key={`priority-${row.sport}`}
                        onDoubleClick={() => {
                          const route = DASHBOARD_SPORT_ROUTES[row.sport];
                          if (route) window.location.hash = route;
                        }}
                      >
                        <td>{row.label}</td>
                        <td className="bb-mono">{row.today}</td>
                        <td className="bb-mono">{row.tomorrow}</td>
                        <td className={row.live ? "bb-pos" : "bb-mono"}>{row.live}</td>
                        <td className="bb-mono">{row.latest ? localEventTime(new Date(row.latest).toISOString()) : "-"}</td>
                        <td className="bb-flag">{DASHBOARD_SPORT_ROUTES[row.sport] ? "Open" : "Watch"}</td>
                      </tr>
                    ))}
                    {!eventsLoading && prioritySportRows.length === 0 && <tr><td colSpan={6}>No priority sport rows returned yet.</td></tr>}
                    {eventsLoading && prioritySportRows.length === 0 && <tr><td colSpan={6}>Loading priority sport rows.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div>
                <div className="bb-demo-strip"><span>Next Focus</span><strong>Live / upcoming event queue</strong><em>{focusEvents.length} near-term events</em></div>
                <table className="bb-demo-table bb-today-focus-table">
                  <thead><tr>{["Time", "Sport", "Event", "Status"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
                  <tbody>
                    {focusEvents.map((event) => (
                      <tr
                        className={event.statusGroup === "live" ? "bb-event-live" : ""}
                        key={`focus-${event.id || `${event.provider}-${event.providerEventId}`}`}
                        onDoubleClick={() => {
                          const route = DASHBOARD_SPORT_ROUTES[event.sport];
                          if (route) window.location.hash = route;
                        }}
                      >
                        <td>{localEventTime(event.startAt || null)}</td>
                        <td>{event.sportLabel}</td>
                        <td title={event.name}>{event.name}</td>
                        <td className={event.statusGroup === "live" ? "bb-pos" : "bb-flag"}>{rowStatus(event)}</td>
                      </tr>
                    ))}
                    {!eventsLoading && focusEvents.length === 0 && <tr><td colSpan={4}>No live or upcoming focus events returned.</td></tr>}
                    {eventsLoading && focusEvents.length === 0 && <tr><td colSpan={4}>Loading focus queue.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="bb-demo-strip"><span>Sports Captured</span><strong>Today and tomorrow by sport</strong><em>Double-click rows below to open sport dashboards.</em></div>
            <table className="bb-demo-table bb-today-sports-table">
              <thead><tr>{["Sport", "Today", "Tomorrow", "Total", "Live", "Latest"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
              <tbody>
                {sportRows.map((row) => (
                  <tr
                    key={row.sport}
                    onDoubleClick={() => {
                      const route = DASHBOARD_SPORT_ROUTES[row.sport];
                      if (route) window.location.hash = route;
                    }}
                  >
                    <td>{row.label}</td>
                    <td className="bb-mono">{row.today}</td>
                    <td className="bb-mono">{row.tomorrow}</td>
                    <td className="bb-mono">{row.total}</td>
                    <td className={row.live ? "bb-pos" : "bb-mono"}>{row.live}</td>
                    <td className="bb-mono">{row.latest ? localEventTime(new Date(row.latest).toISOString()) : "-"}</td>
                  </tr>
                ))}
                {!eventsLoading && sportRows.length === 0 && <tr><td colSpan={6}>No captured sport events returned for today or tomorrow.</td></tr>}
                {eventsLoading && sportRows.length === 0 && <tr><td colSpan={6}>Loading captured sports.</td></tr>}
              </tbody>
            </table>

            {renderEventTable("Today", todayRows)}
            {renderEventTable("Tomorrow", tomorrowRows)}
          </section>

          <aside className="bb-demo-news bb-profile-news-rail bb-resizable-news-rail">
            <button
              aria-label="Resize news rail"
              className="bb-news-resize-handle"
              type="button"
              onPointerDown={startNewsResize}
            />
            <div className="bb-demo-news-head"><strong>News</strong><span>ALL SPORTSEDGE NEWS</span></div>
            {dashboardNews.length > 0
              ? dashboardNews.slice(0, 40).map((item) => (
                <article key={item.id || `${item.title}-${item.discovered_at || item.published_at}`}>
                  <time>{terminalNewsTimeLabel(item)}</time>
                  <b>{terminalNewsTag(item)}</b>
                  <p>{terminalNewsHeadline(item)}</p>
                </article>
              ))
              : alerts.map((item) => <article key={`${item[0]}-${item[1]}`}><time>{item[0]}</time><b>{item[1]}</b><p>{item[2]}</p></article>)}
          </aside>
        </div>
      </main>
    </>
  );
}
