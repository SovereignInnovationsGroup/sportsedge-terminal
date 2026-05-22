export type FootballPlayerStat = {
  id: string;
  season: number;
  providerLeagueId?: string | null;
  leagueName: string | null;
  teamName: string | null;
  position: string | null;
  appearances: number | null;
  lineups: number | null;
  minutes: number | null;
  rating: number | null;
  captain?: boolean | null;
  goalsTotal: number | null;
  assists: number | null;
  shotsTotal: number | null;
  passesTotal: number | null;
  tacklesTotal: number | null;
  duelsTotal?: number | null;
  dribblesAttempts?: number | null;
  foulsDrawn?: number | null;
  cardsYellow: number | null;
  cardsRed: number | null;
  penaltiesScored?: number | null;
  penaltiesMissed?: number | null;
  syncedAt: string | null;
};

export type FootballStaffProfile = {
  id: string;
  name: string;
  age: number | null;
  nationality: string | null;
  photoUrl: string | null;
  role: string;
  syncedAt: string | null;
};

export type FootballTeamProfile = {
  id: string;
  provider: string;
  providerTeamId: string;
  name: string;
  code: string | null;
  country: string | null;
  founded: number | null;
  national: boolean;
  logoUrl: string | null;
  syncedAt: string | null;
  venue: {
    name: string;
    address: string | null;
    city: string | null;
    country: string | null;
    capacity: number | null;
    surface: string | null;
    imageUrl: string | null;
  } | null;
  asset: {
    ticker: string;
    fullName: string;
    shortName: string;
    currentLeague: string;
    logoUrl: string | null;
    aliases: string[];
  } | null;
  squad: Array<{
    id: string;
    providerPlayerId?: string | null;
    name: string;
    firstname?: string | null;
    lastname?: string | null;
    age: number | null;
    birthDate?: string | null;
    birthPlace?: string | null;
    birthCountry?: string | null;
    nationality: string | null;
    height: string | null;
    weight: string | null;
    injured?: boolean | null;
    photoUrl: string | null;
    position: string | null;
    number: number | null;
    stats?: FootballPlayerStat[];
  }>;
  staff?: FootballStaffProfile[];
};

export type FootballPlayerProfile = FootballTeamProfile["squad"][number] & {
  team?: {
    id: string;
    name: string;
    logoUrl: string | null;
    country: string | null;
  } | null;
};
