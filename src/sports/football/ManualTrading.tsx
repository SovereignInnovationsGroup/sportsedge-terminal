import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { formatExchangeMoney } from "../../core/format";

type ManualTrade = {
  id: string;
  openedAt: string;
  closedAt?: string;
  match: string;
  outcome: string;
  stake: number;
  entryCents: number;
  markCents: number;
  status: "OPEN" | "CLOSED";
  realisedPnl?: number;
};

const STORE_KEY = "sportsedge.manualTrading.v1";

function money(value: number) {
  return formatExchangeMoney(value, "USD");
}

function cents(value: number) {
  return `${Number(value || 0).toFixed(Number.isInteger(value) ? 0 : 1)}c`;
}

function tradePnl(trade: ManualTrade) {
  if (trade.status === "CLOSED") return Number(trade.realisedPnl || 0);
  const shares = Number(trade.stake || 0) / Math.max(0.01, Number(trade.entryCents || 0) / 100);
  return shares * ((Number(trade.markCents || 0) - Number(trade.entryCents || 0)) / 100);
}

function loadTrades() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed as ManualTrade[] : [];
  } catch {
    return [];
  }
}

export default function ManualTrading() {
  const [trades, setTrades] = useState<ManualTrade[]>(loadTrades);
  const [match, setMatch] = useState("Spain vs. Saudi Arabia");
  const [outcome, setOutcome] = useState("Spain");
  const [stake, setStake] = useState("500");
  const [entryCents, setEntryCents] = useState("99");
  const [markCents, setMarkCents] = useState("99");
  const [walletStart, setWalletStart] = useState("10000");

  useEffect(() => {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(trades));
  }, [trades]);

  const openPnl = useMemo(() => trades.filter((trade) => trade.status === "OPEN").reduce((sum, trade) => sum + tradePnl(trade), 0), [trades]);
  const realisedPnl = useMemo(() => trades.filter((trade) => trade.status === "CLOSED").reduce((sum, trade) => sum + tradePnl(trade), 0), [trades]);
  const openStake = useMemo(() => trades.filter((trade) => trade.status === "OPEN").reduce((sum, trade) => sum + Number(trade.stake || 0), 0), [trades]);
  const wallet = Number(walletStart || 0) - openStake + realisedPnl;
  const equity = wallet + openStake + openPnl;

  function addTrade() {
    const next: ManualTrade = {
      id: `manual:${Date.now()}`,
      openedAt: new Date().toISOString(),
      match: match.trim() || "Manual match",
      outcome: outcome.trim() || "Outcome",
      stake: Number(stake || 0),
      entryCents: Number(entryCents || 0),
      markCents: Number(markCents || entryCents || 0),
      status: "OPEN"
    };
    if (next.stake <= 0 || next.entryCents <= 0) return;
    setTrades((current) => [next, ...current]);
  }

  function updateMark(id: string, value: string) {
    const mark = Number(value || 0);
    setTrades((current) => current.map((trade) => trade.id === id ? { ...trade, markCents: mark } : trade));
  }

  function closeTrade(id: string) {
    setTrades((current) => current.map((trade) => {
      if (trade.id !== id || trade.status !== "OPEN") return trade;
      return { ...trade, status: "CLOSED", closedAt: new Date().toISOString(), realisedPnl: tradePnl(trade) };
    }));
  }

  return (
    <div className="manual-trading-shell">
      <TerminalTopbar activeSport="football" activeScreen="manual-trading" searchPlaceholder="Manual trading" />
      <main className="manual-trading-page">
        <section className="manual-wallet">
          <article><span>Wallet</span><strong>{money(wallet)}</strong></article>
          <article><span>Equity</span><strong>{money(equity)}</strong></article>
          <article><span>Open P/L</span><strong className={openPnl >= 0 ? "positive" : "negative"}>{money(openPnl)}</strong></article>
          <article><span>Realised</span><strong className={realisedPnl >= 0 ? "positive" : "negative"}>{money(realisedPnl)}</strong></article>
        </section>

        <section className="manual-ticket">
          <label>Wallet start<input inputMode="decimal" value={walletStart} onChange={(event) => setWalletStart(event.target.value)} /></label>
          <label>Match<input value={match} onChange={(event) => setMatch(event.target.value)} /></label>
          <label>Outcome<input value={outcome} onChange={(event) => setOutcome(event.target.value)} /></label>
          <div className="manual-ticket-row">
            <label>Stake<input inputMode="decimal" value={stake} onChange={(event) => setStake(event.target.value)} /></label>
            <label>Entry c<input inputMode="decimal" value={entryCents} onChange={(event) => setEntryCents(event.target.value)} /></label>
            <label>Now c<input inputMode="decimal" value={markCents} onChange={(event) => setMarkCents(event.target.value)} /></label>
          </div>
          <button type="button" onClick={addTrade}>Add Manual Trade</button>
        </section>

        <section className="manual-positions">
          {trades.map((trade) => {
            const pnl = tradePnl(trade);
            return (
              <article key={trade.id} className={trade.status === "CLOSED" ? "closed" : ""}>
                <div>
                  <strong>{trade.outcome}</strong>
                  <span>{trade.match}</span>
                </div>
                <div className="manual-position-grid">
                  <span>Stake <b>{money(trade.stake)}</b></span>
                  <span>Entry <b>{cents(trade.entryCents)}</b></span>
                  <label>Now <input inputMode="decimal" value={trade.markCents} onChange={(event) => updateMark(trade.id, event.target.value)} disabled={trade.status === "CLOSED"} /></label>
                  <span>P/L <b className={pnl >= 0 ? "positive" : "negative"}>{money(pnl)}</b></span>
                </div>
                {trade.status === "OPEN"
                  ? <button type="button" onClick={() => closeTrade(trade.id)}>Close</button>
                  : <small>Closed {trade.closedAt ? new Date(trade.closedAt).toLocaleTimeString() : ""}</small>}
              </article>
            );
          })}
          {!trades.length && <p>No manual trades yet.</p>}
        </section>
      </main>
    </div>
  );
}
