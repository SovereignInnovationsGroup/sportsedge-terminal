import { localDateKey, localEventTime } from "../../core/format";
import { countryNameFromCode, inferFootballCountry } from "../football/countryInference";
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

const LIVE_FOOTBALL_STATUS_CODES = new Set(["1H", "2H", "HT", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);

export function fixtureStatusCode(event: Pick<SportEventRow, "statusShort">) {
  return String(event.statusShort || "").trim().toUpperCase();
}

export function isLiveSportEvent(event: Pick<SportEventRow, "statusShort" | "statusLong">) {
  const code = fixtureStatusCode(event);
  if (LIVE_FOOTBALL_STATUS_CODES.has(code)) return true;
  const text = String(event.statusLong || "").toLowerCase();
  return text.includes("first half")
    || text.includes("second half")
    || text.includes("halftime")
    || text.includes("extra time")
    || text.includes("break time")
    || text.includes("penalty in progress")
    || text.includes("suspended")
    || text.includes("interrupted");
}

export function fixtureStatusLabel(event: Pick<SportEventRow, "statusShort" | "statusLong" | "elapsed">) {
  const code = fixtureStatusCode(event);
  if (isLiveSportEvent(event)) {
    if (event.elapsed != null && Number.isFinite(Number(event.elapsed)) && !["HT", "BT", "P"].includes(code)) {
      return `${code || "LIVE"} ${Number(event.elapsed)}'`;
    }
    return code || "LIVE";
  }
  return code || "NS";
}

export function fixtureScoreLabel(event: Pick<SportEventRow, "scoreHome" | "scoreAway">) {
  if (event.scoreHome == null || event.scoreAway == null) return "-";
  return `${event.scoreHome}-${event.scoreAway}`;
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
  const sourceValue = Number(match.sourceLiquidity || match.marketLiquidity || 0);
  if (exchangeKey === "polymarket" && Number.isFinite(sourceValue) && sourceValue > 0) return sourceValue;
  return match.runners.reduce((sum, runner) => {
    const back = runner.backLevels?.length
      ? runner.backLevels.reduce((levelSum, level) => levelSum + Number(level.amount || 0), 0)
      : Number(runner.back?.amount || 0);
    const lay = runner.layLevels?.length
      ? runner.layLevels.reduce((levelSum, level) => levelSum + Number(level.amount || 0), 0)
      : Number(runner.lay?.amount || 0);
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
    .replace(/\b(?:zhejiang fc|zhejiang professional|zhejiang zhiye|zhejiang greentown|hangzhou greentown)\b/g, "zhejiang")
    .replace(/\b(?:qingdao hainiu|qingdao jonoon)\b/g, "qingdao")
    .replace(/\bafc\b|\bfc\b|\bcf\b|\bsc\b|\bunited\b|\butd\b|\bhotspur\b|\bwanderers\b|\bcounty\b|\balbion\b|\bhove\b/g, " ")
    .replace(/\bwolves\b/g, "wolverhampton")
    .replace(/\bbournemouth\b/g, "bourne mouth")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function exchangeRowCountry(row: BackendPriceRow, matches: Array<[string, BackendExchangeMatch]>) {
  const directCountry = String(row.country || matches.find(([, match]) => match.country)?.[1].country || "").trim();
  if (directCountry) return directCountry;
  const directCode = String(row.countryCode || matches.find(([, match]) => match.countryCode)?.[1].countryCode || "").trim();
  return countryNameFromCode(directCode) || inferFootballCountry({
    competition: row.competitionName,
    fixture: row.name,
    extra: matches.map(([, match]) => `${match.competitionName || ""} ${match.name || ""}`).join(" ")
  });
}

function exchangeMatchIsLive(match: BackendExchangeMatch | undefined) {
  if (!match) return false;
  if (match.isLive) return true;
  const status = String(match.status || "").toLowerCase();
  return status.includes("inplay") || status.includes("in-play") || status.includes("live");
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
  const isLive = Boolean(row.isLive) || matches.some(([, match]) => exchangeMatchIsLive(match));
  return {
    id: row.id,
    name: row.name || firstMatch?.name || `${displayLabel(fallbackSport)} market`,
    competition: row.competitionName || firstMatch?.competitionName || null,
    country: exchangeRowCountry(row, matches) || null,
    startAt,
    statusShort: isLive ? "LIVE" : null,
    statusLong: isLive ? "Exchange in-play" : null,
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
    if (isLiveSportEvent(entry) && !isLiveSportEvent(existing)) {
      existing.statusShort = entry.statusShort || "LIVE";
      existing.statusLong = entry.statusLong || "Exchange in-play";
      existing.elapsed = entry.elapsed ?? existing.elapsed ?? null;
    } else {
      existing.statusShort = existing.statusShort || entry.statusShort || null;
      existing.statusLong = existing.statusLong || entry.statusLong || null;
      existing.elapsed = existing.elapsed ?? entry.elapsed ?? null;
    }
    existing.scoreHome = existing.scoreHome ?? entry.scoreHome ?? null;
    existing.scoreAway = existing.scoreAway ?? entry.scoreAway ?? null;
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
    statusShort: fixture.statusShort || null,
    statusLong: fixture.statusLong || null,
    elapsed: fixture.elapsed ?? null,
    scoreHome: fixture.goals?.home ?? null,
    scoreAway: fixture.goals?.away ?? null,
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
