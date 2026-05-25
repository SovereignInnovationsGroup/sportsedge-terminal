import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { eventHasPassed, localDateKey, localEventTime } from "../../core/format";
import { FootballScopeFilter } from "../football/FootballScopeFilter";
import { footballScopeMatches } from "../football/filters";
import { fetchMarketSnapshotRows } from "../football/marketData";

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
  aggregateLiquidityByExchange?: Record<string, number>;
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
  { key: "betfair", label: "Betfair", short: "BF" },
  { key: "matchbook", label: "Matchbook", short: "MB" },
  { key: "monaco", label: "BetDEX", short: "BX" },
  { key: "smarkets", label: "Smarkets", short: "SM" },
  { key: "betdaq", label: "Betdaq", short: "BD" },
  { key: "sx", label: "SX" }
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

function isTodayLocal(value: string | null | undefined) {
  return Boolean(value) && localDateKey(value) === localDateKey(new Date());
}

function isTomorrowLocal(value: string | null | undefined) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return Boolean(value) && localDateKey(value) === localDateKey(tomorrow);
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
  const aggregateValue = Number(row.aggregateLiquidityByExchange?.[exchangeKey] || 0);
  if (aggregateValue > 0) return aggregateValue;
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

function ExchangeCoverageCell({ event }: { event: SportEventRow }) {
  return (
    <div className="exchange-coverage sport-summary-coverage">
      {DASHBOARD_EXCHANGES.map((exchange) => (
        <span
          className={Number(event.liquidityByExchange[exchange.key] || 0) > 0 ? "available" : ""}
          key={exchange.key}
        >
          {"short" in exchange ? exchange.short : exchange.label.slice(0, 2)}
        </span>
      ))}
    </div>
  );
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

function newsTime(item: NewsItem) {
  return localEventTime(item.published_at || item.discovered_at || null);
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
  function eventRowClass(event: SportEventRow) {
    if (!eventHasPassed(event.startAt)) return "";
    return event.liquidity > 0 ? "is-started-event" : "is-past-event";
  }

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
            <th>Coverage</th>
            <th>BF £ Now</th>
            <th>MB £ Now</th>
            <th>BX $ Now</th>
            <th>SM £ Now</th>
            <th>BD £ Now</th>
            <th>SX £ Now</th>
            <th>Total £ Now</th>
            <th>Latest</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((event) => (
            <tr className={eventRowClass(event)} key={`${title}-${event.id}-${event.startAt}`}>
              <td className="mono positive">{localEventTime(event.startAt)}</td>
              <td><strong>{event.name}</strong></td>
              <td>{event.competition || "-"}</td>
              <td><ExchangeCoverageCell event={event} /></td>
              <td className="mono liquidity-money">{formatExchangeMoney(event.liquidityByExchange.betfair, "GBP")}</td>
              <td className="mono liquidity-money">{formatExchangeMoney(event.liquidityByExchange.matchbook, "GBP")}</td>
              <td className="mono liquidity-money">{formatExchangeMoney(event.liquidityByExchange.monaco, "USD")}</td>
              <td className="mono liquidity-money">{formatExchangeMoney(event.liquidityByExchange.smarkets, "GBP")}</td>
              <td className="mono liquidity-money">{formatExchangeMoney(event.liquidityByExchange.betdaq, "GBP")}</td>
              <td className="mono liquidity-money">{formatExchangeMoney(event.liquidityByExchange.sx, "GBP")}</td>
              <td className="mono liquidity-money total">{formatExchangeMoney(event.liquidity, "GBP")}</td>
              <td className="mono">{event.latestSeenAt ? localEventTime(event.latestSeenAt) : "-"}</td>
            </tr>
          ))}
          {!loading && rows.length === 0 && <tr><td className="empty" colSpan={12}>No fixtures returned for this day.</td></tr>}
          {loading && rows.length === 0 && <tr><td className="empty" colSpan={12}>Loading fixtures.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

function DemoHoldingBoard({ label }: { label: string }) {
  const demoRows = [
    ["Feed", "Standing by", "No live venue rows yet"],
    ["Snapshot", "Demo", "Holding board only"],
    ["Routing", "Ready", "BF / MB / BX / SM / BD / SX slots"],
    ["News", "Live", "Rail remains real"]
  ];
  const demoTape = [
    `${label.toUpperCase()} market spine ready`,
    "Real feed empty for this sport",
    "Demo state labelled",
    "No executable prices shown",
    "Waiting for exchange liquidity"
  ];

  return (
    <section className="sport-demo-holding" aria-label={`${label} demo holding screen`}>
      <div className="sport-demo-holding-head">
        <span>SportsEdge / {label}</span>
        <strong>Demo holding screen</strong>
        <p>No live exchange events are currently available for this sport. This placeholder keeps the terminal surface warm while the real feed is empty.</p>
      </div>
      <div className="sport-demo-tape" aria-label="Demo holding ticker">
        <div>{demoTape.concat(demoTape).map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
      </div>
      <div className="sport-demo-grid">
        {demoRows.map(([labelText, value, note]) => (
          <article key={labelText}>
            <span>{labelText}</span>
            <strong>{value}</strong>
            <em>{note}</em>
          </article>
        ))}
      </div>
      <table className="sport-demo-table">
        <thead><tr>{["Screen", "State", "Liquidity", "Fresh", "Action"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
        <tbody>
          {[
            [`${label} Dashboard`, "Ready", "-", "watch", "Await live feed"],
            ["Liquidity", "Slots armed", "-", "watch", "Open when exchange rows arrive"],
            ["Bias Matrix", "Demo capable", "-", "watch", "Odds-only feed can populate later"],
            ["News", "Live", "Real news rail", "live", "Monitor sport context"]
          ].map((row) => (
            <tr key={row[0]}>{row.map((cell, index) => <td className={index === 1 || index === 3 ? "mono positive" : ""} key={`${row[0]}-${cell}`}>{cell}</td>)}</tr>
          ))}
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
  const [dateScope, setDateScope] = useState("all");
  const [locationScope, setLocationScope] = useState("all");

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
        if (isFootball) oddsParams.set("segment", "upcoming4");
        const newsParams = new URLSearchParams({
          sport: normalizedSport,
          limit: "30"
        });
        const fixturesPromise = isFootball
          ? fetch("/api/football/fixtures?days=2&limit=2000&timezone=Europe/London", { cache: "no-store" })
          : Promise.resolve(null);
        const marketSnapshotUrl = `/api/markets/snapshot?${oddsParams.toString()}`;
        const exchangeFallbackUrl = `/api/exchange-odds?${oddsParams.toString()}`;
        const [oddsRows, newsResponse, fixturesResponse] = await Promise.all([
          fetchMarketSnapshotRows(marketSnapshotUrl, exchangeFallbackUrl),
          fetch(`/api/news?${newsParams.toString()}`, { cache: "no-store" }),
          fixturesPromise
        ]);
        const newsPayload = await newsResponse.json().catch(() => ({}));
        const fixturesPayload = fixturesResponse ? await fixturesResponse.json().catch(() => ({})) : {};
        if (!Array.isArray(oddsRows)) throw new Error("fixtures failed");
        if (!cancelled) {
          const exchangeEvents = mergeEvents(oddsRows as BackendPriceRow[], normalizedSport);
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
    return events.filter((event) => footballScopeMatches(`${event.name} ${event.competition || ""}`, event.country, event.startAt, dateScope, locationScope));
  }, [events, isFootball, dateScope, locationScope]);

  const todayRows = useMemo(() => filteredEvents.filter((event) => isTodayLocal(event.startAt)), [filteredEvents]);
  const tomorrowRows = useMemo(() => filteredEvents.filter((event) => isTomorrowLocal(event.startAt)), [filteredEvents]);
  const todayLiquidity = todayRows.reduce((sum, event) => sum + event.liquidity, 0);
  const exchangeCount = new Set(filteredEvents.flatMap((event) => event.exchanges)).size;
  const latestTick = filteredEvents
    .map((event) => event.latestSeenAt ? new Date(event.latestSeenAt).getTime() : 0)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0];
  const showDemoHolding = !loading && filteredEvents.length === 0;

  return (
    <>
      <TerminalTopbar active={active} searchPlaceholder={`${label}: fixtures, news, liquidity...`} />
      {isFootball && (
        <FootballScopeFilter
          dateScope={dateScope}
          locationScope={locationScope}
          onDateScopeChange={setDateScope}
          onLocationScopeChange={setLocationScope}
          meta={[`${filteredEvents.length} / ${events.length} fixtures`]}
          ariaLabel="Football dashboard filters"
        />
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
            <article><span>Exchanges Live</span><strong>{exchangeCount || "-"}</strong></article>
            <article><span>Today £ Now</span><strong>{todayLiquidity ? formatExchangeMoney(todayLiquidity, "GBP") : "-"}</strong></article>
            <article><span>Latest Tick</span><strong>{latestTick ? localEventTime(new Date(latestTick).toISOString()) : "-"}</strong></article>
          </div>
        </section>
        {error && <div className="agtest-error">{error}</div>}
        <section className="sport-summary-layout">
          <div className="sport-summary-main">
            {showDemoHolding ? (
              <DemoHoldingBoard label={label} />
            ) : (
              <>
                <FixtureTable title="Today" rows={todayRows} loading={loading} />
                <FixtureTable title="Tomorrow" rows={tomorrowRows} loading={loading} />
              </>
            )}
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
