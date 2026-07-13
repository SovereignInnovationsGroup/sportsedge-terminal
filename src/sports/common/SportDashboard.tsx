import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { eventHasPassed, localEventTime } from "../../core/format";
import { FootballScopeFilter } from "../football/FootballScopeFilter";
import { footballScopeMatches } from "../football/filters";
import {
  ExchangeCoverageCell,
  FixtureTable,
  SportEntitiesPanel,
  SportNewsRail,
  SportScopeFilter,
  SportStandingByBoard,
  StandingsPanel
} from "./SportDashboardPanels";
import { DASHBOARD_EXCHANGES, SportEntitiesPayload, SportEntityRow, SportLocationFilter } from "./sportDashboardTypes";
import {
  apiSportValue,
  formatExchangeMoney,
  genericScopeMatches,
  isLiveSportEvent,
  isTodayLocal,
  isTomorrowLocal,
  newsHeadline
} from "./sportDashboardUtils";
import { useSportDashboardData } from "./useSportDashboardData";

export function SportDashboard({
  sport,
  label,
  active,
  espnScopes = [],
  dataStatus = "ESPN metadata enabled; exchange liquidity appears when normalized venue rows are available.",
  scopeLabel,
  locationFilters = [],
  showDefaultStandings = true
}: {
  sport: string;
  label: string;
  active: string;
  espnScopes?: string[];
  dataStatus?: string;
  scopeLabel?: string;
  locationFilters?: SportLocationFilter[];
  showDefaultStandings?: boolean;
}) {
  const normalizedSport = apiSportValue(sport);
  const isFootball = normalizedSport === "football";
  const [dateScope, setDateScope] = useState("all");
  const [locationScope, setLocationScope] = useState("all");
  const [liquidityOnly, setLiquidityOnly] = useState(true);
  const [query, setQuery] = useState("");
  const [entities, setEntities] = useState<SportEntityRow[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entitiesError, setEntitiesError] = useState("");
  const espnScopeKey = espnScopes.join(",");
  const {
    events,
    news,
    standings,
    loading,
    error
  } = useSportDashboardData({ normalizedSport, isFootball, espnScopeKey });

  const hasScopeFilter = locationFilters.length > 0;
  const scopedEvents = useMemo(() => {
    if (!isFootball && hasScopeFilter) return events.filter((event) => genericScopeMatches(event, dateScope, locationScope, locationFilters));
    if (!isFootball) return events;
    return events.filter((event) => footballScopeMatches(`${event.name} ${event.competition || ""}`, event.country, event.startAt, dateScope, locationScope));
  }, [events, isFootball, hasScopeFilter, dateScope, locationScope, locationFilters]);

  const liquidScopedEvents = useMemo(() => scopedEvents.filter((event) => Number(event.liquidity || 0) > 0), [scopedEvents]);
  const visibleEvents = isFootball && liquidityOnly ? liquidScopedEvents : scopedEvents;
  const timeOrderedEvents = useMemo(() => {
    return [...visibleEvents].sort((left, right) => {
      const leftLiveRank = isLiveSportEvent(left) ? 0 : 1;
      const rightLiveRank = isLiveSportEvent(right) ? 0 : 1;
      if (leftLiveRank !== rightLiveRank) return leftLiveRank - rightLiveRank;
      const leftTime = left.startAt ? new Date(left.startAt).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.startAt ? new Date(right.startAt).getTime() : Number.MAX_SAFE_INTEGER;
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return leftTime - rightTime;
      return String(left.name || "").localeCompare(String(right.name || ""));
    });
  }, [visibleEvents]);

  const todayRows = useMemo(() => timeOrderedEvents.filter((event) => isTodayLocal(event.startAt)), [timeOrderedEvents]);
  const tomorrowRows = useMemo(() => timeOrderedEvents.filter((event) => isTomorrowLocal(event.startAt)), [timeOrderedEvents]);
  const todayLiquidity = todayRows.reduce((sum, event) => sum + event.liquidity, 0);
  const exchangeCount = new Set(timeOrderedEvents.flatMap((event) => event.exchanges)).size;
  const nearTermRows = useMemo(() => [...todayRows, ...tomorrowRows]
    .filter((event) => isLiveSportEvent(event) || !eventHasPassed(event.startAt))
    .slice(0, 6), [todayRows, tomorrowRows]);
  const coveredRows = useMemo(() => timeOrderedEvents.filter((event) => event.exchanges.length > 0), [timeOrderedEvents]);
  const exchangeLiquidityRows = useMemo(() => DASHBOARD_EXCHANGES.map((exchange) => ({
    ...exchange,
    liquidity: timeOrderedEvents.reduce((sum, event) => sum + Number(event.liquidityByExchange[exchange.key] || 0), 0),
    eventCount: timeOrderedEvents.filter((event) => Number(event.liquidityByExchange[exchange.key] || 0) > 0).length
  })).filter((row) => row.liquidity > 0 || row.eventCount > 0), [timeOrderedEvents]);
  const latestTick = timeOrderedEvents
    .map((event) => event.latestSeenAt ? new Date(event.latestSeenAt).getTime() : 0)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0];
  const showDemoHolding = !isFootball && !loading && timeOrderedEvents.length === 0;
  const activeSection = active.replace(`${sport}-`, "");
  const entityType = activeSection === "teams" ? "team" : activeSection === "players" || activeSection === "drivers" ? "player" : "";
  const isEntityPage = Boolean(entityType);
  const isStandingsPage = ["standings", "tables", "rankings", "leaderboards"].includes(activeSection);
  const isResultsPage = activeSection === "results" || activeSection === "calendar" || activeSection === "tournaments" || activeSection === "series";
  const isLiquidityPage = activeSection === "liquidity" || activeSection === "markets";
  const isBiasPage = activeSection === "bias-matrix";
  const isInjuriesPage = activeSection === "injuries";

  useEffect(() => {
    if (!isEntityPage) return;
    let cancelled = false;
    async function loadEntities() {
      setEntitiesLoading(true);
      setEntitiesError("");
      try {
        const params = new URLSearchParams({
          sport: normalizedSport,
          type: entityType,
          limit: "500"
        });
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/sports/entities?${params.toString()}`, { cache: "no-store" });
        const payload = await response.json() as SportEntitiesPayload;
        if (!response.ok) throw new Error((payload as { detail?: string }).detail || "sport entities failed");
        if (!cancelled) setEntities(Array.isArray(payload.rows) ? payload.rows : []);
      } catch (err) {
        if (!cancelled) {
          setEntities([]);
          setEntitiesError(err instanceof Error ? err.message : "sport entities failed");
        }
      } finally {
        if (!cancelled) setEntitiesLoading(false);
      }
    }
    loadEntities();
    return () => {
      cancelled = true;
    };
  }, [isEntityPage, normalizedSport, entityType, query]);

  return (
    <>
      <TerminalTopbar active={active} searchPlaceholder={`${label}: fixtures, news, liquidity...`} onSearchChange={setQuery} />
      {isFootball && (
        <FootballScopeFilter
          dateScope={dateScope}
          locationScope={locationScope}
          liquidityOnly={liquidityOnly}
          onDateScopeChange={setDateScope}
          onLocationScopeChange={setLocationScope}
          onLiquidityOnlyChange={setLiquidityOnly}
          meta={[`${timeOrderedEvents.length} visible`, `${liquidScopedEvents.length} with £`, `${events.length} fixtures`]}
          ariaLabel="Football dashboard filters"
        />
      )}
      {!isFootball && hasScopeFilter && (
        <SportScopeFilter
          sportLabel={label}
          dateScope={dateScope}
          locationScope={locationScope}
          locationFilters={locationFilters}
          onDateScopeChange={setDateScope}
          onLocationScopeChange={setLocationScope}
          meta={[`${timeOrderedEvents.length} / ${events.length} events`]}
          ariaLabel={scopeLabel || `${label} dashboard filters`}
        />
      )}
      <main className="sport-summary-page">
        <section className="sport-summary-hero">
          <div>
            <h1>{label}</h1>
            <p>Today and tomorrow events, exchange coverage, available liquidity, and sport-specific intelligence.</p>
          </div>
          <div className="sport-summary-kpis">
            <article><span>Today</span><strong>{todayRows.length}</strong></article>
            <article><span>Tomorrow</span><strong>{tomorrowRows.length}</strong></article>
            <article><span>Exchanges Live</span><strong>{exchangeCount || "-"}</strong></article>
            <article><span>Today £ Now</span><strong>{todayLiquidity ? formatExchangeMoney(todayLiquidity, "GBP") : "-"}</strong></article>
            <article><span>Latest Tick</span><strong>{latestTick ? localEventTime(new Date(latestTick).toISOString()) : "-"}</strong></article>
          </div>
        </section>
        {error && <div className="agtest-error">{error}</div>}
        <section className="sport-summary-layout">
          <div className="sport-summary-main">
            {isEntityPage ? (
              <SportEntitiesPanel label={label} type={entityType} rows={entities} loading={entitiesLoading} error={entitiesError} />
            ) : isStandingsPage ? (
              <StandingsPanel
                label={label}
                rows={standings}
                loading={loading}
              />
            ) : isLiquidityPage || isBiasPage ? (
              <FixtureTable title={isBiasPage ? "Bias / Liquidity Board" : "Liquidity Board"} rows={timeOrderedEvents} loading={loading} />
            ) : isResultsPage ? (
              <FixtureTable title="Event Calendar / Results" rows={timeOrderedEvents} loading={loading} />
            ) : isInjuriesPage ? (
              <SportStandingByBoard label={label} espnScopes={espnScopes} dataStatus={`${label} injury feed configured when provider rows are available.`} />
            ) : (
              <>
                {!isFootball && (
                  <section className="sport-command-grid" aria-label={`${label} market overview`}>
                    <div className="sport-command-panel">
                      <header><span>Market Board</span><strong>{nearTermRows.length}</strong></header>
                      <table>
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Event</th>
                            <th>Competition</th>
                            <th>Coverage</th>
                            <th>Total Now</th>
                            <th>Latest</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nearTermRows.map((event) => (
                            <tr key={`command-${event.id}-${event.startAt}`}>
                              <td className="mono positive">{localEventTime(event.startAt, { weekday: "short", day: "2-digit", month: "short", year: "2-digit" })}</td>
                              <td><strong>{event.name}</strong></td>
                              <td>{event.competition || "-"}</td>
                              <td><ExchangeCoverageCell event={event} /></td>
                              <td className="mono liquidity-money total">{formatExchangeMoney(event.liquidity, "GBP")}</td>
                              <td className="mono">{event.latestSeenAt ? localEventTime(event.latestSeenAt, { weekday: "short", day: "2-digit", month: "short", year: "2-digit" }) : "-"}</td>
                            </tr>
                          ))}
                          {!loading && nearTermRows.length === 0 && <tr><td className="empty" colSpan={6}>No near-term events returned for the current filter.</td></tr>}
                          {loading && nearTermRows.length === 0 && <tr><td className="empty" colSpan={6}>Loading market board.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    <div className="sport-command-panel sport-command-intel">
                      <header><span>Sport Intel</span><strong>{news.length}</strong></header>
                      <div>
                        <article><span>Covered events</span><strong>{coveredRows.length}</strong><em>{timeOrderedEvents.length} total in view</em></article>
                        <article><span>Exchange venues</span><strong>{exchangeCount || "-"}</strong><em>{exchangeLiquidityRows.length ? "liquidity visible" : "waiting for venue rows"}</em></article>
                        <article><span>News tape</span><strong>{news.length ? "Live" : loading ? "Loading" : "Quiet"}</strong><em>{news[0] ? newsHeadline(news[0]) : `${label} news rail remains filtered.`}</em></article>
                      </div>
                    </div>
                  </section>
                )}
                {showDemoHolding ? (
                  <SportStandingByBoard label={label} espnScopes={espnScopes} dataStatus={dataStatus} />
                ) : isFootball ? (
                  <FixtureTable title="Fixtures" rows={timeOrderedEvents} loading={loading} />
                ) : (
                  <>
                    {showDefaultStandings && (
                      <StandingsPanel
                        label={label}
                        rows={standings}
                        loading={loading}
                      />
                    )}
                    <FixtureTable title="Today" rows={todayRows} loading={loading} />
                    <FixtureTable title="Tomorrow" rows={tomorrowRows} loading={loading} />
                  </>
                )}
              </>
            )}
          </div>
          <SportNewsRail label={label} news={news} loading={loading} />
        </section>
      </main>
    </>
  );
}
