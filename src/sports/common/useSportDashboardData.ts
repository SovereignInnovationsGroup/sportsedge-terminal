import { useEffect, useState } from "react";
import { readSnapshot, writeSnapshot } from "../../core/snapshotCache";
import { fetchMarketSnapshotRows } from "../football/marketData";
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
  const cachedSnapshot = readSnapshot<SportDashboardSnapshot>(snapshotKey, 90_000) || emptySportDashboardSnapshot();
  const [events, setEvents] = useState<SportEventRow[]>(cachedSnapshot.events);
  const [news, setNews] = useState<NewsItem[]>(cachedSnapshot.news);
  const [standings, setStandings] = useState<StandingRow[]>(cachedSnapshot.standings);
  const [standingsStatus, setStandingsStatus] = useState(cachedSnapshot.standingsStatus);
  const [standingsProvider, setStandingsProvider] = useState(cachedSnapshot.standingsProvider);
  const [loading, setLoading] = useState(cachedSnapshot.events.length === 0 && cachedSnapshot.news.length === 0 && cachedSnapshot.standings.length === 0);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSportDashboard() {
      setLoading(true);
      try {
        const oddsParams = new URLSearchParams({
          sport: normalizedSport,
          exchanges: DASHBOARD_EXCHANGES.map((exchange) => exchange.key).join(","),
          limit: "400"
        });
        if (isFootball) oddsParams.set("segment", "upcoming4");
        const newsParams = new URLSearchParams({
          sport: normalizedSport,
          limit: "30"
        });
        const fixturesPromise = isFootball
          ? fetch("/api/football/fixtures?days=2&limit=2000&timezone=Europe/London", { cache: "no-store" })
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
          withTimeout(fetchMarketSnapshotRows(marketSnapshotUrl, exchangeFallbackUrl), 3500, "markets"),
          withTimeout(fetch(`/api/news?${newsParams.toString()}`, { cache: "no-store" }), 3000, "news"),
          withTimeout(fixturesPromise, 3500, "fixtures"),
          withTimeout(fetch(`/api/sports/standings?${standingsParams.toString()}`, { cache: "no-store" }), 3000, "standings"),
          withTimeout(capturedEventsPromise, 3500, "captured events")
        ]);
        const oddsRows = oddsResult.status === "fulfilled" && Array.isArray(oddsResult.value) ? oddsResult.value : [];
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
          const nextSnapshot: SportDashboardSnapshot = {
            events: isFootball ? mergeSportEvents([...fixtureEvents, ...exchangeEvents]) : mergeSportEvents([...capturedEvents, ...exchangeEvents]),
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
          const failed = [
            oddsResult.status === "rejected" ? "markets" : "",
            newsResult.status === "rejected" ? "news" : "",
            fixturesResult.status === "rejected" ? "fixtures" : "",
            standingsResult.status === "rejected" ? "standings" : "",
            capturedEventsResult.status === "rejected" ? "events" : ""
          ].filter(Boolean);
          setError(failed.length ? `Slow or unavailable: ${failed.join(", ")}` : "");
        }
      } catch (err) {
        if (!cancelled) {
          setEvents([]);
          setNews([]);
          setStandings([]);
          setStandingsStatus("");
          setStandingsProvider("");
          setError(err instanceof Error ? err.message : "sport dashboard failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSportDashboard();
    const timer = window.setInterval(loadSportDashboard, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [normalizedSport, isFootball, espnScopeKey]);

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
