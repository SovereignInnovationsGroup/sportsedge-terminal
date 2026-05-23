import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { footballTextMatchesGroup } from "../football/filters";

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
  country?: string | null;
  startAt: string | null;
  liquidity: number;
  liquidityByExchange: Record<string, number>;
  latestSeenAt: string | null;
  exchanges: string[];
};
type FootballFixtureRow = {
  id?: string;
  providerFixtureId?: string;
  country?: string | null;
  leagueName?: string | null;
  kickoffAt?: string | null;
  syncedAt?: string | null;
  updatedAt?: string | null;
  home?: { name?: string | null };
  away?: { name?: string | null };
};

const DASHBOARD_EXCHANGES = [
  { key: "betfair", label: "Betfair" },
  { key: "matchbook", label: "Matchbook" }
] as const;
const FOOTBALL_DASHBOARD_FILTERS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "UK", value: "uk" },
  { label: "UK Today", value: "uk-today" },
  { label: "UK Tomorrow", value: "uk-tomorrow" },
  { label: "Europe", value: "european" },
  { label: "UEFA", value: "uefa" },
  { label: "International", value: "international" },
  { label: "World", value: "world" }
];

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

function normalizeEventName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bvs?\b/g, " v ")
    .replace(/\bafc\b|\bfc\b|\bcf\b|\bsc\b|\bunited\b|\butd\b|\bhotspur\b|\bwanderers\b|\bcounty\b|\balbion\b|\bhove\b/g, " ")
    .replace(/\bwolves\b/g, "wolverhampton")
    .replace(/\bbournemouth\b/g, "bourne mouth")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function eventKey(event: Pick<SportEventRow, "name" | "startAt">) {
  const date = String(event.startAt || "").slice(0, 10);
  return `${date}:${normalizeEventName(event.name)}`;
}

function eventTokens(value: string) {
  return normalizeEventName(value).split(" ").filter((token) => token.length > 2);
}

function sameFixtureDay(a: SportEventRow, b: SportEventRow) {
  if (String(a.startAt || "").slice(0, 10) !== String(b.startAt || "").slice(0, 10)) return false;
  const aTokens = new Set(eventTokens(a.name));
  const bTokens = new Set(eventTokens(b.name));
  if (!aTokens.size || !bTokens.size) return false;
  let overlap = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) overlap += 1;
  });
  const smaller = Math.min(aTokens.size, bTokens.size);
  return smaller >= 2 && overlap / smaller >= 0.75;
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
    country: null,
    startAt,
    liquidity: rowMatchedValue(row),
    liquidityByExchange: Object.fromEntries(DASHBOARD_EXCHANGES.map((exchange) => [exchange.key, backendMatchLiquidity(row, exchange.key)])),
    latestSeenAt: latestSeenAtMs ? new Date(latestSeenAtMs).toISOString() : firstMatch?.observedAt || null,
    exchanges: Array.from(new Set(exchanges))
  };
}

function mergeSportEvents(entries: SportEventRow[]) {
  const merged = new Map<string, SportEventRow>();
  entries.forEach((entry) => {
    if (!entry) return;
    const key = eventKey(entry);
    const existing = merged.get(key) || Array.from(merged.values()).find((candidate) => sameFixtureDay(candidate, entry));
    if (!existing) {
      merged.set(key, entry);
      return;
    }
    existing.liquidity += entry.liquidity;
    DASHBOARD_EXCHANGES.forEach((exchange) => {
      existing.liquidityByExchange[exchange.key] = Number(existing.liquidityByExchange[exchange.key] || 0) + Number(entry.liquidityByExchange[exchange.key] || 0);
    });
    existing.exchanges = Array.from(new Set([...existing.exchanges, ...entry.exchanges]));
    existing.country = existing.country || entry.country || null;
    existing.competition = existing.competition || entry.competition || null;
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

function mergeEvents(rows: BackendPriceRow[], fallbackSport: string) {
  return mergeSportEvents(rows.map((row) => exchangeOddsRowToEvent(row, fallbackSport)).filter(Boolean) as SportEventRow[]);
}

function footballFixtureToEvent(fixture: FootballFixtureRow): SportEventRow | null {
  const home = fixture.home?.name;
  const away = fixture.away?.name;
  const startAt = fixture.kickoffAt || null;
  if (!home || !away || !startAt) return null;
  return {
    id: String(fixture.id || fixture.providerFixtureId || `${home}-${away}-${startAt}`),
    name: `${home} v ${away}`,
    competition: fixture.leagueName || null,
    country: fixture.country || null,
    startAt,
    liquidity: 0,
    liquidityByExchange: Object.fromEntries(DASHBOARD_EXCHANGES.map((exchange) => [exchange.key, 0])),
    latestSeenAt: fixture.updatedAt || fixture.syncedAt || null,
    exchanges: []
  };
}

function footballDashboardGroupMatches(event: SportEventRow, group: string) {
  if (group === "uk-today") {
    return footballTextMatchesGroup(`${event.name} ${event.competition || ""}`, event.country, "uk", event.startAt) && isTodayInMadrid(event.startAt);
  }
  if (group === "uk-tomorrow") {
    return footballTextMatchesGroup(`${event.name} ${event.competition || ""}`, event.country, "uk", event.startAt) && isTomorrowInMadrid(event.startAt);
  }
  return footballTextMatchesGroup(`${event.name} ${event.competition || ""}`, event.country, group, event.startAt);
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
              <td>
                {event.exchanges.length > 0
                  ? <span className="sport-summary-venue">{event.exchanges.join(" / ")}</span>
                  : <span className="sport-summary-fixture-only">Fixture</span>}
              </td>
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
        const fixturesPromise = isFootball
          ? fetch("/api/football/fixtures?days=2&limit=2000&timezone=Europe/London", { cache: "no-store" })
          : Promise.resolve(null);
        const [oddsResponse, newsResponse, fixturesResponse] = await Promise.all([
          fetch(`/api/exchange-odds?${oddsParams.toString()}`, { cache: "no-store" }),
          fetch(`/api/news?${newsParams.toString()}`, { cache: "no-store" }),
          fixturesPromise
        ]);
        const oddsPayload = await oddsResponse.json().catch(() => ({}));
        const newsPayload = await newsResponse.json().catch(() => ({}));
        const fixturesPayload = fixturesResponse ? await fixturesResponse.json().catch(() => ({})) : {};
        if (!oddsResponse.ok || !Array.isArray(oddsPayload.rows)) throw new Error(oddsPayload.detail || "fixtures failed");
        if (!cancelled) {
          const exchangeEvents = mergeEvents(oddsPayload.rows as BackendPriceRow[], normalizedSport);
          const fixtureEvents = Array.isArray(fixturesPayload.fixtures)
            ? (fixturesPayload.fixtures as FootballFixtureRow[]).map(footballFixtureToEvent).filter(Boolean) as SportEventRow[]
            : [];
          setEvents(isFootball ? mergeSportEvents([...fixtureEvents, ...exchangeEvents]) : exchangeEvents);
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
  }, [normalizedSport, isFootball]);

  const filteredEvents = useMemo(() => {
    if (!isFootball) return events;
    return events.filter((event) => footballDashboardGroupMatches(event, marketGroup));
  }, [events, isFootball, marketGroup]);

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
            <nav aria-label="Football dashboard filters">
              {FOOTBALL_DASHBOARD_FILTERS.map((filter) => (
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
          </div>
          <div>
            <span>SportsEdge / Football / {FOOTBALL_DASHBOARD_FILTERS.find((filter) => filter.value === marketGroup)?.label || "All"}</span>
            <span>{filteredEvents.length}{marketGroup !== "all" ? ` / ${events.length}` : ""} fixtures</span>
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
