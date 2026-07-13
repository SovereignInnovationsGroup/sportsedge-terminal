import { useEffect, useRef, useState } from "react";
import { readSnapshot, writeSnapshot } from "../../core/snapshotCache";
import {
  cachedFootballLiquidityRows,
  fetchMarketSnapshotRows,
  isPrimaryTradingMarket,
  mergeLivePriceRows,
  mergeMarketStateRows,
  sportsEdgeWsUrl,
  storeFootballLiquidity,
  type BackendPriceRow as FootballBackendPriceRow
} from "../football/marketData";
import {
  BackendPriceRow,
  CapturedSportEvent,
  DASHBOARD_EXCHANGES,
  FootballFixtureRow,
  NewsItem,
  StandingRow,
  StandingsPayload,
  SportEventRow
} from "./sportDashboardTypes";
import {
  capturedSportEventToEvent,
  footballFixtureToEvent,
  mergeEvents,
  mergeSportEvents,
  responseJson,
  withTimeout
} from "./sportDashboardUtils";

type SportDashboardSnapshot = {
  events: SportEventRow[];
  news: NewsItem[];
  standings: StandingRow[];
  standingsStatus: string;
  standingsProvider: string;
};

function emptySportDashboardSnapshot(): SportDashboardSnapshot {
  return {
    events: [],
    news: [],
    standings: [],
    standingsStatus: "",
    standingsProvider: ""
  };
}

const FOOTBALL_MARKET_STALE_MS = 120_000;

function footballRowsHaveLiquidity(rows: FootballBackendPriceRow[]) {
  return rows.some((row) => DASHBOARD_EXCHANGES.some((exchange) => {
    const aggregate = Number(row.aggregateLiquidityByExchange?.[exchange.key] || 0);
    if (aggregate > 0) return true;
    return (row.matches?.[exchange.key]?.runners || []).some((runner) => (
      Number(runner.back?.amount || 0) > 0 || Number(runner.lay?.amount || 0) > 0
    ));
  }));
}

export function useSportDashboardData({
  normalizedSport,
  isFootball,
  espnScopeKey
}: {
  normalizedSport: string;
  isFootball: boolean;
  espnScopeKey: string;
}) {
  const snapshotKey = `sport-dashboard.${normalizedSport}.${espnScopeKey || "default"}`;
  const cacheMaxAgeMs = isFootball ? 120_000 : 90_000;
  const refreshIntervalMs = isFootball ? 5_000 : 15_000;
  const fixtureDays = isFootball ? "2" : "0";
  const cachedSnapshot = readSnapshot<SportDashboardSnapshot>(snapshotKey, cacheMaxAgeMs) || emptySportDashboardSnapshot();
  const [events, setEvents] = useState<SportEventRow[]>(cachedSnapshot.events);
  const [news, setNews] = useState<NewsItem[]>(cachedSnapshot.news);
  const [standings, setStandings] = useState<StandingRow[]>(cachedSnapshot.standings);
  const [standingsStatus, setStandingsStatus] = useState(cachedSnapshot.standingsStatus);
  const [standingsProvider, setStandingsProvider] = useState(cachedSnapshot.standingsProvider);
  const [loading, setLoading] = useState(cachedSnapshot.events.length === 0 && cachedSnapshot.news.length === 0 && cachedSnapshot.standings.length === 0);
  const [error, setError] = useState("");
  const footballMarketRowsRef = useRef<FootballBackendPriceRow[]>(isFootball ? cachedFootballLiquidityRows(FOOTBALL_MARKET_STALE_MS) : []);
  const footballMarketRowsAtRef = useRef(footballMarketRowsRef.current.length ? Date.now() : 0);
  const hasRenderedDataRef = useRef(cachedSnapshot.events.length > 0 || cachedSnapshot.news.length > 0 || cachedSnapshot.standings.length > 0);
  const baseEventRowsRef = useRef<SportEventRow[]>(cachedSnapshot.events.map((event) => ({
    ...event,
    liquidity: 0,
    liquidityByExchange: Object.fromEntries(DASHBOARD_EXCHANGES.map((exchange) => [exchange.key, 0])),
    exchanges: []
  })));

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function loadSportDashboard(initial = false) {
      if (inFlight) return;
      inFlight = true;
      if (initial) setLoading(true);
      try {
        const oddsParams = new URLSearchParams({
          sport: normalizedSport,
          exchanges: DASHBOARD_EXCHANGES.map((exchange) => exchange.key).join(","),
          limit: isFootball ? "600" : "400"
        });
        if (isFootball) oddsParams.set("segment", "upcoming4");
        const newsParams = new URLSearchParams({
          sport: normalizedSport,
          limit: "30"
        });
        const fixturesPromise = isFootball
          ? fetch(`/api/football/fixtures?days=${fixtureDays}&limit=5000&timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London")}`, { cache: "no-store" })
          : Promise.resolve(null);
        const capturedEventsPromise = !isFootball
          ? fetch(`/api/sports/events?timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London")}&limit=1200`, { cache: "no-store" })
          : Promise.resolve(null);
        const standingsParams = new URLSearchParams({
          sport: normalizedSport,
          scopes: espnScopeKey,
          limit: "120"
        });
        const marketSnapshotUrl = `/api/markets/snapshot?${oddsParams.toString()}`;
        const exchangeFallbackUrl = `/api/exchange-odds?${oddsParams.toString()}`;
        const [oddsResult, newsResult, fixturesResult, standingsResult, capturedEventsResult] = await Promise.allSettled([
          withTimeout(fetchMarketSnapshotRows(marketSnapshotUrl, exchangeFallbackUrl), 9000, "markets"),
          withTimeout(fetch(`/api/news?${newsParams.toString()}`, { cache: "no-store" }), 6000, "news"),
          withTimeout(fixturesPromise, 9000, "fixtures"),
          withTimeout(fetch(`/api/sports/standings?${standingsParams.toString()}`, { cache: "no-store" }), 6000, "standings"),
          withTimeout(capturedEventsPromise, 9000, "captured events")
        ]);
        const fetchedOddsRows = oddsResult.status === "fulfilled" && Array.isArray(oddsResult.value) ? oddsResult.value as FootballBackendPriceRow[] : [];
        let oddsRows = fetchedOddsRows as BackendPriceRow[];
        if (isFootball) {
          const now = Date.now();
          const previousRowsAreFresh = footballRowsHaveLiquidity(footballMarketRowsRef.current) && now - footballMarketRowsAtRef.current <= FOOTBALL_MARKET_STALE_MS;
          const cachedRows = cachedFootballLiquidityRows(FOOTBALL_MARKET_STALE_MS);
          if (footballRowsHaveLiquidity(fetchedOddsRows)) {
            footballMarketRowsRef.current = fetchedOddsRows;
            footballMarketRowsAtRef.current = now;
            storeFootballLiquidity(fetchedOddsRows);
            oddsRows = fetchedOddsRows as BackendPriceRow[];
          } else if (previousRowsAreFresh) {
            oddsRows = footballMarketRowsRef.current as BackendPriceRow[];
          } else if (footballRowsHaveLiquidity(cachedRows)) {
            footballMarketRowsRef.current = cachedRows;
            footballMarketRowsAtRef.current = now;
            oddsRows = cachedRows as BackendPriceRow[];
          } else {
            footballMarketRowsRef.current = fetchedOddsRows;
            footballMarketRowsAtRef.current = fetchedOddsRows.length ? now : 0;
          }
        }
        const newsPayload = newsResult.status === "fulfilled" ? await responseJson(newsResult.value) : {};
        const fixturesPayload = fixturesResult.status === "fulfilled" ? await responseJson(fixturesResult.value) : {};
        const standingsPayload = standingsResult.status === "fulfilled" ? await responseJson(standingsResult.value) as StandingsPayload : {};
        const capturedEventsPayload = capturedEventsResult.status === "fulfilled" ? await responseJson(capturedEventsResult.value) : {};
        if (!cancelled) {
          const exchangeEvents = mergeEvents(oddsRows as BackendPriceRow[], normalizedSport);
          const fixtureEvents = Array.isArray(fixturesPayload.fixtures)
            ? (fixturesPayload.fixtures as FootballFixtureRow[]).map(footballFixtureToEvent).filter(Boolean) as SportEventRow[]
            : [];
          const capturedEvents = Array.isArray(capturedEventsPayload.items)
            ? (capturedEventsPayload.items as CapturedSportEvent[])
              .filter((event) => event.sport === normalizedSport)
              .map(capturedSportEventToEvent)
              .filter(Boolean) as SportEventRow[]
            : [];
          const baseEvents = isFootball
            ? (fixtureEvents.length > 0 ? fixtureEvents : baseEventRowsRef.current)
            : capturedEvents;
          baseEventRowsRef.current = baseEvents;
          const nextSnapshot: SportDashboardSnapshot = {
            events: mergeSportEvents([...baseEvents, ...exchangeEvents]),
            news: Array.isArray(newsPayload.items) ? newsPayload.items as NewsItem[] : [],
            standings: Array.isArray(standingsPayload.rows) ? standingsPayload.rows : [],
            standingsStatus: String(standingsPayload.sourceStatus || ""),
            standingsProvider: String(standingsPayload.provider || "")
          };
          writeSnapshot(snapshotKey, nextSnapshot);
          setEvents(nextSnapshot.events);
          setNews(nextSnapshot.news);
          setStandings(nextSnapshot.standings);
          setStandingsStatus(nextSnapshot.standingsStatus);
          setStandingsProvider(nextSnapshot.standingsProvider);
          hasRenderedDataRef.current = nextSnapshot.events.length > 0 || nextSnapshot.news.length > 0 || nextSnapshot.standings.length > 0;
          const failed = [
            fixturesResult.status === "rejected" ? "fixtures" : "",
            standingsResult.status === "rejected" && nextSnapshot.standings.length === 0 ? "standings" : "",
            capturedEventsResult.status === "rejected" && !isFootball && nextSnapshot.events.length === 0 ? "events" : ""
          ].filter(Boolean);
          setError(failed.length && nextSnapshot.events.length === 0 ? `Slow or unavailable: ${failed.join(", ")}` : "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(hasRenderedDataRef.current ? "" : err instanceof Error ? err.message : "sport dashboard failed");
        }
      } finally {
        inFlight = false;
        if (!cancelled) setLoading(false);
      }
    }

    loadSportDashboard(true);
    const timer = window.setInterval(() => loadSportDashboard(false), refreshIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [normalizedSport, isFootball, espnScopeKey, fixtureDays, refreshIntervalMs]);

  useEffect(() => {
    if (!isFootball) return;
    const token = window.localStorage.getItem("sportsedge.auth.token");
    if (!token) return;

    let closedByEffect = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let flushTimer: number | null = null;
    const pendingEvents: Array<{ channel: string; payload: unknown }> = [];

    function clearReconnect() {
      if (!reconnectTimer) return;
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    function applyFootballMarketRows(nextRows: FootballBackendPriceRow[]) {
      const now = Date.now();
      const nextRowsHaveLiquidity = footballRowsHaveLiquidity(nextRows);
      const previousRowsAreFresh = footballRowsHaveLiquidity(footballMarketRowsRef.current) && now - footballMarketRowsAtRef.current <= FOOTBALL_MARKET_STALE_MS;
      const rowsToApply = nextRowsHaveLiquidity
        ? nextRows
        : previousRowsAreFresh ? footballMarketRowsRef.current : nextRows;
      footballMarketRowsRef.current = rowsToApply;
      if (nextRowsHaveLiquidity) {
        footballMarketRowsAtRef.current = now;
        storeFootballLiquidity(rowsToApply);
      }
      const exchangeEvents = mergeEvents(rowsToApply as unknown as BackendPriceRow[], normalizedSport);
      setEvents(mergeSportEvents([...baseEventRowsRef.current, ...exchangeEvents]));
    }

    function flushPriceEvents() {
      flushTimer = null;
      if (!pendingEvents.length) return;
      const eventsToApply = pendingEvents.splice(0);
      const nextRows = eventsToApply.reduce(
        (rows, item) => item.channel === "markets.football"
          ? mergeMarketStateRows(rows, item.payload, 700)
          : mergeLivePriceRows(rows, item.channel, item.payload, "football", true, 700),
        footballMarketRowsRef.current
      );
      applyFootballMarketRows(nextRows);
    }

    function queuePayload(channel: string, payload: unknown) {
      pendingEvents.push({ channel, payload });
      if (flushTimer) return;
      flushTimer = window.setTimeout(flushPriceEvents, 75);
    }

    function connect() {
      clearReconnect();
      socket = new WebSocket(sportsEdgeWsUrl(token));
      socket.addEventListener("open", () => {
        socket?.send(JSON.stringify({
          type: "subscribe",
          channel: "markets.football",
          filters: { sport: "football" }
        }));
      });
      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          const channel = String(message?.channel || "");
          if (message?.type !== "event" || !message.payload) return;
          if (channel !== "markets.football" && !isPrimaryTradingMarket(message.payload, "football")) return;
          queuePayload(channel, message.payload);
        } catch {
          // Ignore malformed socket payloads; the snapshot fallback will keep the board populated.
        }
      });
      socket.addEventListener("close", () => {
        if (closedByEffect) return;
        reconnectTimer = window.setTimeout(connect, 2500);
      });
      socket.addEventListener("error", () => {
        if (closedByEffect) return;
        socket?.close();
      });
    }

    connect();

    return () => {
      closedByEffect = true;
      clearReconnect();
      if (flushTimer) window.clearTimeout(flushTimer);
      pendingEvents.splice(0);
      socket?.close();
    };
  }, [isFootball, normalizedSport]);

  return {
    events,
    news,
    standings,
    standingsStatus,
    standingsProvider,
    loading,
    error
  };
}
