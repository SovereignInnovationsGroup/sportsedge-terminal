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
type CapturedSportEvent = {
  id: string;
  provider: string;
  sport: string;
  competition?: string | null;
  country?: string | null;
  name: string;
  startAt?: string | null;
  syncedAt?: string | null;
  updatedAt?: string | null;
};
type SportLocationFilter = {
  label: string;
  value: string;
  terms?: string[];
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
type StandingRow = {
  id: string;
  provider: string;
  sport: string;
  league: string;
  leagueName: string;
  season?: number | null;
  rank?: number | null;
  team: string;
  teamAbbreviation?: string | null;
  record?: string | null;
  played?: number | null;
  wins?: number | null;
  draws?: number | null;
  losses?: number | null;
  ties?: number | null;
  points?: number | null;
  pointsFor?: number | null;
  pointsAgainst?: number | null;
  pointDifferential?: number | null;
  syncedAt?: string | null;
};
type StandingsPayload = {
  generatedAt?: string;
  sport?: string;
  provider?: string;
  sourceStatus?: string;
  rows?: StandingRow[];
};

const DASHBOARD_EXCHANGES = [
  { key: "betfair", label: "Betfair", short: "BF" },
  { key: "matchbook", label: "Matchbook", short: "MB" },
  { key: "monaco", label: "BetDEX", short: "BX", currency: "USD" },
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

function capturedSportEventToEvent(event: CapturedSportEvent): SportEventRow | null {
  if (!event.name || !event.startAt) return null;
  return {
    id: event.id,
    name: event.name,
    competition: event.competition || null,
    country: event.country || null,
    startAt: event.startAt,
    liquidity: 0,
    liquidityByExchange: Object.fromEntries(DASHBOARD_EXCHANGES.map((exchange) => [exchange.key, 0])),
    latestSeenAt: event.updatedAt || event.syncedAt || null,
    exchanges: [event.provider.toUpperCase()]
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

function standingsNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return Number(value).toLocaleString("en-GB");
}

function StandingsPanel({
  label,
  rows,
  provider,
  sourceStatus,
  loading
}: {
  label: string;
  rows: StandingRow[];
  provider: string;
  sourceStatus: string;
  loading: boolean;
}) {
  const groupedRows = useMemo(() => {
    const groups = new Map<string, StandingRow[]>();
    rows.forEach((row) => {
      const key = row.leagueName || row.league || "Standings";
      const group = groups.get(key) || [];
      if (group.length < 12) group.push(row);
      groups.set(key, group);
    });
    return Array.from(groups.entries()).slice(0, 4);
  }, [rows]);

  return (
    <section className="sport-summary-panel sport-standings-panel">
      <header>
        <span>Tables / Standings</span>
        <strong>{provider ? provider.toUpperCase() : "SOURCE"}</strong>
      </header>
      <p className="sport-standings-source">{sourceStatus || `${label} standings source pending.`}</p>
      {groupedRows.map(([leagueName, leagueRows]) => (
        <div className="sport-standings-league" key={leagueName}>
          <div className="sport-standings-league-title">
            <strong>{leagueName}</strong>
            <span>{leagueRows[0]?.season || ""}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>P</th>
                <th>W</th>
                <th>D/T</th>
                <th>L</th>
                <th>+/-</th>
                <th>Pts</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {leagueRows.map((row, index) => (
                <tr key={row.id || `${leagueName}-${row.team}-${index}`}>
                  <td className="mono">{row.rank || index + 1}</td>
                  <td><strong>{row.team}</strong>{row.teamAbbreviation ? <small>{row.teamAbbreviation}</small> : null}</td>
                  <td className="mono">{standingsNumber(row.played)}</td>
                  <td className="mono positive">{standingsNumber(row.wins)}</td>
                  <td className="mono">{standingsNumber(row.draws ?? row.ties)}</td>
                  <td className="mono">{standingsNumber(row.losses)}</td>
                  <td className="mono">{standingsNumber(row.pointDifferential)}</td>
                  <td className="mono total">{standingsNumber(row.points)}</td>
                  <td className="mono">{row.record || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {!loading && groupedRows.length === 0 && (
        <div className="sport-standings-empty">
          <strong>No standings rows returned.</strong>
          <span>{sourceStatus || "Provider configured, waiting for normalized standings rows."}</span>
        </div>
      )}
      {loading && groupedRows.length === 0 && (
        <div className="sport-standings-empty">
          <strong>Loading standings.</strong>
          <span>Checking provider cache.</span>
        </div>
      )}
    </section>
  );
}

function SportStandingByBoard({
  label,
  espnScopes,
  dataStatus
}: {
  label: string;
  espnScopes: string[];
  dataStatus: string;
}) {
  const demoRows = [
    ["Provider", "ESPN", espnScopes.length ? espnScopes.join(" / ") : "Scope pending"],
    ["Exchange Rows", "Standing by", "No live venue rows yet"],
    ["Routing", "Ready", "BF / MB / BX / SM / BD / SX slots"],
    ["News", "Live", "Rail remains real when sport news exists"]
  ];
  const demoTape = [
    `${label.toUpperCase()} data spine ready`,
    "No live exchange rows for this sport",
    "ESPN metadata additive",
    "No executable prices shown",
    "Waiting for exchange liquidity"
  ];

  return (
    <section className="sport-demo-holding" aria-label={`${label} data standing by screen`}>
      <div className="sport-demo-holding-head">
        <span>SportsEdge / {label}</span>
        <strong>Data standing by</strong>
        <p>{dataStatus}</p>
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
            [`${label} Dashboard`, "Ready", "-", "watch", "Await normalized events"],
            ["Liquidity", "Slots armed", "-", "watch", "Open when exchange rows arrive"],
            ["Bias Matrix", "Pending", "-", "watch", "Odds-only feed can populate later"],
            ["News", "Live capable", "Real news rail", "watch", "Monitor sport context"]
          ].map((row) => (
            <tr key={row[0]}>{row.map((cell, index) => <td className={index === 1 || index === 3 ? "mono positive" : ""} key={`${row[0]}-${cell}`}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const DEFAULT_DATE_SCOPE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" }
];

function dateScopeMatches(startAt: string | null | undefined, scope: string) {
  if (scope === "today") return isTodayLocal(startAt);
  if (scope === "tomorrow") return isTomorrowLocal(startAt);
  return true;
}

function genericScopeMatches(event: SportEventRow, dateScope: string, locationScope: string, filters: SportLocationFilter[]) {
  if (!dateScopeMatches(event.startAt, dateScope)) return false;
  if (locationScope === "all") return true;
  const filter = filters.find((item) => item.value === locationScope);
  const terms = filter?.terms || [filter?.label || locationScope];
  const haystack = `${event.name} ${event.competition || ""} ${event.country || ""}`.toLowerCase();
  return terms.some((term) => haystack.includes(String(term).toLowerCase()));
}

function SportScopeFilter({
  sportLabel,
  dateScope,
  locationScope,
  locationFilters,
  onDateScopeChange,
  onLocationScopeChange,
  meta,
  ariaLabel
}: {
  sportLabel: string;
  dateScope: string;
  locationScope: string;
  locationFilters: SportLocationFilter[];
  onDateScopeChange: (value: string) => void;
  onLocationScopeChange: (value: string) => void;
  meta?: string[];
  ariaLabel: string;
}) {
  const dateLabel = DEFAULT_DATE_SCOPE_FILTERS.find((filter) => filter.value === dateScope)?.label || "All";
  const locationLabel = locationFilters.find((filter) => filter.value === locationScope)?.label || "All";
  return (
    <section className="agtest-subbar football-scope-filterbar" aria-label={ariaLabel}>
      <div className="agtest-filter-stack">
        <nav aria-label={ariaLabel}>
          {DEFAULT_DATE_SCOPE_FILTERS.map((filter) => (
            <button className={dateScope === filter.value ? "active" : ""} key={filter.value} type="button" onClick={() => onDateScopeChange(filter.value)}>
              {filter.label}
            </button>
          ))}
          <span className="agtest-filter-crumb">/</span>
          {locationFilters.map((filter) => (
            <button className={locationScope === filter.value ? "active" : ""} key={filter.value} type="button" onClick={() => onLocationScopeChange(filter.value)}>
              {filter.label}
            </button>
          ))}
        </nav>
      </div>
      <div>
        <span>{["SportsEdge", sportLabel, dateLabel, locationScope !== "all" ? locationLabel : ""].filter(Boolean).join(" / ")}</span>
        {(meta || []).map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>
  );
}

export function SportDashboard({
  sport,
  label,
  active,
  espnScopes = [],
  dataStatus = "ESPN metadata enabled; exchange liquidity appears when normalized venue rows are available.",
  scopeLabel,
  locationFilters = []
}: {
  sport: string;
  label: string;
  active: string;
  espnScopes?: string[];
  dataStatus?: string;
  scopeLabel?: string;
  locationFilters?: SportLocationFilter[];
}) {
  const normalizedSport = apiSportValue(sport);
  const [events, setEvents] = useState<SportEventRow[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [standingsStatus, setStandingsStatus] = useState("");
  const [standingsProvider, setStandingsProvider] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isFootball = normalizedSport === "football";
  const [dateScope, setDateScope] = useState("all");
  const [locationScope, setLocationScope] = useState("all");
  const espnScopeKey = espnScopes.join(",");

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
        const capturedEventsPromise = !isFootball
          ? fetch(`/api/sports/events?timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London")}&limit=1200`, { cache: "no-store" })
          : Promise.resolve(null);
        const standingsParams = new URLSearchParams({
          sport: normalizedSport,
          scopes: espnScopeKey,
          limit: "120"
        });
        const marketSnapshotUrl = `/api/markets/snapshot?${oddsParams.toString()}`;
        const exchangeFallbackUrl = `/api/exchange-odds?${oddsParams.toString()}`;
        const [oddsRows, newsResponse, fixturesResponse, standingsResponse, capturedEventsResponse] = await Promise.all([
          fetchMarketSnapshotRows(marketSnapshotUrl, exchangeFallbackUrl),
          fetch(`/api/news?${newsParams.toString()}`, { cache: "no-store" }),
          fixturesPromise,
          fetch(`/api/sports/standings?${standingsParams.toString()}`, { cache: "no-store" }),
          capturedEventsPromise
        ]);
        const newsPayload = await newsResponse.json().catch(() => ({}));
        const fixturesPayload = fixturesResponse ? await fixturesResponse.json().catch(() => ({})) : {};
        const standingsPayload = await standingsResponse.json().catch(() => ({})) as StandingsPayload;
        const capturedEventsPayload = capturedEventsResponse ? await capturedEventsResponse.json().catch(() => ({})) : {};
        if (!Array.isArray(oddsRows)) throw new Error("fixtures failed");
        if (!cancelled) {
          const exchangeEvents = mergeEvents(oddsRows as BackendPriceRow[], normalizedSport);
          const fixtureEvents = Array.isArray(fixturesPayload.fixtures)
            ? (fixturesPayload.fixtures as FootballFixtureRow[]).map(footballFixtureToEvent).filter(Boolean) as SportEventRow[]
            : [];
          const capturedEvents = Array.isArray(capturedEventsPayload.items)
            ? (capturedEventsPayload.items as CapturedSportEvent[])
              .filter((event) => event.sport === normalizedSport)
              .map(capturedSportEventToEvent)
              .filter(Boolean) as SportEventRow[]
            : [];
          setEvents(isFootball ? mergeSportEvents([...fixtureEvents, ...exchangeEvents]) : mergeSportEvents([...capturedEvents, ...exchangeEvents]));
          setNews(Array.isArray(newsPayload.items) ? newsPayload.items as NewsItem[] : []);
          setStandings(Array.isArray(standingsPayload.rows) ? standingsPayload.rows : []);
          setStandingsStatus(String(standingsPayload.sourceStatus || ""));
          setStandingsProvider(String(standingsPayload.provider || ""));
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setEvents([]);
          setNews([]);
          setStandings([]);
          setStandingsStatus("");
          setStandingsProvider("");
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
  }, [normalizedSport, isFootball, espnScopeKey]);

  const hasScopeFilter = locationFilters.length > 0;
  const filteredEvents = useMemo(() => {
    if (!isFootball && hasScopeFilter) return events.filter((event) => genericScopeMatches(event, dateScope, locationScope, locationFilters));
    if (!isFootball) return events;
    return events.filter((event) => footballScopeMatches(`${event.name} ${event.competition || ""}`, event.country, event.startAt, dateScope, locationScope));
  }, [events, isFootball, hasScopeFilter, dateScope, locationScope, locationFilters]);

  const todayRows = useMemo(() => filteredEvents.filter((event) => isTodayLocal(event.startAt)), [filteredEvents]);
  const tomorrowRows = useMemo(() => filteredEvents.filter((event) => isTomorrowLocal(event.startAt)), [filteredEvents]);
  const todayLiquidity = todayRows.reduce((sum, event) => sum + event.liquidity, 0);
  const exchangeCount = new Set(filteredEvents.flatMap((event) => event.exchanges)).size;
  const nearTermRows = useMemo(() => [...todayRows, ...tomorrowRows]
    .filter((event) => !eventHasPassed(event.startAt))
    .sort((a, b) => {
      const liquidityDiff = b.liquidity - a.liquidity;
      if (liquidityDiff !== 0) return liquidityDiff;
      return new Date(a.startAt || "").getTime() - new Date(b.startAt || "").getTime();
    })
    .slice(0, 6), [todayRows, tomorrowRows]);
  const coveredRows = useMemo(() => filteredEvents.filter((event) => event.exchanges.length > 0), [filteredEvents]);
  const exchangeLiquidityRows = useMemo(() => DASHBOARD_EXCHANGES.map((exchange) => ({
    ...exchange,
    liquidity: filteredEvents.reduce((sum, event) => sum + Number(event.liquidityByExchange[exchange.key] || 0), 0),
    eventCount: filteredEvents.filter((event) => Number(event.liquidityByExchange[exchange.key] || 0) > 0).length
  })).filter((row) => row.liquidity > 0 || row.eventCount > 0), [filteredEvents]);
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
      {!isFootball && hasScopeFilter && (
        <SportScopeFilter
          sportLabel={label}
          dateScope={dateScope}
          locationScope={locationScope}
          locationFilters={locationFilters}
          onDateScopeChange={setDateScope}
          onLocationScopeChange={setLocationScope}
          meta={[`${filteredEvents.length} / ${events.length} events`]}
          ariaLabel={scopeLabel || `${label} dashboard filters`}
        />
      )}
      <main className="sport-summary-page">
        <section className="sport-summary-hero">
          <div>
            <span>SportsEdge / {label}</span>
            <h1>{label}</h1>
            <p>Today and tomorrow events, exchange coverage, available liquidity, and sport-specific intelligence.</p>
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
            <section className="sport-command-grid" aria-label={`${label} market overview`}>
              <div className="sport-command-panel">
                <header><span>Market Board</span><strong>{nearTermRows.length}</strong></header>
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Event</th>
                      <th>Competition</th>
                      <th>Coverage</th>
                      <th>Total Now</th>
                      <th>Latest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nearTermRows.map((event) => (
                      <tr key={`command-${event.id}-${event.startAt}`}>
                        <td className="mono positive">{localEventTime(event.startAt)}</td>
                        <td><strong>{event.name}</strong></td>
                        <td>{event.competition || "-"}</td>
                        <td><ExchangeCoverageCell event={event} /></td>
                        <td className="mono liquidity-money total">{formatExchangeMoney(event.liquidity, "GBP")}</td>
                        <td className="mono">{event.latestSeenAt ? localEventTime(event.latestSeenAt) : "-"}</td>
                      </tr>
                    ))}
                    {!loading && nearTermRows.length === 0 && <tr><td className="empty" colSpan={6}>No near-term events returned for the current filter.</td></tr>}
                    {loading && nearTermRows.length === 0 && <tr><td className="empty" colSpan={6}>Loading market board.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="sport-command-panel sport-command-intel">
                <header><span>Sport Intel</span><strong>{news.length}</strong></header>
                <div>
                  <article><span>Covered events</span><strong>{coveredRows.length}</strong><em>{filteredEvents.length} total in view</em></article>
                  <article><span>Exchange venues</span><strong>{exchangeCount || "-"}</strong><em>{exchangeLiquidityRows.length ? "liquidity visible" : "waiting for venue rows"}</em></article>
                  <article><span>News tape</span><strong>{news.length ? "Live" : loading ? "Loading" : "Quiet"}</strong><em>{news[0] ? newsHeadline(news[0]) : `${label} news rail remains filtered.`}</em></article>
                </div>
              </div>
            </section>
            <StandingsPanel
              label={label}
              rows={standings}
              provider={standingsProvider}
              sourceStatus={standingsStatus}
              loading={loading}
            />
            {showDemoHolding ? (
              <SportStandingByBoard label={label} espnScopes={espnScopes} dataStatus={dataStatus} />
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
