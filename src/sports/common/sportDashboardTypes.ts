export type BackendRunnerLevel = { odds: number; amount: number; level?: number };
export type BackendRunnerPrice = BackendRunnerLevel | null;
export type BackendRunner = {
  name: string;
  back?: BackendRunnerPrice;
  lay?: BackendRunnerPrice;
  backLevels?: BackendRunnerLevel[];
  layLevels?: BackendRunnerLevel[];
};

export type BackendExchangeMatch = {
  exchange?: string;
  name?: string;
  sportName?: string;
  competitionName?: string | null;
  startAt?: string | null;
  observedAt?: string | null;
  runners: BackendRunner[];
};

export type BackendPriceRow = {
  id: string;
  name: string;
  sportName?: string;
  competitionName?: string | null;
  startAt: string | null;
  matches?: Record<string, BackendExchangeMatch | undefined>;
  aggregateLiquidityByExchange?: Record<string, number>;
};

export type NewsItem = {
  id?: string;
  title?: string;
  display_summary?: string;
  source_name?: string;
  published_at?: string | null;
  discovered_at?: string | null;
  impact_assessment?: { impact_score?: number; urgency?: string; trading_note?: string };
};

export type SportEventRow = {
  id: string;
  name: string;
  competition: string | null;
  country?: string | null;
  startAt: string | null;
  liquidity: number;
  liquidityByExchange: Record<string, number>;
  latestSeenAt: string | null;
  exchanges: string[];
};

export type CapturedSportEvent = {
  id: string;
  provider: string;
  sport: string;
  competition?: string | null;
  country?: string | null;
  name: string;
  startAt?: string | null;
  syncedAt?: string | null;
  updatedAt?: string | null;
};

export type SportLocationFilter = {
  label: string;
  value: string;
  terms?: string[];
};

export type FootballFixtureRow = {
  id?: string;
  providerFixtureId?: string;
  country?: string | null;
  leagueName?: string | null;
  kickoffAt?: string | null;
  syncedAt?: string | null;
  updatedAt?: string | null;
  home?: { name?: string | null };
  away?: { name?: string | null };
};

export type StandingRow = {
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

export type StandingsPayload = {
  generatedAt?: string;
  sport?: string;
  provider?: string;
  sourceStatus?: string;
  rows?: StandingRow[];
};

export type SportEntityRow = {
  id: string;
  provider: string;
  type: string;
  sport: string;
  league?: string | null;
  name: string;
  subtitle?: string | null;
  abbreviation?: string | null;
  position?: string | null;
  country?: string | null;
  age?: number | null;
  imageUrl?: string | null;
  href?: string | null;
  syncedAt?: string | null;
};

export type SportEntitiesPayload = {
  generatedAt?: string;
  sport?: string;
  type?: string;
  total?: number;
  rows?: SportEntityRow[];
};

export const DASHBOARD_EXCHANGES = [
  { key: "betfair", label: "Betfair", short: "BF" },
  { key: "matchbook", label: "Matchbook", short: "MB" },
  { key: "monaco", label: "BetDEX", short: "BX", currency: "USD" },
  { key: "smarkets", label: "Smarkets", short: "SM" },
  { key: "betdaq", label: "Betdaq", short: "BD" },
  { key: "sx", label: "SX" }
] as const;

export const DEFAULT_DATE_SCOPE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" }
];
