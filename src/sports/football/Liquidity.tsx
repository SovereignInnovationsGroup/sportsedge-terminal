import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { FootballScopeFilter } from "./FootballScopeFilter";
import { footballScopeBreadcrumb, footballScopeMatches } from "./filters";
import {
  BETTING_EXCHANGE_COLUMNS,
  buildAgTestRows,
  cachedFootballLiquidityRows,
  fetchMarketSnapshotRows,
  filterAgTestRows,
  isPrimaryTradingMarket,
  mergeDisplayPriceRows,
  mergeLivePriceRows,
  mergeMarketStateRows,
  prefetchFootballLiquiditySnapshot,
  sportsEdgeWsUrl,
  storeFootballLiquidity,
  type AgTestRow,
  type BackendPriceRow,
  type FootballFixture
} from "./marketData";

ModuleRegistry.registerModules([AllCommunityModule]);

const LIQUIDITY_COLUMN_STATE_KEY = "sportsedge.footballLiquidityColumnState.v2";
const COMPACT_EXCHANGE_COLUMNS = [
  { field: "betfair", label: "BF", liquidityField: "bfLiquidity" },
  { field: "matchbook", label: "MB", liquidityField: "mbLiquidity" },
  { field: "betdex", label: "BX", liquidityField: "bdxLiquidity" },
  { field: "smarkets", label: "SM", liquidityField: "smLiquidity" },
  { field: "betdaq", label: "BD", liquidityField: "bdLiquidity" },
  { field: "sx", label: "SX", liquidityField: "sxLiquidity" }
] as const satisfies ReadonlyArray<{
  field: keyof Pick<AgTestRow, "betfair" | "matchbook" | "betdex" | "smarkets" | "betdaq" | "sx">;
  label: string;
  liquidityField: keyof Pick<AgTestRow, "bfLiquidity" | "mbLiquidity" | "bdxLiquidity" | "smLiquidity" | "bdLiquidity" | "sxLiquidity">;
}>;

function readLiquidityColumnState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIQUIDITY_COLUMN_STATE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLiquidityColumnState(api: { getColumnState?: () => unknown[] }) {
  if (typeof api.getColumnState !== "function") return;
  try {
    window.localStorage.setItem(LIQUIDITY_COLUMN_STATE_KEY, JSON.stringify(api.getColumnState()));
  } catch {
    // Column state is a convenience preference only.
  }
}

function parseQuoteLine(line: string) {
  const back = Number(line.match(/\bB\s+([0-9]+(?:\.[0-9]+)?)/)?.[1]);
  const lay = Number(line.match(/\bL\s+([0-9]+(?:\.[0-9]+)?)/)?.[1]);
  return {
    back: Number.isFinite(back) ? back : null,
    lay: Number.isFinite(lay) ? lay : null
  };
}

function compactQuote(data: AgTestRow | undefined, field: typeof COMPACT_EXCHANGE_COLUMNS[number]["field"], liquidityField: typeof COMPACT_EXCHANGE_COLUMNS[number]["liquidityField"]) {
  const lines = Array.isArray(data?.[field]) ? data[field].filter((line) => line && line !== "-") : [];
  let bestBack: number | null = null;
  let bestLay: number | null = null;
  for (const line of lines) {
    const quote = parseQuoteLine(line);
    if (quote.back && (!bestBack || quote.back > bestBack)) bestBack = quote.back;
    if (quote.lay && (!bestLay || quote.lay < bestLay)) bestLay = quote.lay;
  }
  const price = bestBack || bestLay
    ? `${bestBack ? bestBack.toFixed(2) : "-"} / ${bestLay ? bestLay.toFixed(2) : "-"}`
    : "-";
  return {
    price,
    liquidity: data?.[liquidityField] || "-"
  };
}

function CompactExchangeCell({
  data,
  field,
  liquidityField
}: {
  data?: AgTestRow;
  field: typeof COMPACT_EXCHANGE_COLUMNS[number]["field"];
  liquidityField: typeof COMPACT_EXCHANGE_COLUMNS[number]["liquidityField"];
}) {
  const quote = compactQuote(data, field, liquidityField);
  return (
    <div className={quote.price === "-" ? "ag-compact-quote empty" : "ag-compact-quote"}>
      <strong>{quote.price}</strong>
      <span>{quote.liquidity}</span>
    </div>
  );
}

function BestRouteCell({ data }: { data?: AgTestRow }) {
  let best: { label: string; price: number } | null = null;
  for (const exchange of COMPACT_EXCHANGE_COLUMNS) {
    const lines = Array.isArray(data?.[exchange.field]) ? data[exchange.field] : [];
    for (const line of lines) {
      const quote = parseQuoteLine(line);
      if (quote.back && (!best || quote.back > best.price)) {
        best = { label: exchange.label, price: quote.back };
      }
    }
  }
  return (
    <div className={best ? "ag-best-route" : "ag-best-route empty"}>
      <strong>{best ? best.label : "-"}</strong>
      <span>{best ? best.price.toFixed(2) : "no quote"}</span>
    </div>
  );
}

export default function Liquidity() {
  const cachedLiquidityRows = cachedFootballLiquidityRows();
  const [fixtures, setFixtures] = useState<FootballFixture[]>([]);
  const [backendRows, setBackendRows] = useState<BackendPriceRow[]>(cachedLiquidityRows);
  const [loading, setLoading] = useState(cachedLiquidityRows.length === 0);
  const [initialSnapshotLoaded, setInitialSnapshotLoaded] = useState(cachedLiquidityRows.length > 0);
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
  const allRows = useMemo(() => buildAgTestRows(fixtures, backendRows), [fixtures, backendRows]);
  const hasDemoRows = useMemo(() => allRows.some((row) => row.isDemo), [allRows]);
  const groupedRows = useMemo(() => allRows.filter((row) => (
    footballScopeMatches(`${row.match} ${row.competition}`, row.country, row.startAt, dateScope, locationScope)
  )), [allRows, dateScope, locationScope]);
  const rows = useMemo(() => filterAgTestRows(groupedRows, searchQuery), [groupedRows, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    let hydrateTimer: number | null = null;

    async function loadRows() {
      if (!cachedFootballLiquidityRows().length) setLoading(true);
      try {
        const fastRows = await prefetchFootballLiquiditySnapshot();
        if (!fastRows.length) throw new Error("odds failed");

        if (!cancelled) {
          setBackendRows((currentRows) => mergeDisplayPriceRows([
            ...fastRows,
            ...currentRows
          ]).slice(0, 700));
          setInitialSnapshotLoaded(true);
          setError("");
          setLoading(false);
        }

        hydrateTimer = window.setTimeout(async () => {
          try {
            const [fullOddsResponse, fixtureResponse] = await Promise.all([
              fetchMarketSnapshotRows(
                "/api/markets/snapshot?sport=football&exchanges=betfair,matchbook,monaco,smarkets,betdaq,sx&segment=upcoming4&limit=220",
                "/api/exchange-odds?sport=football&exchanges=betfair,matchbook,monaco,smarkets,betdaq,sx&segment=upcoming4&limit=220"
              ),
              fetch("/api/football/fixtures?days=4&limit=2000&timezone=Europe/London", { cache: "no-store" })
            ]);
            const fixturePayload = await fixtureResponse.json().catch(() => ({}));
            if (!cancelled) {
              if (Array.isArray(fullOddsResponse)) {
                storeFootballLiquidity(fullOddsResponse as BackendPriceRow[]);
                setBackendRows((currentRows) => mergeDisplayPriceRows([
                  ...(fullOddsResponse as BackendPriceRow[]),
                  ...currentRows
                ]).slice(0, 700));
              }
              if (fixtureResponse.ok && Array.isArray(fixturePayload.fixtures)) setFixtures(fixturePayload.fixtures as FootballFixture[]);
            }
          } catch {
            // Keep the fast exchange snapshot visible if slower enrichment fails.
          }
        }, 80);
      } catch (err) {
        if (!cancelled) {
          setInitialSnapshotLoaded(true);
          setError(err instanceof Error ? err.message : "Liquidity board failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRows();
    const timer = window.setInterval(loadRows, 30000);
    return () => {
      cancelled = true;
      if (hydrateTimer) window.clearTimeout(hydrateTimer);
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

    function subscribe(socket: WebSocket) {
      socket.send(JSON.stringify({
        type: "subscribe",
        channel: "markets.football",
        filters: { sport: "football" }
      }));
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
        subscribe(socket);
      });

      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type !== "event" || !message.payload) return;
          if (String(message.channel || "") !== "markets.football" && !isPrimaryTradingMarket(message.payload, "football")) return;
          pendingPriceEventsRef.current.push({
            channel: String(message.channel || ""),
            payload: message.payload
          });
          if (!priceFlushTimerRef.current) {
            priceFlushTimerRef.current = window.setTimeout(flushPriceEvents, 50);
          }
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
      if (priceFlushTimerRef.current) {
        window.clearTimeout(priceFlushTimerRef.current);
        priceFlushTimerRef.current = null;
      }
      pendingPriceEventsRef.current = [];
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  const columnDefs = useMemo<ColDef<AgTestRow>[]>(() => [
    { field: "kickoff", headerName: "Time", width: 112, minWidth: 106, pinned: "left" },
    {
      field: "match",
      headerName: "Fixture",
      minWidth: 280,
      flex: 1,
      pinned: "left",
      cellRenderer: ({ data }: { data?: AgTestRow }) => (
        <div className="ag-fixture-cell">
          <strong>{data?.match}</strong>
          <span>{data?.competition}</span>
        </div>
      )
    },
    {
      field: "coverage",
      headerName: "Cvg",
      width: 118,
      cellRenderer: ({ data }: { data?: AgTestRow }) => (
        <div className="exchange-coverage ag-coverage">
          {(data?.coverage || []).map((exchange) => (
            <span className={exchange.available ? "available" : ""} key={exchange.label}>{exchange.label}</span>
          ))}
        </div>
      )
    },
    {
      colId: "best",
      headerName: "Best",
      width: 70,
      sortable: false,
      cellRenderer: ({ data }: { data?: AgTestRow }) => <BestRouteCell data={data} />
    },
    ...COMPACT_EXCHANGE_COLUMNS.map((exchange) => ({
      field: exchange.field,
      headerName: exchange.label,
      width: 86,
      minWidth: 82,
      maxWidth: 98,
      cellClass: "ag-compact-quote-cell",
      cellRenderer: ({ data }: { data?: AgTestRow }) => (
        <CompactExchangeCell data={data} field={exchange.field} liquidityField={exchange.liquidityField} />
      )
    })),
    { field: "liquidity", headerName: "Total", width: 88 },
    { field: "fresh", headerName: "Fresh", width: 72 }
  ], []);

  function showCellDetails(event: { event?: Event; colDef?: ColDef<AgTestRow>; data?: AgTestRow }) {
    const pointerEvent = event.event as MouseEvent | undefined;
    const field = event.colDef?.field as keyof AgTestRow | undefined;
    if (!pointerEvent || !field || !event.data) return;
    if (!["outcomes", "betfair", "matchbook", "betdex", "smarkets", "betdaq", "sx"].includes(String(field))) {
      setHoverDetails(null);
      return;
    }
    const rawValue = event.data[field];
    const lines = Array.isArray(rawValue) ? rawValue.filter((line) => line && line !== "-") : [];
    if (!lines.length) {
      setHoverDetails(null);
      return;
    }
    const titles: Partial<Record<keyof AgTestRow, string>> = {
      outcomes: "Outcomes",
      betfair: "Betfair ladder",
      matchbook: "Matchbook ladder",
      betdex: "BetDEX ladder",
      smarkets: "Smarkets ladder",
      betdaq: "Betdaq ladder",
      sx: "SX ladder"
    };
    setHoverDetails({
      x: Math.min(pointerEvent.clientX + 18, window.innerWidth - 390),
      y: Math.min(pointerEvent.clientY + 18, window.innerHeight - 230),
      title: `${titles[field] || String(field)} / ${event.data.match}`,
      lines
    });
  }

  return (
    <>
      <TerminalTopbar
        active="liquidity"
        onSearchChange={setSearchQuery}
        searchPlaceholder="Filter table, open team/player, market..."
        demoMode={hasDemoRows}
      />
      <main className="agtest-page">
        <FootballScopeFilter
          dateScope={dateScope}
          locationScope={locationScope}
          onDateScopeChange={setDateScope}
          onLocationScopeChange={setLocationScope}
          meta={[
            `${rows.length}${searchQuery.trim() || dateScope !== "all" || locationScope !== "all" ? ` / ${allRows.length}` : ""} markets`,
            "Available money now",
            socketStatus === "live" ? "wss live" : loading ? "loading" : socketStatus
          ]}
          ariaLabel="Football liquidity filters"
        />
        <section className="agtest-source-strip" aria-label="Liquidity source status">
          <span>Available now: BF / MB / BX / SM / BD / SX</span>
          {hasDemoRows && <span className="demo">Demo rows disabled for production screens</span>}
        </section>
        <section className="agtest-grid-wrap ag-theme-quartz-dark">
          <AgGridReact
            rowData={rows}
            columnDefs={columnDefs}
            onGridReady={(event) => {
              const state = readLiquidityColumnState();
              if (state.length) event.api.applyColumnState({ state, applyOrder: true });
            }}
            onColumnMoved={(event) => {
              if (event.finished) saveLiquidityColumnState(event.api);
            }}
            onColumnPinned={(event) => saveLiquidityColumnState(event.api)}
            onColumnResized={(event) => {
              if (event.finished) saveLiquidityColumnState(event.api);
            }}
            onColumnVisible={(event) => saveLiquidityColumnState(event.api)}
            loading={!initialSnapshotLoaded && rows.length === 0}
            overlayNoRowsTemplate="<span></span>"
            overlayLoadingTemplate="<span></span>"
            onCellMouseOver={showCellDetails}
            onCellMouseMove={showCellDetails}
            onCellMouseOut={() => setHoverDetails(null)}
            rowHeight={42}
            headerHeight={34}
            animateRows
            suppressCellFocus
            defaultColDef={{ sortable: true, resizable: true, filter: false, suppressHeaderMenuButton: true }}
          />
          {!initialSnapshotLoaded && rows.length === 0 && (
            <div className="agtest-empty-state">
              <strong>Loading liquidity</strong>
              <span>Fetching BF / MB / BX / SM / BD / SX exchange snapshot</span>
            </div>
          )}
          {initialSnapshotLoaded && !loading && rows.length === 0 && (
            <div className="agtest-empty-state">
              <strong>No liquidity rows for this filter</strong>
              <span>{footballScopeBreadcrumb(dateScope, locationScope)}</span>
            </div>
          )}
        </section>
        {error && <div className="agtest-error">{error}</div>}
        {hoverDetails && (
          <aside
            className="liquidity-hover-card"
            style={{ left: hoverDetails.x, top: hoverDetails.y }}
            aria-label="Full market cell details"
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
