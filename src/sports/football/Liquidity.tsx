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
                "/api/markets/snapshot?sport=football&exchanges=betfair,matchbook,smarkets,betdaq,sx&segment=upcoming4&limit=220",
                "/api/exchange-odds?sport=football&exchanges=betfair,matchbook,smarkets,betdaq,sx&segment=upcoming4&limit=220"
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
    { field: "kickoff", headerName: "Time", width: 128, pinned: "left" },
    {
      field: "match",
      headerName: "Fixture",
      minWidth: 390,
      flex: 1.6,
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
      headerName: "Coverage",
      width: 156,
      cellRenderer: ({ data }: { data?: AgTestRow }) => (
        <div className="exchange-coverage ag-coverage">
          {(data?.coverage || []).map((exchange) => (
            <span className={exchange.available ? "available" : ""} key={exchange.label}>{exchange.label}</span>
          ))}
        </div>
      )
    },
    { field: "outcomes", headerName: "Outcomes", minWidth: 260, flex: 1.05, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.outcomes} /> },
    { field: "betfair", headerName: "Betfair", minWidth: 230, flex: 1, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.betfair} className="ag-price-stack" /> },
    { field: "matchbook", headerName: "Matchbook", minWidth: 250, flex: 1.1, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.matchbook} className="ag-price-stack" /> },
    { field: "smarkets", headerName: "Smarkets", minWidth: 230, flex: 1, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.smarkets} className="ag-price-stack" /> },
    { field: "betdaq", headerName: "Betdaq", minWidth: 220, flex: 0.95, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.betdaq} className="ag-price-stack" /> },
    { field: "sx", headerName: "SX", minWidth: 210, flex: 0.9, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.sx} className="ag-price-stack" /> },
    { field: "bias", headerName: "Bias", width: 150 },
    { field: "bfLiquidity", headerName: "BF £ Now", width: 118 },
    { field: "mbLiquidity", headerName: "MB £ Now", width: 118 },
    { field: "smLiquidity", headerName: "SM £ Now", width: 118 },
    { field: "bdLiquidity", headerName: "BD £ Now", width: 118 },
    { field: "sxLiquidity", headerName: "SX £ Now", width: 118 },
    { field: "fresh", headerName: "Fresh", width: 118 }
  ], []);

  return (
    <>
      <TerminalTopbar
        active="liquidity"
        onSearchChange={setSearchQuery}
        searchPlaceholder="Filter table, open team/player, market..."
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
          <span>Available now: BF / MB / SM / BD / SX</span>
          {hasDemoRows && <span>Demo odds and liquidity feed</span>}
        </section>
        <section className="agtest-grid-wrap ag-theme-quartz-dark">
          <AgGridReact
            rowData={rows}
            columnDefs={columnDefs}
            loading={!initialSnapshotLoaded && rows.length === 0}
            overlayNoRowsTemplate="<span></span>"
            overlayLoadingTemplate="<span></span>"
            rowHeight={36}
            headerHeight={34}
            animateRows
            suppressCellFocus
            defaultColDef={{ sortable: true, resizable: true, filter: false, suppressHeaderMenuButton: true }}
          />
          {!initialSnapshotLoaded && rows.length === 0 && (
            <div className="agtest-empty-state">
              <strong>Loading liquidity</strong>
              <span>Fetching BF / MB / SM / BD / SX exchange snapshot</span>
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
      </main>
    </>
  );
}
