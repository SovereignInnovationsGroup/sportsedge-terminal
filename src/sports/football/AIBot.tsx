import { useEffect, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { formatExchangeMoney, localEventTime } from "../../core/format";

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
  score: { home: number; away: number };
  signal: string;
  book?: BotBook | null;
};

type BotTrade = {
  id: string;
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
  trades: BotTrade[];
  signals: BotSignal[];
  segments: BotSegment[];
};

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
    refresh();
    const timer = window.setInterval(refresh, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = status?.rows || [];
  const trades = status?.trades || [];
  const signals = status?.signals || [];
  const segments = status?.segments || [];
  const watchedWithMoney = rows.filter((row) => Number(row.book?.eventLiquidity || 0) > 0).length;
  const nextMatch = rows.find((row) => row.startAt && new Date(row.startAt).getTime() > Date.now());

  return (
    <div className="terminal-shell">
      <TerminalTopbar activeSport="football" activeScreen="ai-bot" searchPlaceholder="AI Bot: World Cup, audio goals, paper trades..." />
      <main className="terminal-content ai-bot-screen">
        <section className="ai-bot-summary">
          <article><span>Paper Balance</span><strong>{money(status?.balance)}</strong><small>Backend-owned account</small></article>
          <article><span>Stake</span><strong>{money(status?.stakeUsd || 500)}</strong><small>Per goal-triggered trade</small></article>
          <article><span>Open P/L</span><strong className={(status?.openPnl || 0) >= 0 ? "positive" : "negative"}>{money(status?.openPnl)}</strong><small>Marked on backend</small></article>
          <article><span>Total P/L</span><strong className={(status?.totalPnl || 0) >= 0 ? "positive" : "negative"}>{money(status?.totalPnl)}</strong><small>Realised {money(status?.realisedPnl)}</small></article>
          <article><span>Watching</span><strong>{rows.length}</strong><small>{watchedWithMoney} with Poly money</small></article>
          <article><span>Next Match</span><strong>{nextMatch ? fullTimestamp(nextMatch.startAt) : "-"}</strong><small>{nextMatch?.eventName || "Waiting for fixture"}</small></article>
        </section>

        <section className="ai-bot-warning">
          <strong>Backend paper mode.</strong>
          <span>The browser only displays backend state. Goal detection, fixed $500 entries, stops, closes, and P/L are executed by the API.</span>
          <button className="ai-close-button" type="button" onClick={resetPaper} disabled={busyAction === "reset"}>Reset Paper</button>
        </section>
        {error && <section className="ai-bot-warning error"><strong>API</strong><span>{error}</span></section>}

        <section className="ai-bot-grid">
          <div className="ai-bot-panel ai-bot-watch">
            <div className="ai-bot-head"><span>World Cup watchlist</span><strong>{status ? fullTimestamp(status.generatedAt) : "-"} backend</strong></div>
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
                      <td><span className={`ai-pill ${row.signal === "In-play" ? "live" : ""}`}>{row.signal}</span></td>
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colSpan={9}>No World Cup matches in the backend watch window.</td></tr>}
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
            {!signals.length && <p className="ai-empty">No backend goal/start signals yet.</p>}
          </div>
        </section>

        <section className="ai-bot-panel ai-bot-trades">
          <div className="ai-bot-head"><span>Backend paper trades</span><strong>{trades.filter((trade) => trade.status === "OPEN").length} open</strong></div>
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
              {!trades.length && <tr><td colSpan={10}>No backend paper trades yet. Waiting for World Cup goal signal plus Polymarket price.</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="ai-bot-panel ai-audio-feed">
          <div className="ai-bot-head"><span>TalkSport transcript input</span><strong>{segments.length}</strong></div>
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
