import { Activity, Pause, Play, RefreshCw, Square, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { formatExchangeMoney, localEventTime, normalizeFixtureText } from "../../core/format";
import { sportsEdgeWsUrl } from "../../core/news";

type FlowGridLevel = {
  price: number;
  cents: number;
  size: number;
};

type FlowGridBook = {
  timestamp?: string | null;
  bids: FlowGridLevel[];
  asks: FlowGridLevel[];
};

type FlowGridLeg = {
  key: string;
  label: string;
  question: string;
  marketId?: string;
  conditionId?: string;
  marketSlug: string;
  tokenId: string;
  noTokenId?: string;
  bestBid?: number;
  bestAsk?: number;
  bidCents: number;
  askCents: number;
  topBidSize?: number;
  topAskSize?: number;
  liquidityUsd: number;
  volumeUsd: number;
  book?: FlowGridBook | null;
};

type FlowGridEvent = {
  id: string;
  slug: string;
  exchange: string;
  sport: string;
  title: string;
  marketFamily?: string;
  eventUrl: string;
  startAt: string | null;
  endAt: string | null;
  active: boolean;
  closed: boolean;
  liquidityUsd: number;
  volumeUsd: number;
  outcomeCount: number;
  bidSumCents: number;
  askSumCents: number;
  basketSpreadCents: number;
  legs: FlowGridLeg[];
};

type FlowGridSettings = {
  stakeUsdPerLevel: number;
  levelSpacingCents: number;
  virtualLevelsPerOutcome: number;
  maxNewLevelsPerTick: number;
  maxEpochCostUsd: number;
  maxEventCostUsd: number;
  takeProfitUsd: number;
  reloadCooldownMs: number;
  maxQuoteAgeMs: number;
};

type FlowGridSession = {
  id: string;
  status: string;
  exchange: string;
  sport: string;
  event: FlowGridEvent;
  settings: FlowGridSettings;
  exposure: {
    theoreticalFullGridUsd: number;
    maxEventExposureUsd: number;
    maxEpochExposureUsd: number;
    maxNewFillUsdPerTick: number;
  };
  createdAt: string;
  updatedAt: string;
  executor?: { ok?: boolean; detail?: string; payload?: Record<string, unknown> } | null;
  pnlUsd?: number;
  openPnlUsd?: number;
  realizedPnlUsd?: number;
};

type FlowGridWallet = {
  at?: string;
  balance?: number;
  allowance?: number;
  openOrders?: number;
  signer?: string;
  funder?: string;
  error?: string;
};

type FlowGridExecution = {
  liveTradingEnabled?: boolean;
  executionReady?: boolean;
  executionMode?: string;
  detail?: string;
  missing?: string[];
};

type FlowGridLiveEvent = {
  id: string;
  sport: string;
  name: string;
  startAt: string | null;
  statusShort?: string | null;
  statusLong?: string | null;
  statusGroup?: string | null;
  clock?: string | null;
  clockSeconds?: number | null;
  clockRunning?: boolean;
  clockSource?: string | null;
  liveScoreSource?: string | null;
  home?: { name?: string; score?: string | number | null } | null;
  away?: { name?: string; score?: string | number | null } | null;
  updatedAt?: string | null;
};

type FlowGridSocketStatus = "waiting" | "connecting" | "live" | "offline";

type FlowGridPricePatch = {
  exchange?: string;
  sport?: string;
  eventId?: string;
  eventSlug?: string;
  marketId?: string;
  marketSlug?: string;
  tokenId?: string;
  conditionId?: string;
  eventTitle?: string;
  outcome?: string;
  bidCents?: number;
  askCents?: number;
  topBidSize?: number;
  topAskSize?: number;
  liquidityUsd?: number;
  volumeUsd?: number;
};

const DEFAULT_SETTINGS: FlowGridSettings = {
  stakeUsdPerLevel: 5,
  levelSpacingCents: 1,
  virtualLevelsPerOutcome: 40,
  maxNewLevelsPerTick: 2,
  maxEpochCostUsd: 25,
  maxEventCostUsd: 75,
  takeProfitUsd: 0.25,
  reloadCooldownMs: 750,
  maxQuoteAgeMs: 500
};

const SPORTS = [
  { label: "All", value: "all" },
  { label: "Football", value: "football" },
  { label: "Tennis", value: "tennis" },
  { label: "Basketball", value: "basketball" },
  { label: "Baseball", value: "baseball" },
  { label: "Hockey", value: "hockey" },
  { label: "Cricket", value: "cricket" },
  { label: "Golf", value: "golf" }
];

const FLOW_GRID_WSS_SPORTS = SPORTS.filter((item) => item.value !== "all").map((item) => item.value);
const FLOW_GRID_DIRECT_PRICE_CHANNELS = ["polymarket.price", "kalshi.price"];

type FlowGridSocketSubscription = {
  channel: string;
  filters: Record<string, string>;
};

type RefreshEventsOptions = {
  background?: boolean;
  force?: boolean;
};

const DATE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "Next 7 Days", value: "next7" }
] as const;

type DateFilter = typeof DATE_FILTERS[number]["value"];

function money(value: number | undefined | null) {
  return formatExchangeMoney(Number(value || 0), "USD");
}

function signedMoney(value: number | undefined | null) {
  const amount = Number(value || 0);
  if (Math.abs(amount) < 0.000001) return "$0";
  const formatted = money(Math.abs(amount));
  return amount > 0 ? `+${formatted}` : `-${formatted}`;
}

function centsLabel(value: number | undefined | null) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "-";
  return `${Number.isInteger(amount) ? amount : amount.toFixed(1)}c`;
}

function compactLegLabel(leg: FlowGridLeg) {
  return `${leg.label} ${centsLabel(leg.bidCents)}/${centsLabel(leg.askCents)}`;
}

function legPriceCents(leg: FlowGridLeg) {
  const bid = Number(leg.bidCents || 0);
  const ask = Number(leg.askCents || 0);
  if (bid > 0 && ask > 0) return Math.round(((bid + ask) / 2) * 10) / 10;
  return Math.round((ask || bid) * 10) / 10;
}

function compactPriceLabel(leg: FlowGridLeg) {
  return `${leg.label} ${centsLabel(legPriceCents(leg))}`;
}

function marketFamilyLabel(event: FlowGridEvent) {
  return String(event.marketFamily || "").trim().toUpperCase();
}

function sportLabel(value: string | null | undefined) {
  return String(value || "unknown").replace(/-/g, " ").toUpperCase();
}

function sportKey(value: string | null | undefined) {
  const normalized = normalizeFixtureText(value || "").replace(/\s+/g, "-");
  if (normalized === "soccer") return "football";
  return normalized;
}

function eventDate(event: FlowGridEvent) {
  const raw = event.startAt || event.endAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventTimeMs(event: FlowGridEvent) {
  return eventDate(event)?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function isGridStartCandidate(event: FlowGridEvent, now = new Date()) {
  const date = eventDate(event);
  if (!date) return false;
  return date.getTime() >= now.getTime();
}

function flowGridEventKey(event: FlowGridEvent) {
  return event.slug || event.id;
}

function dayKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function matchesDateFilter(event: FlowGridEvent, filter: DateFilter, now = new Date()) {
  if (filter === "all") return true;
  const date = eventDate(event);
  if (!date) return false;
  const today = dayKey(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = dayKey(tomorrowDate);
  const eventKey = dayKey(date);
  if (filter === "today") return eventKey === today;
  if (filter === "tomorrow") return eventKey === tomorrow;
  const sevenDays = new Date(now);
  sevenDays.setDate(sevenDays.getDate() + 7);
  return date.getTime() >= now.getTime() && date.getTime() <= sevenDays.getTime();
}

function matchesSportFilter(event: FlowGridEvent, filter: string) {
  return filter === "all" || sportKey(event.sport) === sportKey(filter);
}

function liveStatusCode(event: FlowGridLiveEvent | null | undefined) {
  return String(event?.statusShort || event?.statusLong || event?.statusGroup || "").trim().toUpperCase();
}

function isInPlayLiveEvent(event: FlowGridLiveEvent | null | undefined) {
  if (!event) return false;
  if (String(event.statusGroup || "").toLowerCase() === "live") return true;
  const code = liveStatusCode(event);
  return ["1H", "2H", "HT", "ET", "P", "LIVE", "IN"].includes(code) || /^\d{1,3}(?::\d{2})?'?$/.test(code);
}

function flowGridLiveName(event: FlowGridLiveEvent) {
  return event.name || [event.home?.name, event.away?.name].filter(Boolean).join(" v ");
}

function flowGridNameTokens(value: string) {
  return normalizeFixtureText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !["win", "draw", "will", "end", "date"].includes(token));
}

function liveMatchScore(event: FlowGridEvent, liveEvent: FlowGridLiveEvent) {
  if (sportKey(event.sport) !== sportKey(liveEvent.sport)) return 0;
  const eventMs = eventTimeMs(event);
  const liveMs = liveEvent.startAt ? new Date(liveEvent.startAt).getTime() : NaN;
  if (Number.isFinite(eventMs) && Number.isFinite(liveMs) && Math.abs(eventMs - liveMs) > 8 * 60 * 60 * 1000) return 0;
  const eventName = normalizeFixtureText(event.title);
  const liveName = normalizeFixtureText(flowGridLiveName(liveEvent));
  if (!eventName || !liveName) return 0;
  if (eventName === liveName) return 100;
  if (eventName.includes(liveName) || liveName.includes(eventName)) return 92;
  const eventTokens = new Set(flowGridNameTokens(event.title));
  const liveTokens = new Set(flowGridNameTokens(flowGridLiveName(liveEvent)));
  if (!eventTokens.size || !liveTokens.size) return 0;
  let overlap = 0;
  eventTokens.forEach((token) => {
    if (liveTokens.has(token)) overlap += 1;
  });
  const ratio = overlap / Math.max(1, Math.min(eventTokens.size, liveTokens.size));
  return overlap >= 2 && ratio >= 0.67 ? Math.round(70 + ratio * 20) : 0;
}

function liveEventForGrid(event: FlowGridEvent, liveEvents: FlowGridLiveEvent[]) {
  return liveEvents
    .filter(isInPlayLiveEvent)
    .map((liveEvent) => ({ liveEvent, score: liveMatchScore(event, liveEvent) }))
    .filter((item) => item.score >= 70)
    .sort((left, right) => right.score - left.score)[0]?.liveEvent || null;
}

function liveScoreLabel(event: FlowGridLiveEvent) {
  const home = event.home?.score;
  const away = event.away?.score;
  if (home == null || away == null || home === "" || away === "") return "";
  return `${home}-${away}`;
}

function liveClockLabel(event: FlowGridLiveEvent) {
  return String(event.clock || event.statusShort || event.statusGroup || "LIVE").toUpperCase();
}

function liveSourceLabel(event: FlowGridLiveEvent) {
  return event.liveScoreSource || event.clockSource || event.statusLong || "live results";
}

function eventRangeQuery(filter: DateFilter) {
  if (filter === "all") return "";
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(start);
  const to = new Date(start);
  if (filter === "tomorrow") {
    from.setDate(from.getDate() + 1);
    to.setDate(to.getDate() + 2);
  } else if (filter === "next7") {
    to.setDate(to.getDate() + 7);
  } else {
    to.setDate(to.getDate() + 1);
  }
  return `&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
}

function numericValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sessionPnl(session: FlowGridSession) {
  const source = session as FlowGridSession & {
    raw?: Record<string, unknown>;
    executor?: { payload?: Record<string, unknown> } | null;
  };
  return numericValue(source.pnlUsd)
    ?? numericValue(source.openPnlUsd)
    ?? numericValue(source.realizedPnlUsd)
    ?? numericValue(source.raw?.pnlUsd)
    ?? numericValue(source.executor?.payload?.pnlUsd)
    ?? 0;
}

function executionFromPayload(payload: { execution?: FlowGridExecution; executionReady?: boolean; executionMode?: string; liveTradingEnabled?: boolean; detail?: string } | null | undefined): FlowGridExecution | null {
  if (!payload) return null;
  return payload.execution || {
    executionReady: payload.executionReady,
    executionMode: payload.executionMode,
    liveTradingEnabled: payload.liveTradingEnabled,
    detail: payload.detail
  };
}

function executionLabel(execution: FlowGridExecution | null, configured: boolean) {
  if (!configured) return "Control only";
  if (!execution) return "Ireland linked";
  if (execution.executionReady) return "Ireland live";
  if (execution.liveTradingEnabled) return "Ireland blocked";
  return "Ireland dry";
}

function executionDetail(execution: FlowGridExecution | null) {
  if (!execution) return "";
  if (execution.detail) return execution.detail;
  if (execution.missing?.length) return `Missing ${execution.missing.join(", ")}`;
  return execution.executionMode || "";
}

function timeLabel(value: string | null | undefined) {
  if (!value) return "-";
  return localEventTime(value, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function sessionForEvent(sessions: FlowGridSession[], event: FlowGridEvent) {
  return sessions.find((session) => session.event?.slug === event.slug || session.event?.id === event.id) || null;
}

function sortEventsForGrid(events: FlowGridEvent[], sessions: FlowGridSession[]) {
  const openSessionKeys = new Set(sessions.map((session) => flowGridEventKey(session.event)).filter(Boolean));
  return [...events].sort((left, right) => {
    const leftOpen = openSessionKeys.has(flowGridEventKey(left));
    const rightOpen = openSessionKeys.has(flowGridEventKey(right));
    if (leftOpen !== rightOpen) return leftOpen ? -1 : 1;
    const leftTime = eventTimeMs(left);
    const rightTime = eventTimeMs(right);
    if (leftTime !== rightTime) return leftTime - rightTime;
    const sportOrder = sportLabel(left.sport).localeCompare(sportLabel(right.sport));
    if (sportOrder) return sportOrder;
    return left.title.localeCompare(right.title);
  });
}

function previewExposure(event: FlowGridEvent, settings: FlowGridSettings) {
  const theoreticalFullGridUsd = event.outcomeCount * settings.virtualLevelsPerOutcome * settings.stakeUsdPerLevel;
  const maxEventExposureUsd = Math.min(settings.maxEventCostUsd, theoreticalFullGridUsd);
  const maxEpochExposureUsd = Math.min(settings.maxEpochCostUsd, maxEventExposureUsd);
  return {
    theoreticalFullGridUsd,
    maxEventExposureUsd,
    maxEpochExposureUsd,
    maxNewFillUsdPerTick: settings.stakeUsdPerLevel * settings.maxNewLevelsPerTick
  };
}

function gridLevels(leg: FlowGridLeg, settings: FlowGridSettings) {
  const baseline = Number(leg.askCents || 0);
  return Array.from({ length: settings.virtualLevelsPerOutcome }, (_, index) => (
    Math.min(99, baseline + settings.levelSpacingCents * (index + 1))
  ));
}

function selectedSocketSports(value: string) {
  return value === "all" ? FLOW_GRID_WSS_SPORTS : [value];
}

function socketSubscriptionsForSport(value: string): FlowGridSocketSubscription[] {
  const sportSubscriptions = selectedSocketSports(value).map((item) => ({
    channel: `markets.${item}`,
    filters: { sport: item }
  }));
  const directFilters: Record<string, string> = {};
  if (value !== "all") directFilters.sport = value;
  return [
    ...sportSubscriptions,
    ...FLOW_GRID_DIRECT_PRICE_CHANNELS.map((channel) => ({
      channel,
      filters: directFilters
    }))
  ];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function textValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function numberValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function firstPresentKey(record: Record<string, unknown>, keys: string[]) {
  return keys.find((key) => record[key] != null) || "";
}

function marketPriceToCents(value: number | null, key = "") {
  if (!value || !Number.isFinite(value)) return undefined;
  const normalizedKey = key.toLowerCase();
  if (normalizedKey.includes("cent")) return Math.round(value * 10) / 10;
  if (normalizedKey.includes("odds") && value > 1) return Math.round((100 / value) * 10) / 10;
  if (value <= 1.05) return Math.round(value * 1000) / 10;
  if (value <= 10) return Math.round((100 / value) * 10) / 10;
  if (value <= 100) return Math.round(value * 10) / 10;
  return undefined;
}

function complementCents(value: number | undefined) {
  if (value == null || !Number.isFinite(value)) return undefined;
  return Math.round(Math.max(0, Math.min(100, 100 - value)) * 10) / 10;
}

function directPatchFromRecord(record: Record<string, unknown>, inherited: Partial<FlowGridPricePatch> = {}) {
  const exchange = textValue(record, ["exchange", "exchange_code", "exchangeCode", "source", "venue"]) || inherited.exchange || "";
  const tokenId = textValue(record, ["tokenId", "token_id", "assetId", "asset_id", "exchangeRunnerId", "exchange_runner_id", "runnerId", "runner_id", "token"]) || inherited.tokenId || "";
  const eventId = textValue(record, ["eventId", "event_id", "exchangeEventId", "exchange_event_id"]) || inherited.eventId || "";
  const marketId = textValue(record, ["marketId", "market_id", "exchangeMarketId", "exchange_market_id"]) || inherited.marketId || "";
  const conditionId = textValue(record, ["conditionId", "condition_id"]) || inherited.conditionId || "";
  const marketSlug = textValue(record, ["marketSlug", "market_slug", "market"]);
  const eventSlug = textValue(record, ["eventSlug", "event_slug", "slug"]);
  const eventTitle = textValue(record, ["eventName", "event_name", "fixture", "fixture_name", "name", "title", "event"]);
  const outcome = textValue(record, ["runnerName", "runner_name", "selection", "outcome", "outcomeName", "outcome_name"]);
  const bidKeys = ["bidCents", "bid_cents", "bestBidCents", "best_bid_cents", "bestBid", "best_bid", "bid"];
  const askKeys = ["askCents", "ask_cents", "bestAskCents", "best_ask_cents", "bestAsk", "best_ask", "ask"];
  const bidRaw = numberValue(record, bidKeys);
  const askRaw = numberValue(record, askKeys);
  const priceRaw = numberValue(record, ["price", "lastPrice", "last_price"]);
  const oddsRaw = numberValue(record, ["odds", "decimalOdds", "decimal_odds"]);
  const side = textValue(record, ["side", "orderSide", "order_side"]).toLowerCase();
  const exchangeType = textValue(record, ["exchangeType", "exchange_type"]).toLowerCase();
  const ladderLevel = numberValue(record, ["ladderLevel", "ladder_level"]);
  let bidCents = marketPriceToCents(bidRaw, firstPresentKey(record, bidKeys));
  let askCents = marketPriceToCents(askRaw, firstPresentKey(record, askKeys));
  const priceCents = marketPriceToCents(priceRaw, "price");
  const oddsCents = marketPriceToCents(oddsRaw, "odds");
  const predictiveClob = ["polymarket", "kalshi"].some((venue) => exchangeType.includes(venue) || exchange.toLowerCase() === venue);
  const polymarketSyntheticBid = exchangeType.includes("polymarket:wss")
    && side === "back"
    && Number(ladderLevel || 0) > 1
    && (exchangeType.includes("price_change") || exchangeType.includes("best_bid_ask"));

  if (predictiveClob && side === "back" && polymarketSyntheticBid && bidCents == null) bidCents = complementCents(oddsCents ?? priceCents);
  else if (predictiveClob && side === "back" && askCents == null) askCents = oddsCents ?? priceCents;
  else if (predictiveClob && side === "lay" && bidCents == null) bidCents = complementCents(oddsCents ?? priceCents);
  else if (side === "back" && bidCents == null) bidCents = oddsCents ?? priceCents;
  else if (side === "lay" && askCents == null) askCents = oddsCents ?? priceCents;
  if (!side && bidCents == null && askCents == null) {
    bidCents = priceCents;
    askCents = priceCents;
  }
  if (!tokenId && !marketId && !conditionId && !marketSlug && !(eventTitle && outcome)) return null;
  if (bidCents == null && askCents == null && priceCents == null) return null;
  const availableAmount = numberValue(record, ["topBidSize", "top_bid_size", "bidSize", "bid_size", "availableAmount", "available_amount", "amount", "size"]);
  return {
    ...inherited,
    exchange: exchange || inherited.exchange,
    tokenId,
    eventId,
    marketId,
    conditionId,
    marketSlug: marketSlug || inherited.marketSlug,
    eventSlug: eventSlug || inherited.eventSlug,
    eventTitle: eventTitle || inherited.eventTitle,
    outcome: outcome || inherited.outcome,
    bidCents: bidCents ?? (!side ? priceCents : undefined),
    askCents: askCents ?? (!side ? priceCents : undefined),
    topBidSize: (bidCents != null ? availableAmount : numberValue(record, ["topBidSize", "top_bid_size", "bidSize", "bid_size"])) ?? inherited.topBidSize,
    topAskSize: (askCents != null ? availableAmount : numberValue(record, ["topAskSize", "top_ask_size", "askSize", "ask_size"])) ?? inherited.topAskSize,
    liquidityUsd: numberValue(record, ["liquidityUsd", "liquidity_usd", "liquidity", "liquidityNum"]) ?? inherited.liquidityUsd,
    volumeUsd: numberValue(record, ["volumeUsd", "volume_usd", "volume", "volumeNum"]) ?? inherited.volumeUsd
  };
}

function patchesFromMatch(match: Record<string, unknown>, inherited: Partial<FlowGridPricePatch>) {
  const eventTitle = textValue(match, ["eventName", "event_name", "fixture", "fixture_name", "name", "title"]) || inherited.eventTitle;
  const eventId = textValue(match, ["eventId", "event_id", "exchangeEventId", "exchange_event_id"]) || inherited.eventId;
  const eventSlug = textValue(match, ["eventSlug", "event_slug", "slug"]) || inherited.eventSlug;
  const marketId = textValue(match, ["marketId", "market_id", "exchangeMarketId", "exchange_market_id"]) || inherited.marketId;
  const marketSlug = textValue(match, ["marketSlug", "market_slug"]) || inherited.marketSlug;
  const sport = textValue(match, ["sportName", "sport_name", "sport"]) || inherited.sport;
  const exchange = textValue(match, ["exchange", "exchange_code", "exchangeCode", "source", "venue"]) || inherited.exchange;
  const runners = Array.isArray(match.runners) ? match.runners : [];
  return runners.flatMap((runner) => {
    const record = asRecord(runner);
    if (!record) return [];
    const back = asRecord(record.back);
    const lay = asRecord(record.lay);
    const bidCents = marketPriceToCents(
      numberValue(record, ["bidCents", "bid_cents"]) ?? (back ? numberValue(back, ["price", "odds", "decimalOdds", "decimal_odds"]) : null),
      back ? "odds" : "bidCents"
    );
    const askCents = marketPriceToCents(
      numberValue(record, ["askCents", "ask_cents"]) ?? (lay ? numberValue(lay, ["price", "odds", "decimalOdds", "decimal_odds"]) : null),
      lay ? "odds" : "askCents"
    );
    const patch = directPatchFromRecord(record, {
      exchange,
      eventTitle,
      eventId,
      eventSlug,
      marketId,
      marketSlug,
      sport,
      outcome: textValue(record, ["name", "runnerName", "runner_name", "selection", "outcome"]),
      bidCents,
      askCents,
      topBidSize: back ? numberValue(back, ["amount", "size", "availableAmount", "available_amount"]) ?? undefined : undefined,
      topAskSize: lay ? numberValue(lay, ["amount", "size", "availableAmount", "available_amount"]) ?? undefined : undefined
    });
    return patch ? [patch] : [];
  });
}

function socketPricePatches(payload: unknown, channel: string): FlowGridPricePatch[] {
  if (Array.isArray(payload)) return payload.flatMap((item) => socketPricePatches(item, channel));
  const record = asRecord(payload);
  if (!record) return [];
  if (Array.isArray(record.rows)) return record.rows.flatMap((row) => socketPricePatches(row, channel));
  if (record.row) return socketPricePatches(record.row, channel);
  const sport = textValue(record, ["sportName", "sport_name", "sport"]) || channel.replace(/^markets\./, "");
  const inherited = {
    exchange: textValue(record, ["exchange", "exchange_code", "exchangeCode", "source", "venue"]),
    sport,
    eventId: textValue(record, ["eventId", "event_id", "exchangeEventId", "exchange_event_id"]),
    eventSlug: textValue(record, ["eventSlug", "event_slug", "slug"]),
    eventTitle: textValue(record, ["eventName", "event_name", "fixture", "fixture_name", "name", "title", "event"]),
    marketId: textValue(record, ["marketId", "market_id", "exchangeMarketId", "exchange_market_id"]),
    marketSlug: textValue(record, ["marketSlug", "market_slug"])
  };
  const matches = asRecord(record.matches);
  if (matches) {
    return Object.values(matches).flatMap((match) => {
      const matchRecord = asRecord(match);
      if (!matchRecord) return [];
      const exchange = textValue(matchRecord, ["exchange", "source", "venue"]).toLowerCase();
      if (exchange && !["polymarket", "kalshi"].includes(exchange)) return [];
      return patchesFromMatch(matchRecord, inherited);
    });
  }
  if (record.match) {
    const matchRecord = asRecord(record.match);
    if (matchRecord) return patchesFromMatch(matchRecord, inherited);
  }
  const patch = directPatchFromRecord(record, inherited);
  return patch ? [patch] : [];
}

function patchMatchesLeg(event: FlowGridEvent, leg: FlowGridLeg, patch: FlowGridPricePatch) {
  if (patch.exchange && event.exchange && patch.exchange.toLowerCase() !== event.exchange.toLowerCase()) return false;
  if (patch.sport && patch.sport !== "all" && event.sport && sportKey(patch.sport) !== sportKey(event.sport)) return false;
  if (patch.tokenId && patch.tokenId === leg.tokenId) return true;
  const outcomeMatches = patch.outcome
    ? normalizeFixtureText(patch.outcome) === normalizeFixtureText(leg.label)
    : false;
  if (patch.conditionId && leg.conditionId && patch.conditionId === leg.conditionId && outcomeMatches) return true;
  if (patch.marketId && leg.marketId && patch.marketId === leg.marketId && outcomeMatches) return true;
  if (patch.marketSlug && patch.marketSlug === leg.marketSlug && (!patch.outcome || outcomeMatches)) return true;
  if (patch.eventId) {
    const eventIds = [event.id, String(event.id || "").split(":")[0]].filter(Boolean);
    if (!eventIds.includes(patch.eventId)) return false;
  }
  if (patch.eventSlug && patch.eventSlug !== event.slug) return false;
  if (!patch.eventTitle || !patch.outcome) return false;
  return normalizeFixtureText(patch.eventTitle) === normalizeFixtureText(event.title)
    && outcomeMatches;
}

function applyFlowGridPricePatches(events: FlowGridEvent[], patches: FlowGridPricePatch[]) {
  if (!patches.length) return events;
  let changed = false;
  const next = events.map((event) => {
    let eventChanged = false;
    const legs = event.legs.map((leg) => {
      const patch = patches.find((item) => patchMatchesLeg(event, leg, item));
      if (!patch) return leg;
      eventChanged = true;
      return {
        ...leg,
        bidCents: patch.bidCents ?? leg.bidCents,
        askCents: patch.askCents ?? leg.askCents,
        bestBid: patch.bidCents != null ? patch.bidCents / 100 : leg.bestBid,
        bestAsk: patch.askCents != null ? patch.askCents / 100 : leg.bestAsk,
        topBidSize: patch.topBidSize ?? leg.topBidSize,
        topAskSize: patch.topAskSize ?? leg.topAskSize,
        liquidityUsd: patch.liquidityUsd ?? leg.liquidityUsd,
        volumeUsd: patch.volumeUsd ?? leg.volumeUsd
      };
    });
    if (!eventChanged) return event;
    changed = true;
    const bidSumCents = legs.reduce((sum, leg) => sum + Number(leg.bidCents || 0), 0);
    const askSumCents = legs.reduce((sum, leg) => sum + Number(leg.askCents || 0), 0);
    const patchLiquidity = Math.max(0, ...patches
      .filter((patch) => legs.some((leg) => patchMatchesLeg(event, leg, patch)))
      .map((patch) => Number(patch.liquidityUsd || 0)));
    return {
      ...event,
      legs,
      bidSumCents,
      askSumCents,
      basketSpreadCents: askSumCents > 0 && bidSumCents > 0 ? Math.max(0, askSumCents - bidSumCents) : event.basketSpreadCents,
      liquidityUsd: patchLiquidity > 0 ? Math.max(event.liquidityUsd, patchLiquidity) : event.liquidityUsd
    };
  });
  return changed ? next : events;
}

async function jsonFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || payload.error || "Flow Grid API failed");
  return payload as T;
}

async function loadEvents(sport: string, dateFilter: DateFilter, signal?: AbortSignal) {
  const limit = sport === "all" ? 150 : 100;
  const payload = await jsonFetch<{ events: FlowGridEvent[] }>(
    `/api/flow-grid/events?sport=${encodeURIComponent(sport)}&limit=${limit}&books=0&date=${encodeURIComponent(dateFilter)}${eventRangeQuery(dateFilter)}`,
    { signal }
  );
  return (payload.events || []).filter((event) => isGridStartCandidate(event));
}

async function loadLiveSports(signal?: AbortSignal) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
  const payload = await jsonFetch<{ items?: FlowGridLiveEvent[] }>(
    `/api/sports/events?limit=5000&timezone=${encodeURIComponent(timezone)}`,
    { signal }
  );
  return (payload.items || []).filter(isInPlayLiveEvent);
}

async function resolveEvent(input: string, sport: string) {
  const payload = await jsonFetch<{ event: FlowGridEvent }>(`/api/flow-grid/events/resolve?id=${encodeURIComponent(input)}&sport=${encodeURIComponent(sport)}&idType=slug`);
  return payload.event;
}

async function loadSessions() {
  return jsonFetch<{
    executorConfigured: boolean;
    executor?: { ok?: boolean; detail?: string; payload?: { execution?: FlowGridExecution; executionReady?: boolean; executionMode?: string; liveTradingEnabled?: boolean; detail?: string } } | null;
    sessions: FlowGridSession[];
  }>("/api/flow-grid/sessions");
}

async function loadWallet() {
  return jsonFetch<{
    executorConfigured: boolean;
    wallet: FlowGridWallet | null;
    executor?: { detail?: string; payload?: { execution?: FlowGridExecution; executionReady?: boolean; executionMode?: string; liveTradingEnabled?: boolean; detail?: string } } | null;
  }>("/api/flow-grid/wallet");
}

async function startGrid(event: FlowGridEvent, settings: FlowGridSettings) {
  return jsonFetch<{ session: FlowGridSession }>("/api/flow-grid/grids/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventId: event.slug || event.id,
      idType: event.slug ? "slug" : "id",
      sport: event.sport,
      exchange: event.exchange,
      settings
    })
  });
}

async function gridAction(sessionId: string, action: "pause" | "stop" | "flatten") {
  return jsonFetch<{ session: FlowGridSession }>(`/api/flow-grid/grids/${encodeURIComponent(sessionId)}/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json" }
  });
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const warning = normalized.includes("control") || normalized.includes("request") || normalized.includes("dry") || normalized.includes("not_ready") || normalized.includes("blocked");
  return (
    <span className={[
      "flow-grid-pill",
      !warning && (normalized.includes("armed") || normalized.includes("trading") || normalized.includes("arming")) ? "live" : "",
      warning ? "warn" : ""
    ].filter(Boolean).join(" ")}>
      {status || "idle"}
    </span>
  );
}

function EventDetail({
  event,
  settings,
  session,
  liveEvent,
  onClose
}: {
  event: FlowGridEvent;
  settings: FlowGridSettings;
  session: FlowGridSession | null;
  liveEvent: FlowGridLiveEvent | null;
  onClose: () => void;
}) {
  const exposure = previewExposure(event, settings);
  const sessionExposure = session?.exposure || exposure;
  const sessionExecution = executionFromPayload(session?.executor?.payload as { execution?: FlowGridExecution; executionReady?: boolean; executionMode?: string; liveTradingEnabled?: boolean; detail?: string } | undefined);
  const executorText = session ? executionLabel(sessionExecution, Boolean(session.executor?.ok)) : "No session";
  const sessionStatus = session?.status || "IDLE";
  return (
    <div className="flow-grid-detail" role="dialog" aria-label={`${event.title} flow grid detail`}>
      <header>
        <div className="flow-grid-detail-title">
          <span>{event.exchange.toUpperCase()} / {event.sport.toUpperCase()}</span>
          <strong>{event.title}</strong>
          <div className="flow-grid-detail-meta">
            <span>{timeLabel(event.startAt || event.endAt)}</span>
            {liveEvent && <span className="live">IN PLAY {liveClockLabel(liveEvent)} {liveScoreLabel(liveEvent)}</span>}
            <span>{marketFamilyLabel(event) || `${event.outcomeCount} legs`}</span>
            <span>Spread {centsLabel(event.basketSpreadCents)}</span>
            <span>{event.slug}</span>
          </div>
        </div>
        <div className="flow-grid-detail-actions">
          <StatusPill status={sessionStatus} />
          <a href={event.eventUrl} target="_blank" rel="noreferrer">Open market</a>
          <button type="button" className="flow-grid-icon-button" aria-label="Close grid detail" onClick={onClose}><X size={16} /></button>
        </div>
      </header>

      <section className="flow-grid-detail-strip">
        <article><span>Full Grid</span><strong>{money(exposure.theoreticalFullGridUsd)}</strong></article>
        <article><span>Event Cap</span><strong>{money(exposure.maxEventExposureUsd)}</strong></article>
        <article><span>Epoch Cap</span><strong>{money(exposure.maxEpochExposureUsd)}</strong></article>
        <article><span>Per Tick</span><strong>{money(exposure.maxNewFillUsdPerTick)}</strong></article>
        <article><span>TP</span><strong>{money(settings.takeProfitUsd)}</strong></article>
        <article><span>Basket</span><strong>{centsLabel(event.bidSumCents)} / {centsLabel(event.askSumCents)}</strong></article>
      </section>

      <section className="flow-grid-detail-body">
        <div className="flow-grid-detail-levels-panel">
          <div className="flow-grid-section-head">
            <span>Outcome Grid</span>
            <strong>{settings.virtualLevelsPerOutcome} levels / {centsLabel(settings.levelSpacingCents)} spacing / {money(settings.stakeUsdPerLevel)} stake</strong>
          </div>
          <table className="flow-grid-level-table">
            <thead>
              <tr>
                <th>Outcome</th>
                <th>Market</th>
                <th>Liquidity</th>
                <th>Local Range</th>
                <th>Preview Levels</th>
              </tr>
            </thead>
            <tbody>
              {event.legs.map((leg) => {
                const levels = gridLevels(leg, settings);
                const preview = levels.slice(0, 14);
                const firstLevel = levels[0];
                const lastLevel = levels[levels.length - 1];
                return (
                  <tr key={leg.key}>
                    <td>
                      <strong>{leg.label}</strong>
                      <small>{leg.marketSlug || leg.tokenId}</small>
                    </td>
                    <td>
                      <div className="flow-grid-detail-market">
                        <span><em>Bid</em>{centsLabel(leg.bidCents)}</span>
                        <span><em>Ask</em>{centsLabel(leg.askCents)}</span>
                      </div>
                    </td>
                    <td>{money(leg.liquidityUsd)}</td>
                    <td>
                      <strong>{centsLabel(firstLevel)} to {centsLabel(lastLevel)}</strong>
                      <small>{levels.length} local levels</small>
                    </td>
                    <td>
                      <div className="flow-grid-detail-levels">
                        {preview.map((level, index) => (
                          <span key={`${leg.key}:${level}:${index}`}>{centsLabel(level)}</span>
                        ))}
                        {levels.length > preview.length && <span className="more">+{levels.length - preview.length}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="flow-grid-detail-session">
          <div className="flow-grid-section-head">
            <span>Session</span>
            <strong>{session?.id || "No active session"}</strong>
          </div>
          <div className="flow-grid-session-stack">
            <article>
              <span>State</span>
              <strong><StatusPill status={sessionStatus} /></strong>
            </article>
            <article>
              <span>Executor</span>
              <strong>{executorText}</strong>
            </article>
            <article>
              <span>Created</span>
              <strong>{session ? timeLabel(session.createdAt) : "-"}</strong>
            </article>
            <article>
              <span>Updated</span>
              <strong>{session ? timeLabel(session.updatedAt) : "-"}</strong>
            </article>
            <article>
              <span>Event Cap</span>
              <strong>{money(sessionExposure.maxEventExposureUsd)}</strong>
            </article>
            <article>
              <span>Epoch Cap</span>
              <strong>{money(sessionExposure.maxEpochExposureUsd)}</strong>
            </article>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default function FlowGrid() {
  const [sport, setSport] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [events, setEvents] = useState<FlowGridEvent[]>([]);
  const [liveEvents, setLiveEvents] = useState<FlowGridLiveEvent[]>([]);
  const [liveEventsUpdatedAt, setLiveEventsUpdatedAt] = useState("");
  const [sessions, setSessions] = useState<FlowGridSession[]>([]);
  const [wallet, setWallet] = useState<FlowGridWallet | null>(null);
  const [walletError, setWalletError] = useState("");
  const [executorConfigured, setExecutorConfigured] = useState(false);
  const [executorState, setExecutorState] = useState<FlowGridExecution | null>(null);
  const [settings, setSettings] = useState<FlowGridSettings>(DEFAULT_SETTINGS);
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set());
  const [selectedSlug, setSelectedSlug] = useState("");
  const [detailSlug, setDetailSlug] = useState("");
  const [manualEvent, setManualEvent] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [socketStatus, setSocketStatus] = useState<FlowGridSocketStatus>("waiting");
  const eventsRequestRef = useRef(0);
  const eventsAbortRef = useRef<AbortController | null>(null);
  const eventsCacheRef = useRef<Map<string, FlowGridEvent[]>>(new Map());
  const socketRef = useRef<WebSocket | null>(null);
  const socketReconnectRef = useRef<number | null>(null);
  const socketFlushRef = useRef<number | null>(null);
  const socketPatchesRef = useRef<FlowGridPricePatch[]>([]);
  const detailEvent = useMemo(() => (
    events.find((event) => event.slug === detailSlug || event.id === detailSlug)
    || sessions.find((session) => session.event?.slug === detailSlug || session.event?.id === detailSlug)?.event
    || null
  ), [events, sessions, detailSlug]);
  const detailLiveEvent = useMemo(() => (
    detailEvent ? liveEventForGrid(detailEvent, liveEvents) : null
  ), [detailEvent, liveEvents]);

  async function refreshEvents(nextSport = sport, nextDateFilter = dateFilter, options: RefreshEventsOptions = {}) {
    const requestId = eventsRequestRef.current + 1;
    eventsRequestRef.current = requestId;
    eventsAbortRef.current?.abort();
    const controller = new AbortController();
    eventsAbortRef.current = controller;
    const cacheKey = `${nextSport}:${nextDateFilter}`;
    const cached = eventsCacheRef.current.get(cacheKey);
    if (cached) setEvents(cached);
    if (cached && !options.force) return;
    if (!options.background) setBusy("refresh");
    try {
      const next = await loadEvents(nextSport, nextDateFilter, controller.signal);
      if (eventsRequestRef.current !== requestId) return;
      eventsCacheRef.current.set(cacheKey, next);
      setEvents(next);
      setError("");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (eventsRequestRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : "Flow Grid events failed");
    } finally {
      if (eventsRequestRef.current === requestId) {
        if (!options.background) setBusy("");
        if (eventsAbortRef.current === controller) eventsAbortRef.current = null;
      }
    }
  }

  async function refreshSessions() {
    try {
      const payload = await loadSessions();
      setSessions(payload.sessions || []);
      setExecutorConfigured(Boolean(payload.executorConfigured));
      setExecutorState(executionFromPayload(payload.executor?.payload));
    } catch {
      setSessions([]);
      setExecutorState(null);
    }
  }

  async function refreshLiveSports(signal?: AbortSignal) {
    try {
      const next = await loadLiveSports(signal);
      setLiveEvents(next);
      setLiveEventsUpdatedAt(new Date().toISOString());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }

  async function refreshWallet() {
    try {
      const payload = await loadWallet();
      setWallet(payload.wallet || null);
      setWalletError(payload.executor?.detail || "");
      if (payload.executorConfigured) setExecutorConfigured(true);
      const nextExecution = executionFromPayload(payload.executor?.payload);
      if (nextExecution) setExecutorState(nextExecution);
    } catch (err) {
      setWallet(null);
      setWalletError(err instanceof Error ? err.message : "Wallet unavailable");
    }
  }

  async function addManualEvent() {
    if (!manualEvent.trim()) return;
    setBusy("manual");
    try {
      const event = await resolveEvent(manualEvent.trim(), sport);
      setEvents((current) => [event, ...current.filter((item) => item.slug !== event.slug)]);
      setSelectedSlug(event.slug || event.id);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Event resolve failed");
    } finally {
      setBusy("");
    }
  }

  async function openDetail(event: FlowGridEvent) {
    const key = event.slug || event.id;
    setSelectedSlug(key);
    setDetailSlug(key);
    if (!event.slug || event.legs.some((leg) => leg.book)) return;
    try {
      const enriched = await resolveEvent(event.slug, event.sport);
      setEvents((current) => current.map((item) => (
        item.slug === enriched.slug || item.id === enriched.id ? enriched : item
      )));
      const cacheKey = `${sport}:${dateFilter}`;
      const cached = eventsCacheRef.current.get(cacheKey);
      if (cached) {
        eventsCacheRef.current.set(cacheKey, cached.map((item) => (
          item.slug === enriched.slug || item.id === enriched.id ? enriched : item
        )));
      }
    } catch {
      // The detail can still render the live top-of-book rows if depth fails.
    }
  }

  async function startEvent(event: FlowGridEvent) {
    setBusy(`start:${event.slug || event.id}`);
    try {
      const result = await startGrid(event, settings);
      setSessions((current) => [result.session, ...current.filter((item) => item.id !== result.session.id)]);
      setEnabled((current) => new Set(current).add(event.slug || event.id));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Start grid failed");
    } finally {
      setBusy("");
    }
  }

  async function sendAction(session: FlowGridSession, action: "pause" | "stop" | "flatten") {
    setBusy(`${action}:${session.id}`);
    try {
      const result = await gridAction(session.id, action);
      setSessions((current) => current.map((item) => item.id === result.session.id ? result.session : item));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Grid action failed");
    } finally {
      setBusy("");
    }
  }

  function toggleEvent(key: string) {
    setEnabled((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    refreshEvents("all", "all");
    refreshSessions();
    refreshWallet();
    const timer = window.setInterval(() => {
      refreshSessions();
      refreshWallet();
    }, 3000);
    return () => {
      eventsAbortRef.current?.abort();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const refresh = async (signal?: AbortSignal) => {
      if (!active) return;
      await refreshLiveSports(signal);
    };
    void refresh(controller.signal);
    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const token = window.localStorage.getItem("sportsedge.auth.token");
    const subscriptions = socketSubscriptionsForSport(sport);
    const channels = subscriptions.map((subscription) => subscription.channel);
    let closedByEffect = false;

    function clearReconnect() {
      if (!socketReconnectRef.current) return;
      window.clearTimeout(socketReconnectRef.current);
      socketReconnectRef.current = null;
    }

    function flushPatches() {
      socketFlushRef.current = null;
      const patches = socketPatchesRef.current.splice(0);
      if (!patches.length) return;
      setEvents((current) => applyFlowGridPricePatches(current, patches));
      const nextCache = new Map<string, FlowGridEvent[]>();
      eventsCacheRef.current.forEach((cachedEvents, key) => {
        nextCache.set(key, applyFlowGridPricePatches(cachedEvents, patches));
      });
      eventsCacheRef.current = nextCache;
    }

    function queuePatches(patches: FlowGridPricePatch[]) {
      if (!patches.length) return;
      socketPatchesRef.current.push(...patches);
      if (socketFlushRef.current) return;
      socketFlushRef.current = window.setTimeout(flushPatches, 50);
    }

    function subscribe(socket: WebSocket) {
      subscriptions.forEach((subscription) => {
        socket.send(JSON.stringify({
          type: "subscribe",
          channel: subscription.channel,
          filters: subscription.filters
        }));
      });
    }

    function connect() {
      clearReconnect();
      if (!token) {
        setSocketStatus("waiting");
        return;
      }
      setSocketStatus("connecting");
      const socket = new WebSocket(sportsEdgeWsUrl(token));
      socketRef.current = socket;
      socket.addEventListener("open", () => {
        setSocketStatus("live");
        subscribe(socket);
      });
      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          const channel = String(message?.channel || "");
          if (message?.type !== "event" || !message.payload || !channels.includes(channel)) return;
          queuePatches(socketPricePatches(message.payload, channel));
        } catch {
          // Snapshot refresh still keeps the grid usable if a socket frame is malformed.
        }
      });
      socket.addEventListener("close", () => {
        if (closedByEffect) return;
        setSocketStatus("offline");
        socketReconnectRef.current = window.setTimeout(connect, 2500);
      });
      socket.addEventListener("error", () => {
        if (closedByEffect) return;
        setSocketStatus("offline");
        socket.close();
      });
    }

    connect();

    return () => {
      closedByEffect = true;
      clearReconnect();
      if (socketFlushRef.current) {
        window.clearTimeout(socketFlushRef.current);
        socketFlushRef.current = null;
      }
      socketPatchesRef.current = [];
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [sport]);

  const visibleEvents = useMemo(
    () => sortEventsForGrid(
      events.filter((event) => isGridStartCandidate(event) && matchesDateFilter(event, dateFilter) && matchesSportFilter(event, sport)),
      sessions
    ),
    [events, dateFilter, sport, sessions]
  );
  const liveEventByGridKey = useMemo(() => {
    const matches = new Map<string, FlowGridLiveEvent>();
    visibleEvents.forEach((event) => {
      const liveEvent = liveEventForGrid(event, liveEvents);
      if (liveEvent) matches.set(flowGridEventKey(event), liveEvent);
    });
    return matches;
  }, [visibleEvents, liveEvents]);

  const totals = visibleEvents.reduce((acc, event) => {
    const exposure = previewExposure(event, settings);
    acc.liquidity += Number(event.liquidityUsd || 0);
    if (enabled.has(event.slug || event.id)) {
      acc.enabledExposure += exposure.maxEventExposureUsd;
      acc.enabledCount += 1;
    }
    return acc;
  }, { liquidity: 0, enabledExposure: 0, enabledCount: 0 });
  const socketSportsLabel = `${selectedSocketSports(sport).map(sportLabel).join(", ")} + direct predictive prices`;
  const executorLabel = executionLabel(executorState, executorConfigured);
  const executorDetail = executionDetail(executorState);
  const executorReady = Boolean(executorState?.executionReady);

  return (
    <div className="terminal-shell">
      <TerminalTopbar active="flow-grid" searchPlaceholder="Flow Grid: event, sport, market..." />
      <main className="terminal-content flow-grid-screen">
        <section className="flow-grid-summary">
          <article><span>Executor</span><strong className={executorReady ? "positive" : "warning"}>{executorLabel}</strong><small>{executorDetail || (executorConfigured ? "Awaiting Ireland state" : "FLOW_GRID_EXECUTOR_URL missing")}</small></article>
          <article><span>Wallet</span><strong className={wallet?.balance != null ? "positive" : "warning"}>{wallet?.balance != null ? money(wallet.balance) : "Unavailable"}</strong><small>{wallet?.openOrders != null ? `${wallet.openOrders} exchange orders` : walletError || "No wallet feed"}</small></article>
          <article><span>Events</span><strong>{visibleEvents.length}</strong><small>{events.length} loaded</small></article>
          <article><span>In Play</span><strong className={liveEventByGridKey.size ? "positive" : ""}>{liveEventByGridKey.size}</strong><small>{liveEvents.length} live results / {liveEventsUpdatedAt ? timeLabel(liveEventsUpdatedAt) : "waiting"}</small></article>
          <article><span>Price WSS</span><strong className={socketStatus === "live" ? "positive" : "warning"}>{socketStatus}</strong><small>{socketSportsLabel}</small></article>
          <article><span>Enabled exposure</span><strong>{money(totals.enabledExposure)}</strong><small>{totals.enabledCount} enabled</small></article>
          <article><span>Visible liquidity</span><strong>{money(totals.liquidity)}</strong></article>
          <article><span>Open grids</span><strong>{sessions.length}</strong></article>
        </section>

        <section className="flow-grid-controls">
          <div className="flow-grid-filterbar">
            <nav aria-label="Flow grid date filter">
              {DATE_FILTERS.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={dateFilter === item.value ? "active" : ""}
                  onClick={() => { setDateFilter(item.value); void refreshEvents(sport, item.value, { background: true }); }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <span>/</span>
            <nav aria-label="Flow grid sport filter">
              {SPORTS.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={sport === item.value ? "active" : ""}
                  onClick={() => { setSport(item.value); void refreshEvents(item.value, dateFilter, { background: true }); }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flow-grid-control-group">
            <label>Event slug
              <input value={manualEvent} onChange={(event) => setManualEvent(event.target.value)} placeholder="event slug or market URL" />
            </label>
            <button type="button" onClick={addManualEvent} disabled={busy === "manual"}><Activity size={14} /> Add</button>
            <button type="button" onClick={() => refreshEvents(sport, dateFilter, { force: true })} disabled={busy === "refresh"}><RefreshCw size={14} /> Refresh</button>
          </div>
          <div className="flow-grid-control-group numeric">
            <label>Stake <input type="number" min="1" value={settings.stakeUsdPerLevel} onChange={(event) => setSettings({ ...settings, stakeUsdPerLevel: Number(event.target.value) })} /></label>
            <label>Levels <input type="number" min="1" max="99" value={settings.virtualLevelsPerOutcome} onChange={(event) => setSettings({ ...settings, virtualLevelsPerOutcome: Number(event.target.value) })} /></label>
            <label>Spacing <input type="number" min="0.5" step="0.5" value={settings.levelSpacingCents} onChange={(event) => setSettings({ ...settings, levelSpacingCents: Number(event.target.value) })} /></label>
            <label>Epoch <input type="number" min="1" value={settings.maxEpochCostUsd} onChange={(event) => setSettings({ ...settings, maxEpochCostUsd: Number(event.target.value) })} /></label>
            <label>Event <input type="number" min="1" value={settings.maxEventCostUsd} onChange={(event) => setSettings({ ...settings, maxEventCostUsd: Number(event.target.value) })} /></label>
            <label>TP <input type="number" min="0.01" step="0.01" value={settings.takeProfitUsd} onChange={(event) => setSettings({ ...settings, takeProfitUsd: Number(event.target.value) })} /></label>
          </div>
        </section>

        {error && <section className="flow-grid-error">{error}</section>}

        <section className="flow-grid-table-panel sessions">
          <div className="flow-grid-section-head">
            <span>Local grids / sessions</span>
            <strong>{sessions.length} tracked / virtual levels trigger execution locally</strong>
          </div>
          <table>
            <thead>
              <tr><th>State</th><th>Sport</th><th>Event</th><th>Created</th><th>Event Cap</th><th>Epoch Cap</th><th>P&L</th><th>Executor</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const pnl = sessionPnl(session);
                const sessionExecution = executionFromPayload(session.executor?.payload as { execution?: FlowGridExecution; executionReady?: boolean; executionMode?: string; liveTradingEnabled?: boolean; detail?: string } | undefined);
                const inPlay = session.event ? liveEventForGrid(session.event, liveEvents) : null;
                return (
                  <tr key={session.id} onDoubleClick={() => setDetailSlug(session.event?.slug || session.event?.id || "")}>
                    <td><StatusPill status={session.status} /></td>
                    <td><span className="flow-grid-sport-cell">{sportLabel(session.event?.sport || session.sport)}</span></td>
                    <td>
                      <strong>{session.event?.title || session.id}</strong>
                      {inPlay && <span className="flow-grid-live-badge" title={liveSourceLabel(inPlay)}>IN PLAY {liveClockLabel(inPlay)} {liveScoreLabel(inPlay)}</span>}
                      <small>{session.id}</small>
                    </td>
                    <td>{timeLabel(session.createdAt)}</td>
                    <td>{money(session.exposure?.maxEventExposureUsd)}</td>
                    <td>{money(session.exposure?.maxEpochExposureUsd)}</td>
                    <td className={pnl >= 0 ? "positive" : "negative"}>{signedMoney(pnl)}</td>
                    <td>{executionLabel(sessionExecution, Boolean(session.executor?.ok || executorConfigured))}<small>{executionDetail(sessionExecution) || session.executor?.detail || ""}</small></td>
                    <td className="flow-grid-row-actions">
                      <button type="button" onClick={() => sendAction(session, "flatten")}><Square size={13} /> Flat</button>
                      <button type="button" onClick={() => sendAction(session, "stop")}><X size={13} /> Stop</button>
                    </td>
                  </tr>
                );
              })}
              {!sessions.length && <tr><td colSpan={9}>No local grid sessions.</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="flow-grid-table-panel">
          <div className="flow-grid-section-head">
            <span>Supported events</span>
            <strong>{sport.toUpperCase()} / PREDICTIVE VENUES</strong>
          </div>
          <table>
            <colgroup>
              <col className="flow-grid-col-enable" />
              <col className="flow-grid-col-sport" />
              <col className="flow-grid-col-event" />
              <col className="flow-grid-col-time" />
              <col className="flow-grid-col-legs" />
              <col className="flow-grid-col-money" />
              <col className="flow-grid-col-book" />
              <col className="flow-grid-col-money" />
              <col className="flow-grid-col-money" />
              <col className="flow-grid-col-money" />
              <col className="flow-grid-col-status" />
              <col className="flow-grid-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>Enable</th><th>Sport</th><th>Event</th><th>Time</th><th>Legs</th><th>Liquidity</th><th>Prices</th><th>Full Grid</th><th>Event Cap</th><th>Epoch</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map((event) => {
                const key = event.slug || event.id;
                const checked = enabled.has(key);
                const exposure = previewExposure(event, settings);
                const session = sessionForEvent(sessions, event);
                const inPlay = liveEventByGridKey.get(flowGridEventKey(event)) || null;
                return (
                  <tr
                    key={key}
                    className={[selectedSlug === key ? "selected" : "", inPlay ? "in-play" : ""].filter(Boolean).join(" ")}
                    onClick={() => setSelectedSlug(key)}
                    onDoubleClick={() => { void openDetail(event); }}
                  >
                    <td>
                      <button
                        type="button"
                        className={`flow-grid-enable-button ${checked ? "active" : ""}`}
                        onClick={(click) => { click.stopPropagation(); toggleEvent(key); }}
                      >
                        {checked ? `On ${money(exposure.maxEventExposureUsd)}` : "Enable"}
                      </button>
                    </td>
                    <td><span className="flow-grid-sport-cell">{sportLabel(event.sport)}</span></td>
                    <td>
                      <strong title={event.title}>{event.title}</strong>
                      {inPlay && <span className="flow-grid-live-badge" title={liveSourceLabel(inPlay)}>IN PLAY {liveClockLabel(inPlay)} {liveScoreLabel(inPlay)}</span>}
                      {marketFamilyLabel(event) && <span className="flow-grid-market-kind">{marketFamilyLabel(event)}</span>}
                    </td>
                    <td>{timeLabel(event.startAt || event.endAt)}</td>
                    <td>
                      <div className="flow-grid-leg-strip" title={event.legs.map(compactLegLabel).join(" / ")}>
                        {event.legs.map((leg) => <span className="flow-grid-leg-chip" key={leg.key}>{compactLegLabel(leg)}</span>)}
                      </div>
                    </td>
                    <td>{money(event.liquidityUsd)}</td>
                    <td className="flow-grid-price-cell">
                      <div className="flow-grid-price-strip" title={event.legs.map(compactPriceLabel).join(" / ")}>
                        {event.legs.map((leg) => (
                          <span className="flow-grid-price-chip" key={`${leg.key}:${leg.tokenId}`} title={compactPriceLabel(leg)}>
                            <span className="flow-grid-price-name">{leg.label}</span>
                            <span className="flow-grid-price-value">{centsLabel(legPriceCents(leg))}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{money(exposure.theoreticalFullGridUsd)}</td>
                    <td>{money(exposure.maxEventExposureUsd)}</td>
                    <td>{money(exposure.maxEpochExposureUsd)}</td>
                    <td>{session ? <StatusPill status={session.status} /> : checked ? <span className="flow-grid-exposure-note">Cost {money(exposure.maxEventExposureUsd)} / epoch {money(exposure.maxEpochExposureUsd)}</span> : <StatusPill status="idle" />}</td>
                    <td className="flow-grid-row-actions">
                      <button type="button" disabled={!checked || busy === `start:${key}`} onClick={(click) => { click.stopPropagation(); startEvent(event); }}><Play size={13} /> Start</button>
                      {session && <button type="button" onClick={(click) => { click.stopPropagation(); sendAction(session, "pause"); }}><Pause size={13} /> Pause</button>}
                      {session && <button type="button" onClick={(click) => { click.stopPropagation(); sendAction(session, "flatten"); }}><Square size={13} /> Flat</button>}
                    </td>
                  </tr>
                );
              })}
              {!visibleEvents.length && <tr><td colSpan={12}>No supported events match this filter.</td></tr>}
            </tbody>
          </table>
        </section>
      </main>
      {detailEvent && (
        <EventDetail
          event={detailEvent}
          settings={settings}
          session={sessionForEvent(sessions, detailEvent)}
          liveEvent={detailLiveEvent}
          onClose={() => setDetailSlug("")}
        />
      )}
    </div>
  );
}
