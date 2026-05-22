import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { AGTEST_FOOTBALL_PRIMARY_FILTERS, AGTEST_FOOTBALL_SECONDARY_FILTERS, footballFilterBreadcrumb } from "./filters";
import { normalizeFixtureText, teamInitials } from "../../core/format";
import {
  cachedFootballTeamAssets,
  footballTeamAssetMatchesGroup,
  footballTeamAssetCacheIsComplete,
  hydrateFootballTeamAssets,
  prefetchFootballTeamAssets,
  searchFootballTeamAssets,
  type FootballTeamAsset
} from "./teamAssets";

export default function Profiles() {
  const cachedTeams = cachedFootballTeamAssets();
  const [teams, setTeams] = useState<FootballTeamAsset[]>(cachedTeams);
  const [loading, setLoading] = useState(cachedTeams.length === 0);
  const [hydrating, setHydrating] = useState(!footballTeamAssetCacheIsComplete());
  const [serverSearchTeams, setServerSearchTeams] = useState<FootballTeamAsset[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filterBucket, setFilterBucket] = useState("all");
  const [marketGroup, setMarketGroup] = useState("all");

  useEffect(() => {
    let cancelled = false;
    async function loadTeams() {
      if (!cachedFootballTeamAssets().length) setLoading(true);
      try {
        const teams = await prefetchFootballTeamAssets();
        if (!teams.length) throw new Error("team profiles failed");
        if (!cancelled) {
          setTeams(teams);
          setError("");
        }
        hydrateFootballTeamAssets().then((hydratedTeams) => {
          if (!cancelled && hydratedTeams.length) {
            setTeams(hydratedTeams);
            setHydrating(!footballTeamAssetCacheIsComplete());
          }
        });
      } catch (err) {
        if (!cancelled) {
          setTeams([]);
          setError(err instanceof Error ? err.message : "team profiles failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTeams();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || footballTeamAssetCacheIsComplete()) {
      setServerSearchTeams(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchFootballTeamAssets(trimmed).then((results) => {
        if (!cancelled) setServerSearchTeams(results);
      }).catch(() => {
        if (!cancelled) setServerSearchTeams(null);
      });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const secondaryFilters = AGTEST_FOOTBALL_SECONDARY_FILTERS[filterBucket] || [];
  const filteredTeams = useMemo(() => {
    const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
    return (serverSearchTeams || teams)
      .filter((team) => footballTeamAssetMatchesGroup(team, marketGroup))
      .filter((team) => {
        if (!terms.length) return true;
        const haystack = normalizeFixtureText([
          team.fullName,
          team.shortName,
          team.country,
          team.currentLeague,
          team.ticker,
          ...(team.aliases || [])
        ].join(" "));
        return terms.every((term) => haystack.includes(term));
      })
      .sort((a, b) => {
        const country = String(a.country || "").localeCompare(String(b.country || ""));
        if (country !== 0) return country;
        return String(a.fullName || a.shortName).localeCompare(String(b.fullName || b.shortName));
      });
  }, [teams, serverSearchTeams, marketGroup, query]);

  return (
    <>
      <TerminalTopbar active="football-profiles" onSearchChange={setQuery} searchPlaceholder="Filter football teams, country, league..." />
      <main className="football-profiles-page">
        <section className="agtest-subbar" aria-label="Football profile filters">
          <div className="agtest-filter-stack">
            <nav aria-label="Football profile regions">
              {AGTEST_FOOTBALL_PRIMARY_FILTERS.filter((filter) => !["today", "tomorrow"].includes(filter.value)).map((filter) => (
                <button
                  className={filterBucket === filter.value ? "active" : ""}
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setFilterBucket(filter.value);
                    setMarketGroup(filter.value);
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </nav>
            {secondaryFilters.length > 0 && (
              <nav className="agtest-filter-secondary" aria-label="Football profile league filters">
                {secondaryFilters.map((filter) => (
                  <button
                    className={marketGroup === filter.value ? "active" : ""}
                    key={filter.value}
                    type="button"
                    onClick={() => setMarketGroup(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </nav>
            )}
          </div>
          <div>
            <span>{filteredTeams.length} / {teams.length} teams</span>
            <span>{footballFilterBreadcrumb(filterBucket, marketGroup)}</span>
            <span>{loading ? "loading" : hydrating ? "loading full directory" : "double-click opens profile"}</span>
          </div>
        </section>

        <section className="football-profiles-header">
          <div>
            <span>SportsEdge Football Profiles</span>
            <h1>Team Directory</h1>
          </div>
          <p>Canonical team identity, logos, countries, leagues, provider ids and aliases. Double-click any row to open the detail profile.</p>
        </section>

        {error && <div className="agtest-error">{error}</div>}

        <section className="football-profiles-table-wrap">
          <table className="football-profiles-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Code</th>
                <th>Country</th>
                <th>League</th>
                <th>Provider</th>
                <th>Aliases</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map((team) => (
                <tr
                  key={team.id || team.slug}
                  onDoubleClick={() => { window.location.hash = `#team/${team.slug || encodeURIComponent(team.fullName)}`; }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") window.location.hash = `#team/${team.slug || encodeURIComponent(team.fullName)}`;
                  }}
                  tabIndex={0}
                >
                  <td className="football-profile-team-cell">
                    <span className={`team-logo-frame matrix-team-logo${team.national ? " flag-logo" : ""}`}>
                      {team.logoUrl || team.flagUrl ? <img src={team.logoUrl || team.flagUrl || ""} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
                      <span>{team.ticker || teamInitials(team.shortName || team.fullName)}</span>
                    </span>
                    <strong>{team.fullName || team.shortName}</strong>
                  </td>
                  <td className="mono">{team.ticker || "-"}</td>
                  <td>{team.country || "-"}</td>
                  <td>{team.currentLeague || "-"}</td>
                  <td className="mono">{team.providerTeamId || team.provider || "-"}</td>
                  <td>{(team.aliases || []).slice(0, 4).join(" / ") || "-"}</td>
                </tr>
              ))}
              {!loading && filteredTeams.length === 0 && (
                <tr><td className="empty" colSpan={6}>No teams matched this filter.</td></tr>
              )}
              {loading && filteredTeams.length === 0 && (
                <tr><td className="empty" colSpan={6}>Loading football teams.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
