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
  type: "back_book" | "lay_book" | "crossed_runner" | "cross_venue_book" | "cross_venue_runner" | "watch";
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
  venuePair: string;
  sourceCoverage: string;
};

type ArbHistorySummary = {
  active: number;
  executable: number;
  blocked: number;
  vanished: number;
  seenToday: number;
  bestEdgePct: number;
};

type ArbHistoryEvent = {
  id: string;
  fixture: string;
  status: "EXECUTABLE" | "BLOCKED";
  edgePct: number;
  venuePair: string;
  reason: string;
  firstSeenAt: string;
  lastSeenAt: string;
  durationMs: number;
};

type ArbHistory = {
  summary: ArbHistorySummary;
  events: ArbHistoryEvent[];
};

const ARB_FRESH_MS = 2000;
const MIN_EXECUTABLE_STAKE = 10;
const ARB_EXCHANGES = [
  { key: "betfair", label: "BF", currency: "GBP" },
  { key: "matchbook", label: "MB", currency: "GBP" },
  { key: "monaco", label: "BetDEX", currency: "USD" },
  { key: "betdex", label: "BetDEX", currency: "USD", aliasOf: "monaco" }
] as const;

const ACTIVE_ARB_EXCHANGES = ARB_EXCHANGES.filter((exchange) => !("aliasOf" in exchange));

function runnerPriceText(runner: BackendRunner) {
  const back = runner.back ? `B ${runner.back.odds.toFixed(2)} ${formatExchangeMoney(runner.back.amount, "GBP")}` : "B -";
  const lay = runner.lay ? `L ${runner.lay.odds.toFixed(2)} ${formatExchangeMoney(runner.lay.amount, "GBP")}` : "L -";
  return `${runner.name}: ${back} / ${lay}`;
}

function exchangeLabel(key: string) {
  return ARB_EXCHANGES.find((exchange) => exchange.key === key)?.label || key;
}

function exchangeCurrency(key: string) {
  return ARB_EXCHANGES.find((exchange) => exchange.key === key)?.currency || "GBP";
}

function matchForExchange(row: BackendPriceRow, key: string) {
  if (key === "monaco") return row.matches?.monaco || row.matches?.betdex;
  return row.matches?.[key];
}

function normalizeRunnerKey(name: string) {
  const normalized = normalizeFixtureText(name);
  if (normalized === "draw" || normalized.includes(" the draw")) return "draw";
  return normalized.replace(/\b(fc|cf|afc|sc)\b/g, "").replace(/\s+/g, " ").trim();
}

function sameCurrency(keys: string[]) {
  const currencies = new Set(keys.map(exchangeCurrency));
  return currencies.size <= 1;
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

type CrossVenueQuote = {
  exchange: string;
  runner: BackendRunner;
  match: BackendExchangeMatch;
};

type CrossVenueMatch = {
  exchange: string;
  match: BackendExchangeMatch;
};

function buildCrossVenueRows(row: BackendPriceRow) {
  const matches = ACTIVE_ARB_EXCHANGES
    .map((exchange) => ({ exchange: exchange.key, match: matchForExchange(row, exchange.key) }))
    .filter((item): item is CrossVenueMatch => Boolean(item.match?.runners?.length));
  if (matches.length < 2) return [];

  const scans: CrossVenueMatch[][] = [];
  for (let left = 0; left < matches.length; left += 1) {
    for (let right = left + 1; right < matches.length; right += 1) {
      scans.push([matches[left], matches[right]]);
    }
  }
  if (matches.length > 2) scans.push(matches);

  return scans.flatMap((scan) => buildCrossVenueRowsForMatches(row, scan));
}

function buildCrossVenueRowsForMatches(row: BackendPriceRow, matches: CrossVenueMatch[]) {
  const output: ArbRow[] = [];
  const runnerMap = new Map<string, CrossVenueQuote[]>();
  const sourceCoverage = matches.map((item) => exchangeLabel(item.exchange)).join(" / ");
  const scopeKey = matches.map((item) => item.exchange).join("-");
  const firstMatch = matches[0].match;
  const startAt = firstMatch.startAt || row.startAt;
  const observedTimes = matches
    .map((item) => item.match.observedAt)
    .filter(Boolean)
    .map((value) => new Date(String(value).includes("T") ? String(value) : `${String(value).replace(" ", "T")}Z`).getTime())
    .filter((value) => Number.isFinite(value));
  const staleMs = observedTimes.length ? Date.now() - Math.max(...observedTimes) : null;
  const isFresh = staleMs != null && staleMs <= ARB_FRESH_MS;

  matches.forEach(({ exchange, match }) => {
    (match.runners || []).forEach((runner) => {
      const key = normalizeRunnerKey(runner.name);
      if (!key) return;
      const bucket = runnerMap.get(key) || [];
      bucket.push({ exchange, runner, match });
      runnerMap.set(key, bucket);
    });
  });

  const bestBacks: Array<{ outcome: string; exchange: string; runner: BackendRunner; odds: number; amount: number }> = [];
  const bestLays: Array<{ outcome: string; exchange: string; runner: BackendRunner; odds: number; amount: number }> = [];

  runnerMap.forEach((quotes, outcome) => {
    const backs = quotes
      .map((quote) => ({ outcome, exchange: quote.exchange, runner: quote.runner, odds: Number(quote.runner.back?.odds || 0), amount: Number(quote.runner.back?.amount || 0) }))
      .filter((quote) => quote.odds > 1 && quote.amount > 0)
      .sort((a, b) => b.odds - a.odds);
    const lays = quotes
      .map((quote) => ({ outcome, exchange: quote.exchange, runner: quote.runner, odds: Number(quote.runner.lay?.odds || 0), amount: Number(quote.runner.lay?.amount || 0) }))
      .filter((quote) => quote.odds > 1 && quote.amount > 0)
      .sort((a, b) => a.odds - b.odds);
    if (backs[0]) bestBacks.push(backs[0]);
    if (lays[0]) bestLays.push(lays[0]);

    if (backs[0] && lays[0] && backs[0].exchange !== lays[0].exchange && backs[0].odds > lays[0].odds) {
      const execution = crossedRunnerExecution({
        ...backs[0].runner,
        back: { odds: backs[0].odds, amount: backs[0].amount },
        lay: { odds: lays[0].odds, amount: lays[0].amount }
      });
      const currenciesMatch = sameCurrency([backs[0].exchange, lays[0].exchange]);
      const executable = currenciesMatch && isFresh && execution.executableStake >= MIN_EXECUTABLE_STAKE && execution.maxProfit > 0;
      output.push({
        id: `${row.id}:${scopeKey}:${outcome}:${backs[0].exchange}-${lays[0].exchange}:cross`,
        fixture: firstMatch.name || row.name,
        competition: firstMatch.competitionName || row.competitionName || "",
        market: firstMatch.marketName || row.marketName || "Market",
        startAt,
        observedAt: firstMatch.observedAt,
        type: "cross_venue_runner",
        status: executable ? "EXECUTABLE_ARB" : "ANOMALY",
        edgePct: ((backs[0].odds / lays[0].odds) - 1) * 100,
        roiPct: ((backs[0].odds / lays[0].odds) - 1) * 100,
        backBookPct: null,
        layBookPct: null,
        usableLiquidity: execution.executableStake,
        validRunners: runnerMap.size,
        expectedRunners: null,
        missingRunners: null,
        marketComplete: true,
        staleMs,
        executable,
        executableStake: execution.executableStake,
        maxProfit: execution.maxProfit,
        maxLoss: execution.maxLoss,
        reason: executable ? "cross venue + fresh + sized" : !currenciesMatch ? "cross-currency/fee check required" : !isFresh ? `stale ${arbFreshnessLabel(staleMs)}` : "below min executable stake",
        bestBack: `${exchangeLabel(backs[0].exchange)} ${backs[0].odds.toFixed(2)}`,
        bestLay: `${exchangeLabel(lays[0].exchange)} ${lays[0].odds.toFixed(2)}`,
        outcomes: `${backs[0].runner.name}: back ${exchangeLabel(backs[0].exchange)} ${backs[0].odds.toFixed(2)} / lay ${exchangeLabel(lays[0].exchange)} ${lays[0].odds.toFixed(2)}`,
        liquidity: backs[0].amount + lays[0].amount,
        venuePair: `${exchangeLabel(backs[0].exchange)} -> ${exchangeLabel(lays[0].exchange)}`,
        sourceCoverage
      });
    }
  });

  if (bestBacks.length >= 2) {
    const bookPct = bestBacks.reduce((sum, quote) => sum + 1 / quote.odds, 0) * 100;
    if (bookPct < 99.95) {
      const exchanges = bestBacks.map((quote) => quote.exchange);
      const currenciesMatch = sameCurrency(exchanges);
      const minReturn = Math.min(...bestBacks.map((quote) => quote.amount * quote.odds));
      const executableStake = Number.isFinite(minReturn) && minReturn > 0 ? minReturn * (bookPct / 100) : 0;
      const maxProfit = Number.isFinite(minReturn) && minReturn > 0 ? minReturn - executableStake : 0;
      const executable = currenciesMatch && isFresh && executableStake >= MIN_EXECUTABLE_STAKE && maxProfit > 0;
      output.push({
        id: `${row.id}:${scopeKey}:cross-back-book`,
        fixture: firstMatch.name || row.name,
        competition: firstMatch.competitionName || row.competitionName || "",
        market: firstMatch.marketName || row.marketName || "Market",
        startAt,
        observedAt: firstMatch.observedAt,
        type: "cross_venue_book",
        status: executable ? "EXECUTABLE_ARB" : "ANOMALY",
        edgePct: 100 - bookPct,
        roiPct: (100 / bookPct - 1) * 100,
        backBookPct: bookPct,
        layBookPct: null,
        usableLiquidity: executableStake,
        validRunners: bestBacks.length,
        expectedRunners: null,
        missingRunners: null,
        marketComplete: true,
        staleMs,
        executable,
        executableStake,
        maxProfit,
        maxLoss: 0,
        reason: executable ? "best back book across venues" : !currenciesMatch ? "cross-currency/fee check required" : !isFresh ? `stale ${arbFreshnessLabel(staleMs)}` : "below min executable stake",
        bestBack: `${bookPct.toFixed(2)}%`,
        bestLay: "-",
        outcomes: bestBacks.map((quote) => `${quote.runner.name}: ${exchangeLabel(quote.exchange)} ${quote.odds.toFixed(2)}`).join(" | "),
        liquidity: bestBacks.reduce((sum, quote) => sum + quote.amount, 0),
        venuePair: Array.from(new Set(bestBacks.map((quote) => exchangeLabel(quote.exchange)))).join(" / "),
        sourceCoverage
      });
    }

    if (!output.length) {
      const exchanges = Array.from(new Set(bestBacks.map((quote) => quote.exchange)));
      const minReturn = Math.min(...bestBacks.map((quote) => quote.amount * quote.odds));
      const executableStake = Number.isFinite(minReturn) && minReturn > 0 ? minReturn * (bookPct / 100) : 0;
      output.push({
        id: `${row.id}:${scopeKey}:cross-venue-watch`,
        fixture: firstMatch.name || row.name,
        competition: firstMatch.competitionName || row.competitionName || "",
        market: firstMatch.marketName || row.marketName || "Market",
        startAt,
        observedAt: firstMatch.observedAt,
        type: "watch",
        status: "WATCH",
        edgePct: 100 - bookPct,
        roiPct: 0,
        backBookPct: bookPct,
        layBookPct: null,
        usableLiquidity: executableStake,
        validRunners: bestBacks.length,
        expectedRunners: null,
        missingRunners: null,
        marketComplete: true,
        staleMs,
        executable: false,
        executableStake: 0,
        maxProfit: 0,
        maxLoss: 0,
        reason: !isFresh ? `stale ${arbFreshnessLabel(staleMs)}` : "cross-venue checked, no arb",
        bestBack: `${bookPct.toFixed(2)}%`,
        bestLay: "-",
        outcomes: bestBacks.map((quote) => `${quote.runner.name}: ${exchangeLabel(quote.exchange)} ${quote.odds.toFixed(2)}`).join(" | "),
        liquidity: bestBacks.reduce((sum, quote) => sum + quote.amount, 0),
        venuePair: exchanges.map(exchangeLabel).join(" / "),
        sourceCoverage
      });
    }
  }

  return output;
}

function buildArbRows(rows: BackendPriceRow[]) {
  const output: ArbRow[] = [];

  for (const row of rows) {
    const crossVenueRows = buildCrossVenueRows(row);
    output.push(...crossVenueRows);
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
      liquidity,
      venuePair: "BF internal",
      sourceCoverage: "BF"
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
  if (type === "cross_venue_book") return "Venue book";
  if (type === "cross_venue_runner") return "Venue runner";
  return "No arb";
}

function arbStatusClass(status: ArbRow["status"]) {
  return status.toLowerCase().replace("_", "-");
}

function arbRiskClass(row: ArbRow) {
  const reason = row.reason.toLowerCase();
  if (row.status === "EXECUTABLE_ARB") return "is-executable";
  if (reason.includes("cross-currency") || reason.includes("stale")) return "is-blocked";
  if (row.status === "ANOMALY") return "is-anomaly";
  return "is-watch";
}

function arbStatusTone(row: ArbRow) {
  const risk = arbRiskClass(row);
  if (risk === "is-executable") return "executable";
  if (risk === "is-blocked") return "blocked";
  if (risk === "is-anomaly") return "anomaly";
  return "watch";
}

function arbDisplayStatus(row: ArbRow) {
  const risk = arbRiskClass(row);
  if (risk === "is-blocked") return "NO TRADE";
  if (row.status === "WATCH") return "NO ARB";
  return row.status;
}

export default function Arbs() {
  const [rows, setRows] = useState<ArbRow[]>([]);
  const [history, setHistory] = useState<ArbHistory | null>(null);
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
        exchanges: "betfair,matchbook,monaco,betdex",
        segment: "upcoming4",
        limit: "300"
      });
      const rows = await fetchMarketSnapshotRows(`/api/markets/snapshot?${params.toString()}`, `/api/exchange-odds?${params.toString()}`);
      setSourceMarkets(rows.length);
      setRows(buildArbRows((rows as BackendPriceRow[]).filter((row) => !eventHasPassed(row.startAt))));
      setLastRefresh(new Date().toISOString());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Private arb scan failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      const response = await fetch("/api/arbs/history?sport=football&limit=80&sinceMs=86400000", { headers: { accept: "application/json" } });
      if (!response.ok) return;
      const payload = await response.json();
      setHistory({
        summary: payload.summary || { active: 0, executable: 0, blocked: 0, vanished: 0, seenToday: 0, bestEdgePct: 0 },
        events: Array.isArray(payload.events) ? payload.events : []
      });
    } catch {
      setHistory(null);
    }
  }

  useEffect(() => {
    loadArbs();
    loadHistory();
    const scanTimer = window.setInterval(loadArbs, 15000);
    const historyTimer = window.setInterval(loadHistory, 30000);
    return () => {
      window.clearInterval(scanTimer);
      window.clearInterval(historyTimer);
    };
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
        row.venuePair,
        row.sourceCoverage,
        row.outcomes
      ].join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }, [query, rows, dateScope, locationScope]);

  const executableRows = filteredRows.filter((row) => row.status === "EXECUTABLE_ARB");
  const anomalyRows = filteredRows.filter((row) => row.status === "ANOMALY");
  const blockedRows = filteredRows.filter((row) => arbRiskClass(row) === "is-blocked");
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
            `${sourceMarkets} private markets`,
            "BF / MB / BetDEX",
            loading ? "scanning" : `fresh ${freshest}`
          ]}
          ariaLabel="Football arbitrage filters"
        />

        <section className="arbs-summary">
          <article className="arb-summary-executable"><span>Executable</span><strong>{executableRows.length}</strong></article>
          <article className="arb-summary-anomaly"><span>Anomalies</span><strong>{anomalyRows.length}</strong></article>
          <article className="arb-summary-blocked"><span>Blocked</span><strong>{blockedRows.length}</strong></article>
          <article><span>Markets watched</span><strong>{rows.length}</strong></article>
        </section>

        <section className="arbs-monitor-memory" aria-label="Arbitrage monitor memory">
          <article>
            <span>Monitor live</span>
            <strong>{history ? history.summary.active : "-"}</strong>
          </article>
          <article>
            <span>Seen 24h</span>
            <strong>{history ? history.summary.seenToday : "-"}</strong>
          </article>
          <article>
            <span>Executable seen</span>
            <strong>{history ? history.summary.executable : "-"}</strong>
          </article>
          <article>
            <span>Recently vanished</span>
            <strong>{history ? history.summary.vanished : "-"}</strong>
          </article>
          <article className="wide">
            <span>Latest monitor event</span>
            <strong>{history?.events[0] ? `${history.events[0].venuePair} ${history.events[0].edgePct > 0 ? "+" : ""}${history.events[0].edgePct.toFixed(2)}%` : "Waiting for monitor"}</strong>
            <em>{history?.events[0] ? `${history.events[0].fixture} / ${history.events[0].reason}` : "Server-side arb monitor records events even when this screen is closed."}</em>
          </article>
        </section>

        <section className="arbs-colour-key" aria-label="Arbitrage colour key">
          <span className="exec">Green: live executable candidate</span>
          <span className="warn">Amber: theoretical anomaly / review</span>
          <span className="blocked">Red: blocked by stale data, fees or currency</span>
          <span className="watch">Blue: watched market, no arb</span>
        </section>

        <section className={executableRows.length ? "arbs-state-banner live" : "arbs-state-banner flat"}>
          <strong>{executableRows.length ? `${executableRows.length} executable candidate${executableRows.length === 1 ? "" : "s"}` : "No executable arbs right now"}</strong>
          <span>
            {executableRows.length
              ? "Green rows passed the current same-currency, freshness and minimum-size checks. Recheck price before ticket submit."
              : "Negative arb % means no risk-free cross. Red rows are no-trade diagnostics, usually stale, same-venue only, cross-currency, fee-sensitive or too thin."}
          </span>
        </section>

        <section className="arbs-table-wrap">
          {error && <div className="agtest-error">{error}</div>}
          <table className="arbs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Fixture</th>
                <th>Market</th>
                <th>Venues</th>
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
                <tr className={arbRiskClass(row)} key={row.id}>
                  <td className="mono">{row.startAt ? localEventTime(row.startAt, { day: "2-digit", month: "short" }) : "-"}</td>
                  <td><strong>{row.fixture}</strong><span>{row.competition}</span></td>
                  <td>{row.market}</td>
                  <td><strong>{row.venuePair}</strong><span>{row.sourceCoverage}</span></td>
                  <td><span className={`arb-type ${arbStatusClass(row.status)} ${arbRiskClass(row).replace("is-", "")} ${row.type}`}>{arbTypeLabel(row.type)}</span></td>
                  <td className={`arb-status-cell ${arbStatusTone(row)}`}><strong>{arbDisplayStatus(row)}</strong><span>{row.reason}</span></td>
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
                <tr><td className="empty" colSpan={19}>
                  {sourceMarkets > 0
                    ? "Private markets returned, but none passed the cross-venue or complete-runner arb checks."
                    : "No private football markets matched the BF / Matchbook / BetDEX arb scan."}
                </td></tr>
              )}
              {loading && filteredRows.length === 0 && (
                <tr><td className="empty" colSpan={19}>Scanning BF, Matchbook and BetDEX books.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
