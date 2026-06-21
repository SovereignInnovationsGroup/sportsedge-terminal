import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
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
};

type BotBook = {
  home?: BotOutcome | null;
  away?: BotOutcome | null;
  draw?: BotOutcome | null;
  favourite?: BotOutcome | null;
  eventLiquidity: number;
  visibleMoney: number;
  latest?: string | null;
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

const AUDIO_MONITORS = [
  {
    id: "talksport",
    label: "talkSPORT",
    logoUrl: "https://ukradiolive.com/public/uploads/radio_img/talksport/play_250_250.webp",
    playbackUrl: "/api/live-audio/stream/talksport",
    upstreamUrl: "https://radio.talksport.com/stream#.mp3",
    codec: "MP3 64k",
    kind: "mp3"
  },
  {
    id: "bbc-radio-5-live",
    label: "BBC 5 Live",
    logoUrl: "https://ukradiolive.com/public/uploads/radio_img/bbc-radio-5-live/play_250_250.webp",
    playbackUrl: "/api/live-audio/hls/bbc-radio-5-live",
    upstreamUrl: "https://a.files.bbci.co.uk/ms6/live/3441A116-B12E-4D2F-ACA8-C1984642FA4B/audio/simulcast/hls/nonuk/mobile_wifi_main_sd_abr_v2/cfs/bbc_radio_five_live.m3u8",
    codec: "HLS 101k",
    kind: "hls"
  }
] as const;

function money(value: number | undefined | null) {
  return Number(value || 0) > 0 ? formatExchangeMoney(Number(value || 0), "USD") : "-";
}

function odds(value: number | undefined | null) {
  return Number(value || 0) > 1 ? Number(value).toFixed(2) : "-";
}

function priceLabel(cents: number | undefined | null) {
  return Number(cents || 0) > 0 ? `${Math.round(Number(cents))}c` : "-";
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

export default function AIBot() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [audioMonitorId, setAudioMonitorId] = useState<(typeof AUDIO_MONITORS)[number]["id"]>("talksport");
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
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
  const segments = status?.segments || [];
  const watchedWithMoney = rows.filter((row) => Number(row.book?.eventLiquidity || 0) > 0).length;
  const nextMatch = rows.find((row) => row.startAt && new Date(row.startAt).getTime() > Date.now());
  const audioMonitor = AUDIO_MONITORS.find((source) => source.id === audioMonitorId) || AUDIO_MONITORS[0];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioError("");
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    if (audioMonitor.kind === "hls") {
      if (audio.canPlayType("application/vnd.apple.mpegurl")) {
        audio.src = audioMonitor.playbackUrl;
      } else if (Hls.isSupported()) {
        const hls = new Hls({ lowLatencyMode: true });
        hlsRef.current = hls;
        hls.loadSource(audioMonitor.playbackUrl);
        hls.attachMedia(audio);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) setAudioError("BBC HLS playback failed. Try reselecting the source.");
        });
      } else {
        setAudioError("This browser cannot play BBC HLS audio.");
      }
    } else {
      audio.src = audioMonitor.playbackUrl;
    }
    audio.load();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
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

        <section className="ai-bot-warning">
          <strong>Backend paper mode.</strong>
          <span>The browser only displays backend state. Score WSS creates paper limit orders; only orders with fresh Polymarket price and visible size become filled positions.</span>
          <button className="ai-close-button" type="button" onClick={resetPaper} disabled={busyAction === "reset"}>Reset Paper</button>
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
                    <td className="mono">{priceLabel(order.limitCents)}</td>
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
                    <td className="mono">{odds(trade.entryOdds)}</td>
                    <td className="mono">{odds(trade.currentOdds)}</td>
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
                    <tr key={row.id}>
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
            <span>Live radio monitor</span>
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
          </div>
          <div className="ai-radio-monitor">
            <div className="ai-radio-card">
              <img src={audioMonitor.logoUrl} alt={`${audioMonitor.label} logo`} />
              <audio ref={audioRef} controls preload="none" />
            </div>
            <div className="ai-radio-meta">
              <strong>{audioMonitor.label}</strong>
              <span>{audioMonitor.codec} via SportsEdge relay</span>
              {audioError && <small className="negative">{audioError}</small>}
              <code>{audioMonitor.playbackUrl}</code>
              <small>Upstream held server-side: {audioMonitor.upstreamUrl}</small>
            </div>
          </div>
          <div className="ai-bot-head"><span>Transcript input</span><strong>{segments.length}</strong></div>
          {segments.map((segment) => (
            <div className="ai-transcript" key={segment.id}>
              <span>{segment.createdAt ? fullTimestamp(segment.createdAt) : "-"}</span>
              <p>{segment.text}</p>
            </div>
          ))}
          {!segments.length && <p className="ai-empty">No recent transcript rows from backend.</p>}
        </section>
      </main>
    </div>
  );
}
