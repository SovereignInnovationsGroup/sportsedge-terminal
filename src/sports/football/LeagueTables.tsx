import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { localEventTime } from "../../core/format";

type StandingRow = {
  id: string;
  provider: string;
  sport: string;
  league: string;
  leagueName: string;
  season?: number | null;
  rank?: number | null;
  team: string;
  teamAbbreviation?: string | null;
  record?: string | null;
  played?: number | null;
  wins?: number | null;
  draws?: number | null;
  losses?: number | null;
  ties?: number | null;
  points?: number | null;
  pointsFor?: number | null;
  pointsAgainst?: number | null;
  pointDifferential?: number | null;
  syncedAt?: string | null;
};

type StandingsPayload = {
  generatedAt?: string;
  provider?: string;
  sourceStatus?: string;
  rows?: StandingRow[];
};

const TABLE_FILTERS = [
  {
    label: "All",
    value: "all",
    scopes: [
      "soccer:eng.1",
      "soccer:eng.2",
      "soccer:eng.3",
      "soccer:eng.4",
      "soccer:sco.1",
      "soccer:esp.1",
      "soccer:ita.1",
      "soccer:ger.1",
      "soccer:fra.1",
      "soccer:uefa.champions",
      "soccer:uefa.europa",
      "soccer:uefa.europa.conf"
    ]
  },
  {
    label: "UK",
    value: "uk",
    scopes: [
      "soccer:eng.1",
      "soccer:eng.2",
      "soccer:eng.3",
      "soccer:eng.4",
      "soccer:eng.5",
      "soccer:eng.w.1",
      "soccer:sco.1",
      "soccer:sco.2",
      "soccer:sco.3",
      "soccer:sco.4"
    ]
  },
  {
    label: "Europe",
    value: "europe",
    scopes: ["soccer:esp.1", "soccer:ita.1", "soccer:ger.1", "soccer:fra.1"]
  },
  {
    label: "UEFA",
    value: "uefa",
    scopes: ["soccer:uefa.champions", "soccer:uefa.europa", "soccer:uefa.europa.conf"]
  },
  {
    label: "World",
    value: "world",
    scopes: ["soccer:usa.1", "soccer:fifa.world"]
  }
] as const;

function numberCell(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return Number(value).toLocaleString("en-GB");
}

function pctComplete(rows: StandingRow[]) {
  const withPlayed = rows.filter((row) => Number(row.played || 0) > 0);
  if (!withPlayed.length) return "-";
  const maxPlayed = Math.max(...withPlayed.map((row) => Number(row.played || 0)));
  if (!maxPlayed) return "-";
  return `${Math.min(100, Math.round((withPlayed.reduce((sum, row) => sum + Number(row.played || 0), 0) / (withPlayed.length * maxPlayed)) * 100))}%`;
}

function leagueSortKey(league: string, scopeOrder: string[]) {
  const index = scopeOrder.findIndex((scope) => scope.endsWith(`:${league}`));
  return index === -1 ? 999 : index;
}

export default function LeagueTables() {
  const [activeFilter, setActiveFilter] = useState<(typeof TABLE_FILTERS)[number]["value"]>("all");
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [provider, setProvider] = useState("");
  const [sourceStatus, setSourceStatus] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const filter = TABLE_FILTERS.find((item) => item.value === activeFilter) || TABLE_FILTERS[0];

  useEffect(() => {
    let cancelled = false;
    async function loadTables() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          sport: "football",
          scopes: filter.scopes.join(","),
          limit: "200"
        });
        const response = await fetch(`/api/sports/standings?${params.toString()}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({})) as StandingsPayload;
        if (!response.ok) throw new Error("league tables failed");
        if (!cancelled) {
          setRows(Array.isArray(payload.rows) ? payload.rows : []);
          setProvider(String(payload.provider || ""));
          setSourceStatus(String(payload.sourceStatus || ""));
          setGeneratedAt(String(payload.generatedAt || ""));
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setProvider("");
          setSourceStatus("");
          setGeneratedAt("");
          setError(err instanceof Error ? err.message : "league tables failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTables();
    const timer = window.setInterval(loadTables, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [filter]);

  const filteredRows = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return rows;
    return rows.filter((row) => `${row.team} ${row.teamAbbreviation || ""} ${row.leagueName} ${row.league}`.toLowerCase().includes(trimmed));
  }, [rows, query]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, StandingRow[]>();
    filteredRows.forEach((row) => {
      const key = row.leagueName || row.league || "Football";
      const leagueRows = groups.get(key) || [];
      leagueRows.push(row);
      groups.set(key, leagueRows);
    });
    return Array.from(groups.entries())
      .sort((a, b) => leagueSortKey(a[1][0]?.league || "", [...filter.scopes]) - leagueSortKey(b[1][0]?.league || "", [...filter.scopes]) || a[0].localeCompare(b[0]))
      .map(([leagueName, leagueRows]) => [leagueName, leagueRows.sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999) || Number(b.points || 0) - Number(a.points || 0))] as const);
  }, [filteredRows, filter.scopes]);

  const latestSyncedAt = rows
    .map((row) => row.syncedAt ? new Date(row.syncedAt).getTime() : 0)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0];

  return (
    <>
      <TerminalTopbar active="football-tables" searchPlaceholder="Filter football tables, teams, leagues..." onSearchChange={setQuery} />
      <main className="football-tables-page">
        <section className="football-tables-header">
          <div>
            <h1>League Tables</h1>
            <p>Football standings grouped by competition. API-Football is the preferred source; ESPN fallback is shown where the API-Football standings cache is not populated yet.</p>
          </div>
          <div className="football-tables-kpis">
            <article><span>Leagues</span><strong>{groupedRows.length}</strong></article>
            <article><span>Teams</span><strong>{filteredRows.length}</strong></article>
            <article><span>Provider</span><strong>{provider || "-"}</strong></article>
            <article><span>Synced</span><strong>{latestSyncedAt ? localEventTime(new Date(latestSyncedAt).toISOString()) : generatedAt ? localEventTime(generatedAt) : "-"}</strong></article>
          </div>
        </section>

        <section className="football-tables-filterbar" aria-label="Football league table filters">
          <nav>
            {TABLE_FILTERS.map((item) => (
              <button className={activeFilter === item.value ? "active" : ""} key={item.value} type="button" onClick={() => setActiveFilter(item.value)}>
                {item.label}
              </button>
            ))}
          </nav>
          <div>
            <span>{sourceStatus || "standings source pending"}</span>
            {loading && <span>loading</span>}
          </div>
        </section>

        {error && <div className="agtest-error">{error}</div>}

        <section className="football-tables-scroll">
          {groupedRows.map(([leagueName, leagueRows]) => (
            <article className="football-league-table-panel" key={leagueName}>
              <header>
                <div>
                  <span>{leagueRows[0]?.league || "football"}</span>
                  <strong>{leagueName}</strong>
                </div>
                <div>
                  <span>{leagueRows[0]?.season || "-"}</span>
                  <b>{leagueRows.length} teams</b>
                  <em>{pctComplete(leagueRows)} played</em>
                </div>
              </header>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>P</th>
                    <th>W</th>
                    <th>D/T</th>
                    <th>L</th>
                    <th>For</th>
                    <th>Against</th>
                    <th>+/-</th>
                    <th>Pts</th>
                    <th>Record</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueRows.map((row, index) => (
                    <tr key={row.id || `${leagueName}-${row.team}-${index}`}>
                      <td className="mono positive">{row.rank || index + 1}</td>
                      <td><strong>{row.team}</strong>{row.teamAbbreviation ? <small>{row.teamAbbreviation}</small> : null}</td>
                      <td className="mono">{numberCell(row.played)}</td>
                      <td className="mono">{numberCell(row.wins)}</td>
                      <td className="mono">{numberCell(row.draws ?? row.ties)}</td>
                      <td className="mono">{numberCell(row.losses)}</td>
                      <td className="mono">{numberCell(row.pointsFor)}</td>
                      <td className="mono">{numberCell(row.pointsAgainst)}</td>
                      <td className="mono">{numberCell(row.pointDifferential)}</td>
                      <td className="mono total">{numberCell(row.points)}</td>
                      <td className="mono">{row.record || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
          {!loading && groupedRows.length === 0 && (
            <div className="football-tables-empty">
              <strong>No league tables returned.</strong>
              <span>{sourceStatus || "Provider configured, waiting for standings rows."}</span>
            </div>
          )}
          {loading && groupedRows.length === 0 && (
            <div className="football-tables-empty">
              <strong>Loading league tables.</strong>
              <span>Checking standings cache.</span>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
