import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { FootballScopeFilter } from "./FootballScopeFilter";
import { footballScopeBreadcrumb, footballScopeMatches } from "./filters";
import {
  AgStackCell,
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
const LIQUIDITY_HAS_MONEY_STATE_KEY = "sportsedge.footballLiquidity.hasMoney.v1";
const LIQUIDITY_MIN_TOTAL_STATE_KEY = "sportsedge.footballLiquidity.minTotal.v1";
const LIQUIDITY_THRESHOLD_OPTIONS = [
  { value: 0, label: "ANY £" },
  { value: 1_000, label: "£1K+" },
  { value: 10_000, label: "£10K+" },
  { value: 50_000, label: "£50K+" },
  { value: 100_000, label: "£100K+" },
  { value: 1_000_000, label: "£1M+" }
];

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

function readBooleanPreference(key: string, fallback: boolean) {
  try {
    const value = window.localStorage.getItem(key);
    if (value === "true") return true;
    if (value === "false") return false;
  } catch {
    // Preference only.
  }
  return fallback;
}

function readMinLiquidityPreference() {
  try {
    const value = Number(window.localStorage.getItem(LIQUIDITY_MIN_TOTAL_STATE_KEY) || 0);
    return LIQUIDITY_THRESHOLD_OPTIONS.some((option) => option.value === value) ? value : 0;
  } catch {
    return 0;
  }
}

function savePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preference only.
  }
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
  const [liquidityOnly, setLiquidityOnly] = useState(() => readBooleanPreference(LIQUIDITY_HAS_MONEY_STATE_KEY, true));
  const [minLiquidity, setMinLiquidity] = useState(readMinLiquidityPreference);
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
  const moneyFilteredRows = useMemo(() => groupedRows.filter((row) => {
    const total = Number(row.totalLiquidity || 0);
    if (liquidityOnly && total <= 0) return false;
    if (minLiquidity > 0 && total < minLiquidity) return false;
    return true;
  }), [groupedRows, liquidityOnly, minLiquidity]);
  const rows = useMemo(() => {
    const nextRows = filterAgTestRows(moneyFilteredRows, searchQuery);
    return [...nextRows].sort((left, right) => {
      const leftTime = left.startAt ? new Date(left.startAt).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.startAt ? new Date(right.startAt).getTime() : Number.MAX_SAFE_INTEGER;
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return leftTime - rightTime;
      return String(left.match || "").localeCompare(String(right.match || ""));
    });
  }, [moneyFilteredRows, searchQuery]);

  useEffect(() => {
    savePreference(LIQUIDITY_HAS_MONEY_STATE_KEY, String(liquidityOnly));
  }, [liquidityOnly]);

  useEffect(() => {
    savePreference(LIQUIDITY_MIN_TOTAL_STATE_KEY, String(minLiquidity));
  }, [minLiquidity]);

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
                "/api/markets/snapshot?sport=football&exchanges=betfair,matchbook,polymarket,monaco,sx&segment=upcoming4&limit=220",
                "/api/exchange-odds?sport=football&exchanges=betfair,matchbook,polymarket,monaco,sx&segment=upcoming4&limit=220"
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
    { field: "kickoff", headerName: "Time", width: 178, minWidth: 168, pinned: "left" },
    {
      field: "match",
      headerName: "Fixture",
      minWidth: 235,
      flex: 1,
      pinned: "left",
      cellRenderer: ({ data }: { data?: AgTestRow }) => (
        <div className="ag-fixture-cell">
          <strong>{data?.match}</strong>
          <span>{data?.competition}</span>
        </div>
      )
    },
    { field: "country", headerName: "Country", width: 118, valueFormatter: ({ value }) => value || "-" },
    {
      field: "coverage",
      headerName: "Coverage",
      width: 188,
      cellRenderer: ({ data }: { data?: AgTestRow }) => (
        <div className="exchange-coverage ag-coverage">
          {(data?.coverage || []).map((exchange) => (
            <span className={exchange.available ? "available" : ""} key={exchange.label}>{exchange.label}</span>
          ))}
        </div>
      )
    },
    { field: "outcomes", headerName: "Outcomes", minWidth: 150, flex: 0.55, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.outcomes} /> },
    { field: "betfair", headerName: "BF", minWidth: 128, flex: 0.48, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.betfair} className="ag-price-stack" /> },
    { field: "matchbook", headerName: "MB", minWidth: 128, flex: 0.48, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.matchbook} className="ag-price-stack" /> },
    { field: "polymarket", headerName: "PY", minWidth: 128, flex: 0.48, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.polymarket} className="ag-price-stack" /> },
    { field: "monaco", headerName: "BX", minWidth: 128, flex: 0.48, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.monaco} className="ag-price-stack" /> },
    { field: "sx", headerName: "SX", minWidth: 122, flex: 0.45, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.sx} className="ag-price-stack" /> },
    { field: "bias", headerName: "Bias", width: 92 },
    { field: "bfLiquidity", headerName: "BF ALL £", width: 92 },
    { field: "mbLiquidity", headerName: "MB ALL £", width: 92 },
    { field: "pyLiquidity", headerName: "PY ALL $", width: 92 },
    { field: "bxLiquidity", headerName: "BX ALL $", width: 92 },
    { field: "sxLiquidity", headerName: "SX ALL £", width: 92 },
    { field: "fresh", headerName: "Fresh", width: 76 }
  ], []);

  function showCellDetails(event: { event?: Event; colDef?: ColDef<AgTestRow>; data?: AgTestRow }) {
    const pointerEvent = event.event as MouseEvent | undefined;
    const field = event.colDef?.field as keyof AgTestRow | undefined;
    if (!pointerEvent || !field || !event.data) return;
    if (!["outcomes", "betfair", "matchbook", "polymarket", "monaco", "sx"].includes(String(field))) {
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
      polymarket: "Polymarket book",
      monaco: "BetDEX ladder",
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
          liquidityOnly={liquidityOnly}
          minLiquidity={minLiquidity}
          liquidityThresholdOptions={LIQUIDITY_THRESHOLD_OPTIONS}
          onDateScopeChange={setDateScope}
          onLocationScopeChange={setLocationScope}
          onLiquidityOnlyChange={setLiquidityOnly}
          onMinLiquidityChange={(value) => {
            setMinLiquidity(value);
            if (value > 0) setLiquidityOnly(true);
          }}
          meta={[
            `${rows.length}${searchQuery.trim() || dateScope !== "all" || locationScope !== "all" || minLiquidity > 0 || !liquidityOnly ? ` / ${allRows.length}` : ""} markets`,
            "Available money now",
            socketStatus === "live" ? "wss live" : loading ? "loading" : socketStatus
          ]}
          ariaLabel="Football liquidity filters"
        />
        <section className="agtest-source-strip" aria-label="Liquidity source status">
          <span>Available now: BF / MB / PY / BX / SX</span>
          {hasDemoRows && <span className="demo">Hybrid demo fills missing fixtures</span>}
        </section>
        <section className="agtest-grid-wrap ag-theme-quartz-dark">
          <AgGridReact
            rowData={rows}
            columnDefs={columnDefs}
            getRowId={(params) => params.data.id}
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
            rowHeight={36}
            headerHeight={34}
            suppressCellFocus
            defaultColDef={{ sortable: true, resizable: true, filter: false, suppressHeaderMenuButton: true }}
          />
          {!initialSnapshotLoaded && rows.length === 0 && (
            <div className="agtest-empty-state">
              <strong>Loading liquidity</strong>
              <span>Fetching BF / MB / PY / BX / SX exchange snapshot</span>
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
