import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { eventHasPassed, formatExchangeMoney, localEventTime, normalizeFixtureText } from "../../core/format";
import { FootballScopeFilter } from "./FootballScopeFilter";
import { footballScopeBreadcrumb, footballScopeMatches } from "./filters";
import {
  cachedFootballLiquidityRows,
  fetchMarketSnapshotRows,
  isPrimaryTradingMarket,
  mergeDisplayPriceRows,
  mergeLivePriceRows,
  mergeMarketStateRows,
  sportsEdgeWsUrl,
  storeFootballLiquidity,
  type BackendExchangeMatch,
  type BackendPriceRow,
  type BackendRunner
} from "./marketData";

ModuleRegistry.registerModules([AllCommunityModule]);

const COMPACT_EXCHANGES = [
  { key: "betfair", label: "BF", name: "Betfair", currency: "GBP" },
  { key: "matchbook", label: "MB", name: "Matchbook", currency: "GBP" },
  { key: "monaco", label: "BX", name: "BetDEX", currency: "USD" },
  { key: "smarkets", label: "SM", name: "Smarkets", currency: "GBP" },
  { key: "betdaq", label: "BD", name: "Betdaq", currency: "GBP" },
  { key: "sx", label: "SX", name: "SX", currency: "USD" }
] as const;

type CompactExchangeKey = typeof COMPACT_EXCHANGES[number]["key"];

type CompactLiquidityRow = {
  id: string;
  startAt: string | null;
  kickoff: string;
  match: string;
  market: string;
  competition: string;
  country: string | null;
  coverage: Array<{ label: string; available: boolean }>;
  quotes: Partial<Record<CompactExchangeKey, { price: string; liquidity: string; empty: boolean; lines: string[] }>>;
  best: { label: string; price: string } | null;
  total: string;
  fresh: string;
  raw: BackendPriceRow;
};

function displayStartTime(row: BackendPriceRow) {
  if (!row.startAt) return "-";
  return localEventTime(row.startAt, { day: "2-digit", month: "short" });
}

function displayEventName(name: string) {
  return String(name || "").replace(/\s+-\s+(?:More Markets|Exact Score|Player Props).*$/i, "").trim();
}

function matchLiquidity(match?: BackendExchangeMatch) {
  return (match?.runners || []).reduce((sum, runner) => sum + Number(runner.back?.amount || 0) + Number(runner.lay?.amount || 0), 0);
}

function formatFresh(row?: BackendPriceRow) {
  const latest = Object.values(row?.matches || {})
    .map((match) => match?.observedAt ? new Date(match.observedAt).getTime() : 0)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0];
  if (!latest) return "watch";
  return localEventTime(new Date(latest).toISOString(), { second: "2-digit" });
}

function formatRunnerLine(runner: BackendRunner, currency: string) {
  const back = runner.back ? `B ${runner.back.odds.toFixed(2)} ${formatExchangeMoney(runner.back.amount, currency)}` : "B -";
  const lay = runner.lay ? `L ${runner.lay.odds.toFixed(2)} ${formatExchangeMoney(runner.lay.amount, currency)}` : "L -";
  return `${runner.name}: ${back} / ${lay}`;
}

function compactQuote(match: BackendExchangeMatch | undefined, currency: string) {
  const runners = match?.runners || [];
  let bestBack: number | null = null;
  let bestLay: number | null = null;
  for (const runner of runners) {
    if (runner.back?.odds && (!bestBack || runner.back.odds > bestBack)) bestBack = runner.back.odds;
    if (runner.lay?.odds && (!bestLay || runner.lay.odds < bestLay)) bestLay = runner.lay.odds;
  }
  const liquidityValue = matchLiquidity(match);
  return {
    price: bestBack || bestLay ? `${bestBack ? bestBack.toFixed(2) : "-"} / ${bestLay ? bestLay.toFixed(2) : "-"}` : "-",
    liquidity: liquidityValue > 0 ? formatExchangeMoney(liquidityValue, currency) : "-",
    empty: !runners.length || (!bestBack && !bestLay),
    lines: runners.map((runner) => formatRunnerLine(runner, currency)).filter(Boolean)
  };
}

function totalLiquidity(row: BackendPriceRow) {
  return COMPACT_EXCHANGES.reduce((sum, exchange) => sum + matchLiquidity(row.matches?.[exchange.key]), 0);
}

function bestRoute(quotes: CompactLiquidityRow["quotes"]) {
  let best: { label: string; price: number } | null = null;
  for (const exchange of COMPACT_EXCHANGES) {
    const quote = quotes[exchange.key]?.price.match(/^([0-9]+(?:\.[0-9]+)?)/);
    const price = quote ? Number(quote[1]) : 0;
    if (price > 1 && (!best || price > best.price)) best = { label: exchange.label, price };
  }
  return best ? { label: best.label, price: best.price.toFixed(2) } : null;
}

function inferCountryFromCompetition(value: string | null | undefined) {
  const text = normalizeFixtureText(value || "");
  if (text.includes("england") || text.includes("english")) return "England";
  if (text.includes("scotland") || text.includes("scottish")) return "Scotland";
  if (text.includes("germany") || text.includes("bundesliga")) return "Germany";
  if (text.includes("spain") || text.includes("la liga")) return "Spain";
  if (text.includes("italy") || text.includes("serie a")) return "Italy";
  if (text.includes("france") || text.includes("ligue 1")) return "France";
  return null;
}

function compactRowsFromBackend(rows: BackendPriceRow[]) {
  return mergeDisplayPriceRows(rows)
    .filter((row) => !eventHasPassed(row.startAt))
    .map((row): CompactLiquidityRow => {
      const quotes = Object.fromEntries(COMPACT_EXCHANGES.map((exchange) => [
        exchange.key,
        compactQuote(row.matches?.[exchange.key], exchange.currency)
      ])) as CompactLiquidityRow["quotes"];
      const value = totalLiquidity(row);
      return {
        id: `${normalizeFixtureText(row.name)}:${row.startAt || row.id}`,
        startAt: row.startAt,
        kickoff: displayStartTime(row),
        match: displayEventName(row.name),
        market: row.marketName || row.marketType || "Market",
        competition: row.competitionName || "Exchange football",
        country: inferCountryFromCompetition(row.competitionName),
        coverage: COMPACT_EXCHANGES.map((exchange) => ({ label: exchange.label, available: Boolean(row.matches?.[exchange.key]) })),
        quotes,
        best: bestRoute(quotes),
        total: value > 0 ? formatExchangeMoney(value, "GBP") : "-",
        fresh: row.isDemo ? "demo" : formatFresh(row),
        raw: row
      };
    })
    .filter((row) => row.total !== "-")
    .sort((a, b) => new Date(a.startAt || 0).getTime() - new Date(b.startAt || 0).getTime())
    .slice(0, 500);
}

function CompactQuoteCell({ data, exchange }: { data?: CompactLiquidityRow; exchange: CompactExchangeKey }) {
  const quote = data?.quotes[exchange];
  return (
    <div className={quote?.empty ? "ag-compact-quote empty" : "ag-compact-quote"}>
      <strong>{quote?.price || "-"}</strong>
      <span>{quote?.liquidity || "-"}</span>
    </div>
  );
}

function BestRouteCell({ data }: { data?: CompactLiquidityRow }) {
  return (
    <div className={data?.best ? "ag-best-route" : "ag-best-route empty"}>
      <strong>{data?.best?.label || "-"}</strong>
      <span>{data?.best?.price || "no quote"}</span>
    </div>
  );
}

export default function LiquidityCompactDemo() {
  const [backendRows, setBackendRows] = useState<BackendPriceRow[]>(cachedFootballLiquidityRows());
  const [loading, setLoading] = useState(backendRows.length === 0);
  const [initialSnapshotLoaded, setInitialSnapshotLoaded] = useState(backendRows.length > 0);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateScope, setDateScope] = useState("all");
  const [locationScope, setLocationScope] = useState("all");
  const [socketStatus, setSocketStatus] = useState<"offline" | "connecting" | "live" | "waiting">("offline");
  const [hoverDetails, setHoverDetails] = useState<{ x: number; y: number; title: string; lines: string[] } | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingPriceEventsRef = useRef<Array<{ channel: string; payload: unknown }>>([]);
  const priceFlushTimerRef = useRef<number | null>(null);
  const allRows = useMemo(() => compactRowsFromBackend(backendRows), [backendRows]);
  const rows = useMemo(() => allRows.filter((row) => {
    if (!footballScopeMatches(`${row.match} ${row.competition}`, row.country, row.startAt, dateScope, locationScope)) return false;
    const terms = normalizeFixtureText(searchQuery).split(" ").filter(Boolean);
    if (!terms.length) return true;
    const haystack = normalizeFixtureText([
      row.kickoff,
      row.match,
      row.competition,
      row.country || "",
      row.coverage.filter((exchange) => exchange.available).map((exchange) => exchange.label).join(" "),
      row.best?.label || "",
      row.best?.price || "",
      row.total,
      row.fresh
    ].join(" "));
    return terms.every((term) => haystack.includes(term));
  }), [allRows, dateScope, locationScope, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    async function loadRows() {
      setLoading(true);
      try {
        const rows = await fetchMarketSnapshotRows(
          "/api/markets/snapshot?sport=football&exchanges=betfair,matchbook,monaco,smarkets,betdaq,sx&segment=upcoming4&limit=260",
          "/api/exchange-odds?sport=football&exchanges=betfair,matchbook,monaco,smarkets,betdaq,sx&segment=upcoming4&limit=260"
        );
        if (!cancelled) {
          storeFootballLiquidity(rows);
          setBackendRows((currentRows) => mergeDisplayPriceRows([...rows, ...currentRows]).slice(0, 700));
          setInitialSnapshotLoaded(true);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setInitialSnapshotLoaded(true);
          setError(err instanceof Error ? err.message : "Compact liquidity demo failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRows();
    const timer = window.setInterval(loadRows, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const token = window.localStorage.getItem("sportsedge.auth.token");
    let closedByEffect = false;
    function clearReconnect() {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }
    function flushPriceEvents() {
      const events = pendingPriceEventsRef.current.splice(0);
      priceFlushTimerRef.current = null;
      if (!events.length) return;
      setBackendRows((currentRows) => mergeDisplayPriceRows(events.reduce(
        (nextRows, item) => item.channel === "markets.football"
          ? mergeMarketStateRows(nextRows, item.payload, 700)
          : mergeLivePriceRows(nextRows, item.channel, item.payload, "football", true, 700),
        currentRows
      )).slice(0, 700));
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
        socket.send(JSON.stringify({ type: "subscribe", channel: "markets.football", filters: { sport: "football" } }));
      });
      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type !== "event" || !message.payload) return;
          if (String(message.channel || "") !== "markets.football" && !isPrimaryTradingMarket(message.payload, "football")) return;
          pendingPriceEventsRef.current.push({ channel: String(message.channel || ""), payload: message.payload });
          if (!priceFlushTimerRef.current) priceFlushTimerRef.current = window.setTimeout(flushPriceEvents, 50);
        } catch {
          // Ignore malformed socket payloads.
        }
      });
      socket.addEventListener("close", () => {
        if (closedByEffect) return;
        setSocketStatus("offline");
        reconnectTimerRef.current = window.setTimeout(connect, 2500);
      });
      socket.addEventListener("error", () => setSocketStatus("offline"));
    }
    connect();
    return () => {
      closedByEffect = true;
      clearReconnect();
      if (priceFlushTimerRef.current) window.clearTimeout(priceFlushTimerRef.current);
      pendingPriceEventsRef.current = [];
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  const columnDefs = useMemo<ColDef<CompactLiquidityRow>[]>(() => [
    { field: "kickoff", headerName: "Time", width: 108, minWidth: 102 },
    {
      field: "match",
      headerName: "Fixture",
      width: 390,
      minWidth: 320,
      cellRenderer: ({ data }: { data?: CompactLiquidityRow }) => (
        <div className="ag-fixture-cell">
          <strong>{data?.match}</strong>
          <span>{data?.competition}</span>
        </div>
      )
    },
    { field: "market", headerName: "Market", width: 178, minWidth: 142 },
    {
      field: "coverage",
      headerName: "Cvg",
      width: 112,
      cellRenderer: ({ data }: { data?: CompactLiquidityRow }) => (
        <div className="exchange-coverage ag-coverage compact">
          {(data?.coverage || []).map((exchange) => (
            <span className={exchange.available ? "available" : ""} key={exchange.label}>{exchange.label}</span>
          ))}
        </div>
      )
    },
    { colId: "best", headerName: "Best", width: 86, sortable: false, cellRenderer: ({ data }: { data?: CompactLiquidityRow }) => <BestRouteCell data={data} /> },
    ...COMPACT_EXCHANGES.map((exchange) => ({
      colId: exchange.key,
      headerName: exchange.label,
      minWidth: 118,
      flex: 1,
      sortable: false,
      cellClass: "ag-compact-quote-cell",
      cellRenderer: ({ data }: { data?: CompactLiquidityRow }) => <CompactQuoteCell data={data} exchange={exchange.key} />
    })),
    { field: "total", headerName: "Total", width: 106 },
    { field: "fresh", headerName: "Fresh", width: 84 }
  ], []);

  function showCellDetails(event: { event?: Event; colDef?: ColDef<CompactLiquidityRow>; data?: CompactLiquidityRow }) {
    const pointerEvent = event.event as MouseEvent | undefined;
    const key = String(event.colDef?.colId || "");
    if (!pointerEvent || !event.data) return;
    const exchange = COMPACT_EXCHANGES.find((item) => item.key === key);
    if (!exchange) {
      setHoverDetails(null);
      return;
    }
    const lines = event.data.quotes[exchange.key]?.lines || [];
    if (!lines.length) {
      setHoverDetails(null);
      return;
    }
    setHoverDetails({
      x: Math.min(pointerEvent.clientX + 18, window.innerWidth - 390),
      y: Math.min(pointerEvent.clientY + 18, window.innerHeight - 230),
      title: `${exchange.name} ladder / ${event.data.match}`,
      lines
    });
  }

  return (
    <>
      <TerminalTopbar
        active="liquidity"
        onSearchChange={setSearchQuery}
        searchPlaceholder="Filter compact liquidity demo..."
        demoMode
      />
      <main className="agtest-page compact-liquidity-demo">
        <FootballScopeFilter
          dateScope={dateScope}
          locationScope={locationScope}
          onDateScopeChange={setDateScope}
          onLocationScopeChange={setLocationScope}
          meta={[
            `${rows.length}${searchQuery.trim() || dateScope !== "all" || locationScope !== "all" ? ` / ${allRows.length}` : ""} markets`,
            "Compact demo",
            socketStatus === "live" ? "wss live" : loading ? "loading" : socketStatus
          ]}
          ariaLabel="Compact football liquidity filters"
        />
        <section className="agtest-source-strip" aria-label="Liquidity demo source status">
          <span>Compact demo only: BF / MB / BX / SM / BD / SX</span>
        </section>
        <section className="agtest-grid-wrap ag-theme-quartz-dark">
          <AgGridReact
            rowData={rows}
            columnDefs={columnDefs}
            loading={!initialSnapshotLoaded && rows.length === 0}
            overlayNoRowsTemplate="<span></span>"
            overlayLoadingTemplate="<span></span>"
            onCellMouseOver={showCellDetails}
            onCellMouseMove={showCellDetails}
            onCellMouseOut={() => setHoverDetails(null)}
            rowHeight={46}
            headerHeight={34}
            animateRows
            suppressCellFocus
            defaultColDef={{ sortable: true, resizable: true, filter: false, suppressHeaderMenuButton: true }}
          />
          {!initialSnapshotLoaded && rows.length === 0 && (
            <div className="agtest-empty-state">
              <strong>Loading compact liquidity demo</strong>
              <span>Fetching BF / MB / BX / SM / BD / SX exchange snapshot</span>
            </div>
          )}
          {initialSnapshotLoaded && !loading && rows.length === 0 && (
            <div className="agtest-empty-state">
              <strong>No liquid rows for this filter</strong>
              <span>{footballScopeBreadcrumb(dateScope, locationScope)}</span>
            </div>
          )}
        </section>
        {error && <div className="agtest-error">{error}</div>}
        {hoverDetails && (
          <aside
            className="liquidity-hover-card"
            style={{ left: hoverDetails.x, top: hoverDetails.y }}
            aria-label="Full compact market cell details"
          >
            <strong>{hoverDetails.title}</strong>
            <div>
              {hoverDetails.lines.map((line, index) => (
                <span key={`${line}-${index}`}>{line}</span>
              ))}
            </div>
          </aside>
        )}
      </main>
    </>
  );
}
