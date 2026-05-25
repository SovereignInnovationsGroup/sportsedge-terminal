import { useEffect, useRef, useState } from "react";
import { TerminalTopbar } from "../app/TerminalTopbar";
import { terminalNewsHeadline, terminalNewsTag, terminalNewsTimeLabel, uniqueNewsItems, type NewsItem } from "../core/news";

const DASHBOARD_NEWS_WIDTH_KEY = "sportsedge.dashboard.newsRailWidth.v1";
const DEFAULT_NEWS_WIDTH = 330;
const MIN_NEWS_WIDTH = 260;
const MAX_NEWS_WIDTH = 560;

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
  const [dashboardNews, setDashboardNews] = useState<NewsItem[]>([]);
  const [newsRailWidth, setNewsRailWidth] = useState(readNewsRailWidth);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const sportRows = [
    ["Football", "42", "18", "GBP 8.42m", "12s", "Lineups, injuries", "+3"],
    ["Tennis", "31", "9", "GBP 2.18m", "18s", "Retirement watch", "+1"],
    ["Basketball", "14", "6", "GBP 1.74m", "22s", "Team news", "0"],
    ["Baseball", "16", "7", "GBP 1.29m", "31s", "Pitchers confirmed", "0"],
    ["Golf", "8", "3", "GBP 840k", "44s", "Round markets", "+2"],
    ["Racing", "56", "24", "GBP 3.66m", "9s", "Going changes", "+4"]
  ];
  const eventRows = [
    ["19:45", "ARS-TOT", "Football", "Match Odds", "GBP 1.42m", "84", "LINEUP"],
    ["20:00", "CHE-MCI", "Football", "Match Odds", "GBP 2.31m", "91", "SHARP"],
    ["18:30", "Sinner v Alcaraz", "Tennis", "Moneyline", "GBP 620k", "78", "LIVE"],
    ["21:05", "Lakers v Knicks", "Basketball", "Spread", "GBP 510k", "73", "TEAM NEWS"],
    ["22:10", "Yankees v Red Sox", "Baseball", "Moneyline", "GBP 430k", "69", "PITCHERS"],
    ["Today", "Ascot R4", "Racing", "Win", "GBP 290k", "64", "GOING"]
  ];
  const alerts = [
    ["10:42", "FOOTBALL", "Arsenal lineup sensitivity elevated before London derby"],
    ["10:38", "TENNIS", "Liquidity building on Sinner-Alcaraz moneyline"],
    ["10:31", "RACING", "Going update pushed two Ascot markets into watch"],
    ["10:26", "MEDIA", "Official team-news windows opening for evening fixtures"],
    ["10:19", "SOCIAL", "Basketball beat reporters flag questionable starters"]
  ];

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboardNews() {
      try {
        const params = new URLSearchParams({ limit: "60" });
        const response = await fetch(`/api/news?${params.toString()}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (response.ok && Array.isArray(payload.items)) {
          setDashboardNews(uniqueNewsItems(payload.items as NewsItem[]).slice(0, 60));
        }
      } catch {
        if (!controller.signal.aborted) setDashboardNews([]);
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

  return (
    <>
      <TerminalTopbar active="today-demo" searchPlaceholder="TODAY, FOOTBALL, TENNIS, LIQUIDITY, NEWS, ALERTS..." />
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
                <h1>What is on, what is liquid, what needs attention</h1>
              </div>
              <div className="bb-today-clock">
                <span>As of</span>
                <strong>10:45</strong>
                <em>prices 9-44s fresh</em>
              </div>
            </div>

            <div className="bb-profile-kpis bb-today-kpis">
              {[
                ["Sports Active", "6", "today"],
                ["Events Tracked", "167", "live + upcoming"],
                ["Linked Liquidity", "GBP 18.1m", "demo"],
                ["High Impact Alerts", "10", "+4 last hour"],
                ["Feed Health", "Live", "WSS + API"]
              ].map(([label, value, delta]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <em>{delta}</em>
                </div>
              ))}
            </div>

            <div className="bb-demo-strip"><span>Sports On Today</span><strong>Liquidity and attention by sport</strong><em>Rows open sport dashboards.</em></div>
            <table className="bb-demo-table bb-today-sports-table">
              <thead><tr>{["Sport", "Events", "Liquid", "Liquidity", "Fresh", "Market Focus", "Alerts"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
              <tbody>
                {sportRows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, index) => (
                      <td className={index === 3 || index === 4 ? "bb-mono" : index === 6 && cell !== "0" ? "bb-flag" : ""} key={`${cell}-${index}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bb-demo-strip"><span>Top Markets</span><strong>Largest available liquidity now and next</strong><em>SportsEdge fair fields appear when linked.</em></div>
            <table className="bb-demo-table bb-today-events-table">
              <thead><tr>{["Time", "Code", "Sport", "Market", "Liquidity", "Conf", "Flag"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
              <tbody>
                {eventRows.map((row) => (
                  <tr key={`${row[1]}-${row[3]}`}>
                    {row.map((cell, index) => (
                      <td className={index >= 4 ? "bb-mono" : index === 6 ? "bb-flag" : ""} key={`${cell}-${index}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
