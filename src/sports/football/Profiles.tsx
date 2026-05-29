import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { FootballScopeFilter } from "./FootballScopeFilter";
import { normalizeFixtureText, teamInitials } from "../../core/format";
import {
  cachedFootballTeamAssets,
  footballTeamAssetMatchesGroup,
  footballTeamAssetCacheIsComplete,
  prefetchFootballTeamAssets,
  searchFootballTeamAssets,
  type FootballTeamAsset
} from "./teamAssets";

export default function Profiles({ active = "football-teams" }: { active?: string }) {
  const cachedTeams = cachedFootballTeamAssets();
  const [teams, setTeams] = useState<FootballTeamAsset[]>(cachedTeams);
  const [loading, setLoading] = useState(cachedTeams.length === 0);
  const [hydrating, setHydrating] = useState(false);
  const [serverSearchTeams, setServerSearchTeams] = useState<FootballTeamAsset[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [dateScope, setDateScope] = useState("all");
  const [locationScope, setLocationScope] = useState("all");

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
      setHydrating(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setHydrating(true);
      searchFootballTeamAssets(trimmed).then((results) => {
        if (!cancelled) setServerSearchTeams(results);
      }).catch(() => {
        if (!cancelled) setServerSearchTeams(null);
      }).finally(() => {
        if (!cancelled) setHydrating(false);
      });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const filteredTeams = useMemo(() => {
    const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
    return (serverSearchTeams || teams)
      .filter((team) => footballTeamAssetMatchesGroup(team, locationScope))
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
  }, [teams, serverSearchTeams, locationScope, query]);

  return (
    <>
      <TerminalTopbar active={active} onSearchChange={setQuery} searchPlaceholder="Filter football teams, country, league..." />
      <main className="football-profiles-page">
        <FootballScopeFilter
          dateScope={dateScope}
          locationScope={locationScope}
          onDateScopeChange={setDateScope}
          onLocationScopeChange={setLocationScope}
          meta={[
            `${filteredTeams.length} / ${teams.length} teams`,
            loading ? "loading" : hydrating ? "loading full directory" : "double-click opens profile"
          ]}
          ariaLabel="Football profile filters"
        />

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
