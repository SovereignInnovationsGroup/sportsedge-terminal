import { eventHasPassed, formatExchangeMoney, localEventTime, normalizeFixtureText } from "../../core/format";
import { sportsEdgeWsUrl } from "../../core/news";
import { readSnapshot, writeSnapshot } from "../../core/snapshotCache";
import { footballTextMatchesGroup } from "./filters";

export type BackendRunnerLevel = { odds: number; amount: number; level?: number };
type BackendRunnerPrice = BackendRunnerLevel | null;

export type BackendRunner = {
  id: string;
  name: string;
  sortOrder?: number;
  back: BackendRunnerPrice;
  lay: BackendRunnerPrice;
  backLevels?: BackendRunnerLevel[];
  layLevels?: BackendRunnerLevel[];
};

export type BackendExchangeMatch = {
  exchange: string;
  eventId: string;
  marketId: string;
  name: string;
  sportName?: string | null;
  competitionName?: string | null;
  marketName?: string | null;
  marketType?: string | null;
  startAt: string | null;
  observedAt: string | null;
  volume?: number;
  isDemo?: boolean;
  runners: BackendRunner[];
};

export type BackendPriceRow = {
  id: string;
  name: string;
  sportName?: string | null;
  competitionName?: string | null;
  marketName?: string | null;
  marketType?: string | null;
  startAt: string | null;
  matches: Record<string, BackendExchangeMatch | undefined>;
  arbs?: Array<{ edgePct?: number; backExchange?: string; layExchange?: string; label?: string }>;
  marketCount?: number;
  aggregateLiquidityByExchange?: Record<string, number>;
  isDemo?: boolean;
};

export type FootballFixture = {
  id: string;
  provider: string;
  providerFixtureId: string;
  providerLeagueId: string | null;
  season: number | null;
  round: string | null;
  leagueName: string | null;
  leagueType: string | null;
  country: string | null;
  countryCode: string | null;
  leagueLogoUrl: string | null;
  countryFlagUrl: string | null;
  kickoffAt: string | null;
  timezone: string | null;
  statusShort: string | null;
  statusLong: string | null;
  elapsed: number | null;
  venueName: string | null;
  venueCity: string | null;
  referee: string | null;
  home: { providerTeamId: string | null; name: string; logoUrl: string | null; winner: boolean | null };
  away: { providerTeamId: string | null; name: string; logoUrl: string | null; winner: boolean | null };
  goals: { home: number | null; away: number | null };
  syncedAt: string | null;
  updatedAt: string | null;
};

export type AgTestRow = {
  id: string;
  startAt: string | null;
  kickoff: string;
  match: string;
  competition: string;
  country: string | null;
  coverage: Array<{ label: string; available: boolean }>;
  outcomes: string[];
  betfair: string[];
  matchbook: string[];
  polymarket: string[];
  smarkets: string[];
  betdaq: string[];
  sx: string[];
  bias: string;
  liquidity: string;
  bfLiquidity: string;
  mbLiquidity: string;
  pyLiquidity: string;
  smLiquidity: string;
  bdLiquidity: string;
  sxLiquidity: string;
  fresh: string;
  isDemo?: boolean;
};

export const BETTING_EXCHANGE_COLUMNS = [
  { key: "bf", label: "BF", name: "Betfair", backendKey: "betfair", currency: "GBP" },
  { key: "mb", label: "MB", name: "Matchbook", backendKey: "matchbook", currency: "GBP" },
  { key: "py", label: "PY", name: "Polymarket", backendKey: "polymarket", currency: "USD" },
  { key: "sm", label: "SM", name: "Smarkets", backendKey: "smarkets", currency: "GBP" },
  { key: "bd", label: "BD", name: "Betdaq", backendKey: "betdaq", currency: "GBP" },
  { key: "sx", label: "SX", name: "SX", backendKey: "sx", currency: "USD" }
] as const;

type BettingExchangeColumn = typeof BETTING_EXCHANGE_COLUMNS[number];

const FOOTBALL_EXCHANGE_QUERY = "betfair,matchbook,polymarket,smarkets,betdaq,sx";
const FOOTBALL_LIQUIDITY_FAST_URL = `/api/markets/snapshot?sport=football&exchanges=${FOOTBALL_EXCHANGE_QUERY}&segment=upcoming4&limit=80`;
const FOOTBALL_LIQUIDITY_FALLBACK_URL = `/api/exchange-odds?sport=football&exchanges=${FOOTBALL_EXCHANGE_QUERY}&segment=upcoming4&limit=80`;
const FOOTBALL_LIQUIDITY_STORAGE_KEY = "sportsedge.footballLiquiditySnapshot.v1";
let footballLiquidityCache: { rows: BackendPriceRow[]; fetchedAt: number } | null = null;
let footballLiquidityPrefetchPromise: Promise<BackendPriceRow[]> | null = null;

export function exchangePriceChannel(exchange: BettingExchangeColumn) {
  return `${exchange.name.toLowerCase()}.price`;
}

function readStoredFootballLiquidity(maxAgeMs: number) {
  try {
    const raw = window.localStorage.getItem(FOOTBALL_LIQUIDITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rows?: BackendPriceRow[]; fetchedAt?: number };
    if (!Array.isArray(parsed.rows) || !parsed.fetchedAt) return null;
    if (Date.now() - parsed.fetchedAt > maxAgeMs) return null;
    return { rows: parsed.rows, fetchedAt: parsed.fetchedAt };
  } catch {
    return null;
  }
}

export function storeFootballLiquidity(rows: BackendPriceRow[]) {
  const snapshot = { rows: rows.slice(0, 250), fetchedAt: Date.now() };
  footballLiquidityCache = snapshot;
  try {
    window.localStorage.setItem(FOOTBALL_LIQUIDITY_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Browser storage is a cache only.
  }
}

export function cachedFootballLiquidityRows(maxAgeMs = 2 * 60 * 1000) {
  if (footballLiquidityCache && Date.now() - footballLiquidityCache.fetchedAt <= maxAgeMs) return footballLiquidityCache.rows;
  const stored = readStoredFootballLiquidity(maxAgeMs);
  if (!stored) return [];
  footballLiquidityCache = stored;
  return stored.rows;
}

async function fetchBackendPriceRows(url: string) {
  const cacheKey = `marketRows.${withDemoMarketFeed(url)}`;
  const cached = readSnapshot<{ rows: BackendPriceRow[] }>(cacheKey, 20_000);
  if (cached?.rows?.length) return cached.rows;
  const response = await fetch(withDemoMarketFeed(url), { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.rows)) throw new Error(payload.detail || "liquidity fetch failed");
  writeSnapshot(cacheKey, { rows: payload.rows as BackendPriceRow[] });
  return payload.rows as BackendPriceRow[];
}

function demoMarketFeedEnabled() {
  if (typeof window === "undefined") return false;
  const search = new URLSearchParams(window.location.search);
  const hashQuery = window.location.hash.includes("?")
    ? new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf("?") + 1))
    : new URLSearchParams();
  if (window.localStorage.getItem("sportsedge.demoMarketFeed") === "false") return false;
  if (["1", "true", "yes", "demo"].includes(String(search.get("demoOdds") || hashQuery.get("demoOdds") || "").toLowerCase())) return true;
  if (window.localStorage.getItem("sportsedge.demoMarketFeed") === "true") return true;
  return window.location.hash.startsWith("#liquidity");
}

function withDemoMarketFeed(url: string) {
  if (!demoMarketFeedEnabled() || !url.includes("/api/markets/snapshot")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}demo=hybrid`;
}

export async function fetchMarketSnapshotRows(url: string, fallbackUrl?: string) {
  try {
    const rows = await fetchBackendPriceRows(url);
    if (rows.length || !fallbackUrl) return rows;
  } catch {
    if (!fallbackUrl) return [];
  }
  try {
    return await fetchBackendPriceRows(fallbackUrl);
  } catch {
    return [];
  }
}

export async function prefetchFootballLiquiditySnapshot() {
  const cachedRows = cachedFootballLiquidityRows();
  if (cachedRows.length) return cachedRows;
  if (footballLiquidityPrefetchPromise) return footballLiquidityPrefetchPromise;
  footballLiquidityPrefetchPromise = fetchMarketSnapshotRows(FOOTBALL_LIQUIDITY_FAST_URL, FOOTBALL_LIQUIDITY_FALLBACK_URL)
    .then((rows) => {
      storeFootballLiquidity(rows);
      return rows;
    })
    .catch(() => [])
    .finally(() => {
      footballLiquidityPrefetchPromise = null;
    });
  return footballLiquidityPrefetchPromise;
}

function backendRowStartTimeMs(row: BackendPriceRow) {
  if (!row.startAt) return Number.MAX_SAFE_INTEGER;
  const time = new Date(row.startAt).getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function stableDisplayRowKey(row: BackendPriceRow) {
  const fixtureName = normalizeFixtureText(row.name)
    .replace(/\bvs\b/g, " v ")
    .replace(/\s+/g, " ")
    .trim();
  return normalizeFixtureText(`${fixtureName} ${String(row.startAt || "").slice(0, 16)}`);
}

function marketSortRank(row: BackendPriceRow) {
  const text = normalizeFixtureText(`${row.marketType || ""} ${row.marketName || ""}`);
  if (text.includes("match odds") || text.includes("match result") || text.includes("one x two")) return 0;
  if (text.includes("winner") || text.includes("moneyline")) return 1;
  if (text.includes("handicap") || text.includes("spread")) return 4;
  if (text.includes("correct score") || text.includes("exact score")) return 8;
  return 5;
}

function isDisplayableFootballMarket(row: BackendPriceRow) {
  const text = normalizeFixtureText(`${row.name || ""} ${row.marketType || ""} ${row.marketName || ""}`);
  if (["announcer", "announcers", "corner", "card", "booking", "goalscorer", "correct score", "exact score", "player", "cross"].some((value) => text.includes(value))) return false;
  if (text.includes("match odds") || text.includes("match result") || text.includes("one x two") || text.includes("one_x_two")) return true;
  if (text.includes("moneyline") || text.includes("winner")) return true;
  if (/\bwill\b.+\bwin\b/.test(text)) return true;
  return !row.matches?.polymarket;
}

function clonePriceRow(row: BackendPriceRow): BackendPriceRow {
  const aggregateLiquidityByExchange = Object.fromEntries(BETTING_EXCHANGE_COLUMNS.map((exchange) => [
    exchange.backendKey,
    matchLiquidity(row.matches?.[exchange.backendKey])
  ]));
  return {
    ...row,
    matches: { ...row.matches },
    arbs: [...(row.arbs || [])],
    marketCount: 1,
    aggregateLiquidityByExchange
  };
}

export function mergeDisplayPriceRows(rows: BackendPriceRow[]) {
  const merged = new Map<string, BackendPriceRow>();
  for (const row of rows) {
    if (!isDisplayableFootballMarket(row)) continue;
    const key = stableDisplayRowKey(row) || row.id;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, clonePriceRow(row));
      continue;
    }
    const nextAggregate = { ...(existing.aggregateLiquidityByExchange || {}) };
    BETTING_EXCHANGE_COLUMNS.forEach((exchange) => {
      nextAggregate[exchange.backendKey] = Number(nextAggregate[exchange.backendKey] || 0) + matchLiquidity(row.matches?.[exchange.backendKey]);
    });
    existing.aggregateLiquidityByExchange = nextAggregate;
    existing.marketCount = Number(existing.marketCount || 1) + 1;
    const incomingIsBetterDisplay = marketSortRank(row) < marketSortRank(existing);
    existing.matches = incomingIsBetterDisplay ? { ...existing.matches, ...row.matches } : { ...row.matches, ...existing.matches };
    existing.arbs = [...(existing.arbs || []), ...(row.arbs || [])];
    if (backendRowStartTimeMs(row) < backendRowStartTimeMs(existing)) existing.startAt = row.startAt;
    if (row.name && (!existing.name || row.name.length < existing.name.length)) existing.name = row.name;
    if (incomingIsBetterDisplay) {
      existing.marketName = row.marketName;
      existing.marketType = row.marketType;
      existing.competitionName = row.competitionName || existing.competitionName;
    }
  }
  return Array.from(merged.values()).sort((a, b) => backendRowStartTimeMs(a) - backendRowStartTimeMs(b) || String(a.name || "").localeCompare(String(b.name || "")));
}

function textFromPayload(payload: unknown, keys: string[]) {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
  }
  return "";
}

function numberFromPayload(payload: unknown, keys: string[]) {
  if (!payload || typeof payload !== "object") return 0;
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^0-9.-]+/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function normalizeExchangeCode(value: unknown) {
  const normalized = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (["bf", "betfair"].includes(normalized)) return "betfair";
  if (["mb", "matchbook"].includes(normalized)) return "matchbook";
  if (["py", "poly", "polymarket"].includes(normalized)) return "polymarket";
  if (["sm", "smarkets"].includes(normalized)) return "smarkets";
  if (["bd", "betdaq"].includes(normalized)) return "betdaq";
  if (["sx", "sxbet", "sxmarkets", "sportx"].includes(normalized)) return "sx";
  return normalized;
}

export function isPrimaryTradingMarket(payload: unknown, selectedSport: string) {
  const marketType = textFromPayload(payload, ["market_type", "marketType"]).toLowerCase();
  const marketName = textFromPayload(payload, ["market_name", "marketName"]).toLowerCase();
  const eventName = textFromPayload(payload, ["event_name", "eventName", "fixture", "fixture_name", "event", "name", "title"]).toLowerCase();
  const marketText = `${eventName} ${marketType} ${marketName}`;
  if (selectedSport === "football") {
    if (["player prop", "halftime", "half time", "1st half", "correct score", "total goals", "goalscorer", "corner", "card", "handicap", "spread"].some((value) => marketText.includes(value))) return false;
    return ["one_x_two", "match_odds", "match-odds", "moneyline", "winner"].some((value) => marketType.includes(value))
      || marketName.includes("match odds")
      || marketName.includes("match result")
      || marketName.includes("moneyline")
      || marketName.includes("winner");
  }
  return true;
}

export function mergeLivePriceRows(rows: BackendPriceRow[], channel: string, payload: unknown, selectedSport: string, primaryOnly = true, maxRows = 80) {
  if (primaryOnly && !isPrimaryTradingMarket(payload, selectedSport)) return rows;
  const exchange = normalizeExchangeCode(textFromPayload(payload, ["exchange", "exchange_code", "exchangeCode", "venue", "source", "source_name"]) || channel.split(".")[0]);
  if (!["betfair", "matchbook", "polymarket", "smarkets", "betdaq", "sx"].includes(exchange)) return rows;
  const eventName = textFromPayload(payload, ["event_name", "eventName", "fixture", "fixture_name", "event", "name", "title"]);
  const runnerName = textFromPayload(payload, ["runner_name", "runnerName", "selection", "outcome"]);
  const side = textFromPayload(payload, ["side"]).toLowerCase();
  const odds = numberFromPayload(payload, ["odds", "price", "decimal_odds", "decimalOdds"]);
  const amount = numberFromPayload(payload, ["available_amount", "availableAmount", "amount", "size"]);
  if (!eventName || !runnerName || odds <= 1 || amount <= 0 || !["back", "lay"].includes(side)) return rows;

  const marketName = textFromPayload(payload, ["market_name", "marketName"]) || "Match Odds";
  const startAt = textFromPayload(payload, ["start_at", "startAt", "start_time", "event_start"]) || null;
  const id = normalizeFixtureText(`${eventName} ${marketName} ${startAt || ""}`) || `${exchange}:${eventName}`;
  const next = mergeDisplayPriceRows(rows);
  let row = next.find((item) => stableDisplayRowKey(item) === id || item.id === id);
  if (!row) {
    row = { id, name: eventName, sportName: selectedSport, competitionName: textFromPayload(payload, ["competition", "competition_name", "competitionName"]), marketName, marketType: textFromPayload(payload, ["market_type", "marketType"]) || "MATCH_ODDS", startAt, matches: {} };
    next.push(row);
  }
  let match = row.matches[exchange];
  if (!match) {
    match = { exchange, eventId: id, marketId: id, name: eventName, sportName: selectedSport, competitionName: row.competitionName, marketName, marketType: row.marketType, startAt, observedAt: new Date().toISOString(), runners: [] };
    row.matches[exchange] = match;
  }
  let runner = match.runners.find((item) => normalizeFixtureText(item.name) === normalizeFixtureText(runnerName));
  if (!runner) {
    runner = { id: normalizeFixtureText(runnerName), name: runnerName, back: null, lay: null };
    match.runners.push(runner);
  }
  runner[side as "back" | "lay"] = { odds, amount, level: 1 };
  match.observedAt = new Date().toISOString();
  return mergeDisplayPriceRows(next).slice(0, maxRows);
}

function marketStateRowsFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.rows)) return record.rows as BackendPriceRow[];
  if (record.row && typeof record.row === "object") return [record.row as BackendPriceRow];
  if (record.match && typeof record.match === "object") {
    const match = record.match as BackendExchangeMatch;
    return [{
      id: `${match.exchange}:${match.eventId}:${match.marketId}`,
      name: match.name,
      sportName: match.sportName,
      competitionName: match.competitionName,
      marketName: match.marketName,
      marketType: match.marketType,
      startAt: match.startAt,
      matches: { [normalizeExchangeCode(match.exchange)]: match }
    }];
  }
  return [];
}

export function mergeMarketStateRows(rows: BackendPriceRow[], payload: unknown, maxRows = 80) {
  const incomingRows = marketStateRowsFromPayload(payload);
  if (!incomingRows.length) return rows;
  return mergeDisplayPriceRows([...incomingRows, ...rows]).slice(0, maxRows);
}

function displayStartTime(row: BackendPriceRow) {
  if (!row.startAt) return "-";
  return localEventTime(row.startAt, { day: "2-digit", month: "short" });
}

function displayEventName(name: string) {
  return String(name || "").replace(/\s+-\s+(?:More Markets|Exact Score|Player Props).*$/i, "").trim();
}

function footballFixtureName(fixture: FootballFixture) {
  return `${fixture.home?.name || "Home"} vs ${fixture.away?.name || "Away"}`;
}

function footballFixtureCompetition(fixture: FootballFixture) {
  return [fixture.country, fixture.leagueName].filter(Boolean).join(" / ") || "Football";
}

function inferCountryFromCompetition(value: string | null | undefined) {
  const text = normalizeFixtureText(value || "");
  if (text.includes("english") || text.includes("england ")) return "England";
  if (text.includes("scottish") || text.includes("scotland ")) return "Scotland";
  if (text.includes("welsh") || text === "wales" || text.includes(" wales ")) return "Wales";
  if (text.includes("northern ireland")) return "Northern Ireland";
  if (text.includes("germany") || text.includes("bundesliga")) return "Germany";
  if (text.includes("spain") || text.includes("la liga")) return "Spain";
  if (text.includes("italy") || text.includes("serie a")) return "Italy";
  if (text.includes("france") || text.includes("ligue 1")) return "France";
  if (text.includes("netherlands") || text.includes("eredivisie")) return "Netherlands";
  if (text.includes("portugal") || text.includes("primeira liga")) return "Portugal";
  if (text.includes("turkey")) return "Turkey";
  return null;
}

function formatFootballFixtureTime(fixture: FootballFixture) {
  if (!fixture.kickoffAt) return "-";
  return localEventTime(fixture.kickoffAt, { day: "2-digit", month: "short" });
}

function exchangeCoverage(row?: BackendPriceRow) {
  return BETTING_EXCHANGE_COLUMNS.map((exchange) => ({
    label: exchange.label,
    available: Boolean(row?.matches?.[exchange.backendKey])
  }));
}

function matchLiquidity(match?: BackendExchangeMatch) {
  return (match?.runners || []).reduce((sum, runner) => sum + Number(runner.back?.amount || 0) + Number(runner.lay?.amount || 0), 0);
}

function rowMatchedValue(row?: BackendPriceRow) {
  if (!row) return 0;
  if (row.aggregateLiquidityByExchange) {
    return Object.values(row.aggregateLiquidityByExchange).reduce((sum, value) => sum + Number(value || 0), 0);
  }
  return Object.values(row.matches || {}).reduce((sum, match) => sum + matchLiquidity(match), 0);
}

function exchangeCurrency(exchange: string) {
  return BETTING_EXCHANGE_COLUMNS.find((item) => item.backendKey === exchange)?.currency || "GBP";
}

function formatBackendExchangeLiquidity(row: BackendPriceRow | undefined, exchange: string) {
  const aggregateValue = Number(row?.aggregateLiquidityByExchange?.[exchange] || 0);
  const value = aggregateValue > 0 ? aggregateValue : matchLiquidity(row?.matches?.[exchange]);
  return value > 0 ? formatExchangeMoney(value, exchangeCurrency(exchange)) : "-";
}

function formatFresh(row?: BackendPriceRow) {
  const latest = Object.values(row?.matches || {})
    .map((match) => match?.observedAt ? new Date(match.observedAt).getTime() : 0)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0];
  if (!latest) return "watch";
  return localEventTime(new Date(latest).toISOString(), { second: "2-digit" });
}

type OutcomeRow = {
  label: string;
  runners: Partial<Record<string, BackendRunner>>;
};

function tradeableOutcomeRows(row?: BackendPriceRow) {
  if (!row) return [];
  const byName = new Map<string, OutcomeRow>();
  BETTING_EXCHANGE_COLUMNS.forEach((exchange) => {
    const match = row.matches?.[exchange.backendKey];
    (match?.runners || []).forEach((runner) => {
      const key = normalizeFixtureText(runner.name);
      if (!key) return;
      if (!byName.has(key)) byName.set(key, { label: runner.name, runners: {} });
      byName.get(key)!.runners[exchange.backendKey] = runner;
    });
  });
  return [...byName.values()].slice(0, 3);
}

function formatOutcomeCell(outcome: OutcomeRow, exchange: string) {
  const runner = outcome.runners[exchange];
  if (!runner) return "-";
  const currency = exchangeCurrency(exchange);
  const back = runner.back ? `B ${runner.back.odds.toFixed(2)} ${formatExchangeMoney(runner.back.amount, currency)}` : "B -";
  const lay = runner.lay ? `L ${runner.lay.odds.toFixed(2)} ${formatExchangeMoney(runner.lay.amount, currency)}` : "L -";
  return `${back} / ${lay}`;
}

function rowHasBettingExchange(row?: BackendPriceRow) {
  return BETTING_EXCHANGE_COLUMNS.some((exchange) => Boolean(row?.matches?.[exchange.backendKey]));
}

function rowHasMultiBettingExchange(row?: BackendPriceRow) {
  return BETTING_EXCHANGE_COLUMNS.filter((exchange) => Boolean(row?.matches?.[exchange.backendKey])).length > 1;
}

function biasFromRow(row?: BackendPriceRow) {
  if (!row) return "No route";
  if (!rowHasMultiBettingExchange(row)) return rowHasBettingExchange(row) ? "Single route" : "No route";
  return "Multi-route";
}

function cleanFootballFixtures(fixtures: FootballFixture[]) {
  const seen = new Set<string>();
  return fixtures.filter((fixture) => {
    const key = normalizeFixtureText(`${fixture.kickoffAt || ""} ${footballFixtureName(fixture)}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => new Date(a.kickoffAt || 0).getTime() - new Date(b.kickoffAt || 0).getTime());
}

function findMarketRowForFootballFixture(fixture: FootballFixture, rows: BackendPriceRow[]) {
  const fixtureKey = normalizeFixtureText(footballFixtureName(fixture));
  const home = normalizeFixtureText(fixture.home?.name || "");
  const away = normalizeFixtureText(fixture.away?.name || "");
  return rows.find((row) => {
    const rowKey = normalizeFixtureText(row.name);
    if (rowKey === fixtureKey || rowKey.includes(fixtureKey) || fixtureKey.includes(rowKey)) return true;
    return Boolean(home && away && rowKey.includes(home) && rowKey.includes(away));
  });
}

function agRowFromBackend(row: BackendPriceRow): AgTestRow {
  const outcomes = tradeableOutcomeRows(row);
  const liquidityValue = rowMatchedValue(row);
  const marketCount = Number(row.marketCount || 1);
  return {
    id: stableDisplayRowKey(row) || row.id,
    startAt: row.startAt,
    kickoff: displayStartTime(row),
    match: displayEventName(row.name),
    competition: row.competitionName || "Exchange football",
    country: inferCountryFromCompetition(row.competitionName),
    coverage: exchangeCoverage(row),
    outcomes: marketCount > 1 ? [`${marketCount} markets`] : outcomes.length ? outcomes.map((outcome) => outcome.label) : ["Exchange market"],
    betfair: outcomes.length ? outcomes.map((outcome) => formatOutcomeCell(outcome, "betfair")) : ["-"],
    matchbook: outcomes.length ? outcomes.map((outcome) => formatOutcomeCell(outcome, "matchbook")) : ["-"],
    polymarket: outcomes.length ? outcomes.map((outcome) => formatOutcomeCell(outcome, "polymarket")) : ["-"],
    smarkets: outcomes.length ? outcomes.map((outcome) => formatOutcomeCell(outcome, "smarkets")) : ["-"],
    betdaq: outcomes.length ? outcomes.map((outcome) => formatOutcomeCell(outcome, "betdaq")) : ["-"],
    sx: outcomes.length ? outcomes.map((outcome) => formatOutcomeCell(outcome, "sx")) : ["-"],
    bias: biasFromRow(row),
    liquidity: liquidityValue ? formatExchangeMoney(liquidityValue, "GBP") : "-",
    bfLiquidity: formatBackendExchangeLiquidity(row, "betfair"),
    mbLiquidity: formatBackendExchangeLiquidity(row, "matchbook"),
    pyLiquidity: formatBackendExchangeLiquidity(row, "polymarket"),
    smLiquidity: formatBackendExchangeLiquidity(row, "smarkets"),
    bdLiquidity: formatBackendExchangeLiquidity(row, "betdaq"),
    sxLiquidity: formatBackendExchangeLiquidity(row, "sx"),
    fresh: row.isDemo ? "demo" : formatFresh(row),
    isDemo: Boolean(row.isDemo || Object.values(row.matches || {}).some((match) => match?.isDemo))
  };
}

export function buildAgTestRows(fixtures: FootballFixture[], priceRows: BackendPriceRow[]) {
  const displayRows = mergeDisplayPriceRows(priceRows).filter((row) => !eventHasPassed(row.startAt));
  const matchedBackendRowIds = new Set<string>();
  const fixtureRows = cleanFootballFixtures(fixtures).filter((fixture) => !eventHasPassed(fixture.kickoffAt)).map((fixture) => {
    const backend = findMarketRowForFootballFixture(fixture, displayRows);
    if (backend) matchedBackendRowIds.add(stableDisplayRowKey(backend) || backend.id);
    const base = backend ? agRowFromBackend(backend) : {
      id: fixture.id,
      startAt: fixture.kickoffAt,
      kickoff: formatFootballFixtureTime(fixture),
      match: footballFixtureName(fixture),
      competition: footballFixtureCompetition(fixture),
      country: fixture.country,
      coverage: exchangeCoverage(undefined),
      outcomes: ["Fixture"],
      betfair: ["-"],
      matchbook: ["-"],
      polymarket: ["-"],
      smarkets: ["-"],
      betdaq: ["-"],
      sx: ["-"],
      bias: "No route",
      liquidity: "-",
      bfLiquidity: "-",
      mbLiquidity: "-",
      pyLiquidity: "-",
      smLiquidity: "-",
      bdLiquidity: "-",
      sxLiquidity: "-",
      fresh: "watch"
    };
    return { ...base, id: fixture.id, startAt: fixture.kickoffAt, kickoff: formatFootballFixtureTime(fixture), match: footballFixtureName(fixture), competition: footballFixtureCompetition(fixture), country: fixture.country };
  });

  const backendOnlyRows = displayRows
    .filter((row) => !matchedBackendRowIds.has(stableDisplayRowKey(row) || row.id))
    .map(agRowFromBackend);

  return [...fixtureRows, ...backendOnlyRows];
}

export function filterAgTestRows(rows: AgTestRow[], query: string) {
  const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
  if (!terms.length) return rows;
  return rows.filter((row) => {
    const haystack = normalizeFixtureText([
      row.kickoff,
      row.match,
      row.competition,
      row.country || "",
      row.coverage.filter((exchange) => exchange.available).map((exchange) => exchange.label).join(" "),
      row.outcomes.join(" "),
      row.betfair.join(" "),
      row.matchbook.join(" "),
      row.polymarket.join(" "),
      row.smarkets.join(" "),
      row.betdaq.join(" "),
      row.sx.join(" "),
      row.bias,
      row.liquidity,
      row.bfLiquidity,
      row.mbLiquidity,
      row.pyLiquidity,
      row.smLiquidity,
      row.bdLiquidity,
      row.sxLiquidity,
      row.fresh
    ].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

export function agTestRowMatchesGroup(row: AgTestRow, group: string) {
  return footballTextMatchesGroup(`${row.match} ${row.competition}`, row.country, group, row.startAt);
}

export function AgStackCell({ values, className = "" }: { values?: string[]; className?: string }) {
  const displayValues = values?.length ? values : ["-"];
  return (
    <div className={`ag-stack-cell ${className}`}>
      <span>{displayValues.join("  |  ")}</span>
    </div>
  );
}

export { formatExchangeMoney, normalizeFixtureText, sportsEdgeWsUrl };
