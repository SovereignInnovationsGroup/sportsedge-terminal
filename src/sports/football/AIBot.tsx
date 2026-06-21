import { useEffect, useRef, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { formatExchangeMoney, localEventTime } from "../../core/format";
import { sportsEdgeWsUrl } from "../../core/news";

type BotOutcome = {
  label: string;
  yesOdds: number;
  noOdds: number;
  yesCents: number;
  noCents: number;
  yesMoney: number;
  noMoney: number;
  yesLevels?: BotPriceLevel[];
  noLevels?: BotPriceLevel[];
  yesLayLevels?: BotPriceLevel[];
  noLayLevels?: BotPriceLevel[];
};

type BotPriceLevel = {
  odds: number;
  cents: number;
  amount: number;
  level: number;
  observedAt?: string | null;
};

type BotBook = {
  home?: BotOutcome | null;
  away?: BotOutcome | null;
  draw?: BotOutcome | null;
  favourite?: BotOutcome | null;
  eventLiquidity: number;
  visibleMoney: number;
  latest?: string | null;
  source?: string;
  recentTrades?: BotMarketTrade[];
};

type BotMarketTrade = {
  label: string;
  runnerName: string;
  odds: number;
  cents: number;
  amount: number;
  observedAt?: string | null;
};

type BotRow = {
  id: string;
  eventName: string;
  home: string;
  away: string;
  startAt: string | null;
  competition: string;
  sportsApiStatus?: {
    provider: string;
    state: string;
    detail?: string;
    completed?: boolean;
    updatedAt?: string | null;
  } | null;
  score: { home: number; away: number };
  signal: string;
  book?: BotBook | null;
};

type BotTrade = {
  id: string;
  orderId?: string;
  openedAt: string;
  closedAt?: string;
  eventName: string;
  outcome: string;
  reason: string;
  stake: number;
  entryOdds: number;
  currentOdds: number;
  entryPrice?: number;
  currentPrice?: number;
  bestPnl: number;
  stopPnl: number;
  status: "OPEN" | "CLOSED";
  pnl: number;
};

type BotOrder = {
  id: string;
  createdAt: string;
  updatedAt: string;
  eventName: string;
  outcome: string;
  reason: string;
  side: "BUY_YES";
  stake: number;
  remainingStake: number;
  filledStake: number;
  limitPrice: number;
  limitCents: number;
  availableAtCreate: number;
  quoteAgeMs?: number | null;
  status: "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED" | "REJECTED";
  rejectReason?: string;
  cancelReason?: string;
};

type BotSignal = {
  id: string;
  at: string;
  text: string;
  action: string;
};

type BotSegment = {
  id: string;
  text: string;
  createdAt: string | null;
};

type BotStatus = {
  generatedAt: string;
  mode: "backend-paper";
  stakeUsd: number;
  balance: number;
  openPnl: number;
  realisedPnl: number;
  totalPnl: number;
  rows: BotRow[];
  orders: BotOrder[];
  trades: BotTrade[];
  signals: BotSignal[];
  segments: BotSegment[];
  liveScoreFeed?: {
    provider: string;
    enabled: boolean;
    connected: boolean;
    lastConnectedAt?: string | null;
    lastDisconnectedAt?: string | null;
    lastMessageAt?: string | null;
    lastError?: string;
    liveRows: number;
    reconnects: number;
  };
};

type LadderLevel = {
  price: number;
  yesSize: number;
  noSize: number;
  yesLevel?: number;
  noLevel?: number;
  observedAt?: string | null;
};

const AUDIO_MONITORS = [
  {
    id: "talksport",
    label: "talkSPORT",
    logoUrl: "https://ukradiolive.com/public/uploads/radio_img/talksport/play_250_250.webp",
    playbackUrl: "/api/live-audio/stream/talksport",
    transcriptFeedId: "talksport",
    codec: "SE MP3 relay"
  },
  {
    id: "bbc-radio-5-live",
    label: "BBC 5 Live",
    logoUrl: "https://ukradiolive.com/public/uploads/radio_img/bbc-radio-5-live/play_250_250.webp",
    playbackUrl: "/api/live-audio/stream/bbc-radio-5-live",
    transcriptFeedId: "bbc-radio-5-live",
    codec: "SE MP3 relay"
  }
] as const;

function money(value: number | undefined | null) {
  return Number(value || 0) > 0 ? formatExchangeMoney(Number(value || 0), "USD") : "-";
}

function odds(value: number | undefined | null) {
  return Number(value || 0) > 1 ? Number(value).toFixed(2) : "-";
}

function priceLabel(cents: number | undefined | null) {
  const value = Number(cents || 0);
  if (value <= 0) return "-";
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toFixed(value < 10 ? 2 : 1).replace(/0+$/, "").replace(/\.$/, "");
  return `${formatted}c`;
}

function fullTimestamp(value: string | null | undefined) {
  if (!value) return "-";
  return localEventTime(value, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function outcomeCell(outcome?: BotOutcome | null) {
  if (!outcome) return <span className="ai-poly-empty">-</span>;
  return (
    <div className="ai-poly-cell">
      <strong>{outcome.label}</strong>
      <span><em>Y</em> {priceLabel(outcome.yesCents)} <small>{money(outcome.yesMoney)}</small></span>
      <span><em>N</em> {priceLabel(outcome.noCents)} <small>{money(outcome.noMoney)}</small></span>
    </div>
  );
}

function compactMoney(value: number | undefined | null) {
  const amount = Number(value || 0);
  if (amount <= 0) return "-";
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}m`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}k`;
  return `$${Math.round(amount)}`;
}

function currentOutcome(row: BotRow) {
  return row.book?.favourite || row.book?.home || row.book?.away || row.book?.draw || null;
}

function pctLabel(cents: number | undefined | null) {
  const value = Math.max(0, Math.min(100, Math.round(Number(cents || 0))));
  return `${value}%`;
}

function shortLabel(value: string) {
  const clean = String(value || "").trim();
  return clean.length > 14 ? `${clean.slice(0, 13)}.` : clean;
}

function buildLadder(outcome?: BotOutcome | null): LadderLevel[] {
  const grouped = new Map<number, LadderLevel>();
  const add = (level: BotPriceLevel, side: "yes" | "no") => {
    const price = Math.max(1, Math.min(99, Math.round(Number(level.cents || 0))));
    if (!price) return;
    const current = grouped.get(price) || { price, yesSize: 0, noSize: 0 };
    if (side === "yes") {
      current.yesSize += Number(level.amount || 0);
      current.yesLevel = Math.min(current.yesLevel || Number(level.level || 99), Number(level.level || 99));
    } else {
      current.noSize += Number(level.amount || 0);
      current.noLevel = Math.min(current.noLevel || Number(level.level || 99), Number(level.level || 99));
    }
    current.observedAt = level.observedAt || current.observedAt || null;
    grouped.set(price, current);
  };
  (outcome?.yesLevels || []).forEach((level) => add(level, "yes"));
  (outcome?.noLevels || []).forEach((level) => add(level, "no"));
  if (!grouped.size && outcome) {
    if (Number(outcome.yesMoney || 0) > 0 && Number(outcome.yesCents || 0) > 0) {
      add({ odds: outcome.yesOdds, cents: outcome.yesCents, amount: outcome.yesMoney, level: 1, observedAt: null }, "yes");
    }
    if (Number(outcome.noMoney || 0) > 0 && Number(outcome.noCents || 0) > 0) {
      add({ odds: outcome.noOdds, cents: outcome.noCents, amount: outcome.noMoney, level: 1, observedAt: null }, "no");
    }
  }
  return Array.from(grouped.values()).sort((a, b) => b.price - a.price);
}

function chartPoints(row: BotRow) {
  const series = (base: number) => Array.from({ length: 2 }, () => Math.max(4, Math.min(96, base)));
  const home = series(Number(row.book?.home?.yesCents || 0));
  const draw = series(Number(row.book?.draw?.yesCents || 0));
  const away = series(Number(row.book?.away?.yesCents || 0));
  const toPoints = (values: number[]) => values.map((value, index) => {
    const x = 20 + (index / Math.max(1, values.length - 1)) * 560;
    const y = 240 - (value / 100) * 210;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return { home: toPoints(home), draw: toPoints(draw), away: toPoints(away) };
}

function outcomeDepth(outcome?: BotOutcome | null) {
  if (!outcome) return 0;
  return [...(outcome.yesLevels || []), ...(outcome.noLevels || [])]
    .reduce((sum, level) => sum + Number(level.amount || 0), 0);
}

function quoteRows(row: BotRow) {
  const trades = (row.book?.recentTrades || []).map((trade, index) => ({
    key: `trade:${index}:${trade.observedAt || ""}:${trade.label}:${trade.cents}`,
    at: trade.observedAt || row.book?.latest || null,
    outcome: trade.label,
    side: trade.runnerName || "TRADE",
    price: trade.cents,
    size: trade.amount,
    level: 0,
    isTrade: true
  }));
  if (trades.length) return trades.slice(0, 30);
  return [
    { key: "home", outcome: row.book?.home },
    { key: "draw", outcome: row.book?.draw },
    { key: "away", outcome: row.book?.away }
  ].flatMap(({ key, outcome }) => [
    ...(outcome?.yesLevels || []).map((level) => ({ key: `${key}:yes:${level.level}:${level.cents}`, at: level.observedAt || row.book?.latest || null, outcome: outcome.label, side: "YES", price: level.cents, size: level.amount, level: level.level, isTrade: false })),
    ...(outcome?.noLevels || []).map((level) => ({ key: `${key}:no:${level.level}:${level.cents}`, at: level.observedAt || row.book?.latest || null, outcome: outcome.label, side: "NO", price: level.cents, size: level.amount, level: level.level, isTrade: false }))
  ]).sort((a, b) => Number(a.level || 0) - Number(b.level || 0)).slice(0, 24);
}

function ContractLadder({ outcome }: { outcome?: BotOutcome | null }) {
  const ladder = buildLadder(outcome);
  return (
    <div className="ai-market-ladder">
      <div className="ai-market-panel-head">
        <span>{outcome?.label || "Contract"}</span>
        <strong>Yes / No live</strong>
      </div>
      <div className="ai-ladder-table">
        {ladder.map((level) => (
          <div className="ai-ladder-row" key={`${outcome?.label || "contract"}:${level.price}`}>
            <span className={level.yesLevel === 1 ? "hot yes-size" : "yes-size"}>{level.yesSize ? compactMoney(level.yesSize) : ""}</span>
            <strong>{level.price}c</strong>
            <span className={level.noLevel === 1 ? "hot no-size" : "no-size"}>{level.noSize ? compactMoney(level.noSize) : ""}</span>
          </div>
        ))}
        {!ladder.length && <div className="ai-ladder-empty">No live WSS ladder levels</div>}
      </div>
    </div>
  );
}

async function fetchStatus() {
  const response = await fetch("/api/football/ai-bot/status", { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || "AI bot status failed");
  return payload as BotStatus;
}

async function postAction(url: string) {
  const response = await fetch(url, { method: "POST", cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || "AI bot action failed");
  return payload as BotStatus;
}

async function fetchTranscriptSegments(feedId: string) {
  const params = new URLSearchParams({
    feed_id: feedId,
    sinceSeconds: "45",
    limit: "12"
  });
  const response = await fetch(`/api/live-audio/segments?${params.toString()}`, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || "Transcript feed failed");
  return (payload.segments || []).map((segment: { id: string; text: string; createdAt: string | null }) => ({
    id: String(segment.id),
    text: String(segment.text || ""),
    createdAt: segment.createdAt || null
  })).reverse() as BotSegment[];
}

export default function AIBot() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [audioMonitorId, setAudioMonitorId] = useState<(typeof AUDIO_MONITORS)[number]["id"]>("talksport");
  const [audioError, setAudioError] = useState("");
  const [subtitleSegments, setSubtitleSegments] = useState<BotSegment[]>([]);
  const [subtitleError, setSubtitleError] = useState("");
  const [selectedRowId, setSelectedRowId] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  async function refresh() {
    try {
      const next = await fetchStatus();
      setStatus(next);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI bot status failed");
    }
  }

  async function closeTrade(id: string) {
    setBusyAction(id);
    try {
      setStatus(await postAction(`/api/football/ai-bot/trades/${encodeURIComponent(id)}/close`));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Close failed");
    } finally {
      setBusyAction("");
    }
  }

  async function resetPaper() {
    setBusyAction("reset");
    try {
      setStatus(await postAction("/api/football/ai-bot/reset"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusyAction("");
    }
  }

  useEffect(() => {
    let closedByEffect = false;

    function clearReconnect() {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function connect() {
      clearReconnect();
      const token = window.localStorage.getItem("sportsedge.auth.token");
      if (!token) {
        setError("Login token missing for live AI bot stream.");
        return;
      }
      const socket = new WebSocket(sportsEdgeWsUrl(token));
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setError("");
        socket.send(JSON.stringify({
          type: "subscribe",
          channel: "football.ai-bot",
          filters: { sport: "football" }
        }));
      });

      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type !== "event" || String(message.channel || "") !== "football.ai-bot") return;
          const next = message.payload?.status;
          if (next?.mode === "backend-paper") {
            setStatus(next);
            setError("");
          }
        } catch {
          // Ignore malformed live payloads.
        }
      });

      socket.addEventListener("close", () => {
        if (closedByEffect) return;
        reconnectTimerRef.current = window.setTimeout(connect, 1500);
      });

      socket.addEventListener("error", () => {
        setError("Live AI bot stream reconnecting.");
      });
    }

    refresh();
    connect();
    const fallbackTimer = window.setInterval(() => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) refresh();
    }, 10000);
    return () => {
      closedByEffect = true;
      clearReconnect();
      window.clearInterval(fallbackTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  const rows = status?.rows || [];
  const orders = status?.orders || [];
  const trades = status?.trades || [];
  const signals = status?.signals || [];
  const selectedRow = rows.find((row) => row.id === selectedRowId) || null;
  const watchedWithMoney = rows.filter((row) => Number(row.book?.eventLiquidity || 0) > 0).length;
  const nextMatch = rows.find((row) => row.startAt && new Date(row.startAt).getTime() > Date.now());
  const audioMonitor = AUDIO_MONITORS.find((source) => source.id === audioMonitorId) || AUDIO_MONITORS[0];
  const subtitleText = subtitleSegments.map((segment) => segment.text).filter(Boolean).slice(-6).join("     /     ")
    || subtitleError
    || `No recent ${audioMonitor.label} transcript rows`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioError("");
    audio.pause();
    audio.removeAttribute("src");
    audio.src = audioMonitor.playbackUrl;
    audio.load();
  }, [audioMonitor]);

  const selectedOutcome = selectedRow ? currentOutcome(selectedRow) : null;
  const selectedChart = selectedRow ? chartPoints(selectedRow) : null;
  const selectedQuotes = selectedRow ? quoteRows(selectedRow) : [];

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedTranscripts() {
      try {
        const next = await fetchTranscriptSegments(audioMonitor.transcriptFeedId);
        if (cancelled) return;
        setSubtitleSegments(next);
        setSubtitleError("");
      } catch (err) {
        if (cancelled) return;
        setSubtitleSegments([]);
        setSubtitleError(err instanceof Error ? err.message : "Transcript feed failed");
      }
    }

    loadSelectedTranscripts();
    const timer = window.setInterval(loadSelectedTranscripts, 6000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [audioMonitor]);

  return (
    <div className="terminal-shell">
      <TerminalTopbar activeSport="football" activeScreen="ai-bot" searchPlaceholder="AI Bot: live football scores, Poly prices, paper trades..." />
      <main className="terminal-content ai-bot-screen">
        <section className="ai-bot-summary">
          <article><span>Paper Balance</span><strong>{money(status?.balance)}</strong><small>Backend-owned account</small></article>
          <article><span>Stake</span><strong>{money(status?.stakeUsd || 500)}</strong><small>Per goal-triggered trade</small></article>
          <article><span>Open P/L</span><strong className={(status?.openPnl || 0) >= 0 ? "positive" : "negative"}>{money(status?.openPnl)}</strong><small>Marked on backend</small></article>
          <article><span>Total P/L</span><strong className={(status?.totalPnl || 0) >= 0 ? "positive" : "negative"}>{money(status?.totalPnl)}</strong><small>Realised {money(status?.realisedPnl)}</small></article>
          <article><span>Watching</span><strong>{rows.length}</strong><small>{watchedWithMoney} with Poly money</small></article>
          <article><span>Next Match</span><strong>{nextMatch ? fullTimestamp(nextMatch.startAt) : "-"}</strong><small>{nextMatch?.eventName || "Waiting for fixture"}</small></article>
          <article>
            <span>Score WSS</span>
            <strong className={status?.liveScoreFeed?.connected ? "positive" : ""}>{status?.liveScoreFeed?.connected ? "Live" : status?.liveScoreFeed?.enabled ? "Waiting" : "Off"}</strong>
            <small>{status?.liveScoreFeed?.lastMessageAt ? `${fullTimestamp(status.liveScoreFeed.lastMessageAt)} tick` : status?.liveScoreFeed?.lastError || "AllSportsAPI"}</small>
          </article>
          <article><span>Orders</span><strong>{orders.filter((order) => ["OPEN", "PARTIAL"].includes(order.status)).length}</strong><small>{orders.filter((order) => order.status === "FILLED").length} filled</small></article>
        </section>

        <section className="ai-subtitle-strip" aria-label="Live transcript subtitles">
          <strong>{audioMonitor.label} transcript</strong>
          <div className="ai-subtitle-window">
            <div className="ai-subtitle-track">
              <span>{subtitleText}</span>
              <span aria-hidden="true">{subtitleText}</span>
            </div>
          </div>
          <div className="ai-subtitle-actions">
            <div className="ai-audio-tabs" aria-label="Radio source">
              {AUDIO_MONITORS.map((source) => (
                <button
                  key={source.id}
                  className={source.id === audioMonitor.id ? "active" : ""}
                  type="button"
                  onClick={() => setAudioMonitorId(source.id)}
                >
                  {source.label}
                </button>
              ))}
            </div>
            <audio className="ai-strip-audio" ref={audioRef} controls preload="none" />
            <button className="ai-close-button" type="button" onClick={resetPaper} disabled={busyAction === "reset"}>Reset Paper</button>
          </div>
        </section>
        {error && <section className="ai-bot-warning error"><strong>API</strong><span>{error}</span></section>}

        <section className="ai-bot-risk-grid">
          <div className="ai-bot-panel ai-bot-orders">
            <div className="ai-bot-head"><span>Working orders</span><strong>{orders.filter((order) => ["OPEN", "PARTIAL"].includes(order.status)).length} working</strong></div>
            <table>
              <thead>
                <tr><th>Created</th><th>Event</th><th>Outcome</th><th>Limit</th><th>Stake</th><th>Filled</th><th>Left</th><th>Avail</th><th>Status</th><th>Reason</th></tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className={order.status === "CANCELLED" || order.status === "REJECTED" ? "closed" : ""}>
                    <td className="mono">{fullTimestamp(order.createdAt)}</td>
                    <td><strong>{order.eventName}</strong><small>{order.reason}</small></td>
                    <td>{order.outcome}</td>
                    <td className="mono">{priceLabel(Number(order.limitPrice || 0) * 100 || order.limitCents)}</td>
                    <td className="mono">{money(order.stake)}</td>
                    <td className="mono">{money(order.filledStake)}</td>
                    <td className="mono">{money(order.remainingStake)}</td>
                    <td className="mono">{money(order.availableAtCreate)}</td>
                    <td><span className={`ai-pill ${order.status === "OPEN" || order.status === "PARTIAL" ? "live" : order.status === "FILLED" ? "watch" : ""}`}>{order.status}</span></td>
                    <td><small>{order.rejectReason || order.cancelReason || `${Math.round(Number(order.quoteAgeMs || 0) / 1000)}s quote`}</small></td>
                  </tr>
                ))}
                {!orders.length && <tr><td colSpan={10}>No working orders. A score WSS goal signal creates the first backend order.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="ai-bot-panel ai-bot-trades">
            <div className="ai-bot-head"><span>Open positions / P&L</span><strong>{trades.filter((trade) => trade.status === "OPEN").length} open</strong></div>
            <table>
              <thead>
                <tr><th>Opened</th><th>Event</th><th>Outcome</th><th>Stake</th><th>Entry</th><th>Now</th><th>P/L</th><th>Stop</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className={trade.status === "CLOSED" ? "closed" : ""}>
                    <td className="mono">{fullTimestamp(trade.openedAt)}</td>
                    <td><strong>{trade.eventName}</strong><small>{trade.reason}</small></td>
                    <td>{trade.outcome}</td>
                    <td className="mono">{money(trade.stake)}</td>
                    <td className="mono">{priceLabel(Number(trade.entryPrice || 0) * 100)}</td>
                    <td className="mono">{priceLabel(Number(trade.currentPrice || 0) * 100)}</td>
                    <td className={`mono ${trade.pnl >= 0 ? "positive" : "negative"}`}>{money(trade.pnl)}</td>
                    <td className="mono">{money(trade.stopPnl)}</td>
                    <td><span className={`ai-pill ${trade.status === "OPEN" ? "live" : ""}`}>{trade.status}</span></td>
                    <td>
                      {trade.status === "OPEN"
                        ? <button className="ai-close-button" type="button" disabled={busyAction === trade.id} onClick={() => closeTrade(trade.id)}>Close</button>
                        : <span className="ai-closed-time">{trade.closedAt ? fullTimestamp(trade.closedAt) : "-"}</span>}
                    </td>
                  </tr>
                ))}
                {!trades.length && <tr><td colSpan={10}>No filled positions. Orders fill only when fresh Polymarket price and size are available.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {selectedRow && (
          <section className="ai-match-detail" aria-label={`${selectedRow.eventName} market detail`}>
            <div className="ai-match-detail-head">
              <div>
                <span>Selected match</span>
                <strong>{selectedRow.eventName}</strong>
                <small>{selectedRow.competition} / {selectedRow.signal} / {selectedRow.sportsApiStatus?.provider || "fixture"} {selectedRow.sportsApiStatus?.detail || ""} / {selectedRow.book?.source || "price feed"}</small>
              </div>
              <div className="ai-match-scorebox">
                <span>Score</span>
                <strong>{selectedRow.score.home}-{selectedRow.score.away}</strong>
                <small>{fullTimestamp(selectedRow.startAt)}</small>
              </div>
              <button className="ai-close-button" type="button" onClick={() => setSelectedRowId("")}>Close</button>
            </div>

            <div className="ai-match-kpis">
              <article><span>Outcome A</span><strong>{selectedRow.home}</strong><small>{priceLabel(selectedRow.book?.home?.yesCents)} / {priceLabel(selectedRow.book?.home?.noCents)}</small></article>
              <article><span>Outcome B</span><strong>{selectedRow.away}</strong><small>{priceLabel(selectedRow.book?.away?.yesCents)} / {priceLabel(selectedRow.book?.away?.noCents)}</small></article>
              <article><span>Draw</span><strong>{priceLabel(selectedRow.book?.draw?.yesCents)}</strong><small>Yes / No {priceLabel(selectedRow.book?.draw?.noCents)}</small></article>
              <article><span>Last print</span><strong>{selectedOutcome?.label || "-"}</strong><small>Yes {priceLabel(selectedOutcome?.yesCents)}</small></article>
              <article><span>Near depth</span><strong>{compactMoney(outcomeDepth(selectedOutcome))}</strong><small>Full live levels visible</small></article>
              <article><span>24h volume</span><strong>{compactMoney(selectedRow.book?.eventLiquidity)}</strong><small>SportsEdge liquidity</small></article>
              <article><span>Trade read</span><strong>{selectedOutcome?.label || "-"}</strong><small>{selectedRow.signal}</small></article>
            </div>

            <div className="ai-match-market-grid">
              <div className="ai-market-chart">
                <div className="ai-market-panel-head">
                  <span>1X2 outcome chart</span>
                  <strong>{selectedRow.home} / Draw / {selectedRow.away}</strong>
                </div>
                <svg viewBox="0 0 620 280" role="img" aria-label="Selected match home draw away chart">
                  <g className="grid">
                    {[0, 25, 50, 75, 100].map((tick) => (
                      <line key={tick} x1="20" x2="580" y1={240 - tick * 2.1} y2={240 - tick * 2.1} />
                    ))}
                  </g>
                  <polyline className="home" points={selectedChart?.home || ""} />
                  <polyline className="draw" points={selectedChart?.draw || ""} />
                  <polyline className="away" points={selectedChart?.away || ""} />
                  <text x="430" y="78" className="home-label">{shortLabel(selectedRow.home)} {pctLabel(selectedRow.book?.home?.yesCents)}</text>
                  <text x="430" y="142" className="draw-label">Draw {pctLabel(selectedRow.book?.draw?.yesCents)}</text>
                  <text x="430" y="206" className="away-label">{shortLabel(selectedRow.away)} {pctLabel(selectedRow.book?.away?.yesCents)}</text>
                </svg>
              </div>

              <ContractLadder outcome={selectedRow.book?.home} />
              <ContractLadder outcome={selectedRow.book?.draw} />
              <ContractLadder outcome={selectedRow.book?.away} />

              <div className="ai-market-sales">
                <div className="ai-market-panel-head">
                  <span>{selectedRow.book?.recentTrades?.length ? "Polymarket trades" : "Live quote levels"}</span>
                  <strong>{selectedQuotes.length} rows</strong>
                </div>
                <table>
                  <thead><tr><th>Time</th><th>Outcome</th><th>Side</th><th>Price</th><th>Size</th></tr></thead>
                  <tbody>
                    {selectedQuotes.map((quote) => (
                      <tr key={quote.key}>
                        <td className="mono">{fullTimestamp(quote.at).split(",").pop()?.trim() || fullTimestamp(quote.at)}</td>
                        <td>{quote.outcome}</td>
                        <td className={quote.side === "YES" || quote.isTrade ? "positive" : "negative"}>{quote.side}</td>
                        <td className="mono">{quote.price}c</td>
                        <td className="mono">{compactMoney(quote.size)}</td>
                      </tr>
                    ))}
                    {!selectedQuotes.length && <tr><td colSpan={5}>No live WSS quote levels for this match yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <section className="ai-bot-grid">
          <div className="ai-bot-panel ai-bot-watch">
            <div className="ai-bot-head"><span>Football watchlist</span><strong>{status ? fullTimestamp(status.generatedAt) : "-"} backend</strong></div>
            <table>
              <thead>
                <tr><th>Time</th><th>Match</th><th>Score</th><th>Home Yes/No</th><th>Draw Yes/No</th><th>Away Yes/No</th><th>Fav</th><th>Poly $ Now</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const book = row.book;
                  return (
                    <tr key={row.id} className={row.id === selectedRowId ? "selected" : ""} onDoubleClick={() => setSelectedRowId(row.id)}>
                      <td className="mono">{fullTimestamp(row.startAt)}</td>
                      <td><strong>{row.eventName}</strong><small>{row.competition}</small></td>
                      <td className="mono">{row.score.home}-{row.score.away}</td>
                      <td>{outcomeCell(book?.home)}</td>
                      <td>{outcomeCell(book?.draw)}</td>
                      <td>{outcomeCell(book?.away)}</td>
                      <td>{book?.favourite ? <><strong>{book.favourite.label}</strong><small>{odds(book.favourite.yesOdds)} / {priceLabel(book.favourite.yesCents)}</small></> : "-"}</td>
                      <td className="mono">{money(book?.eventLiquidity)}</td>
                      <td>
                        <span className={`ai-pill ${row.signal === "In-play" ? "live" : ""}`}>{row.signal}</span>
                        <small>{row.sportsApiStatus?.provider || "fixture"} {row.sportsApiStatus?.detail || ""}</small>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colSpan={9}>No football matches in the backend watch window.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="ai-bot-panel ai-bot-signals">
            <div className="ai-bot-head"><span>Backend audio signals</span><strong>{signals.length}</strong></div>
            {signals.map((signal) => (
              <div className="ai-signal" key={signal.id}>
                <span>{fullTimestamp(signal.at)}</span>
                <strong>{signal.action}</strong>
                <p>{signal.text}</p>
              </div>
            ))}
            {!signals.length && <p className="ai-empty">No backend goal signals yet.</p>}
          </div>
        </section>

        <section className="ai-bot-panel ai-audio-feed">
          <div className="ai-bot-head ai-audio-monitor-head">
            <span>SportsEdge relay monitor</span>
            <strong>{audioMonitor.label}</strong>
          </div>
          <div className="ai-radio-monitor">
            <div className="ai-radio-card">
              <img src={audioMonitor.logoUrl} alt={`${audioMonitor.label} logo`} />
              <span>{audioMonitor.label}</span>
            </div>
            <div className="ai-radio-meta">
              <strong>{audioMonitor.label}</strong>
              <span>{audioMonitor.codec} via SportsEdge relay</span>
              {audioError && <small className="negative">{audioError}</small>}
              <code>{audioMonitor.playbackUrl}</code>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
