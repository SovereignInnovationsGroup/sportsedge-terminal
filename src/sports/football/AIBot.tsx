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
  score: { home: number; away: number };
  signal: string;
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
  const parts = String(name || "").split(/\s+(?:vs?\.?|versus|v)\s+/i).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { home: parts[0], away: parts.slice(1).join(" v ") };
  return { home: name, away: "" };
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

function markTrade(trade: PaperTrade, rows: WatchRow[]) {
  const row = rows.find((item) => item.id === trade.eventId);
  const odds = oddsForOutcome(row?.marketRow, trade.outcome) || trade.currentOdds || trade.entryOdds;
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
  const [segments, setSegments] = useState<AudioSegment[]>([]);
  const [signals, setSignals] = useState<Array<{ id: string; at: string; text: string; action: string }>>([]);
  const [query, setQuery] = useState("");
  const [socketStatus, setSocketStatus] = useState<"connecting" | "live" | "waiting" | "offline">("offline");
  const seenSegmentsRef = useRef(new Set<string>());
  const socketRef = useRef<WebSocket | null>(null);

  const watchRows = useMemo<WatchRow[]>(() => {
    const now = new Date();
    const todayKey = new Intl.DateTimeFormat("en-CA").format(now);
    const rows = new Map<string, WatchRow>();
    const displayMarketRows = mergeDisplayPriceRows(marketRows).filter((row) => !eventHasPassed(row.startAt));

    fixtures
      .filter((fixture) => fixture.kickoffAt && new Intl.DateTimeFormat("en-CA").format(new Date(fixture.kickoffAt)) === todayKey)
      .filter((fixture) => !eventHasPassed(fixture.kickoffAt))
      .forEach((fixture) => {
        const name = fixtureName(fixture);
        const marketRow = matchRowsByFixture(fixture, displayMarketRows);
        rows.set(rowKey(name, fixture.kickoffAt), {
          id: rowKey(name, fixture.kickoffAt),
          eventName: name,
          home: fixture.home?.name || "",
          away: fixture.away?.name || "",
          startAt: fixture.kickoffAt,
          competition: [fixture.country, fixture.leagueName].filter(Boolean).join(" / ") || "Football",
          source: "fixture",
          marketRow,
          score: { home: Number(fixture.goals?.home || 0), away: Number(fixture.goals?.away || 0) },
          signal: "Watching"
        });
      });

    displayMarketRows.forEach((row) => {
      const key = rowKey(row.name, row.startAt);
      if (rows.has(key)) return;
      const teams = splitTeams(row.name);
      const hintHit = WATCH_HINTS.some((hint) => normalizeFixtureText(row.name).includes(hint));
      const startToday = row.startAt && new Intl.DateTimeFormat("en-CA").format(new Date(row.startAt)) === todayKey;
      if (!hintHit && !startToday) return;
      rows.set(key, {
        id: key,
        eventName: row.name,
        home: teams.home,
        away: teams.away,
        startAt: row.startAt,
        competition: row.competitionName || "Exchange football",
        source: "market",
        marketRow: row,
        score: { home: 0, away: 0 },
        signal: "Watching"
      });
    });

    const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
    return [...rows.values()]
      .filter((row) => !terms.length || terms.every((term) => normalizeFixtureText(`${row.eventName} ${row.competition}`).includes(term)))
      .sort((a, b) => new Date(a.startAt || 0).getTime() - new Date(b.startAt || 0).getTime())
      .slice(0, 120);
  }, [fixtures, marketRows, query]);

  useEffect(() => {
    let cancelled = false;
    async function loadSnapshot() {
      const [fixtureResponse, rows] = await Promise.all([
        fetch("/api/football/fixtures?days=1&limit=500&timezone=Europe/London", { cache: "no-store" }).then((response) => response.json()).catch(() => ({})),
        fetchMarketSnapshotRows(
          "/api/markets/snapshot?sport=football&exchanges=polymarket,kalshi,betfair,matchbook,sx,betdaq&segment=upcoming4&limit=400",
          "/api/exchange-odds?sport=football&exchanges=polymarket,kalshi,betfair,matchbook,sx,betdaq&segment=upcoming4&limit=400"
        )
      ]);
      if (cancelled) return;
      setFixtures(Array.isArray(fixtureResponse.fixtures) ? fixtureResponse.fixtures : []);
      setMarketRows(rows);
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
        const signal = detectGoalSignal(segment, watchRows);
        if (!signal) return;
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
  }, [watchRows]);

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
      const odds = oddsForOutcome(row.marketRow, outcome) || firstAvailableOdds(row.marketRow)?.odds || 0;
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
  const watchedWithMoney = watchRows.filter((row) => marketLiquidity(row.marketRow) > 0).length;

  return (
    <>
      <TerminalTopbar active="football-ai-bot" onSearchChange={setQuery} searchPlaceholder="AI Bot: match, team, audio, goal..." />
      <main className="ai-bot-page">
        <section className="ai-bot-summary">
          <article><span>Paper Balance</span><strong>{formatExchangeMoney(balance, "GBP")}</strong><small>Starting bank £10,000</small></article>
          <article><span>Open P/L</span><strong className={openPnl >= 0 ? "positive" : "negative"}>{formatExchangeMoney(openPnl, "GBP")}</strong><small>Trailing stop marks locally</small></article>
          <article><span>Watching</span><strong>{watchRows.length}</strong><small>{watchedWithMoney} with live money</small></article>
          <article><span>Feeds</span><strong>{socketStatus.toUpperCase()}</strong><small>TalkSport poll 2s / WSS prices</small></article>
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
                <tr><th>Time</th><th>Match</th><th>Score</th><th>Price</th><th>Money</th><th>Status</th></tr>
              </thead>
              <tbody>
                {watchRows.map((row) => {
                  const best = firstAvailableOdds(row.marketRow);
                  return (
                    <tr key={row.id}>
                      <td className="mono"><span>{localEventTime(row.startAt)}</span><small>UK {localEventTime(row.startAt, { timeZone: "Europe/London" })}</small></td>
                      <td><strong>{row.eventName}</strong><small>{row.competition}</small></td>
                      <td className="mono">{row.score.home}-{row.score.away}</td>
                      <td className="mono">{best ? `${best.exchange.toUpperCase()} ${best.runner} @ ${best.odds.toFixed(2)}` : "-"}</td>
                      <td className="mono">{formatExchangeMoney(marketLiquidity(row.marketRow), "GBP")}</td>
                      <td><span className={best ? "ai-pill live" : "ai-pill"}>{best ? "watching" : "no price"}</span></td>
                    </tr>
                  );
                })}
                {!watchRows.length && <tr><td colSpan={6}>No current football matches in the watch window.</td></tr>}
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
