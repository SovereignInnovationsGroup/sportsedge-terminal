import { useEffect, useMemo, useRef, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { eventHasPassed, localEventTime, normalizeFixtureText } from "../../core/format";
import { FootballScopeFilter } from "./FootballScopeFilter";
import { footballScopeMatches } from "./filters";
import { fetchMarketSnapshotRows, type BackendPriceRow } from "./marketData";
import {
  decimalOddsLabel,
  groupOddsApiRowsByEvent,
  isMoneylineOddsApiRow,
  oddsDiagnosticTime,
  type OddsApiDiagnosticResponse,
  type OddsApiDiagnosticRow
} from "./oddsApi";

type OddsOutcome = "home" | "draw" | "away";

type BiasMatrixRow = {
  id: string;
  startTime: number | null;
  kickoff: string;
  fixture: string;
  league: string;
  read: "aligned" | "split" | "sparse";
  sourceOdds: Record<string, Partial<Record<OddsOutcome, number>>>;
  consensus: Partial<Record<OddsOutcome, number>>;
  bias: string;
  note: string;
  isDemo?: boolean;
};

const BIAS_MATRIX_SOURCES = [
  { key: "matchbook", label: "Matchbook", short: "MB", kind: "exchange" },
  { key: "betfair", label: "Betfair", short: "BF", kind: "exchange" },
  { key: "smarkets", label: "Smarkets", short: "SM", kind: "exchange" },
  { key: "betdaq", label: "Betdaq", short: "BD", kind: "exchange" },
  { key: "unibet", label: "Unibet", short: "UNI", kind: "anchor" }
] as const;

const BIAS_MATRIX_OUTCOMES: OddsOutcome[] = ["home", "draw", "away"];

function biasRead(sourceOdds: Record<string, Partial<Record<OddsOutcome, number>>>) {
  const consensus: Partial<Record<OddsOutcome, number>> = {};
  BIAS_MATRIX_OUTCOMES.forEach((outcome) => {
    const prices = BIAS_MATRIX_SOURCES
      .map((source) => sourceOdds[source.key]?.[outcome])
      .filter((value): value is number => Number.isFinite(Number(value)));
    if (prices.length) consensus[outcome] = prices.reduce((sum, value) => sum + value, 0) / prices.length;
  });

  const sourceCount = BIAS_MATRIX_SOURCES.filter((source) => Object.keys(sourceOdds[source.key] || {}).length > 0).length;
  const outcomeSpreads = BIAS_MATRIX_OUTCOMES.map((outcome) => {
    const prices = BIAS_MATRIX_SOURCES
      .map((source) => sourceOdds[source.key]?.[outcome])
      .filter((value): value is number => Number.isFinite(Number(value)));
    if (prices.length < 2) return 0;
    return (Math.max(...prices) - Math.min(...prices)) / Math.max(...prices);
  });

  const maxSpread = Math.max(...outcomeSpreads, 0);
  const read: BiasMatrixRow["read"] = sourceCount < 3 ? "sparse" : maxSpread > 0.08 ? "split" : "aligned";
  const shortestOutcome = BIAS_MATRIX_OUTCOMES
    .filter((outcome) => Number.isFinite(Number(consensus[outcome])))
    .sort((a, b) => Number(consensus[a]) - Number(consensus[b]))[0];
  const bias = shortestOutcome === "home" ? "Home consensus" : shortestOutcome === "away" ? "Away consensus" : shortestOutcome === "draw" ? "Draw pressure" : "No read";
  const note = read === "aligned"
    ? "Sources broadly aligned"
    : read === "split"
      ? "Book/exchange spread worth watching"
      : "Limited source count";

  return { consensus, read, bias, note };
}

function oddsOutcomeFromRow(row: OddsApiDiagnosticRow): OddsOutcome | null {
  const market = String(row.market || "").toLowerCase();
  const selection = normalizeFixtureText(row.selection || "");
  if (market.includes("/draw") || selection === "draw" || selection.includes(" the draw")) return "draw";
  if (market.includes("/home")) return "home";
  if (market.includes("/away")) return "away";
  return null;
}

function buildBiasMatrixRows(rows: OddsApiDiagnosticRow[]): BiasMatrixRow[] {
  const moneylineRows = rows.filter((row) => isMoneylineOddsApiRow(row) && Number.isFinite(Number(row.odds)));
  const grouped = groupOddsApiRowsByEvent(moneylineRows);
  return [...grouped.entries()].map(([eventId, eventRows]) => {
    const first = eventRows[0];
    const sourceOdds: Record<string, Partial<Record<OddsOutcome, number>>> = {};
    eventRows.forEach((row) => {
      const source = String(row.bookmaker || "").toLowerCase();
      const outcome = oddsOutcomeFromRow(row);
      const odds = Number(row.odds);
      if (!BIAS_MATRIX_SOURCES.some((item) => item.key === source) || !outcome || !Number.isFinite(odds)) return;
      sourceOdds[source] = sourceOdds[source] || {};
      const current = sourceOdds[source][outcome];
      if (!current || odds > current) sourceOdds[source][outcome] = odds;
    });

    const { consensus, read, bias, note } = biasRead(sourceOdds);

    return {
      id: eventId,
      startTime: first?.startTime || null,
      kickoff: first?.startTime ? oddsDiagnosticTime(first.startTime) : "-",
      fixture: first?.fixture || eventId,
      league: first?.league || "Football",
      read,
      sourceOdds,
      consensus,
      bias,
      note
    };
  }).filter((row) => BIAS_MATRIX_SOURCES.some((source) => Object.keys(row.sourceOdds[source.key] || {}).length > 0))
    .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
}

function outcomeFromRunner(row: BackendPriceRow, runnerName: string): OddsOutcome | null {
  const runner = normalizeFixtureText(runnerName);
  if (runner === "draw" || runner.includes(" the draw")) return "draw";
  const [homeRaw, awayRaw] = String(row.name || "").split(/\s+(?:v|vs)\s+/i);
  const home = normalizeFixtureText(homeRaw || "");
  const away = normalizeFixtureText(awayRaw || "");
  if (home && (runner === home || runner.includes(home) || home.includes(runner))) return "home";
  if (away && (runner === away || runner.includes(away) || away.includes(runner))) return "away";
  return null;
}

function buildBiasMatrixRowsFromMarkets(rows: BackendPriceRow[]): BiasMatrixRow[] {
  return rows.map((row) => {
    const sourceOdds: Record<string, Partial<Record<OddsOutcome, number>>> = {};
    BIAS_MATRIX_SOURCES.forEach((source) => {
      const match = row.matches?.[source.key];
      if (!match) return;
      (match.runners || []).forEach((runner) => {
        const outcome = outcomeFromRunner(row, runner.name);
        const odds = Number(runner.back?.odds || runner.lay?.odds || 0);
        if (!outcome || !Number.isFinite(odds) || odds <= 1) return;
        sourceOdds[source.key] = sourceOdds[source.key] || {};
        sourceOdds[source.key][outcome] = odds;
      });
    });
    const { consensus, read, bias, note } = biasRead(sourceOdds);
    const startAt = row.startAt || null;
    return {
      id: row.id,
      startTime: startAt ? Math.floor(new Date(startAt).getTime() / 1000) : null,
      kickoff: startAt ? localEventTime(startAt, { day: "2-digit", month: "short" }) : "-",
      fixture: row.name,
      league: row.competitionName || "Football",
      read,
      sourceOdds,
      consensus,
      bias,
      note: row.isDemo ? "Hybrid demo market snapshot" : note,
      isDemo: Boolean(row.isDemo || Object.values(row.matches || {}).some((match) => match?.isDemo))
    };
  }).filter((row) => BIAS_MATRIX_SOURCES.some((source) => Object.keys(row.sourceOdds[source.key] || {}).length > 0))
    .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
}

function biasRowKey(row: BiasMatrixRow) {
  const date = row.startTime ? new Date(row.startTime * 1000).toISOString().slice(0, 10) : "";
  return normalizeFixtureText(`${date} ${row.fixture}`);
}

function mergeBiasRows(primaryRows: BiasMatrixRow[], supportRows: BiasMatrixRow[]) {
  const merged = new Map<string, BiasMatrixRow>();
  primaryRows.forEach((row) => merged.set(biasRowKey(row) || row.id, {
    ...row,
    sourceOdds: { ...row.sourceOdds },
    consensus: { ...row.consensus }
  }));
  supportRows.forEach((row) => {
    const key = biasRowKey(row) || row.id;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, row);
      return;
    }
    BIAS_MATRIX_SOURCES.forEach((source) => {
      existing.sourceOdds[source.key] = {
        ...(row.sourceOdds[source.key] || {}),
        ...(existing.sourceOdds[source.key] || {})
      };
    });
    const { consensus, read, bias, note } = biasRead(existing.sourceOdds);
    existing.consensus = consensus;
    existing.read = read;
    existing.bias = bias;
    existing.isDemo = Boolean(existing.isDemo || row.isDemo);
    existing.note = existing.isDemo ? "Hybrid demo market snapshot" : note;
  });
  return Array.from(merged.values()).sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
}

function oddsPillClass(value: number | undefined, row: BiasMatrixRow, outcome: OddsOutcome) {
  if (!Number.isFinite(Number(value))) return "miss";
  const prices = BIAS_MATRIX_SOURCES
    .map((source) => row.sourceOdds[source.key]?.[outcome])
    .filter((price): price is number => Number.isFinite(Number(price)));
  if (prices.length < 2) return "";
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  if (Math.abs(Number(value) - max) < 0.0001) return "best";
  if (Math.abs(Number(value) - min) < 0.0001) return "short";
  return "";
}

function biasMatrixOddsKey(eventId: string, source: string, outcome: OddsOutcome) {
  return `${eventId}:${source}:${outcome}`;
}

function flattenBiasMatrixOdds(rows: BiasMatrixRow[]) {
  const values = new Map<string, number>();
  rows.forEach((row) => {
    BIAS_MATRIX_SOURCES.forEach((source) => {
      BIAS_MATRIX_OUTCOMES.forEach((outcome) => {
        const value = row.sourceOdds[source.key]?.[outcome];
        if (Number.isFinite(Number(value))) values.set(biasMatrixOddsKey(row.id, source.key, outcome), Number(value));
      });
    });
  });
  return values;
}

function OddsPill({ label, value, tone, changed }: { label: string; value?: number; tone: string; changed?: boolean }) {
  const classes = ["agtest2-odd", tone, changed ? "changed" : ""].filter(Boolean).join(" ");
  return <span className={classes}><b>{label}</b>{Number.isFinite(Number(value)) ? decimalOddsLabel(value) : "-"}</span>;
}

function OddsSourceCell({
  row,
  source,
  changedKeys
}: {
  row: BiasMatrixRow;
  source: typeof BIAS_MATRIX_SOURCES[number];
  changedKeys: Set<string>;
}) {
  const odds = row.sourceOdds[source.key] || {};
  return (
    <div className="agtest2-odds-set" title={source.label}>
      <OddsPill label="H" value={odds.home} tone={oddsPillClass(odds.home, row, "home")} changed={changedKeys.has(biasMatrixOddsKey(row.id, source.key, "home"))} />
      <OddsPill label="D" value={odds.draw} tone={oddsPillClass(odds.draw, row, "draw")} changed={changedKeys.has(biasMatrixOddsKey(row.id, source.key, "draw"))} />
      <OddsPill label="A" value={odds.away} tone={oddsPillClass(odds.away, row, "away")} changed={changedKeys.has(biasMatrixOddsKey(row.id, source.key, "away"))} />
    </div>
  );
}

function ConsensusCell({ row }: { row: BiasMatrixRow }) {
  return (
    <div className="agtest2-odds-set agtest2-consensus-set" title="Average consensus across visible source prices">
      <OddsPill label="H" value={row.consensus.home} tone={row.bias === "Home consensus" ? "consensus" : ""} />
      <OddsPill label="D" value={row.consensus.draw} tone={row.bias === "Draw pressure" ? "consensus" : ""} />
      <OddsPill label="A" value={row.consensus.away} tone={row.bias === "Away consensus" ? "consensus" : ""} />
    </div>
  );
}

export default function BiasMatrix() {
  const [data, setData] = useState<OddsApiDiagnosticResponse | null>(null);
  const [fallbackRows, setFallbackRows] = useState<BiasMatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [dateScope, setDateScope] = useState("all");
  const [locationScope, setLocationScope] = useState("all");
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const previousOddsRef = useRef<Map<string, number> | null>(null);
  const clearChangedTimerRef = useRef<number | null>(null);

  async function loadRows() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sport: "soccer",
        bookmakers: BIAS_MATRIX_SOURCES.map((source) => source.key).join(","),
        eventLimit: "8",
        scanPages: "1",
        pageLimit: "80",
        oddsLimit: "200"
      });
      const marketParams = new URLSearchParams({
        sport: "football",
        exchanges: "betfair,matchbook,smarkets,betdaq,sx",
        segment: "upcoming4",
        limit: "120",
        demo: "hybrid"
      });
      const [response, marketRows] = await Promise.all([
        fetch(`/api/odds-api/diagnostics?${params.toString()}`, { cache: "no-store" }),
        fetchMarketSnapshotRows(`/api/markets/snapshot?${marketParams.toString()}`, `/api/exchange-odds?${marketParams.toString()}`)
      ]);
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.rows)) throw new Error(payload.detail || "odds alignment failed");
      setData(payload as OddsApiDiagnosticResponse);
      setFallbackRows(buildBiasMatrixRowsFromMarkets(marketRows as BackendPriceRow[]));
      setError("");
    } catch (err) {
      try {
        const params = new URLSearchParams({
          sport: "football",
          exchanges: "betfair,matchbook,smarkets,betdaq,sx",
          segment: "upcoming4",
          limit: "120",
          demo: "hybrid"
        });
        const rows = await fetchMarketSnapshotRows(`/api/markets/snapshot?${params.toString()}`, `/api/exchange-odds?${params.toString()}`);
        setFallbackRows(buildBiasMatrixRowsFromMarkets(rows as BackendPriceRow[]));
        setData(null);
        setError("");
      } catch {
        setFallbackRows([]);
        setData(null);
        setError(err instanceof Error ? err.message : "odds alignment failed");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
    const timer = window.setInterval(loadRows, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const allRows = useMemo(() => {
    const oddsRows = buildBiasMatrixRows(data?.rows || []);
    const sourceRows = mergeBiasRows(oddsRows, fallbackRows);
    return sourceRows.filter((row) => !eventHasPassed(row.startTime ? new Date(row.startTime * 1000).toISOString() : null));
  }, [data, fallbackRows]);

  useEffect(() => {
    const currentOdds = flattenBiasMatrixOdds(allRows);
    const previousOdds = previousOddsRef.current;
    if (previousOdds) {
      const nextChanged = new Set<string>();
      currentOdds.forEach((value, key) => {
        const previous = previousOdds.get(key);
        if (previous !== undefined && Math.abs(previous - value) > 0.0001) nextChanged.add(key);
      });
      if (nextChanged.size) {
        setChangedKeys(nextChanged);
        if (clearChangedTimerRef.current) window.clearTimeout(clearChangedTimerRef.current);
        clearChangedTimerRef.current = window.setTimeout(() => setChangedKeys(new Set()), 2200);
      }
    }
    previousOddsRef.current = currentOdds;
  }, [allRows]);

  useEffect(() => () => {
    if (clearChangedTimerRef.current) window.clearTimeout(clearChangedTimerRef.current);
  }, []);

  const rows = useMemo(() => {
    const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
    const scopedRows = allRows.filter((row) => footballScopeMatches(
      `${row.fixture} ${row.league}`,
      null,
      row.startTime ? new Date(row.startTime * 1000).toISOString() : null,
      dateScope,
      locationScope
    ));
    if (!terms.length) return scopedRows;
    return scopedRows.filter((row) => {
      const haystack = normalizeFixtureText([row.fixture, row.league, row.read, row.bias, row.note].join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }, [allRows, query, dateScope, locationScope]);

  const aligned = allRows.filter((row) => row.read === "aligned").length;
  const split = allRows.filter((row) => row.read === "split").length;
  const sparse = allRows.filter((row) => row.read === "sparse").length;
  const bookmakerCounts = data?.counts.byBookmaker || {};
  const hasDemoRows = allRows.some((row) => row.isDemo);

  return (
    <>
      <TerminalTopbar active="bias-matrix" onSearchChange={setQuery} searchPlaceholder="Filter alignment rows, fixture, source, bias..." demoMode={hasDemoRows} />
      <main className="agtest2-page">
        <FootballScopeFilter
          dateScope={dateScope}
          locationScope={locationScope}
          onDateScopeChange={setDateScope}
          onLocationScopeChange={setLocationScope}
          meta={[
            `${rows.length}${query.trim() || dateScope !== "all" || locationScope !== "all" ? ` / ${allRows.length}` : ""} fixtures`,
            "MB / BF / SM / BD / UNI",
            loading ? "loading" : hasDemoRows ? "hybrid demo bias" : fallbackRows.length ? "market snapshot support" : "odds-only bias"
          ]}
          ariaLabel="Bias Matrix football filters"
        />
        <section className="agtest2-summary">
          <article><span>Fixtures</span><strong>{allRows.length}</strong></article>
          <article><span>Aligned</span><strong>{aligned}</strong></article>
          <article><span>Split</span><strong>{split}</strong></article>
          <article><span>Sparse</span><strong>{sparse}</strong></article>
          <article><span>Anchor</span><strong>Unibet</strong></article>
          <article><span>B365</span><strong>0</strong></article>
        </section>
        {error && !fallbackRows.length && <div className="agtest-error">{error}</div>}
        <section className="agtest2-table-wrap">
          <table className="agtest2-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Fixture</th>
                <th>Read</th>
                {BIAS_MATRIX_SOURCES.map((source) => <th key={source.key}>{source.label}<small>{bookmakerCounts[source.key] || 0}</small></th>)}
                <th>Consensus</th>
                <th>Bias</th>
                <th>Human note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="mono agtest2-time">{row.kickoff}</td>
                  <td className="agtest2-fixture"><strong>{row.fixture}</strong><span>{row.league}</span></td>
                  <td><span className={`agtest2-status ${row.read}`}>{row.read}</span></td>
                  {BIAS_MATRIX_SOURCES.map((source) => <td key={`${row.id}-${source.key}`}><OddsSourceCell row={row} source={source} changedKeys={changedKeys} /></td>)}
                  <td className="agtest2-consensus"><ConsensusCell row={row} /></td>
                  <td className="mono agtest2-bias">{row.bias}</td>
                  <td className="agtest2-note">{row.note}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && <tr><td className="empty" colSpan={11}>No odds alignment rows matched the current filter.</td></tr>}
              {loading && rows.length === 0 && <tr><td className="empty" colSpan={11}>Loading odds alignment matrix.</td></tr>}
            </tbody>
          </table>
        </section>
        <footer className="agtest2-legend">
          <span><b>H</b> home</span>
          <span><b>D</b> draw</span>
          <span><b>A</b> away</span>
          <span>green = best price</span>
          <span>red = shortest</span>
          <span>grey = missing source</span>
        </footer>
      </main>
    </>
  );
}
