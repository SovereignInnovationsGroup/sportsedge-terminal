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

const FOOTBALL_TEAM_INITIAL_ASSET_URL = "/api/assets/football-teams?active=true&limit=800";
const FOOTBALL_TEAM_FULL_ASSET_URL = "/api/assets/football-teams?active=true&limit=25000";
let footballTeamAssetCache: { teams: FootballTeamAsset[]; fetchedAt: number; complete: boolean } | null = null;
let footballTeamAssetPrefetchPromise: Promise<FootballTeamAsset[]> | null = null;
let footballTeamAssetHydratePromise: Promise<FootballTeamAsset[]> | null = null;

export function cachedFootballTeamAssets(maxAgeMs = 5 * 60 * 1000) {
  if (!footballTeamAssetCache) return [];
  if (Date.now() - footballTeamAssetCache.fetchedAt > maxAgeMs) return [];
  return footballTeamAssetCache.teams;
}

export function footballTeamAssetCacheIsComplete(maxAgeMs = 5 * 60 * 1000) {
  return Boolean(footballTeamAssetCache?.complete && Date.now() - footballTeamAssetCache.fetchedAt <= maxAgeMs);
}

async function fetchFootballTeamAssets(url: string, complete: boolean) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !Array.isArray(payload.teams)) throw new Error(payload.detail || "team profiles prefetch failed");
  const teams = payload.teams as FootballTeamAsset[];
  footballTeamAssetCache = { teams, fetchedAt: Date.now(), complete };
  return teams;
}

export async function prefetchFootballTeamAssets() {
  const cachedTeams = cachedFootballTeamAssets();
  if (cachedTeams.length) return cachedTeams;
  if (footballTeamAssetPrefetchPromise) return footballTeamAssetPrefetchPromise;
  footballTeamAssetPrefetchPromise = fetchFootballTeamAssets(FOOTBALL_TEAM_INITIAL_ASSET_URL, false)
    .catch(() => [])
    .finally(() => {
      footballTeamAssetPrefetchPromise = null;
    });
  return footballTeamAssetPrefetchPromise;
}

export async function hydrateFootballTeamAssets() {
  if (footballTeamAssetCacheIsComplete()) return cachedFootballTeamAssets();
  if (footballTeamAssetHydratePromise) return footballTeamAssetHydratePromise;
  footballTeamAssetHydratePromise = fetchFootballTeamAssets(FOOTBALL_TEAM_FULL_ASSET_URL, true)
    .catch(() => cachedFootballTeamAssets())
    .finally(() => {
      footballTeamAssetHydratePromise = null;
    });
  return footballTeamAssetHydratePromise;
}

export async function searchFootballTeamAssets(query: string, limit = 500) {
  const trimmed = query.trim();
  if (!trimmed) return cachedFootballTeamAssets();
  const response = await fetch(`/api/assets/football-teams?active=true&limit=${limit}&q=${encodeURIComponent(trimmed)}`, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !Array.isArray(payload.teams)) throw new Error(payload.detail || "team profile search failed");
  return payload.teams as FootballTeamAsset[];
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
