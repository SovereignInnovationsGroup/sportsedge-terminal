import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { localDateKey, localEventTime } from "../../core/format";

type FootballResultFixture = {
  id?: string;
  providerFixtureId?: string;
  country?: string | null;
  leagueName?: string | null;
  kickoffAt?: string | null;
  statusShort?: string | null;
  statusLong?: string | null;
  elapsed?: number | null;
  venueName?: string | null;
  home?: { name?: string | null; logoUrl?: string | null; winner?: boolean | null };
  away?: { name?: string | null; logoUrl?: string | null; winner?: boolean | null };
  goals?: { home?: number | null; away?: number | null };
  syncedAt?: string | null;
  updatedAt?: string | null;
};

const RESULT_FILTERS = [
  { label: "Today", value: "today", daysBack: 0 },
  { label: "Yesterday", value: "yesterday", daysBack: 1 },
  { label: "7 Days", value: "week", daysBack: 7 },
  { label: "30 Days", value: "month", daysBack: 30 }
] as const;

const FINAL_STATUSES = new Set(["FT", "AET", "PEN"]);

function dateOffset(daysBack: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return localDateKey(date);
}

function hasResult(fixture: FootballResultFixture) {
  const status = String(fixture.statusShort || "").toUpperCase();
  const hasGoals = fixture.goals?.home != null && fixture.goals?.away != null;
  return hasGoals && (FINAL_STATUSES.has(status) || new Date(fixture.kickoffAt || "").getTime() < Date.now());
}

function resultScore(fixture: FootballResultFixture) {
  const home = fixture.goals?.home;
  const away = fixture.goals?.away;
  if (home == null || away == null) return "-";
  return `${home} - ${away}`;
}

function resultOutcome(fixture: FootballResultFixture) {
  const home = fixture.goals?.home;
  const away = fixture.goals?.away;
  if (home == null || away == null) return "-";
  if (home > away) return "Home";
  if (away > home) return "Away";
  return "Draw";
}

function fixtureDateLabel(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export default function Results() {
  const [activeFilter, setActiveFilter] = useState<(typeof RESULT_FILTERS)[number]["value"]>("week");
  const [fixtures, setFixtures] = useState<FootballResultFixture[]>([]);
  const [query, setQuery] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const filter = RESULT_FILTERS.find((item) => item.value === activeFilter) || RESULT_FILTERS[2];

  useEffect(() => {
    let cancelled = false;
    async function loadResults() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          from: dateOffset(filter.daysBack),
          to: dateOffset(0),
          limit: "3000",
          timezone: "Europe/London"
        });
        const response = await fetch(`/api/football/fixtures?${params.toString()}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.detail || "results failed");
        if (!cancelled) {
          setFixtures(Array.isArray(payload.fixtures) ? payload.fixtures : []);
          setGeneratedAt(String(payload.generatedAt || ""));
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setFixtures([]);
          setGeneratedAt("");
          setError(err instanceof Error ? err.message : "results failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadResults();
    const timer = window.setInterval(loadResults, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [filter.daysBack]);

  const resultRows = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return fixtures
      .filter(hasResult)
      .filter((fixture) => {
        if (!trimmed) return true;
        return `${fixture.home?.name || ""} ${fixture.away?.name || ""} ${fixture.leagueName || ""} ${fixture.country || ""}`.toLowerCase().includes(trimmed);
      })
      .sort((a, b) => new Date(b.kickoffAt || "").getTime() - new Date(a.kickoffAt || "").getTime());
  }, [fixtures, query]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, FootballResultFixture[]>();
    resultRows.forEach((fixture) => {
      const key = fixture.kickoffAt ? localDateKey(fixture.kickoffAt) : "Unknown";
      const rows = groups.get(key) || [];
      rows.push(fixture);
      groups.set(key, rows);
    });
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [resultRows]);

  const latestSync = fixtures
    .map((fixture) => fixture.updatedAt || fixture.syncedAt || "")
    .map((value) => value ? new Date(value).getTime() : 0)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0];

  return (
    <>
      <TerminalTopbar active="football-results" searchPlaceholder="Filter football results, teams, leagues..." onSearchChange={setQuery} />
      <main className="football-results-page">
        <section className="football-results-header">
          <div>
            <h1>Results</h1>
            <p>Completed and scored football fixtures from the SportsEdge football fixture cache.</p>
          </div>
          <div className="football-results-kpis">
            <article><span>Results</span><strong>{resultRows.length}</strong></article>
            <article><span>Leagues</span><strong>{new Set(resultRows.map((row) => row.leagueName || "-")).size || "-"}</strong></article>
            <article><span>Window</span><strong>{filter.label}</strong></article>
            <article><span>Synced</span><strong>{latestSync ? localEventTime(new Date(latestSync).toISOString()) : generatedAt ? localEventTime(generatedAt) : "-"}</strong></article>
          </div>
        </section>

        <section className="football-results-filterbar" aria-label="Football results filters">
          <nav>
            {RESULT_FILTERS.map((item) => (
              <button className={activeFilter === item.value ? "active" : ""} key={item.value} type="button" onClick={() => setActiveFilter(item.value)}>
                {item.label}
              </button>
            ))}
          </nav>
          <div>
            <span>{dateOffset(filter.daysBack)} / {dateOffset(0)}</span>
            {loading && <span>loading</span>}
          </div>
        </section>

        {error && <div className="agtest-error">{error}</div>}

        <section className="football-results-scroll">
          {groupedRows.map(([date, rows]) => (
            <article className="football-results-day" key={date}>
              <header>
                <strong>{date}</strong>
                <span>{rows.length} results</span>
              </header>
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Fixture</th>
                    <th>Score</th>
                    <th>Outcome</th>
                    <th>Competition</th>
                    <th>Status</th>
                    <th>Venue</th>
                    <th>Synced</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((fixture) => (
                    <tr key={fixture.id || fixture.providerFixtureId || `${fixture.home?.name}-${fixture.away?.name}-${fixture.kickoffAt}`}>
                      <td className="mono positive">{fixtureDateLabel(fixture.kickoffAt)}</td>
                      <td><strong>{fixture.home?.name || "Home"} v {fixture.away?.name || "Away"}</strong><small>{fixture.country || ""}</small></td>
                      <td className="mono total">{resultScore(fixture)}</td>
                      <td>{resultOutcome(fixture)}</td>
                      <td>{fixture.leagueName || "-"}</td>
                      <td className="mono">{fixture.statusShort || fixture.statusLong || "-"}</td>
                      <td>{fixture.venueName || "-"}</td>
                      <td className="mono">{fixture.updatedAt || fixture.syncedAt ? localEventTime(fixture.updatedAt || fixture.syncedAt || null) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
          {!loading && groupedRows.length === 0 && (
            <div className="football-results-empty">
              <strong>No results returned.</strong>
              <span>The fixture cache has no completed/scored football rows for this window.</span>
            </div>
          )}
          {loading && groupedRows.length === 0 && (
            <div className="football-results-empty">
              <strong>Loading results.</strong>
              <span>Checking football fixture cache.</span>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
