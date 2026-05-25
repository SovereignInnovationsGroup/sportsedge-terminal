import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { eventHasPassed, formatExchangeMoney, localEventTime, normalizeFixtureText } from "../../core/format";
import { FootballScopeFilter } from "./FootballScopeFilter";
import { footballScopeMatches } from "./filters";
import {
  fetchMarketSnapshotRows,
  type BackendExchangeMatch,
  type BackendPriceRow,
  type BackendRunner,
  type BackendRunnerLevel
} from "./marketData";

type ArbRow = {
  id: string;
  fixture: string;
  competition: string;
  market: string;
  startAt: string | null;
  observedAt: string | null;
  type: "back_book" | "lay_book" | "crossed_runner" | "watch";
  status: "EXECUTABLE_ARB" | "ANOMALY" | "WATCH";
  edgePct: number;
  roiPct: number;
  backBookPct: number | null;
  layBookPct: number | null;
  usableLiquidity: number;
  validRunners: number;
  expectedRunners: number | null;
  missingRunners: number | null;
  marketComplete: boolean;
  staleMs: number | null;
  executable: boolean;
  executableStake: number;
  maxProfit: number;
  maxLoss: number;
  reason: string;
  bestBack: string;
  bestLay: string;
  outcomes: string;
  liquidity: number;
};

const ARB_FRESH_MS = 2000;
const MIN_EXECUTABLE_STAKE = 10;

function runnerPriceText(runner: BackendRunner) {
  const back = runner.back ? `B ${runner.back.odds.toFixed(2)} ${formatExchangeMoney(runner.back.amount, "GBP")}` : "B -";
  const lay = runner.lay ? `L ${runner.lay.odds.toFixed(2)} ${formatExchangeMoney(runner.lay.amount, "GBP")}` : "L -";
  return `${runner.name}: ${back} / ${lay}`;
}

function marketBookPct(runners: BackendRunner[], side: "back" | "lay") {
  const prices = runners
    .map((runner) => runner[side]?.odds)
    .filter((odds): odds is number => Number.isFinite(Number(odds)) && Number(odds) > 1);
  if (prices.length !== runners.length || prices.length < 2) return null;
  return prices.reduce((sum, odds) => sum + 1 / odds, 0) * 100;
}

function safeArbMarket(match: BackendExchangeMatch, runners: BackendRunner[]) {
  const marketType = String(match.marketType || "").toUpperCase();
  const marketName = String(match.marketName || "").toLowerCase();
  if (marketType === "MATCH_ODDS" && runners.length === 3) return true;
  if ((marketType.startsWith("OVER_UNDER") || marketName.startsWith("over/under")) && runners.length === 2) return true;
  if ((marketType === "BOTH_TEAMS_TO_SCORE" || marketName.includes("both teams to score")) && runners.length === 2) return true;
  return false;
}

function expectedRunnerCount(match: BackendExchangeMatch) {
  const marketType = String(match.marketType || "").toUpperCase();
  const marketName = String(match.marketName || "").toLowerCase();
  if (marketType === "MATCH_ODDS") return 3;
  if (marketType.startsWith("OVER_UNDER") || marketName.startsWith("over/under")) return 2;
  if (marketType === "BOTH_TEAMS_TO_SCORE" || marketName.includes("both teams to score")) return 2;
  return null;
}

function runnerHasBothSides(runner: BackendRunner) {
  return Number(runner.back?.odds || 0) > 1
    && Number(runner.lay?.odds || 0) > 1
    && Number(runner.back?.amount || 0) > 0
    && Number(runner.lay?.amount || 0) > 0;
}

function staleMsFromObservedAt(value: string | null | undefined) {
  if (!value) return null;
  const normalized = String(value).includes("T") ? String(value) : `${String(value).replace(" ", "T")}Z`;
  const ms = Date.now() - new Date(normalized).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function arbFreshnessLabel(ms: number | null) {
  if (ms == null) return "-";
  if (ms < 1000) return `${Math.max(0, ms)}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

function usableBookLiquidity(runners: BackendRunner[], side: "back" | "lay") {
  const prices = runners.map((runner) => runner[side]).filter(Boolean) as BackendRunnerLevel[];
  if (prices.length !== runners.length || !prices.length) return 0;
  const weights = prices.map((price) => 1 / price.odds);
  const scale = Math.min(...prices.map((price, index) => price.amount / weights[index]));
  if (!Number.isFinite(scale) || scale <= 0) return 0;
  return weights.reduce((sum, weight) => sum + weight * scale, 0);
}

function backBookExecution(runners: BackendRunner[], bookPct: number | null) {
  if (bookPct == null || bookPct <= 0 || bookPct >= 100) return { executableStake: 0, maxProfit: 0, maxLoss: 0 };
  const prices = runners.map((runner) => runner.back).filter(Boolean) as BackendRunnerLevel[];
  if (prices.length !== runners.length) return { executableStake: 0, maxProfit: 0, maxLoss: 0 };
  const book = bookPct / 100;
  const weights = prices.map((price) => 1 / price.odds);
  const maxReturn = Math.min(...prices.map((price, index) => price.amount / weights[index]));
  if (!Number.isFinite(maxReturn) || maxReturn <= 0) return { executableStake: 0, maxProfit: 0, maxLoss: 0 };
  const executableStake = maxReturn * book;
  const maxProfit = maxReturn - executableStake;
  return { executableStake, maxProfit, maxLoss: 0 };
}

function layBookExecution(runners: BackendRunner[], bookPct: number | null) {
  if (bookPct == null || bookPct <= 100) return { executableStake: 0, maxProfit: 0, maxLoss: 0 };
  const prices = runners.map((runner) => runner.lay).filter(Boolean) as BackendRunnerLevel[];
  if (prices.length !== runners.length) return { executableStake: 0, maxProfit: 0, maxLoss: 0 };
  const book = bookPct / 100;
  const maxStake = Math.min(...prices.map((price) => price.amount * book * price.odds));
  if (!Number.isFinite(maxStake) || maxStake <= 0) return { executableStake: 0, maxProfit: 0, maxLoss: 0 };
  const maxProfit = maxStake * (1 - 1 / book);
  return { executableStake: maxStake, maxProfit, maxLoss: 0 };
}

function crossedRunnerExecution(runner: BackendRunner) {
  const backOdds = Number(runner.back?.odds || 0);
  const layOdds = Number(runner.lay?.odds || 0);
  const backAmount = Number(runner.back?.amount || 0);
  const layAmount = Number(runner.lay?.amount || 0);
  if (backOdds <= 1 || layOdds <= 1 || backOdds <= layOdds || backAmount <= 0 || layAmount <= 0) {
    return { executableStake: 0, maxProfit: 0, maxLoss: 0 };
  }
  const backStake = Math.min(backAmount, layAmount * layOdds / backOdds);
  const layStake = backStake * backOdds / layOdds;
  const maxProfit = layStake - backStake;
  return { executableStake: backStake + layStake, maxProfit, maxLoss: 0 };
}

function executionStatus(execution: { executableStake: number; maxProfit: number; maxLoss: number }, isFresh: boolean, marketComplete: boolean) {
  return isFresh
    && marketComplete
    && execution.executableStake >= MIN_EXECUTABLE_STAKE
    && execution.maxProfit > 0
    && execution.maxLoss <= 0;
}

function buildArbRows(rows: BackendPriceRow[]) {
  const output: ArbRow[] = [];

  for (const row of rows) {
    const match = row.matches?.betfair;
    if (!match || !match.runners?.length) continue;
    const marketName = match.marketName || row.marketName || "Market";
    const runners = [...match.runners].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    if (runners.length < 2 || runners.length > 30) continue;
    const expectedRunners = expectedRunnerCount(match);
    const validRunners = runners.filter(runnerHasBothSides).length;
    const missingRunners = expectedRunners == null ? null : Math.max(0, expectedRunners - validRunners);
    const marketComplete = expectedRunners != null && runners.length === expectedRunners && validRunners === expectedRunners && missingRunners === 0;
    const staleMs = staleMsFromObservedAt(match.observedAt);
    const isFresh = staleMs != null && staleMs <= ARB_FRESH_MS;
    const isSafeMarket = safeArbMarket(match, runners);

    const backBookPct = isSafeMarket && marketComplete ? marketBookPct(runners, "back") : null;
    const layBookPct = isSafeMarket && marketComplete ? marketBookPct(runners, "lay") : null;
    let hasSignal = false;
    const outcomes = runners.map(runnerPriceText).join(" | ");
    const liquidity = runners.reduce((sum, runner) => (
      sum
      + Number(runner.back?.amount || 0)
      + Number(runner.lay?.amount || 0)
    ), 0);
    const base = {
      fixture: match.name || row.name,
      competition: match.competitionName || row.competitionName || "",
      market: marketName,
      startAt: match.startAt || row.startAt,
      observedAt: match.observedAt,
      backBookPct,
      layBookPct,
      validRunners,
      expectedRunners,
      missingRunners,
      marketComplete,
      staleMs,
      executable: false,
      executableStake: 0,
      maxProfit: 0,
      maxLoss: 0,
      reason: !isSafeMarket ? "unsupported market"
        : !marketComplete ? `incomplete ${validRunners}/${expectedRunners || runners.length}`
          : !isFresh ? `stale ${arbFreshnessLabel(staleMs)}`
            : "watch",
      bestBack: backBookPct == null ? "-" : `${backBookPct.toFixed(2)}%`,
      bestLay: layBookPct == null ? "-" : `${layBookPct.toFixed(2)}%`,
      outcomes,
      usableLiquidity: 0,
      liquidity
    };

    if (backBookPct != null && backBookPct < 99.95) {
      const execution = backBookExecution(runners, backBookPct);
      const executable = executionStatus(execution, isFresh, marketComplete);
      hasSignal = true;
      output.push({
        id: `${match.marketId}:back`,
        ...base,
        type: "back_book",
        status: executable ? "EXECUTABLE_ARB" : "ANOMALY",
        edgePct: 100 - backBookPct,
        roiPct: (100 / backBookPct - 1) * 100,
        usableLiquidity: execution.executableStake || usableBookLiquidity(runners, "back"),
        executable,
        executableStake: execution.executableStake,
        maxProfit: execution.maxProfit,
        maxLoss: execution.maxLoss,
        reason: executable ? "complete + fresh + sized" : execution.executableStake < MIN_EXECUTABLE_STAKE ? "below min executable stake" : base.reason
      });
    }

    if (layBookPct != null && layBookPct > 100.05) {
      const execution = layBookExecution(runners, layBookPct);
      const executable = executionStatus(execution, isFresh, marketComplete);
      hasSignal = true;
      output.push({
        id: `${match.marketId}:lay`,
        ...base,
        type: "lay_book",
        status: executable ? "EXECUTABLE_ARB" : "ANOMALY",
        edgePct: layBookPct - 100,
        roiPct: (1 - 100 / layBookPct) * 100,
        usableLiquidity: execution.executableStake || usableBookLiquidity(runners, "lay"),
        executable,
        executableStake: execution.executableStake,
        maxProfit: execution.maxProfit,
        maxLoss: execution.maxLoss,
        reason: executable ? "complete + fresh + sized" : execution.executableStake < MIN_EXECUTABLE_STAKE ? "below min executable stake" : base.reason
      });
    }

    for (const runner of runners) {
      const backOdds = Number(runner.back?.odds || 0);
      const layOdds = Number(runner.lay?.odds || 0);
      if (backOdds > 1 && layOdds > 1 && backOdds > layOdds) {
        const execution = crossedRunnerExecution(runner);
        const executable = isFresh && execution.executableStake >= MIN_EXECUTABLE_STAKE && execution.maxProfit > 0;
        hasSignal = true;
        output.push({
          id: `${match.marketId}:${runner.id}:crossed`,
          ...base,
          type: "crossed_runner",
          status: executable ? "EXECUTABLE_ARB" : "ANOMALY",
          edgePct: ((backOdds / layOdds) - 1) * 100,
          roiPct: ((backOdds / layOdds) - 1) * 100,
          usableLiquidity: execution.executableStake,
          executable,
          executableStake: execution.executableStake,
          maxProfit: execution.maxProfit,
          maxLoss: execution.maxLoss,
          reason: executable ? "crossed + fresh + sized" : execution.executableStake < MIN_EXECUTABLE_STAKE ? "below min executable stake" : base.reason,
          outcomes: runnerPriceText(runner)
        });
      }
    }

    if (!hasSignal && output.length < 120) {
      const backMiss = backBookPct == null ? Number.POSITIVE_INFINITY : Math.abs(100 - backBookPct);
      const layMiss = layBookPct == null ? Number.POSITIVE_INFINITY : Math.abs(100 - layBookPct);
      output.push({
        id: `${match.marketId}:watch`,
        ...base,
        type: "watch",
        status: "WATCH",
        edgePct: -Math.min(backMiss, layMiss),
        roiPct: 0,
        usableLiquidity: 0,
        executableStake: 0,
        maxProfit: 0,
        maxLoss: 0,
        reason: base.reason
      });
    }
  }

  return output.sort((a, b) => {
    const statusRank = { EXECUTABLE_ARB: 0, ANOMALY: 1, WATCH: 2 };
    if (a.status !== b.status) return statusRank[a.status] - statusRank[b.status];
    return b.edgePct - a.edgePct || b.liquidity - a.liquidity;
  });
}

function arbTypeLabel(type: ArbRow["type"]) {
  if (type === "back_book") return "Back book";
  if (type === "lay_book") return "Lay book";
  if (type === "crossed_runner") return "Crossed runner";
  return "Watch";
}

function arbStatusClass(status: ArbRow["status"]) {
  return status.toLowerCase().replace("_", "-");
}

export default function Arbs() {
  const [rows, setRows] = useState<ArbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [dateScope, setDateScope] = useState("all");
  const [locationScope, setLocationScope] = useState("all");
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [sourceMarkets, setSourceMarkets] = useState(0);

  async function loadArbs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sport: "football",
        exchanges: "betfair",
        segment: "upcoming4",
        limit: "300"
      });
      const rows = await fetchMarketSnapshotRows(`/api/markets/snapshot?${params.toString()}`, `/api/exchange-odds?${params.toString()}`);
      setSourceMarkets(rows.length);
      setRows(buildArbRows((rows as BackendPriceRow[]).filter((row) => !eventHasPassed(row.startAt))));
      setLastRefresh(new Date().toISOString());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Betfair arb scan failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArbs();
    const timer = window.setInterval(loadArbs, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredRows = useMemo(() => {
    const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
    const scopedRows = rows.filter((row) => footballScopeMatches(`${row.fixture} ${row.competition}`, null, row.startAt, dateScope, locationScope));
    if (!terms.length) return scopedRows;
    return scopedRows.filter((row) => {
      const haystack = normalizeFixtureText([
        row.fixture,
        row.competition,
        row.market,
        row.type,
        row.outcomes
      ].join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }, [query, rows, dateScope, locationScope]);

  const executableRows = filteredRows.filter((row) => row.status === "EXECUTABLE_ARB");
  const anomalyRows = filteredRows.filter((row) => row.status === "ANOMALY");
  const freshest = lastRefresh ? localEventTime(lastRefresh, { second: "2-digit" }) : "-";

  return (
    <>
      <TerminalTopbar active="arbs" onSearchChange={setQuery} searchPlaceholder="Filter arbs, fixture, market, runner..." />
      <main className="agtest-page arbs-page">
        <FootballScopeFilter
          dateScope={dateScope}
          locationScope={locationScope}
          onDateScopeChange={setDateScope}
          onLocationScopeChange={setLocationScope}
          meta={[
            `${executableRows.length} executable`,
            `${anomalyRows.length} anomalies`,
            `${filteredRows.length} / ${rows.length} watched`,
            `${sourceMarkets} BF markets`,
            loading ? "scanning" : `fresh ${freshest}`
          ]}
          ariaLabel="Football arbitrage filters"
        />

        <section className="arbs-summary">
          <article><span>Executable</span><strong>{executableRows.length}</strong></article>
          <article><span>Anomalies</span><strong>{anomalyRows.length}</strong></article>
          <article><span>Best ROI</span><strong>{executableRows[0] ? `${executableRows[0].roiPct.toFixed(2)}%` : "-"}</strong></article>
          <article><span>Markets watched</span><strong>{rows.length}</strong></article>
        </section>

        <section className="arbs-table-wrap">
          {error && <div className="agtest-error">{error}</div>}
          <table className="arbs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Fixture</th>
                <th>Market</th>
                <th>Signal</th>
                <th>Status</th>
                <th>Arb %</th>
                <th>ROI</th>
                <th>Back total</th>
                <th>Lay total</th>
                <th>expected_runners</th>
                <th>valid_runners</th>
                <th>missing_runners</th>
                <th>stale_ms</th>
                <th>executable_stake</th>
                <th>max_profit</th>
                <th>max_loss</th>
                <th>Both sides</th>
                <th>Fresh</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr className={row.status === "EXECUTABLE_ARB" ? "is-executable" : row.status === "ANOMALY" ? "is-anomaly" : ""} key={row.id}>
                  <td className="mono">{row.startAt ? localEventTime(row.startAt, { day: "2-digit", month: "short" }) : "-"}</td>
                  <td><strong>{row.fixture}</strong><span>{row.competition}</span></td>
                  <td>{row.market}</td>
                  <td><span className={`arb-type ${arbStatusClass(row.status)}`}>{arbTypeLabel(row.type)}</span></td>
                  <td><strong>{row.status}</strong><span>{row.reason}</span></td>
                  <td className={row.status === "EXECUTABLE_ARB" ? "mono positive" : "mono"}>{row.edgePct > 0 ? `+${row.edgePct.toFixed(2)}%` : `${row.edgePct.toFixed(2)}%`}</td>
                  <td className={row.status === "EXECUTABLE_ARB" ? "mono positive" : "mono"}>{row.roiPct ? `${row.roiPct.toFixed(2)}%` : "-"}</td>
                  <td className="mono">{row.bestBack}</td>
                  <td className="mono">{row.bestLay}</td>
                  <td className="mono">{row.expectedRunners ?? "-"}</td>
                  <td className="mono">{row.validRunners}</td>
                  <td className="mono">{row.missingRunners ?? "-"}</td>
                  <td className="mono">{row.staleMs == null ? "-" : Math.max(0, Math.round(row.staleMs))}</td>
                  <td className="mono">{row.executableStake ? formatExchangeMoney(row.executableStake, "GBP") : "-"}</td>
                  <td className={row.maxProfit > 0 ? "mono positive" : "mono"}>{row.maxProfit ? formatExchangeMoney(row.maxProfit, "GBP") : "-"}</td>
                  <td className="mono">{row.maxLoss ? formatExchangeMoney(row.maxLoss, "GBP") : "£0"}</td>
                  <td className="arbs-outcomes">{row.outcomes}</td>
                  <td className="mono">{arbFreshnessLabel(row.staleMs)}</td>
                </tr>
              ))}
              {!loading && filteredRows.length === 0 && (
                <tr><td className="empty" colSpan={18}>
                  {sourceMarkets > 0
                    ? "Betfair markets returned, but none passed the complete-runner, both-sides, fresh-liquidity arb checks."
                    : "No Betfair football markets matched the current arb scan."}
                </td></tr>
              )}
              {loading && filteredRows.length === 0 && (
                <tr><td className="empty" colSpan={18}>Scanning Betfair back and lay books.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
