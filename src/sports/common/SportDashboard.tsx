import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import {
  AGTEST_FOOTBALL_PRIMARY_FILTERS,
  AGTEST_FOOTBALL_SECONDARY_FILTERS,
  footballFilterBreadcrumb,
  footballTextMatchesGroup
} from "../football/filters";

type BackendRunnerLevel = { odds: number; amount: number; level?: number };
type BackendRunnerPrice = BackendRunnerLevel | null;
type BackendRunner = {
  name: string;
  back?: BackendRunnerPrice;
  lay?: BackendRunnerPrice;
  backLevels?: BackendRunnerLevel[];
  layLevels?: BackendRunnerLevel[];
};
type BackendExchangeMatch = {
  exchange?: string;
  name?: string;
  sportName?: string;
  competitionName?: string | null;
  startAt?: string | null;
  observedAt?: string | null;
  runners: BackendRunner[];
};
type BackendPriceRow = {
  id: string;
  name: string;
  sportName?: string;
  competitionName?: string | null;
  startAt: string | null;
  matches?: Record<string, BackendExchangeMatch | undefined>;
};
type NewsItem = {
  id?: string;
  title?: string;
  display_summary?: string;
  source_name?: string;
  published_at?: string | null;
  discovered_at?: string | null;
  impact_assessment?: { impact_score?: number; urgency?: string; trading_note?: string };
};
type SportEventRow = {
  id: string;
  name: string;
  competition: string | null;
  startAt: string | null;
  liquidity: number;
  liquidityByExchange: Record<string, number>;
  latestSeenAt: string | null;
  exchanges: string[];
};

const DASHBOARD_EXCHANGES = [
  { key: "betfair", label: "Betfair" },
  { key: "matchbook", label: "Matchbook" }
] as const;

function apiSportValue(value: string) {
  if (value === "horseracing" || value === "horse-racing") return "horseracing";
  return value;
}

function displayLabel(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatExchangeMoney(value: number, currency = "GBP") {
  if (!Number.isFinite(value) || value <= 0) return "-";
  const symbol = currency === "USD" ? "$" : "£";
  if (value >= 1_000_000) return `${symbol}${Math.round(value / 100_000) / 10}m`;
  if (value >= 1_000) return `${symbol}${Math.round(value / 1000)}k`;
  return `${symbol}${Math.round(value).toLocaleString("en-GB")}`;
}

function madridEventTime(value: string | null | undefined) {
  if (!value) return "TBD";
  const date = new Date(String(value).includes("T") ? value : String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Madrid"
  }).format(date);
}

function madridDateKey(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value).includes("T") ? value : String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Madrid"
  }).format(date);
}

function isTodayInMadrid(value: string | null | undefined) {
  return Boolean(value) && madridDateKey(value) === madridDateKey(new Date());
}

function isTomorrowInMadrid(value: string | null | undefined) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return Boolean(value) && madridDateKey(value) === madridDateKey(tomorrow);
}

function rowLatestObservedMs(row: BackendPriceRow) {
  return Math.max(0, ...Object.values(row.matches || {}).map((match) => {
    const observedAt = match?.observedAt;
    if (!observedAt) return 0;
    const date = new Date(observedAt);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }));
}

function backendMatchLiquidity(row: BackendPriceRow, exchangeKey: string) {
  const match = row.matches?.[exchangeKey];
  if (!match) return 0;
  return match.runners.reduce((sum, runner) => {
    const back = Number(runner.back?.amount || 0);
    const lay = Number(runner.lay?.amount || 0);
    return sum + back + lay;
  }, 0);
}

function rowMatchedValue(row: BackendPriceRow) {
  return DASHBOARD_EXCHANGES.reduce((sum, exchange) => sum + backendMatchLiquidity(row, exchange.key), 0);
}

function eventKey(event: Pick<SportEventRow, "name" | "startAt">) {
  return `${String(event.startAt || "").slice(0, 10)}:${event.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`;
}

function exchangeOddsRowToEvent(row: BackendPriceRow, fallbackSport: string): SportEventRow | null {
  const matches = Object.entries(row.matches || {}).filter(([, match]) => Boolean(match)) as Array<[string, BackendExchangeMatch]>;
  const firstMatch = matches[0]?.[1];
  const startAt = row.startAt || firstMatch?.startAt || null;
  if (!row.name || !startAt || !matches.length) return null;
  const exchanges = matches.map(([key, match]) => {
    const exchangeKey = String(match.exchange || key).toLowerCase();
    return DASHBOARD_EXCHANGES.find((exchange) => exchange.key === exchangeKey)?.label || displayLabel(exchangeKey);
  });
  const latestSeenAtMs = rowLatestObservedMs(row);
  return {
    id: row.id,
    name: row.name || firstMatch?.name || `${displayLabel(fallbackSport)} market`,
    competition: row.competitionName || firstMatch?.competitionName || null,
    startAt,
    liquidity: rowMatchedValue(row),
    liquidityByExchange: Object.fromEntries(DASHBOARD_EXCHANGES.map((exchange) => [exchange.key, backendMatchLiquidity(row, exchange.key)])),
    latestSeenAt: latestSeenAtMs ? new Date(latestSeenAtMs).toISOString() : firstMatch?.observedAt || null,
    exchanges: Array.from(new Set(exchanges))
  };
}

function mergeEvents(rows: BackendPriceRow[], fallbackSport: string) {
  const merged = new Map<string, SportEventRow>();
  rows.forEach((row) => {
    const entry = exchangeOddsRowToEvent(row, fallbackSport);
    if (!entry) return;
    const key = eventKey(entry);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, entry);
      return;
    }
    existing.liquidity += entry.liquidity;
    DASHBOARD_EXCHANGES.forEach((exchange) => {
      existing.liquidityByExchange[exchange.key] = Number(existing.liquidityByExchange[exchange.key] || 0) + Number(entry.liquidityByExchange[exchange.key] || 0);
    });
    existing.exchanges = Array.from(new Set([...existing.exchanges, ...entry.exchanges]));
    const entryLatest = entry.latestSeenAt ? new Date(entry.latestSeenAt).getTime() : 0;
    const existingLatest = existing.latestSeenAt ? new Date(existing.latestSeenAt).getTime() : 0;
    if (entryLatest > existingLatest) existing.latestSeenAt = entry.latestSeenAt;
  });
  return Array.from(merged.values()).sort((a, b) => {
    const startDiff = new Date(a.startAt || "").getTime() - new Date(b.startAt || "").getTime();
    if (Number.isFinite(startDiff) && startDiff !== 0) return startDiff;
    return b.liquidity - a.liquidity;
  });
}

function newsTime(item: NewsItem) {
  return madridEventTime(item.published_at || item.discovered_at || null);
}

function newsTag(item: NewsItem) {
  return String(item.source_name || "SE").slice(0, 6).toUpperCase();
}

function newsHeadline(item: NewsItem) {
  return item.title || item.display_summary || "SportsEdge news item";
}

function newsImpact(item: NewsItem) {
  return item.impact_assessment?.trading_note || item.display_summary || "No clear market impact detected.";
}

function FixtureTable({ title, rows, loading }: { title: string; rows: SportEventRow[]; loading: boolean }) {
  return (
    <section className="sport-summary-panel sport-summary-fixtures">
      <header>
        <span>{title}</span>
        <strong>{rows.length}</strong>
      </header>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Fixture</th>
            <th>Competition</th>
            <th>Venues</th>
            <th>BF Vol</th>
            <th>MB Vol</th>
            <th>Total</th>
            <th>Latest</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 12).map((event) => (
            <tr key={`${title}-${event.id}-${event.startAt}`}>
              <td className="mono positive">{madridEventTime(event.startAt)}</td>
              <td><strong>{event.name}</strong></td>
              <td>{event.competition || "-"}</td>
              <td><span className="sport-summary-venue">{event.exchanges.join(" / ")}</span></td>
              <td className="mono">{formatExchangeMoney(event.liquidityByExchange.betfair, "GBP")}</td>
              <td className="mono">{formatExchangeMoney(event.liquidityByExchange.matchbook, "GBP")}</td>
              <td className="mono">{formatExchangeMoney(event.liquidity, "GBP")}</td>
              <td className="mono">{event.latestSeenAt ? madridEventTime(event.latestSeenAt) : "-"}</td>
            </tr>
          ))}
          {!loading && rows.length === 0 && <tr><td className="empty" colSpan={8}>No fixtures returned for this day.</td></tr>}
          {loading && rows.length === 0 && <tr><td className="empty" colSpan={8}>Loading fixtures.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

export function SportDashboard({
  sport,
  label,
  active
}: {
  sport: string;
  label: string;
  active: string;
}) {
  const normalizedSport = apiSportValue(sport);
  const [events, setEvents] = useState<SportEventRow[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isFootball = normalizedSport === "football";
  const [filterBucket, setFilterBucket] = useState(isFootball ? "uk" : "all");
  const [marketGroup, setMarketGroup] = useState(isFootball ? "uk" : "all");

  useEffect(() => {
    let cancelled = false;

    async function loadSportDashboard() {
      setLoading(true);
      try {
        const oddsParams = new URLSearchParams({
          sport: normalizedSport,
          exchanges: DASHBOARD_EXCHANGES.map((exchange) => exchange.key).join(","),
          limit: "400"
        });
        const newsParams = new URLSearchParams({
          sport: normalizedSport,
          limit: "30"
        });
        const [oddsResponse, newsResponse] = await Promise.all([
          fetch(`/api/exchange-odds?${oddsParams.toString()}`, { cache: "no-store" }),
          fetch(`/api/news?${newsParams.toString()}`, { cache: "no-store" })
        ]);
        const oddsPayload = await oddsResponse.json().catch(() => ({}));
        const newsPayload = await newsResponse.json().catch(() => ({}));
        if (!oddsResponse.ok || !Array.isArray(oddsPayload.rows)) throw new Error(oddsPayload.detail || "fixtures failed");
        if (!cancelled) {
          setEvents(mergeEvents(oddsPayload.rows as BackendPriceRow[], normalizedSport));
          setNews(Array.isArray(newsPayload.items) ? newsPayload.items as NewsItem[] : []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setEvents([]);
          setNews([]);
          setError(err instanceof Error ? err.message : "sport dashboard failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSportDashboard();
    const timer = window.setInterval(loadSportDashboard, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [normalizedSport]);

  const filteredEvents = useMemo(() => {
    if (!isFootball) return events;
    return events.filter((event) => footballTextMatchesGroup(
      `${event.name} ${event.competition || ""}`,
      null,
      marketGroup,
      event.startAt
    ));
  }, [events, isFootball, marketGroup]);

  const secondaryFilters = isFootball ? AGTEST_FOOTBALL_SECONDARY_FILTERS[filterBucket] || [] : [];
  const todayRows = useMemo(() => filteredEvents.filter((event) => isTodayInMadrid(event.startAt)).slice(0, 40), [filteredEvents]);
  const tomorrowRows = useMemo(() => filteredEvents.filter((event) => isTomorrowInMadrid(event.startAt)).slice(0, 40), [filteredEvents]);
  const topLiquidity = [...todayRows, ...tomorrowRows].sort((a, b) => b.liquidity - a.liquidity)[0];
  const venueCount = new Set(filteredEvents.flatMap((event) => event.exchanges)).size;
  const latestTick = filteredEvents
    .map((event) => event.latestSeenAt ? new Date(event.latestSeenAt).getTime() : 0)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0];

  return (
    <>
      <TerminalTopbar active={active} searchPlaceholder={`${label}: fixtures, news, liquidity...`} />
      {isFootball && (
        <section className="agtest-subbar sport-summary-filterbar" aria-label="Football dashboard filters">
          <div className="agtest-filter-stack">
            <nav aria-label="Football region filters">
              {AGTEST_FOOTBALL_PRIMARY_FILTERS.map((filter) => (
                <button
                  className={filterBucket === filter.value ? "active" : ""}
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setFilterBucket(filter.value);
                    setMarketGroup(filter.value);
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </nav>
            {secondaryFilters.length > 0 && (
              <nav className="agtest-filter-secondary" aria-label="Football league filters">
                {secondaryFilters.map((filter) => (
                  <button
                    className={marketGroup === filter.value ? "active" : ""}
                    key={filter.value}
                    type="button"
                    onClick={() => setMarketGroup(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </nav>
            )}
          </div>
          <div>
            <span>{footballFilterBreadcrumb(filterBucket, marketGroup)}</span>
            <span>{filteredEvents.length}{marketGroup !== "all" ? ` / ${events.length}` : ""} markets</span>
          </div>
        </section>
      )}
      <main className="sport-summary-page">
        <section className="sport-summary-hero">
          <div>
            <span>SportsEdge / {label}</span>
            <h1>{label} Dashboard</h1>
            <p>Today and tomorrow fixtures, exchange coverage, available liquidity, and sport-specific news.</p>
          </div>
          <div className="sport-summary-kpis">
            <article><span>Today</span><strong>{todayRows.length}</strong></article>
            <article><span>Tomorrow</span><strong>{tomorrowRows.length}</strong></article>
            <article><span>Venues</span><strong>{venueCount || "-"}</strong></article>
            <article><span>Top Liquidity</span><strong>{topLiquidity?.liquidity ? formatExchangeMoney(topLiquidity.liquidity, "GBP") : "-"}</strong></article>
            <article><span>Latest Tick</span><strong>{latestTick ? madridEventTime(new Date(latestTick).toISOString()) : "-"}</strong></article>
          </div>
        </section>
        {error && <div className="agtest-error">{error}</div>}
        <section className="sport-summary-layout">
          <div className="sport-summary-main">
            <FixtureTable title="Today" rows={todayRows} loading={loading} />
            <FixtureTable title="Tomorrow" rows={tomorrowRows} loading={loading} />
          </div>
          <aside className="sport-summary-news" aria-label={`${label} news`}>
            <header>
              <span>News</span>
              <strong>{news.length}</strong>
            </header>
            {news.slice(0, 14).map((item) => (
              <article key={item.id || `${item.title}-${item.published_at}`}>
                <div><span>{newsTime(item)}</span><strong>{newsTag(item)}</strong></div>
                <h3>{newsHeadline(item)}</h3>
                <p>{newsImpact(item)}</p>
              </article>
            ))}
            {!loading && news.length === 0 && <p className="sport-summary-empty">No news returned for {label} yet.</p>}
            {loading && news.length === 0 && <p className="sport-summary-empty">Loading news.</p>}
          </aside>
        </section>
      </main>
    </>
  );
}
