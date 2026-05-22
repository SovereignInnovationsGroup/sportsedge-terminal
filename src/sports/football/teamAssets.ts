import { normalizeFixtureText, teamInitials } from "../../core/format";
import { footballTextMatchesGroup } from "./filters";

export type FootballTeamAsset = {
  id?: string;
  slug: string;
  ticker: string;
  fullName: string;
  shortName: string;
  country: string;
  currentLeague: string;
  logoUrl?: string | null;
  flagUrl?: string | null;
  countryCode?: string | null;
  provider?: string | null;
  providerTeamId?: string | null;
  national?: boolean;
  aliases: string[];
};

const FOOTBALL_TEAM_ASSET_URL = "/api/assets/football-teams?active=true&limit=25000";
let footballTeamAssetCache: { teams: FootballTeamAsset[]; fetchedAt: number } | null = null;
let footballTeamAssetPrefetchPromise: Promise<FootballTeamAsset[]> | null = null;

export function cachedFootballTeamAssets(maxAgeMs = 5 * 60 * 1000) {
  if (!footballTeamAssetCache) return [];
  if (Date.now() - footballTeamAssetCache.fetchedAt > maxAgeMs) return [];
  return footballTeamAssetCache.teams;
}

export async function prefetchFootballTeamAssets() {
  const cachedTeams = cachedFootballTeamAssets();
  if (cachedTeams.length) return cachedTeams;
  if (footballTeamAssetPrefetchPromise) return footballTeamAssetPrefetchPromise;
  footballTeamAssetPrefetchPromise = fetch(FOOTBALL_TEAM_ASSET_URL, { cache: "no-store" })
    .then(async (response) => {
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.teams)) throw new Error(payload.detail || "team profiles prefetch failed");
      const teams = payload.teams as FootballTeamAsset[];
      footballTeamAssetCache = { teams, fetchedAt: Date.now() };
      return teams;
    })
    .catch(() => [])
    .finally(() => {
      footballTeamAssetPrefetchPromise = null;
    });
  return footballTeamAssetPrefetchPromise;
}

export function footballTeamAssetMatchesGroup(team: FootballTeamAsset, group: string) {
  return footballTextMatchesGroup([
    team.fullName,
    team.shortName,
    team.currentLeague,
    team.ticker,
    ...(team.aliases || [])
  ].join(" "), team.country, group);
}

export { normalizeFixtureText, teamInitials };
