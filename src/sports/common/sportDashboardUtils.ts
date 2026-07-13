import { localDateKey, localEventTime } from "../../core/format";
import {
  BackendExchangeMatch,
  BackendPriceRow,
  CapturedSportEvent,
  DASHBOARD_EXCHANGES,
  FootballFixtureRow,
  NewsItem,
  SportEventRow,
  SportLocationFilter
} from "./sportDashboardTypes";

export function apiSportValue(value: string) {
  if (value === "horseracing" || value === "horse-racing") return "horseracing";
  return value;
}

export function displayLabel(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatExchangeMoney(value: number, currency = "GBP") {
  if (!Number.isFinite(value) || value <= 0) return "-";
  const symbol = currency === "USD" ? "$" : "£";
  if (value >= 1_000_000) return `${symbol}${Math.round(value / 100_000) / 10}m`;
  if (value >= 1_000) return `${symbol}${Math.round(value / 1000)}k`;
  return `${symbol}${Math.round(value).toLocaleString("en-GB")}`;
}

export function isTodayLocal(value: string | null | undefined) {
  return Boolean(value) && localDateKey(value) === localDateKey(new Date());
}

export function isTomorrowLocal(value: string | null | undefined) {
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

export function backendMatchLiquidity(row: BackendPriceRow, exchangeKey: string) {
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

export function mergeSportEvents(entries: SportEventRow[]) {
  const merged = new Map<string, SportEventRow>();
  const cloneEvent = (entry: SportEventRow): SportEventRow => ({
    ...entry,
    liquidityByExchange: { ...entry.liquidityByExchange },
    exchanges: [...entry.exchanges]
  });
  entries.forEach((entry) => {
    if (!entry) return;
    const key = eventKey(entry);
    const existing = merged.get(key) || Array.from(merged.values()).find((candidate) => sameFixtureDay(candidate, entry));
    if (!existing) {
      merged.set(key, cloneEvent(entry));
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

export function mergeEvents(rows: BackendPriceRow[], fallbackSport: string) {
  return mergeSportEvents(rows.map((row) => exchangeOddsRowToEvent(row, fallbackSport)).filter(Boolean) as SportEventRow[]);
}

export function footballFixtureToEvent(fixture: FootballFixtureRow): SportEventRow | null {
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

export function capturedSportEventToEvent(event: CapturedSportEvent): SportEventRow | null {
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

export function newsTime(item: NewsItem) {
  return localEventTime(item.published_at || item.discovered_at || null);
}

export function newsTag(item: NewsItem) {
  return String(item.source_name || "SE").slice(0, 6).toUpperCase();
}

export function newsHeadline(item: NewsItem) {
  return item.title || item.display_summary || "SportsEdge news item";
}

export function newsImpact(item: NewsItem) {
  return item.impact_assessment?.trading_note || item.display_summary || "No clear market impact detected.";
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function responseJson(response: Response | null) {
  if (!response) return {};
  return response.json().catch(() => ({}));
}

export function dateScopeMatches(startAt: string | null | undefined, scope: string) {
  if (scope === "today") return isTodayLocal(startAt);
  if (scope === "tomorrow") return isTomorrowLocal(startAt);
  return true;
}

export function genericScopeMatches(event: SportEventRow, dateScope: string, locationScope: string, filters: SportLocationFilter[]) {
  if (!dateScopeMatches(event.startAt, dateScope)) return false;
  if (locationScope === "all") return true;
  const filter = filters.find((item) => item.value === locationScope);
  const terms = filter?.terms || [filter?.label || locationScope];
  const haystack = `${event.name} ${event.competition || ""} ${event.country || ""}`.toLowerCase();
  return terms.some((term) => haystack.includes(String(term).toLowerCase()));
}
