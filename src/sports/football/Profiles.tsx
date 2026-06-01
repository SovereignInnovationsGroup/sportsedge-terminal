import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { FootballScopeFilter } from "./FootballScopeFilter";
import { normalizeFixtureText, teamInitials } from "../../core/format";
import { SportNewsRail } from "../common/SportDashboardPanels";
import type { NewsItem } from "../common/sportDashboardTypes";
import {
  cachedFootballTeamAssets,
  footballTeamAssetMatchesGroup,
  footballTeamAssetCacheIsComplete,
  prefetchFootballTeamAssets,
  searchFootballTeamAssets,
  type FootballTeamAsset
} from "./teamAssets";

type FootballPlayerDirectoryRow = {
  id: string;
  providerPlayerId: string | null;
  name: string;
  firstname: string | null;
  lastname: string | null;
  age: number | null;
  nationality: string | null;
  photoUrl: string | null;
  position: string | null;
  number: number | null;
  season: number | null;
  syncedAt: string | null;
  team: {
    id: string;
    name: string;
    country: string | null;
    logoUrl: string | null;
    slug: string | null;
    ticker: string | null;
    league: string | null;
  } | null;
};

const FOOTBALL_FILTER_NEWS_TERMS: Record<string, string> = {
  all: "",
  today: "",
  tomorrow: "",
  uk: "UK football",
  england: "England football",
  scotland: "Scotland football",
  wales: "Wales football",
  "n-ireland": "Northern Ireland football",
  europe: "European football",
  uefa: "UEFA",
  international: "international football",
  world: "world football"
};

function playerMatchesGroup(player: FootballPlayerDirectoryRow, group: string) {
  if (group === "all" || group === "today" || group === "tomorrow") return true;
  const country = normalizeFixtureText([player.nationality, player.team?.country].filter(Boolean).join(" "));
  const league = normalizeFixtureText(player.team?.league || "");
  if (group === "uk") return ["england", "scotland", "wales", "northern ireland", "united kingdom"].some((term) => country.includes(term) || league.includes(term));
  if (group === "england") return country.includes("england") || league.includes("england") || league.includes("premier league") || league.includes("championship") || league.includes("league one") || league.includes("league two");
  if (group === "scotland") return country.includes("scotland") || league.includes("scotland");
  if (group === "wales") return country.includes("wales");
  if (group === "n-ireland") return country.includes("northern ireland");
  if (group === "europe" || group === "uefa") return !["argentina", "brazil", "canada", "chile", "colombia", "ecuador", "mexico", "peru", "united states", "usa", "uruguay"].some((term) => country.includes(term));
  return true;
}

export default function Profiles({ active = "football-teams" }: { active?: string }) {
  const playerMode = active === "football-players";
  const cachedTeams = cachedFootballTeamAssets();
  const [teams, setTeams] = useState<FootballTeamAsset[]>(cachedTeams);
  const [players, setPlayers] = useState<FootballPlayerDirectoryRow[]>([]);
  const [playerNews, setPlayerNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(cachedTeams.length === 0);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playerNewsLoading, setPlayerNewsLoading] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [serverSearchTeams, setServerSearchTeams] = useState<FootballTeamAsset[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [dateScope, setDateScope] = useState("all");
  const [locationScope, setLocationScope] = useState("all");

  useEffect(() => {
    let cancelled = false;
    async function loadTeams() {
      if (playerMode) return;
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
  }, [playerMode]);

  useEffect(() => {
    if (!playerMode) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setPlayersLoading(true);
      try {
        const params = new URLSearchParams({
          limit: query.trim() ? "800" : "500",
          q: query.trim(),
          group: locationScope
        });
        const response = await fetch(`/api/football/players?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("football players failed");
        const payload = await response.json() as { rows?: FootballPlayerDirectoryRow[] };
        if (!cancelled) {
          setPlayers(Array.isArray(payload.rows) ? payload.rows : []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setPlayers([]);
          setError(err instanceof Error ? err.message : "football players failed");
        }
      } finally {
        if (!cancelled) setPlayersLoading(false);
      }
    }, query.trim() ? 180 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [playerMode, query, locationScope]);

  useEffect(() => {
    if (!playerMode) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPlayerNewsLoading(true);
      try {
        const params = new URLSearchParams({
          sport: "football",
          limit: "24",
          include_context: "1"
        });
        const newsQuery = query.trim() || FOOTBALL_FILTER_NEWS_TERMS[locationScope] || "";
        if (newsQuery) params.set("q", newsQuery);
        const response = await fetch(`/api/news?${params.toString()}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json().catch(() => ({})) as { items?: NewsItem[] };
        if (!response.ok || !Array.isArray(payload.items)) throw new Error("news failed");
        setPlayerNews(payload.items);
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError") setPlayerNews([]);
      } finally {
        setPlayerNewsLoading(false);
      }
    }, query.trim() ? 220 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [playerMode, query, locationScope, dateScope]);

  useEffect(() => {
    if (playerMode) return undefined;
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
  }, [query, playerMode]);

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

  const filteredPlayers = useMemo(() => {
    const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
    return players
      .filter((player) => playerMatchesGroup(player, locationScope))
      .filter((player) => {
        if (!terms.length) return true;
        const haystack = normalizeFixtureText([
          player.name,
          player.firstname,
          player.lastname,
          player.nationality,
          player.position,
          player.team?.name,
          player.team?.country,
          player.team?.league,
          player.team?.ticker
        ].filter(Boolean).join(" "));
        return terms.every((term) => haystack.includes(term));
      });
  }, [players, locationScope, query]);

  if (playerMode) {
    return (
      <>
        <TerminalTopbar active={active} onSearchChange={setQuery} searchPlaceholder="Filter football players, team, country, league..." />
        <main className="football-profiles-page">
          <FootballScopeFilter
            dateScope={dateScope}
            locationScope={locationScope}
            onDateScopeChange={setDateScope}
            onLocationScopeChange={setLocationScope}
            meta={[
              `${filteredPlayers.length} / ${players.length} players`,
              playersLoading ? "loading" : "double-click opens player"
            ]}
            ariaLabel="Football player filters"
          />

          <section className="football-profiles-header">
            <div>
              <h1>Player Directory</h1>
            </div>
            <p>Football player profiles with photos, current squad link, nationality and position. Double-click any row to open the player profile.</p>
          </section>

          {error && <div className="agtest-error">{error}</div>}

          <section className="football-profiles-split">
            <div className="football-profiles-table-wrap">
              <table className="football-profiles-table football-player-directory-table">
                <colgroup>
                  <col className="football-player-col-name" />
                  <col className="football-player-col-team" />
                  <col className="football-player-col-nation" />
                  <col className="football-player-col-position" />
                  <col className="football-player-col-age" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Nation</th>
                    <th>Position</th>
                    <th>Age</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player) => (
                    <tr
                      key={player.id}
                      onDoubleClick={() => { window.location.hash = `#player/${player.id}`; }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") window.location.hash = `#player/${player.id}`;
                      }}
                      tabIndex={0}
                    >
                      <td className="football-profile-team-cell">
                        <span className="team-logo-frame matrix-team-logo player-photo-frame">
                          {player.photoUrl ? <img src={player.photoUrl} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
                          <span>{teamInitials(player.name)}</span>
                        </span>
                        <strong>{player.name}</strong>
                      </td>
                      <td>
                        <div className="football-player-team-inline">
                          {player.team?.logoUrl ? <img src={player.team.logoUrl} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
                          <span>{player.team?.name || "-"}</span>
                          <em>{player.team?.league || ""}</em>
                        </div>
                      </td>
                      <td>{player.nationality || player.team?.country || "-"}</td>
                      <td>{[player.position, player.number ? `#${player.number}` : ""].filter(Boolean).join(" ") || "-"}</td>
                      <td className="mono">{player.age ?? "-"}</td>
                    </tr>
                  ))}
                  {!playersLoading && filteredPlayers.length === 0 && (
                    <tr><td className="empty" colSpan={5}>No players matched this filter.</td></tr>
                  )}
                  {playersLoading && filteredPlayers.length === 0 && (
                    <tr><td className="empty" colSpan={5}>Loading football players.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <SportNewsRail label="Football" news={playerNews} loading={playerNewsLoading} />
          </section>
        </main>
      </>
    );
  }

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
          <p>Canonical team identity, logos, countries, leagues and aliases. Double-click any row to open the detail profile.</p>
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
                  <td>{(team.aliases || []).slice(0, 4).join(" / ") || "-"}</td>
                </tr>
              ))}
              {!loading && filteredTeams.length === 0 && (
                <tr><td className="empty" colSpan={5}>No teams matched this filter.</td></tr>
              )}
              {loading && filteredTeams.length === 0 && (
                <tr><td className="empty" colSpan={5}>Loading football teams.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
