import { useEffect, useMemo, useRef, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { eventHasPassed, formatExchangeMoney, localEventTime, normalizeFixtureText } from "../../core/format";
import {
  fetchMarketSnapshotRows,
  mergeDisplayPriceRows,
  mergeLivePriceRows,
  mergeMarketStateRows,
  sportsEdgeWsUrl,
  type BackendPriceRow,
  type BackendRunner,
  type FootballFixture
} from "./marketData";

type AudioSegment = {
  id: string;
  feedId: string;
  feedName?: string;
  text: string;
  confidence?: number | null;
  createdAt: string | null;
};

type WatchRow = {
  id: string;
  eventName: string;
  home: string;
  away: string;
  startAt: string | null;
  competition: string;
  source: "fixture" | "market";
  marketRow?: BackendPriceRow;
  polyEvent?: PolyEvent;
  polyBook?: PolyBook;
  score: { home: number; away: number };
  signal: string;
};

type PolyEvent = {
  id: string;
  name: string;
  competition?: string;
  startAt: string | null;
  liquidity: number;
  status?: string;
};

type PolyPrice = {
  eventId: string;
  eventName: string;
  marketName: string;
  marketType?: string;
  runnerName: string;
  side: string;
  ladderLevel: number;
  odds: number;
  amount: number;
  marketLiquidity?: number;
  observedAt?: string | null;
};

type PolyOutcome = {
  label: string;
  yesOdds: number;
  noOdds: number;
  yesMoney: number;
  noMoney: number;
};

type PolyBook = {
  home?: PolyOutcome;
  away?: PolyOutcome;
  draw?: PolyOutcome;
  favourite?: PolyOutcome;
  totalMoney: number;
  latest?: string | null;
};

type PaperTrade = {
  id: string;
  openedAt: string;
  closedAt?: string;
  eventId: string;
  eventName: string;
  outcome: string;
  reason: string;
  stake: number;
  entryOdds: number;
  entryPrice: number;
  shares: number;
  currentOdds: number;
  currentPrice: number;
  bestPnl: number;
  stopPnl: number;
  status: "OPEN" | "CLOSED";
  pnl: number;
};

const PAPER_STORAGE_KEY = "sportsedge.footballAiBot.paper.v1";
const WATCH_HINTS = [
  "ecuador curacao",
  "ecuador curaçao",
  "tunisia japan",
  "belgium iran",
  "uruguay cabo verde"
];

const GOAL_WORDS = /\b(goal|scores?|scored|equaliser|equalizer|takes? the lead|goes? ahead|netted|strikes?|finish(?:es)?|header|penalty converted)\b/i;
const START_WORDS = /\b(kick[-\s]?off|kicked off|underway|we are underway|first half|first whistle|game has started|match has started|gets underway)\b/i;
const SCORE_REGEX = /\b(\d{1,2})\s*[-–]\s*(\d{1,2})\b/;

function readPaperState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PAPER_STORAGE_KEY) || "{}") as { balance?: number; trades?: PaperTrade[] };
    return {
      balance: Number.isFinite(Number(parsed.balance)) ? Number(parsed.balance) : 10000,
      trades: Array.isArray(parsed.trades) ? parsed.trades : []
    };
  } catch {
    return { balance: 10000, trades: [] as PaperTrade[] };
  }
}

function writePaperState(balance: number, trades: PaperTrade[]) {
  try {
    window.localStorage.setItem(PAPER_STORAGE_KEY, JSON.stringify({ balance, trades: trades.slice(0, 250) }));
  } catch {
    // Paper state is a local convenience only.
  }
}

function fixtureName(fixture: FootballFixture) {
  return `${fixture.home?.name || "Home"} vs ${fixture.away?.name || "Away"}`;
}

function splitTeams(name: string) {
  const cleanName = String(name || "").replace(/\s+-\s+.*$/i, "").trim();
  const parts = cleanName.split(/\s+(?:vs?\.?|versus|v)\s+/i).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { home: parts[0], away: parts.slice(1).join(" v ") };
  return { home: cleanName, away: "" };
}

function rowKey(name: string, startAt: string | null | undefined) {
  return normalizeFixtureText(`${name} ${String(startAt || "").slice(0, 10)}`);
}

function matchRowsByFixture(fixture: FootballFixture, marketRows: BackendPriceRow[]) {
  const home = normalizeFixtureText(fixture.home?.name || "");
  const away = normalizeFixtureText(fixture.away?.name || "");
  return marketRows.find((row) => {
    const text = normalizeFixtureText(row.name);
    return Boolean(home && away && text.includes(home) && text.includes(away));
  });
}

function normalizeUtcLike(value: string | null | undefined) {
  if (!value) return null;
  const text = String(value);
  if (/z$/i.test(text) || /[+-]\d{2}:?\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(text)) return `${text.replace(" ", "T")}Z`;
  return text;
}

function cleanPolyEventName(name: string) {
  return String(name || "").replace(/\s+-\s+(?:More Markets|Exact Score|Player Props|Halftime Result|Total Corners|First Team to Score|Second Half Result).*$/i, "").trim();
}

function isPrimaryPolyEvent(event: PolyEvent) {
  const name = String(event.name || "");
  if (/\s+-\s+(?:More Markets|Exact Score|Player Props|Halftime Result|Total Corners|First Team to Score|Second Half Result)/i.test(name)) return false;
  return /\s+(?:vs?\.?|versus|v)\s+/i.test(name);
}

function eventTokenScore(a: string, b: string) {
  const left = new Set(normalizeFixtureText(a).split(" ").filter((token) => token.length > 2));
  const right = new Set(normalizeFixtureText(b).split(" ").filter((token) => token.length > 2));
  if (!left.size || !right.size) return 0;
  let hits = 0;
  left.forEach((token) => {
    if (right.has(token)) hits += 1;
  });
  return hits / Math.max(1, Math.min(left.size, right.size));
}

function matchPolyEvent(name: string, polyEvents: PolyEvent[]) {
  const cleanName = cleanPolyEventName(name);
  let best: { event: PolyEvent; score: number } | null = null;
  polyEvents.filter(isPrimaryPolyEvent).forEach((event) => {
    const score = eventTokenScore(cleanName, cleanPolyEventName(event.name));
    if (score < 0.5) return;
    if (!best || score > best.score || Number(event.liquidity || 0) > Number(best.event.liquidity || 0)) best = { event, score };
  });
  return best?.event || null;
}

function polyOutcomeFromPrices(prices: PolyPrice[], label: string, marketMatcher: (marketName: string) => boolean): PolyOutcome | undefined {
  const marketPrices = prices.filter((price) => (
    Number(price.ladderLevel || 0) === 1
    && String(price.side || "").toLowerCase() === "back"
    && Number(price.odds || 0) > 1
    && marketMatcher(String(price.marketName || ""))
  ));
  const yes = marketPrices.find((price) => /^yes$/i.test(price.runnerName));
  const no = marketPrices.find((price) => /^no$/i.test(price.runnerName));
  if (!yes && !no) return undefined;
  return {
    label,
    yesOdds: Number(yes?.odds || 0),
    noOdds: Number(no?.odds || 0),
    yesMoney: Number(yes?.amount || 0),
    noMoney: Number(no?.amount || 0)
  };
}

function buildPolyBook(event: PolyEvent | undefined, pricesByEvent: Record<string, PolyPrice[]>): PolyBook | undefined {
  if (!event) return undefined;
  const prices = pricesByEvent[event.id] || [];
  if (!prices.length) return undefined;
  const teams = splitTeams(event.name);
  const homeKey = normalizeFixtureText(teams.home);
  const awayKey = normalizeFixtureText(teams.away);
  const home = polyOutcomeFromPrices(prices, teams.home, (marketName) => {
    const text = normalizeFixtureText(marketName);
    return text.includes(homeKey) && text.includes("win") && !text.includes("second half") && !text.includes("half");
  });
  const away = polyOutcomeFromPrices(prices, teams.away, (marketName) => {
    const text = normalizeFixtureText(marketName);
    return text.includes(awayKey) && text.includes("win") && !text.includes("second half") && !text.includes("half");
  });
  const draw = polyOutcomeFromPrices(prices, "Draw", (marketName) => {
    const text = normalizeFixtureText(marketName);
    return text.includes("draw") && !text.includes("second half") && !text.includes("half");
  });
  const outcomes = [home, away, draw].filter(Boolean) as PolyOutcome[];
  const favourite = outcomes
    .filter((outcome) => outcome.yesOdds > 1)
    .sort((a, b) => a.yesOdds - b.yesOdds)[0];
  return {
    home,
    away,
    draw,
    favourite,
    totalMoney: outcomes.reduce((sum, outcome) => sum + outcome.yesMoney + outcome.noMoney, 0),
    latest: prices.reduce<string | null>((latest, price) => {
      if (!price.observedAt) return latest;
      if (!latest || new Date(normalizeUtcLike(price.observedAt) || price.observedAt).getTime() > new Date(normalizeUtcLike(latest) || latest).getTime()) return price.observedAt;
      return latest;
    }, null)
  };
}

function polyOddsForOutcome(row: WatchRow | undefined, outcome: string) {
  const wanted = normalizeFixtureText(outcome);
  const book = row?.polyBook;
  if (!book) return 0;
  if (wanted === "draw" || wanted.includes("draw")) return book.draw?.yesOdds || 0;
  if (book.home && (normalizeFixtureText(book.home.label) === wanted || wanted.includes(normalizeFixtureText(book.home.label)))) return book.home.yesOdds;
  if (book.away && (normalizeFixtureText(book.away.label) === wanted || wanted.includes(normalizeFixtureText(book.away.label)))) return book.away.yesOdds;
  return 0;
}

function marketLiquidity(row?: BackendPriceRow) {
  return Object.values(row?.matches || {}).reduce((sum, match) => sum + (match?.runners || []).reduce((runnerSum, runner) => (
    runnerSum
    + Number(runner.back?.amount || 0)
    + Number(runner.lay?.amount || 0)
    + Number(runner.backLevels?.reduce((levelSum, level) => levelSum + Number(level.amount || 0), 0) || 0)
    + Number(runner.layLevels?.reduce((levelSum, level) => levelSum + Number(level.amount || 0), 0) || 0)
  ), 0), 0);
}

function runnerBestBack(runner?: BackendRunner | null) {
  if (!runner) return null;
  const levels = [runner.back, ...(runner.backLevels || [])].filter(Boolean) as Array<{ odds: number; amount: number }>;
  return levels.filter((level) => Number(level.odds) > 1 && Number(level.amount) > 0).sort((a, b) => Number(b.amount) - Number(a.amount))[0] || null;
}

function runnerForOutcome(row: BackendPriceRow | undefined, outcome: string) {
  const wanted = normalizeFixtureText(outcome);
  for (const match of Object.values(row?.matches || {})) {
    for (const runner of match?.runners || []) {
      const runnerKey = normalizeFixtureText(runner.name);
      if (runnerKey === wanted || runnerKey.includes(wanted) || wanted.includes(runnerKey)) return runner;
    }
  }
  return null;
}

function oddsForOutcome(row: BackendPriceRow | undefined, outcome: string) {
  return runnerBestBack(runnerForOutcome(row, outcome))?.odds || 0;
}

function firstAvailableOdds(row?: BackendPriceRow) {
  for (const match of Object.values(row?.matches || {})) {
    for (const runner of match?.runners || []) {
      const best = runnerBestBack(runner);
      if (best) return { runner: runner.name, odds: Number(best.odds), amount: Number(best.amount), exchange: match?.exchange || "" };
    }
  }
  return null;
}

function formatPolyPrice(odds: number) {
  if (!odds || odds <= 1) return "-";
  return `${Math.round((1 / odds) * 100)}c`;
}

function formatPolyMoney(value: number) {
  return value > 0 ? formatExchangeMoney(value, "USD") : "-";
}

function outcomeCell(outcome?: PolyOutcome) {
  if (!outcome) return <span className="ai-poly-empty">-</span>;
  return (
    <div className="ai-poly-cell">
      <strong>{outcome.label}</strong>
      <span><em>Y</em> {formatPolyPrice(outcome.yesOdds)} <small>{formatPolyMoney(outcome.yesMoney)}</small></span>
      <span><em>N</em> {formatPolyPrice(outcome.noOdds)} <small>{formatPolyMoney(outcome.noMoney)}</small></span>
    </div>
  );
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || `fetch failed: ${url}`);
  return payload as T;
}

async function fetchPolyEvents() {
  const payload = await fetchJson<{ rows?: PolyEvent[] }>("/api/exchange-sport-events?exchange=polymarket&sport=football&limit=500");
  return (payload.rows || [])
    .map((event) => ({ ...event, startAt: normalizeUtcLike(event.startAt), liquidity: Number(event.liquidity || 0) }))
    .filter((event) => event.startAt && !eventHasPassed(event.startAt))
    .filter(isPrimaryPolyEvent)
    .sort((a, b) => new Date(a.startAt || 0).getTime() - new Date(b.startAt || 0).getTime() || Number(b.liquidity || 0) - Number(a.liquidity || 0))
    .slice(0, 80);
}

async function fetchPolyPrices(eventId: string) {
  const payload = await fetchJson<{ rows?: PolyPrice[] }>(`/api/exchange-event-prices?exchange=polymarket&eventId=${encodeURIComponent(eventId)}&limit=160`);
  return (payload.rows || []).map((price) => ({ ...price, observedAt: normalizeUtcLike(price.observedAt) }));
}

function detectGoalSignal(segment: AudioSegment, watchRows: WatchRow[]) {
  const text = String(segment.text || "");
  if (!GOAL_WORDS.test(text) && !SCORE_REGEX.test(text)) return null;
  const normalizedText = normalizeFixtureText(text);

  for (const row of watchRows) {
    const homeKey = normalizeFixtureText(row.home);
    const awayKey = normalizeFixtureText(row.away);
    const eventHit = normalizeFixtureText(row.eventName).split(" ").filter((token) => token.length > 2).some((token) => normalizedText.includes(token));
    if (!eventHit && !normalizedText.includes(homeKey) && !normalizedText.includes(awayKey)) continue;

    const score = text.match(SCORE_REGEX);
    if (score) {
      const home = Number(score[1]);
      const away = Number(score[2]);
      if (Number.isFinite(home) && Number.isFinite(away)) {
        const outcome = home === away ? "Draw" : home > away ? row.home : row.away;
        return { row, outcome, score: { home, away }, reason: `Audio score detected ${home}-${away}` };
      }
    }

    const homeMention = homeKey && normalizedText.includes(homeKey);
    const awayMention = awayKey && normalizedText.includes(awayKey);
    if (homeMention && !awayMention) {
      return { row, outcome: row.home, score: { home: row.score.home + 1, away: row.score.away }, reason: "Audio goal phrase matched home team" };
    }
    if (awayMention && !homeMention) {
      return { row, outcome: row.away, score: { home: row.score.home, away: row.score.away + 1 }, reason: "Audio goal phrase matched away team" };
    }
  }
  return null;
}

function detectStartSignal(segment: AudioSegment, watchRows: WatchRow[]) {
  const text = String(segment.text || "");
  if (!START_WORDS.test(text)) return null;
  const normalizedText = normalizeFixtureText(text);
  for (const row of watchRows) {
    const homeKey = normalizeFixtureText(row.home);
    const awayKey = normalizeFixtureText(row.away);
    const eventHit = normalizeFixtureText(row.eventName).split(" ").filter((token) => token.length > 2).some((token) => normalizedText.includes(token));
    if (eventHit || (homeKey && normalizedText.includes(homeKey)) || (awayKey && normalizedText.includes(awayKey))) {
      return { row, reason: "Audio match-start phrase detected" };
    }
  }
  return null;
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

function polyLivePriceFromPayload(payload: unknown): PolyPrice | null {
  const eventId = textFromPayload(payload, ["event_id", "eventId", "exchange_event_id", "exchangeEventId"]);
  const eventName = textFromPayload(payload, ["event_name", "eventName", "fixture", "name", "title"]);
  const marketName = textFromPayload(payload, ["market_name", "marketName", "market"]);
  const runnerName = textFromPayload(payload, ["runner_name", "runnerName", "selection", "outcome"]);
  const side = textFromPayload(payload, ["side"]).toLowerCase();
  const odds = numberFromPayload(payload, ["odds", "price", "decimal_odds", "decimalOdds"]);
  const amount = numberFromPayload(payload, ["available_amount", "availableAmount", "amount", "size"]);
  if (!eventId || !marketName || !runnerName || !["back", "trade"].includes(side) || odds <= 1) return null;
  return {
    eventId,
    eventName,
    marketName,
    marketType: textFromPayload(payload, ["market_type", "marketType"]),
    runnerName,
    side,
    ladderLevel: numberFromPayload(payload, ["ladder_level", "ladderLevel", "level"]) || 1,
    odds,
    amount,
    marketLiquidity: numberFromPayload(payload, ["market_liquidity", "marketLiquidity", "liquidity"]),
    observedAt: normalizeUtcLike(textFromPayload(payload, ["observed_at", "observedAt", "timestamp", "ts"])) || new Date().toISOString()
  };
}

function markTrade(trade: PaperTrade, rows: WatchRow[]) {
  const row = rows.find((item) => item.id === trade.eventId);
  const odds = polyOddsForOutcome(row, trade.outcome) || trade.currentOdds || trade.entryOdds;
  const price = odds > 1 ? 1 / odds : trade.currentPrice;
  const pnl = trade.shares * (price - trade.entryPrice);
  const bestPnl = Math.max(trade.bestPnl, pnl);
  const stopPnl = bestPnl > 5 ? Math.max(0, bestPnl * 0.65) : trade.stopPnl;
  const shouldClose = trade.status === "OPEN" && bestPnl > 5 && pnl <= stopPnl;
  return {
    ...trade,
    currentOdds: odds,
    currentPrice: price,
    pnl,
    bestPnl,
    stopPnl,
    status: shouldClose ? "CLOSED" as const : trade.status,
    closedAt: shouldClose ? new Date().toISOString() : trade.closedAt
  };
}

export default function AIBot() {
  const initialPaper = readPaperState();
  const [balance, setBalance] = useState(initialPaper.balance);
  const [trades, setTrades] = useState<PaperTrade[]>(initialPaper.trades);
  const [fixtures, setFixtures] = useState<FootballFixture[]>([]);
  const [marketRows, setMarketRows] = useState<BackendPriceRow[]>([]);
  const [polyEvents, setPolyEvents] = useState<PolyEvent[]>([]);
  const [polyPricesByEvent, setPolyPricesByEvent] = useState<Record<string, PolyPrice[]>>({});
  const [eventStateById, setEventStateById] = useState<Record<string, { phase: "scheduled" | "in_play"; lastSignal?: string; updatedAt?: string }>>({});
  const [segments, setSegments] = useState<AudioSegment[]>([]);
  const [signals, setSignals] = useState<Array<{ id: string; at: string; text: string; action: string }>>([]);
  const [query, setQuery] = useState("");
  const [socketStatus, setSocketStatus] = useState<"connecting" | "live" | "waiting" | "offline">("offline");
  const seenSegmentsRef = useRef(new Set<string>());
  const socketRef = useRef<WebSocket | null>(null);
  const watchRowsRef = useRef<WatchRow[]>([]);

  const watchRows = useMemo<WatchRow[]>(() => {
    const now = new Date();
    const todayKey = new Intl.DateTimeFormat("en-CA").format(now);
    const rows = new Map<string, WatchRow>();
    const displayMarketRows = mergeDisplayPriceRows(marketRows).filter((row) => !eventHasPassed(row.startAt));
    const primaryPolyEvents = polyEvents
      .filter(isPrimaryPolyEvent)
      .filter((event) => !eventHasPassed(normalizeUtcLike(event.startAt)))
      .map((event) => ({ ...event, startAt: normalizeUtcLike(event.startAt) }));

    fixtures
      .filter((fixture) => fixture.kickoffAt && new Intl.DateTimeFormat("en-CA").format(new Date(fixture.kickoffAt)) === todayKey)
      .filter((fixture) => !eventHasPassed(fixture.kickoffAt))
      .forEach((fixture) => {
        const name = fixtureName(fixture);
        const marketRow = matchRowsByFixture(fixture, displayMarketRows);
        const polyEvent = matchPolyEvent(name, primaryPolyEvents);
        const polyBook = buildPolyBook(polyEvent, polyPricesByEvent);
        rows.set(rowKey(name, fixture.kickoffAt), {
          id: rowKey(name, fixture.kickoffAt),
          eventName: name,
          home: fixture.home?.name || "",
          away: fixture.away?.name || "",
          startAt: fixture.kickoffAt,
          competition: [fixture.country, fixture.leagueName].filter(Boolean).join(" / ") || "Football",
          source: "fixture",
          marketRow,
          polyEvent,
          polyBook,
          score: { home: Number(fixture.goals?.home || 0), away: Number(fixture.goals?.away || 0) },
          signal: eventStateById[rowKey(name, fixture.kickoffAt)]?.phase === "in_play" ? "In-play" : "Watching"
        });
      });

    primaryPolyEvents.forEach((event) => {
      const key = rowKey(cleanPolyEventName(event.name), event.startAt);
      if (rows.has(key)) return;
      const teams = splitTeams(event.name);
      const hintHit = WATCH_HINTS.some((hint) => normalizeFixtureText(event.name).includes(hint));
      const startToday = event.startAt && new Intl.DateTimeFormat("en-CA").format(new Date(event.startAt)) === todayKey;
      if (!hintHit && !startToday) return;
      rows.set(key, {
        id: key,
        eventName: cleanPolyEventName(event.name),
        home: teams.home,
        away: teams.away,
        startAt: event.startAt,
        competition: event.competition || "Polymarket football",
        source: "market",
        polyEvent: event,
        polyBook: buildPolyBook(event, polyPricesByEvent),
        score: { home: 0, away: 0 },
        signal: eventStateById[key]?.phase === "in_play" ? "In-play" : "Watching"
      });
    });

    displayMarketRows.forEach((row) => {
      const key = rowKey(row.name, row.startAt);
      if (rows.has(key)) return;
      const teams = splitTeams(row.name);
      const hintHit = WATCH_HINTS.some((hint) => normalizeFixtureText(row.name).includes(hint));
      const startToday = row.startAt && new Intl.DateTimeFormat("en-CA").format(new Date(row.startAt)) === todayKey;
      if (!hintHit && !startToday) return;
      const polyEvent = matchPolyEvent(row.name, primaryPolyEvents);
      rows.set(key, {
        id: key,
        eventName: row.name,
        home: teams.home,
        away: teams.away,
        startAt: row.startAt,
        competition: row.competitionName || "Exchange football",
        source: "market",
        marketRow: row,
        polyEvent,
        polyBook: buildPolyBook(polyEvent, polyPricesByEvent),
        score: { home: 0, away: 0 },
        signal: eventStateById[key]?.phase === "in_play" ? "In-play" : "Watching"
      });
    });

    const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
    return [...rows.values()]
      .filter((row) => !terms.length || terms.every((term) => normalizeFixtureText(`${row.eventName} ${row.competition}`).includes(term)))
      .sort((a, b) => new Date(a.startAt || 0).getTime() - new Date(b.startAt || 0).getTime())
      .slice(0, 120);
  }, [eventStateById, fixtures, marketRows, polyEvents, polyPricesByEvent, query]);

  useEffect(() => {
    watchRowsRef.current = watchRows;
  }, [watchRows]);

  useEffect(() => {
    let cancelled = false;
    async function loadSnapshot() {
      const [fixtureResponse, rows, nextPolyEvents] = await Promise.all([
        fetch("/api/football/fixtures?days=1&limit=500&timezone=Europe/London", { cache: "no-store" }).then((response) => response.json()).catch(() => ({})),
        fetchMarketSnapshotRows(
          "/api/markets/snapshot?sport=football&exchanges=polymarket,kalshi,betfair,matchbook,sx,betdaq&segment=upcoming4&limit=400",
          "/api/exchange-odds?sport=football&exchanges=polymarket,kalshi,betfair,matchbook,sx,betdaq&segment=upcoming4&limit=400"
        ),
        fetchPolyEvents().catch(() => [])
      ]);
      const polyPriceEntries = await Promise.all(nextPolyEvents.slice(0, 40).map(async (event) => [event.id, await fetchPolyPrices(event.id).catch(() => [])] as const));
      if (cancelled) return;
      setFixtures(Array.isArray(fixtureResponse.fixtures) ? fixtureResponse.fixtures : []);
      setMarketRows(rows);
      setPolyEvents(nextPolyEvents);
      setPolyPricesByEvent(Object.fromEntries(polyPriceEntries));
    }
    loadSnapshot().catch(() => undefined);
    const timer = window.setInterval(loadSnapshot, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const token = window.localStorage.getItem("sportsedge.auth.token");
    if (!token) {
      setSocketStatus("waiting");
      return;
    }
    const socket = new WebSocket(sportsEdgeWsUrl(token));
    socketRef.current = socket;
    socket.addEventListener("open", () => {
      setSocketStatus("live");
      socket.send(JSON.stringify({ type: "subscribe", channel: "markets.football", filters: { sport: "football" } }));
      socket.send(JSON.stringify({ type: "subscribe", channel: "polymarket.price", filters: { sport: "football" } }));
      socket.send(JSON.stringify({ type: "subscribe", channel: "kalshi.price", filters: { sport: "football" } }));
    });
    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message?.type !== "event" || !message.payload) return;
        if (message.channel === "polymarket.price") {
          const price = polyLivePriceFromPayload(message.payload);
          if (price) {
            setPolyPricesByEvent((current) => {
              const existing = current[price.eventId] || [];
              const filtered = existing.filter((item) => !(
                item.marketName === price.marketName
                && item.runnerName === price.runnerName
                && item.side === price.side
                && Number(item.ladderLevel || 0) === Number(price.ladderLevel || 0)
              ));
              return { ...current, [price.eventId]: [price, ...filtered].slice(0, 160) };
            });
          }
        }
        setMarketRows((current) => mergeDisplayPriceRows(
          message.channel === "markets.football"
            ? mergeMarketStateRows(current, message.payload, 500)
            : mergeLivePriceRows(current, String(message.channel || ""), message.payload, "football", false, 500)
        ));
      } catch {
        // Ignore malformed socket payloads.
      }
    });
    socket.addEventListener("close", () => setSocketStatus("offline"));
    socket.addEventListener("error", () => setSocketStatus("offline"));
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function pollAudio() {
      const response = await fetch("/api/live-audio/segments?feed_id=talksport&sinceSeconds=240&limit=50", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      const nextSegments = Array.isArray(payload.segments) ? payload.segments as AudioSegment[] : [];
      if (cancelled) return;
      setSegments(nextSegments);
      [...nextSegments].reverse().forEach((segment) => {
        if (seenSegmentsRef.current.has(segment.id)) return;
        seenSegmentsRef.current.add(segment.id);
        const rows = watchRowsRef.current;
        const startSignal = detectStartSignal(segment, rows);
        if (startSignal) {
          setEventStateById((current) => ({
            ...current,
            [startSignal.row.id]: {
              phase: "in_play",
              lastSignal: startSignal.reason,
              updatedAt: segment.createdAt || new Date().toISOString()
            }
          }));
          setSignals((current) => [{
            id: `${segment.id}:start`,
            at: segment.createdAt || new Date().toISOString(),
            text: segment.text,
            action: `${startSignal.row.eventName} / LIVE / ${startSignal.reason}`
          }, ...current].slice(0, 30));
        }
        const signal = detectGoalSignal(segment, rows);
        if (!signal) return;
        setEventStateById((current) => ({
          ...current,
          [signal.row.id]: {
            phase: "in_play",
            lastSignal: signal.reason,
            updatedAt: segment.createdAt || new Date().toISOString()
          }
        }));
        setSignals((current) => [{
          id: segment.id,
          at: segment.createdAt || new Date().toISOString(),
          text: segment.text,
          action: `${signal.outcome} / ${signal.reason}`
        }, ...current].slice(0, 30));
        setFixtures((current) => current.map((fixture) => {
          if (rowKey(fixtureName(fixture), fixture.kickoffAt) !== signal.row.id) return fixture;
          return { ...fixture, goals: { home: signal.score.home, away: signal.score.away } };
        }));
        openPaperTrade(signal.row, signal.outcome, signal.reason);
      });
    }
    pollAudio().catch(() => undefined);
    const timer = window.setInterval(() => pollAudio().catch(() => undefined), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setTrades((current) => {
      const marked = current.map((trade) => trade.status === "OPEN" ? markTrade(trade, watchRows) : trade);
      const released = marked.reduce((sum, trade, index) => {
        const previous = current[index];
        return sum + (previous?.status === "OPEN" && trade.status === "CLOSED" ? trade.stake + trade.pnl : 0);
      }, 0);
      if (released) setBalance((value) => value + released);
      return marked;
    });
  }, [watchRows]);

  useEffect(() => {
    writePaperState(balance, trades);
  }, [balance, trades]);

  function openPaperTrade(row: WatchRow, outcome: string, reason: string) {
    setTrades((current) => {
      if (current.some((trade) => trade.status === "OPEN" && trade.eventId === row.id && normalizeFixtureText(trade.outcome) === normalizeFixtureText(outcome))) return current;
      const odds = polyOddsForOutcome(row, outcome) || 0;
      if (odds <= 1) return current;
      const stake = Math.min(100, Math.max(25, balance * 0.01));
      if (stake > balance) return current;
      const entryPrice = 1 / odds;
      const trade: PaperTrade = {
        id: `${Date.now()}:${row.id}:${outcome}`,
        openedAt: new Date().toISOString(),
        eventId: row.id,
        eventName: row.eventName,
        outcome,
        reason,
        stake,
        entryOdds: odds,
        entryPrice,
        shares: stake / entryPrice,
        currentOdds: odds,
        currentPrice: entryPrice,
        bestPnl: 0,
        stopPnl: 0,
        status: "OPEN",
        pnl: 0
      };
      setBalance((value) => value - stake);
      return [trade, ...current].slice(0, 80);
    });
  }

  function resetPaper() {
    setBalance(10000);
    setTrades([]);
  }

  const openPnl = trades.filter((trade) => trade.status === "OPEN").reduce((sum, trade) => sum + trade.pnl, 0);
  const watchedWithMoney = watchRows.filter((row) => Number(row.polyBook?.totalMoney || 0) > 0).length;
  const nextMatch = watchRows.find((row) => row.startAt && !eventHasPassed(row.startAt));

  return (
    <>
      <TerminalTopbar active="football-ai-bot" onSearchChange={setQuery} searchPlaceholder="AI Bot: match, team, audio, goal..." />
      <main className="ai-bot-page">
        <section className="ai-bot-summary">
          <article><span>Paper Balance</span><strong>{formatExchangeMoney(balance, "GBP")}</strong><small>Starting bank £10,000</small></article>
          <article><span>Open P/L</span><strong className={openPnl >= 0 ? "positive" : "negative"}>{formatExchangeMoney(openPnl, "GBP")}</strong><small>Trailing stop marks locally</small></article>
          <article><span>Watching</span><strong>{watchRows.length}</strong><small>{watchedWithMoney} with live money</small></article>
          <article><span>Next Match</span><strong>{nextMatch ? localEventTime(nextMatch.startAt) : "-"}</strong><small>{nextMatch?.eventName || "Waiting for fixture"}</small></article>
          <article><span>Feeds</span><strong>{socketStatus.toUpperCase()}</strong><small>TalkSport 2s / Poly WSS + snapshot</small></article>
          <button type="button" onClick={resetPaper}>Reset paper</button>
        </section>

        <section className="ai-bot-warning">
          <strong>Paper mode only.</strong>
          <span>Goal detection is from live audio transcript text. It must be confirmed against official score before any future real execution path.</span>
        </section>

        <section className="ai-bot-grid">
          <div className="ai-bot-panel ai-bot-watch">
            <div className="ai-bot-head"><span>Today watchlist</span><strong>{localEventTime(new Date(), { second: "2-digit" })} local</strong></div>
            <table>
              <thead>
                <tr><th>Time</th><th>Match</th><th>Score</th><th>Home Yes/No</th><th>Draw Yes/No</th><th>Away Yes/No</th><th>Fav</th><th>Poly Money</th><th>Status</th></tr>
              </thead>
              <tbody>
                {watchRows.map((row) => {
                  const live = eventStateById[row.id]?.phase === "in_play";
                  const book = row.polyBook;
                  return (
                    <tr key={row.id}>
                      <td className="mono"><span>{localEventTime(row.startAt)}</span><small>UK {localEventTime(row.startAt, { timeZone: "Europe/London" })}</small></td>
                      <td><strong>{row.eventName}</strong><small>{row.competition}</small></td>
                      <td className="mono">{row.score.home}-{row.score.away}</td>
                      <td>{outcomeCell(book?.home)}</td>
                      <td>{outcomeCell(book?.draw)}</td>
                      <td>{outcomeCell(book?.away)}</td>
                      <td className="mono"><strong>{book?.favourite?.label || "-"}</strong><small>{book?.favourite ? `Yes ${formatPolyPrice(book.favourite.yesOdds)}` : "Polymarket"}</small></td>
                      <td className="mono">{formatExchangeMoney(Number(book?.totalMoney || 0), "USD")}</td>
                      <td><span className={live ? "ai-pill live" : book ? "ai-pill watch" : "ai-pill"}>{live ? "LIVE" : book ? "watching" : "no poly"}</span></td>
                    </tr>
                  );
                })}
                {!watchRows.length && <tr><td colSpan={9}>No current football matches in the watch window.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="ai-bot-panel">
            <div className="ai-bot-head"><span>TalkSport detector</span><strong>{segments.length} segments</strong></div>
            <div className="ai-bot-feed">
              {signals.map((signal) => (
                <article key={signal.id} className="signal">
                  <span>{localEventTime(signal.at, { second: "2-digit" })}</span>
                  <strong>{signal.action}</strong>
                  <p>{signal.text}</p>
                </article>
              ))}
              {!signals.length && segments.slice(0, 8).map((segment) => (
                <article key={segment.id}>
                  <span>{localEventTime(segment.createdAt, { second: "2-digit" })}</span>
                  <p>{segment.text}</p>
                </article>
              ))}
              {!segments.length && <article><p>No recent TalkSport transcript segments returned.</p></article>}
            </div>
          </div>
        </section>

        <section className="ai-bot-panel ai-bot-trades">
          <div className="ai-bot-head"><span>Paper trades</span><strong>{trades.filter((trade) => trade.status === "OPEN").length} open</strong></div>
          <table>
            <thead>
              <tr><th>Opened</th><th>Event</th><th>Outcome</th><th>Stake</th><th>Entry</th><th>Now</th><th>P/L</th><th>Stop</th><th>Status</th></tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className={trade.status === "CLOSED" ? "closed" : ""}>
                  <td className="mono">{localEventTime(trade.openedAt, { second: "2-digit" })}</td>
                  <td><strong>{trade.eventName}</strong><small>{trade.reason}</small></td>
                  <td>{trade.outcome}</td>
                  <td className="mono">{formatExchangeMoney(trade.stake, "GBP")}</td>
                  <td className="mono">{trade.entryOdds.toFixed(2)}</td>
                  <td className="mono">{trade.currentOdds.toFixed(2)}</td>
                  <td className={`mono ${trade.pnl >= 0 ? "positive" : "negative"}`}>{formatExchangeMoney(trade.pnl, "GBP")}</td>
                  <td className="mono">{formatExchangeMoney(trade.stopPnl, "GBP")}</td>
                  <td><span className={`ai-pill ${trade.status === "OPEN" ? "live" : ""}`}>{trade.status}</span></td>
                </tr>
              ))}
              {!trades.length && <tr><td colSpan={9}>No paper trades yet. Waiting for goal signal plus available price.</td></tr>}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
