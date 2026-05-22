import { Component, Fragment, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import {
  Activity,
  AlertTriangle,
  Apple,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  Database,
  Eye,
  EyeOff,
  ExternalLink,
  LogOut,
  Lock,
  Mail,
  MoreHorizontal,
  Newspaper,
  PauseCircle,
  PlayCircle,
  Radio,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Target,
  Trash2,
  WalletCards,
  Zap,
} from "lucide-react";
import { APP_VERSION } from "./generated/version";
import "./styles/dashboard.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const loginSportsImage = "/images/login-sports-montage.webp";
const sportsEdgeMarketsLogo = "/images/sportsedge-markets-logo.png";
const sportsEdgeMark = "/images/sportsedge-markets-mark.png";

const PRIORITY_SPORTS = [
  {
    label: "Football",
    value: "football",
    detail: "Soccer, Premier League, Champions League, MLS",
    newsAliases: ["football", "soccer"]
  },
  {
    label: "Tennis",
    value: "tennis",
    detail: "ATP, WTA, Grand Slams",
    newsAliases: ["tennis"]
  },
  {
    label: "Baseball",
    value: "baseball",
    detail: "MLB, moneyline, totals, player news",
    newsAliases: ["baseball"]
  },
  {
    label: "Basketball",
    value: "basketball",
    detail: "NBA, WNBA, EuroLeague",
    newsAliases: ["basketball"]
  },
  {
    label: "Golf",
    value: "golf",
    detail: "PGA, DP World, majors",
    newsAliases: ["golf"]
  }
];

const TERMINAL_TOP_SPORTS = [
  { label: "Football", value: "football", route: "#football" },
  { label: "Horse Racing", value: "horseracing", route: "#horseracing" },
  { label: "Tennis", value: "tennis", route: "#tennis" },
  { label: "Golf", value: "golf", route: "#golf" },
  { label: "News", value: "news", route: "#news" }
] as const;

const TERMINAL_FOOTBALL_NAV = [
  { label: "Back", value: "all-sports", route: "#dashboard", tone: "back" },
  { label: "Football", value: "football", route: "#football", tone: "sport" },
  { label: "Liquidity", value: "liquidity", route: "#liquidity" },
  { label: "Bias Matrix", value: "bias-matrix", route: "#bias-matrix" },
  { label: "Arbs", value: "arbs", route: "#arbs" },
  { label: "Profiles", value: "profile-mockup", route: "#profile-mockup" }
] as const;

const TERMINAL_FOOTBALL_MODE_VALUES = new Set(["football", "liquidity", "bias-matrix", "arbs", "profile-mockup"]);

const TERMINAL_SPORT_VALUES = new Set(["football", "horseracing", "tennis", "golf"]);

const SPORT_MARKET_GROUPS: Record<string, Array<{ label: string; value: string }>> = {
  football: [
    { label: "All", value: "all" },
    { label: "English", value: "english" },
    { label: "Scottish", value: "scottish" },
    { label: "UEFA", value: "uefa" },
    { label: "European", value: "european" },
    { label: "International", value: "international" },
    { label: "World", value: "world" }
  ],
  tennis: [
    { label: "All", value: "all" },
    { label: "Today", value: "today" },
    { label: "ATP", value: "atp" },
    { label: "WTA", value: "wta" },
    { label: "Slams", value: "slam" },
    { label: "Futures", value: "futures" }
  ],
  baseball: [
    { label: "All", value: "all" },
    { label: "Today", value: "today" },
    { label: "MLB", value: "mlb" },
    { label: "Futures", value: "futures" }
  ],
  basketball: [
    { label: "All", value: "all" },
    { label: "Today", value: "today" },
    { label: "NBA", value: "nba" },
    { label: "WNBA", value: "wnba" },
    { label: "Europe", value: "europe" },
    { label: "Futures", value: "futures" }
  ],
  golf: [
    { label: "All", value: "all" },
    { label: "Today", value: "today" },
    { label: "PGA", value: "pga" },
    { label: "Majors", value: "major" },
    { label: "Matchups", value: "matchup" },
    { label: "Futures", value: "futures" }
  ]
};

type FootballGridFilter = { label: string; value: string };

const AGTEST_FOOTBALL_PRIMARY_FILTERS: FootballGridFilter[] = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "UK", value: "uk" },
  { label: "Europe", value: "european" },
  { label: "UEFA", value: "uefa" },
  { label: "International", value: "international" },
  { label: "World", value: "world" }
];

const AGTEST_FOOTBALL_SECONDARY_FILTERS: Record<string, FootballGridFilter[]> = {
  uk: [
    { label: "All UK", value: "uk" },
    { label: "England", value: "english" },
    { label: "Premier League", value: "premier-league" },
    { label: "Championship", value: "championship" },
    { label: "League One", value: "league-one" },
    { label: "League Two", value: "league-two" },
    { label: "FA Cup", value: "fa-cup" },
    { label: "EFL Cup", value: "efl-cup" },
    { label: "Scotland", value: "scottish" },
    { label: "Wales", value: "wales" },
    { label: "N. Ireland", value: "northern-ireland" }
  ],
  european: [
    { label: "All Europe", value: "european" },
    { label: "Germany", value: "germany" },
    { label: "Bundesliga", value: "bundesliga" },
    { label: "2. Bundesliga", value: "2-bundesliga" },
    { label: "Spain", value: "spain" },
    { label: "La Liga", value: "la-liga" },
    { label: "Italy", value: "italy" },
    { label: "Serie A", value: "serie-a" },
    { label: "France", value: "france" },
    { label: "Ligue 1", value: "ligue-1" },
    { label: "Netherlands", value: "netherlands" },
    { label: "Eredivisie", value: "eredivisie" },
    { label: "Portugal", value: "portugal" },
    { label: "Primeira Liga", value: "primeira-liga" },
    { label: "Turkey", value: "turkey" }
  ],
  uefa: [
    { label: "All UEFA", value: "uefa" },
    { label: "Champions League", value: "champions-league" },
    { label: "Europa League", value: "europa-league" },
    { label: "Conference League", value: "conference-league" },
    { label: "Nations League", value: "nations-league" }
  ],
  international: [
    { label: "All International", value: "international" },
    { label: "World Cup", value: "world-cup" },
    { label: "Euro", value: "euro" },
    { label: "Copa America", value: "copa-america" },
    { label: "AFCON", value: "afcon" },
    { label: "Friendlies", value: "friendlies" }
  ],
  world: [
    { label: "All World", value: "world" },
    { label: "Club World Cup", value: "club-world-cup" },
    { label: "World Cup", value: "world-cup" },
    { label: "International", value: "international" }
  ]
};

const AGTEST_FOOTBALL_FILTER_LABELS = new Map(
  [
    ...AGTEST_FOOTBALL_PRIMARY_FILTERS,
    ...Object.values(AGTEST_FOOTBALL_SECONDARY_FILTERS).flat()
  ].map((filter) => [filter.value, filter.label])
);

const FOOTBALL_LEAGUE_GROUPS: Record<string, Array<{ label: string; value: string }>> = {
  english: [
    { label: "Premier League", value: "premier-league" },
    { label: "Championship", value: "championship" },
    { label: "League One", value: "league-one" },
    { label: "League Two", value: "league-two" },
    { label: "FA Cup", value: "fa-cup" },
    { label: "EFL Cup", value: "efl-cup" }
  ],
  scottish: [
    { label: "Premiership", value: "scottish-premiership" },
    { label: "Championship", value: "scottish-championship" },
    { label: "League One", value: "scottish-league-one" },
    { label: "League Two", value: "scottish-league-two" }
  ],
  uefa: [
    { label: "Champions League", value: "champions-league" },
    { label: "Europa League", value: "europa-league" },
    { label: "Conference League", value: "conference-league" },
    { label: "Nations League", value: "nations-league" }
  ],
  european: [
    { label: "La Liga", value: "la-liga" },
    { label: "Serie A", value: "serie-a" },
    { label: "Bundesliga", value: "bundesliga" },
    { label: "Ligue 1", value: "ligue-1" },
    { label: "Eredivisie", value: "eredivisie" },
    { label: "Primeira Liga", value: "primeira-liga" }
  ],
  international: [
    { label: "World Cup", value: "world-cup" },
    { label: "Euro", value: "euro" },
    { label: "Copa America", value: "copa-america" },
    { label: "AFCON", value: "afcon" },
    { label: "Friendlies", value: "friendlies" }
  ],
  world: [
    { label: "Club World Cup", value: "club-world-cup" },
    { label: "World Cup", value: "world-cup" },
    { label: "International", value: "international" }
  ]
};

const FOOTBALL_GROUP_TERMS: Record<string, string[]> = {
  "premier-league": ["premier league"],
  championship: ["championship", "efl championship"],
  "league-one": ["league one", "efl league one"],
  "league-two": ["league two", "efl league two"],
  "fa-cup": ["fa cup"],
  "efl-cup": ["efl cup", "carabao cup", "league cup"],
  "scottish-premiership": ["scottish premiership"],
  "scottish-championship": ["scottish championship"],
  "scottish-league-one": ["scottish league one"],
  "scottish-league-two": ["scottish league two"],
  "champions-league": ["champions league", "uefa champions league"],
  "europa-league": ["europa league", "uefa europa league"],
  "conference-league": ["conference league", "uefa conference league"],
  "nations-league": ["nations league"],
  "la-liga": ["la liga"],
  "serie-a": ["serie a"],
  bundesliga: ["bundesliga"],
  "2-bundesliga": ["2. bundesliga", "2 bundesliga", "bundesliga 2"],
  "ligue-1": ["ligue 1"],
  eredivisie: ["eredivisie"],
  "primeira-liga": ["primeira liga"],
  "world-cup": ["world cup"],
  euro: [" euro ", "uefa euro", "european championship"],
  "copa-america": ["copa america", "copa américa"],
  afcon: ["afcon", "africa cup"],
  friendlies: ["friendly", "friendlies"],
  "club-world-cup": ["club world cup", "fifa club world cup"]
};

function footballRegionByValue(value: string) {
  return SPORT_MARKET_GROUPS.football.find((region) => region.value === value);
}

function footballLeagueByValue(value: string) {
  for (const [region, leagues] of Object.entries(FOOTBALL_LEAGUE_GROUPS)) {
    const league = leagues.find((item) => item.value === value);
    if (league) return { region, league };
  }
  return null;
}

const PRIORITY_NEWS_SPORTS = PRIORITY_SPORTS.flatMap((sport) => sport.newsAliases);
const SPORT_LABELS: Map<string, string> = new Map(PRIORITY_SPORTS.map((sport) => [sport.value, sport.label]));
const MATRIX_SPORT_VALUES = new Set(PRIORITY_SPORTS.map((sport) => sport.value));
SPORT_LABELS.set("horse-racing", "Horse Racing");
SPORT_LABELS.set("horse_racing", "Horse Racing");
SPORT_LABELS.set("horseracing", "Horse Racing");

const SOCIAL_NEWS_SPORTS = [
  { label: "All", value: "", mark: "ALL", aliases: [] },
  { label: "Football", value: "football", mark: "FB", aliases: ["football", "soccer"] },
  { label: "Tennis", value: "tennis", mark: "TN", aliases: ["tennis"] },
  { label: "Baseball", value: "baseball", mark: "BB", aliases: ["baseball"] },
  { label: "Basketball", value: "basketball", mark: "BK", aliases: ["basketball"] },
  { label: "Golf", value: "golf", mark: "GF", aliases: ["golf"] }
];

const DIAGNOSTIC_EXCHANGES = [
  { key: "polymarket", label: "Polymarket" },
  { key: "kalshi", label: "Kalshi" },
  { key: "betfair", label: "Betfair" },
  { key: "matchbook", label: "Matchbook" }
] as const;

const ENTRY_DASHBOARD_EXCHANGES = DIAGNOSTIC_EXCHANGES.filter((exchange) => exchange.key === "betfair" || exchange.key === "matchbook");
const ENTRY_DASHBOARD_SPORTS = [
  PRIORITY_SPORTS[0],
  { label: "Horse Racing", value: "horseracing", detail: "Betfair and Matchbook racing liquidity", newsAliases: ["horse_racing", "horseracing", "racing"] },
  ...PRIORITY_SPORTS.slice(1)
];

const SPORT_DASHBOARDS: Record<string, {
  headline: string;
  subline: string;
  fixtures: Array<[string, string, string, string]>;
  markets: Array<[string, string, string]>;
  signals: Array<[string, string, string]>;
}> = {
  football: {
    headline: "Football Market Desk",
    subline: "Today’s fixture board, cross-exchange liquidity, and live media/social signals.",
    fixtures: [
      ["18:30", "Arsenal v Newcastle", "Premier League", "Match odds live"],
      ["19:00", "Barcelona v Sevilla", "La Liga", "Totals watch"],
      ["19:45", "Inter v Lazio", "Serie A", "Draw pressure"],
      ["20:00", "PSG v Lyon", "Ligue 1", "Team news pending"],
      ["21:00", "LAFC v Seattle", "MLS", "Late US liquidity"]
    ],
    markets: [["Matchbook", "GBP 1.24m", "+12.8%"], ["SX", "GBP 428k", "+6.1%"], ["Kalshi", "GBP 186k", "+3.4%"]],
    signals: [["Arb count", "7", "active"], ["News impact", "86", "high"], ["Open risk", "GBP 18.4k", "within limit"]]
  },
  tennis: {
    headline: "Tennis Market Desk",
    subline: "ATP/WTA schedule watch with player-news sensitivity and set-market movement.",
    fixtures: [
      ["11:00", "Musetti v Draper", "ATP", "Pre-match"],
      ["12:30", "Gauff v Paolini", "WTA", "Price watch"],
      ["14:00", "Alcaraz v Rune", "ATP", "High liquidity"],
      ["16:30", "Sabalenka v Zheng", "WTA", "Injury watch"]
    ],
    markets: [["SX", "GBP 312k", "+8.9%"], ["Kalshi", "GBP 94k", "+4.2%"], ["Matchbook", "GBP 88k", "+2.1%"]],
    signals: [["Serve hold model", "72", "stable"], ["Player news", "41", "medium"], ["In-play edge", "+3.7%", "watch"]]
  },
  baseball: {
    headline: "Baseball Market Desk",
    subline: "MLB moneyline, totals, starting pitcher updates, and weather-driven moves.",
    fixtures: [
      ["18:05", "Yankees v Red Sox", "MLB", "Pitcher confirmed"],
      ["19:10", "Mets v Phillies", "MLB", "Weather watch"],
      ["20:40", "Dodgers v Padres", "MLB", "Totals pressure"],
      ["21:05", "Cubs v Cardinals", "MLB", "Lineup pending"]
    ],
    markets: [["SX", "GBP 518k", "+10.4%"], ["Kalshi", "GBP 214k", "+5.5%"], ["Model", "64%", "confident"]],
    signals: [["Pitcher delta", "5", "active"], ["Weather impact", "31", "low"], ["Totals drift", "+1.8%", "watch"]]
  },
  golf: {
    headline: "Golf Market Desk",
    subline: "Outrights, round matchups, withdrawals, and course-condition signals.",
    fixtures: [
      ["08:00", "DP World Tour Round 1", "Golf", "Tee times"],
      ["12:15", "PGA Featured Groups", "Golf", "Weather watch"],
      ["14:30", "Major outright board", "Golf", "Liquidity building"],
      ["17:00", "Round leader market", "Golf", "Late money"]
    ],
    markets: [["Matchbook", "GBP 642k", "+14.1%"], ["Kalshi", "GBP 52k", "+1.7%"], ["Model", "58%", "neutral"]],
    signals: [["Withdrawal risk", "2", "low"], ["Weather edge", "44", "medium"], ["Outright drift", "+2.3%", "watch"]]
  },
  horseracing: {
    headline: "Horse Racing Market Desk",
    subline: "Racing cards, going updates, non-runners, and sharp-money movement.",
    fixtures: [
      ["13:50", "Southwell 6f Handicap", "UK Racing", "Going standard"],
      ["14:20", "Leopardstown Maiden", "Ireland", "Watch paddock"],
      ["15:05", "Newmarket Listed Stakes", "UK Racing", "Strong volume"],
      ["16:10", "Chelmsford Nursery", "UK Racing", "Late price moves"]
    ],
    markets: [["Matchbook", "GBP 1.86m", "+18.6%"], ["Betfair map", "pending", "fixing"], ["Model", "61%", "watch"]],
    signals: [["Non-runner alerts", "3", "active"], ["Going impact", "52", "medium"], ["Late steamers", "9", "active"]]
  },
  rugby: {
    headline: "Rugby Market Desk",
    subline: "Team sheets, injuries, handicap markets, and in-play territorial pressure.",
    fixtures: [
      ["15:00", "Leinster v Toulouse", "Champions Cup", "Team sheet"],
      ["17:30", "Saracens v Bath", "Premiership", "Handicap watch"],
      ["19:00", "Stormers v Bulls", "URC", "Weather watch"],
      ["20:15", "France U20 v England U20", "International", "Low liquidity"]
    ],
    markets: [["Matchbook", "GBP 128k", "+4.6%"], ["SX", "GBP 76k", "+2.8%"], ["Model", "55%", "neutral"]],
    signals: [["Team news impact", "47", "medium"], ["Handicap move", "+1.5", "watch"], ["Weather edge", "22", "low"]]
  },
  basketball: {
    headline: "Basketball Market Desk",
    subline: "NBA/WNBA totals, injury reports, player props, and fast in-play moves.",
    fixtures: [
      ["18:00", "Celtics v Knicks", "NBA", "Injury report"],
      ["19:30", "Lakers v Warriors", "NBA", "Totals watch"],
      ["21:00", "Aces v Liberty", "WNBA", "Team news"],
      ["22:15", "Real Madrid v Barcelona", "EuroLeague", "Spread watch"]
    ],
    markets: [["SX", "GBP 384k", "+9.2%"], ["Kalshi", "GBP 166k", "+3.8%"], ["Model", "67%", "positive"]],
    signals: [["Injury impact", "63", "high"], ["Totals drift", "+4.5", "active"], ["Prop correlation", "29", "low"]]
  }
};

Object.values(SPORT_DASHBOARDS).forEach((dashboard) => {
  dashboard.fixtures = [];
  dashboard.markets = [];
  dashboard.signals = [];
});

const EXCHANGE_COLUMNS = [
  { key: "bf", label: "BF", name: "Betfair", currency: "GBP", supports: ["football", "tennis", "golf", "basketball"] },
  { key: "mb", label: "MB", name: "Matchbook", currency: "GBP", supports: ["football", "tennis", "golf", "basketball"] },
  { key: "sx", label: "SX", name: "SX", currency: "USD", supports: ["football", "tennis", "baseball", "basketball"] },
  { key: "ks", label: "KS", name: "Kalshi", currency: "USD", supports: ["football", "tennis", "baseball", "basketball", "golf"] },
  { key: "pm", label: "PM", name: "Polymarket", currency: "USD", supports: ["football", "tennis", "baseball", "basketball"] }
];

type ExchangeColumn = typeof EXCHANGE_COLUMNS[number];
const BETTING_EXCHANGE_COLUMNS = EXCHANGE_COLUMNS.filter((exchange) => ["bf", "mb", "sx"].includes(exchange.key));
const MATRIX_VENUES = [
  { key: "betfair", label: "Betfair", short: "BF", matchKeys: ["bf", "betfair"], supports: ["football", "tennis", "golf", "basketball"], weight: 1.15 },
  { key: "matchbook", label: "Matchbook", short: "MB", matchKeys: ["mb", "matchbook"], supports: ["football", "tennis", "golf", "basketball"], weight: 1.05 },
  { key: "sx", label: "SX", short: "SX", matchKeys: ["sx"], supports: ["football", "tennis", "baseball", "basketball"], weight: 0.9 }
] as const;
type MatrixVenue = typeof MATRIX_VENUES[number];
const MATRIX_ACTIVE_SPORT = "football";
const MATRIX_EXCHANGE_KEYS = new Set(["bf", "mb", "sx"]);
const MATRIX_REFERENCE_QUERIES = [
  "Chelsea Manchester City",
  "Arsenal Liverpool",
  "Manchester United",
  "Tottenham",
  "Real Madrid Barcelona",
  "Bayern Munich",
  "PSG",
  "Juventus"
];
type FixtureRow = [string, string, string, string];
type FixtureExchangeSnapshot = {
  value: number;
  volume: number;
  currency: string;
  back?: number;
  lay?: number;
  backSize?: number;
  laySize?: number;
  updatedAt: number;
  source: "api" | "wss";
};

function newsSportFilterValue(value: string) {
  if (!value) return [...PRIORITY_NEWS_SPORTS];
  return [...(PRIORITY_SPORTS.find((sport) => sport.value === value)?.newsAliases || [value])];
}

function normalizeSport(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (["horse-racing", "horseracing", "racing"].includes(normalized)) return "horseracing";
  if (normalized === "soccer") return "football";
  return normalized;
}

function sportMatchesNewsFilter(itemSport: string | null | undefined, selectedSport: string) {
  const aliases = newsSportFilterValue(selectedSport).map(normalizeSport);
  const normalized = normalizeSport(itemSport);
  return aliases.includes(normalized);
}

function socialSportAliases(value: string) {
  return SOCIAL_NEWS_SPORTS.find((sport) => sport.value === value)?.aliases || [];
}

function sportMatchesAliases(itemSport: string | null | undefined, aliases: string[]) {
  if (!aliases.length) return true;
  return aliases.map((sport) => sport.toLowerCase()).includes(String(itemSport || "").trim().toLowerCase());
}

function sportFromHash(hash = window.location.hash) {
  const value = hash.match(/^#sport-([a-z0-9_-]+)/i)?.[1] || "football";
  return PRIORITY_SPORTS.some((sport) => sport.value === value) ? value : "football";
}

function terminalSportFromHash(hash = window.location.hash) {
  const normalized = hash.replace(/^#/, "");
  return TERMINAL_SPORT_VALUES.has(normalized) ? normalized : "football";
}

function isTerminalSportHash(hash = window.location.hash) {
  const normalized = hash.replace(/^#/, "");
  return TERMINAL_SPORT_VALUES.has(normalized);
}

function apiSportValue(value: string) {
  if (value === "horseracing") return "horse_racing";
  return value;
}

function exchangePriceChannel(exchange: ExchangeColumn) {
  return `${exchange.name.toLowerCase()}.price`;
}

function sportsEdgeWsUrl(token: string) {
  const encoded = encodeURIComponent(token);
  return `wss://terminal.sportsedge.markets/ws?token=${encoded}`;
}

function sportsEdgeApiUrl(path: string) {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return path;
  return `https://api.sportsedge.markets${path}`;
}

function fixtureSeed(text: string) {
  return text.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function fixtureExchangeValue(_sport: string, _fixture: FixtureRow, _exchange: ExchangeColumn): FixtureExchangeSnapshot | null {
  return null;
}

function formatExchangeMoney(value: number, currency: string) {
  const symbol = currency === "GBP" ? "£" : "$";
  if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1_000) return `${symbol}${Math.round(value / 1_000)}k`;
  return `${symbol}${Math.round(value).toLocaleString("en-GB")}`;
}

function fixtureExchangeUpdateKey(sport: string, fixture: FixtureRow, exchangeKey: string) {
  return `${sport}:${fixture[0]}:${fixture[1]}:${exchangeKey}`.toLowerCase();
}

function normalizeFixtureText(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(vs?|versus|at)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeExchangeCode(value: unknown) {
  const normalized = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!normalized) return "";
  if (["bf", "betfair"].includes(normalized)) return "bf";
  if (["mb", "matchbook"].includes(normalized)) return "mb";
  if (["sx", "sxbet", "sxmarkets", "sxtrade", "sportx"].includes(normalized)) return "sx";
  if (["ks", "kalshi"].includes(normalized)) return "ks";
  if (["pm", "polymarket"].includes(normalized)) return "pm";
  return normalized;
}

function nestedValue(payload: unknown, keys: string[]): unknown {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] != null) return record[key];
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = nestedValue(value, keys);
      if (nested != null) return nested;
    }
  }
  return undefined;
}

function numberFromPayload(payload: unknown, keys: string[], fallback = 0) {
  const value = nestedValue(payload, keys);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]+/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function firstPositiveNumber(payload: unknown, keys: string[]) {
  const value = numberFromPayload(payload, keys);
  return value > 0 ? value : undefined;
}

function textFromPayload(payload: unknown, keys: string[]) {
  const value = nestedValue(payload, keys);
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function exchangeFromEvent(channel: string, payload: unknown) {
  const direct = normalizeExchangeCode(textFromPayload(payload, [
    "exchange",
    "exchange_code",
    "exchangeCode",
    "venue",
    "source",
    "source_name"
  ]));
  if (direct) return direct;
  return normalizeExchangeCode(channel.split(".")[0]);
}

function extractFixtureExchangeUpdate(channel: string, payload: unknown, sport: string, fixtures: FixtureRow[]) {
  const exchangeKey = exchangeFromEvent(channel, payload);
  const exchange = EXCHANGE_COLUMNS.find((item) => item.key === exchangeKey);
  if (!exchange?.supports.includes(sport)) return null;

  const eventSport = normalizeSport(textFromPayload(payload, ["sport", "sport_name", "category"]));
  if (eventSport && eventSport !== sport && !sportMatchesNewsFilter(eventSport, sport)) return null;

  const eventName = normalizeFixtureText(textFromPayload(payload, [
    "fixture",
    "fixture_name",
    "event_name",
    "eventName",
    "event",
    "match",
    "market_name",
    "marketName",
    "name",
    "title"
  ]));
  if (!eventName) return null;

  const fixture = fixtures.find((row) => {
    const fixtureName = normalizeFixtureText(row[1]);
    return fixtureName.includes(eventName) || eventName.includes(fixtureName) || fixtureName.split(" ").some((part) => part.length > 3 && eventName.includes(part));
  });
  if (!fixture) return null;

  const backSize = firstPositiveNumber(payload, [
    "back_size",
    "backSize",
    "bid_size",
    "bidSize",
    "back_amount",
    "backAmount",
    "available_to_back",
    "availableToBack"
  ]);
  const laySize = firstPositiveNumber(payload, [
    "lay_size",
    "laySize",
    "ask_size",
    "askSize",
    "lay_amount",
    "layAmount",
    "available_to_lay",
    "availableToLay"
  ]);
  const side = textFromPayload(payload, ["side"]).toLowerCase();
  const ladderLevel = Number(firstPositiveNumber(payload, ["ladder_level", "ladderLevel", "level"]) || 1);
  const sideAmount = firstPositiveNumber(payload, ["available_amount", "availableAmount", "amount", "size"]);
  const resolvedBackSize = backSize || (side === "back" ? sideAmount : undefined);
  const resolvedLaySize = laySize || (side === "lay" ? sideAmount : undefined);
  const value = numberFromPayload(payload, [
    "matched_gbp",
    "matched_usd",
    "matched_amount",
    "matchedAmount",
    "matched_volume",
    "matchedVolume",
    "total_matched",
    "totalMatched",
    "liquidity",
    "notional",
    "volume",
    "value"
  ], (resolvedBackSize || 0) + (resolvedLaySize || 0));
  if (!value) return null;

  const volume = Math.max(1, Math.round(numberFromPayload(payload, [
    "market_count",
    "marketCount",
    "markets",
    "runner_count",
    "runnerCount",
    "runners",
    "contracts"
  ], Math.max(1, value / 3200))));
  const currency = textFromPayload(payload, ["currency", "ccy"]) || exchange.currency;
  const back = firstPositiveNumber(payload, [
    "best_back",
    "bestBack",
    "back",
    "bid",
    "best_bid",
    "bestBid",
    "back_price",
    "backPrice",
    "price_back",
    "priceBack"
  ]) || (textFromPayload(payload, ["side"]).toLowerCase() === "back" ? firstPositiveNumber(payload, ["odds", "price", "decimal_odds", "decimalOdds"]) : undefined);
  const lay = firstPositiveNumber(payload, [
    "best_lay",
    "bestLay",
    "lay",
    "ask",
    "best_ask",
    "bestAsk",
    "lay_price",
    "layPrice",
    "price_lay",
    "priceLay"
  ]) || (textFromPayload(payload, ["side"]).toLowerCase() === "lay" ? firstPositiveNumber(payload, ["odds", "price", "decimal_odds", "decimalOdds"]) : undefined);

  return {
    key: fixtureExchangeUpdateKey(sport, fixture, exchange.key),
    snapshot: {
      value,
      volume,
      currency,
      back,
      lay,
      backSize: resolvedBackSize,
      laySize: resolvedLaySize,
      updatedAt: Date.now(),
      source: "wss" as const
    }
  };
}

function competitionCountry(competition: string) {
  const value = competition.toLowerCase();
  const explicitCountry = countryNameFromTextPrefix(competition);
  if (explicitCountry) return explicitCountry;
  if (value.includes("uefa") || value.includes("champions league") || value.includes("europa")) return "Europe";
  if (value.includes("english premier league") || value.includes("england premier league") || value.includes("efl") || value.includes("uk racing") || value.includes("wimbledon")) return "England";
  if (value.includes("la liga")) return "Spain";
  if (value.includes("serie a")) return "Italy";
  if (value.includes("ligue 1")) return "France";
  if (value.includes("mls") || value.includes("mlb") || value.includes("nba") || value.includes("wnba") || value.includes("pga")) return "USA";
  if (value.includes("ireland")) return "Ireland";
  if (value.includes("atp") || value.includes("wta")) return "Tour";
  if (value.includes("urc")) return "International";
  return "Global";
}

function fixtureGroupLabel(competition: string) {
  const value = String(competition || "").trim() || "Football";
  if (value.includes(" / ")) {
    const [country, ...rest] = value.split(" / ");
    const cleanCountry = country.trim() || "Global";
    const cleanCompetition = cleanCompetitionName(cleanCountry, rest.join(" / ").trim() || "Football");
    return `${cleanCountry} / ${cleanCompetition}`;
  }
  const country = competitionCountry(value);
  return `${country} / ${cleanCompetitionName(country, value)}`;
}

function cleanCompetitionName(country: string, competition: string) {
  const source = String(competition || "").trim() || "Football";
  const countryPattern = new RegExp(`^${String(country || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i");
  return source
    .replace(countryPattern, "")
    .replace(/^europe\s+/i, "")
    .replace(/^uk\s+/i, "")
    .replace(/^usa\s+/i, "")
    .trim() || source;
}

function fixtureCompetitionLabel(competition: string, eventName: string) {
  const raw = String(competition || "").trim();
  const normalizedRaw = normalizeSelectionKey(raw);
  const isGeneric = !raw || ["soccer", "football", "global", "exchange prices", "sportsedge"].includes(normalizedRaw);
  const teams = fixtureTeams(eventName);
  const isInternationalFixture = teams.length >= 2 && teams.every((team) => Boolean(countryCodeForName(team)));
  if (isInternationalFixture) {
    const label = raw && !isGeneric && competitionCountry(raw) !== "Global" ? cleanCompetitionName("International", raw) : "Football";
    return `International / ${label}`;
  }
  const assets = teams.map((team) => footballTeamAsset(team)).filter(Boolean) as FootballTeamAsset[];
  const countries = Array.from(new Set(assets.map((asset) => asset.country).filter(Boolean)));
  const leagues = Array.from(new Set(assets.map((asset) => asset.currentLeague).filter(Boolean)));

  const firstLeague = leagues[0] || "Football";
  const leagueCountry = competitionCountry(firstLeague);
  const rawCountry = competitionCountry(raw);
  if ((isGeneric || rawCountry === "Global") && countries.length === 1) {
    const country = countries[0] || leagueCountry;
    const competitionName = raw && !isGeneric ? raw : firstLeague;
    return `${country} / ${cleanCompetitionName(country, competitionName)}`;
  }
  if ((isGeneric || rawCountry === "Global") && countries.length > 1) {
    return `International / ${raw && !isGeneric ? raw : "Football"}`;
  }
  const country = rawCountry;
  return `${country} / ${cleanCompetitionName(country, raw || "Football")}`;
}

function flagEmoji(countryCode: string) {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return code
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

const COUNTRY_FLAG_CODES: Record<string, string> = {
  algeria: "DZ",
  andorra: "AD",
  argentina: "AR",
  australia: "AU",
  austria: "AT",
  belgium: "BE",
  "bosnia": "BA",
  "bosnia and herzegovina": "BA",
  brazil: "BR",
  "cabo verde": "CV",
  canada: "CA",
  chile: "CL",
  china: "CN",
  colombia: "CO",
  croatia: "HR",
  "cote d ivoire": "CI",
  "côte d ivoire": "CI",
  "côte d'ivoire": "CI",
  curacao: "CW",
  "curaçao": "CW",
  czechia: "CZ",
  "czech republic": "CZ",
  denmark: "DK",
  "dr congo": "CD",
  "democratic republic of congo": "CD",
  ecuador: "EC",
  egypt: "EG",
  england: "GB",
  finland: "FI",
  france: "FR",
  germany: "DE",
  ghana: "GH",
  greece: "GR",
  haiti: "HT",
  "ir iran": "IR",
  iran: "IR",
  ireland: "IE",
  italy: "IT",
  japan: "JP",
  jordan: "JO",
  korea: "KR",
  "korea republic": "KR",
  "south korea": "KR",
  mexico: "MX",
  morocco: "MA",
  netherlands: "NL",
  "new zealand": "NZ",
  norway: "NO",
  panama: "PA",
  paraguay: "PY",
  poland: "PL",
  portugal: "PT",
  qatar: "QA",
  "saudi arabia": "SA",
  senegal: "SN",
  singapore: "SG",
  scotland: "GB",
  "south africa": "ZA",
  spain: "ES",
  switzerland: "CH",
  sweden: "SE",
  tunisia: "TN",
  turkey: "TR",
  "türkiye": "TR",
  turkiye: "TR",
  uruguay: "UY",
  usa: "US",
  "united states": "US",
  "united states of america": "US",
  armenia: "AM",
  bhutan: "BT",
  bulgaria: "BG",
  ethiopia: "ET",
  uganda: "UG",
  wales: "GB"
};

const COUNTRY_DISPLAY_NAMES: Record<string, string> = {
  "bosnia and herzegovina": "Bosnia and Herzegovina",
  "cabo verde": "Cabo Verde",
  "cote d ivoire": "Côte d'Ivoire",
  "côte d ivoire": "Côte d'Ivoire",
  "côte d'ivoire": "Côte d'Ivoire",
  "czech republic": "Czech Republic",
  "dr congo": "DR Congo",
  "democratic republic of congo": "DR Congo",
  "ir iran": "IR Iran",
  "korea republic": "Korea Republic",
  "new zealand": "New Zealand",
  "saudi arabia": "Saudi Arabia",
  "south africa": "South Africa",
  "south korea": "Korea Republic",
  "united states": "United States",
  "united states of america": "United States"
};

function countryDisplayName(country: string) {
  const normalized = normalizeSelectionKey(country);
  if (COUNTRY_DISPLAY_NAMES[normalized]) return COUNTRY_DISPLAY_NAMES[normalized];
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function countryNameFromTextPrefix(value: string) {
  const normalized = normalizeSelectionKey(value);
  const country = Object.keys(COUNTRY_FLAG_CODES)
    .sort((a, b) => b.length - a.length)
    .find((name) => normalized === name || normalized.startsWith(`${name} `));
  return country ? countryDisplayName(country) : "";
}

function countryCodeForName(country: string) {
  return COUNTRY_FLAG_CODES[normalizeSelectionKey(country)] || "";
}

function countryFlagImageUrl(country: string) {
  const code = countryCodeForName(country);
  return code ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : "";
}

function directCountryFlag(country: string) {
  const code = countryCodeForName(country);
  if (code) return flagEmoji(code);
  return "";
}

function countryFlag(country: string) {
  const direct = directCountryFlag(country);
  if (direct) return direct;
  const value = country.toLowerCase();
  if (value.includes("england")) return "🇬🇧";
  if (value.includes("germany")) return "🇩🇪";
  if (value.includes("spain")) return "🇪🇸";
  if (value.includes("italy")) return "🇮🇹";
  if (value.includes("france")) return "🇫🇷";
  if (value.includes("usa")) return "🇺🇸";
  if (value.includes("ireland")) return "🇮🇪";
  if (value.includes("europe")) return "🇪🇺";
  if (value.includes("tour")) return "🌐";
  if (value.includes("international")) return "🌐";
  return "🌐";
}

function teamFallbackBadge(team: string) {
  const country = directCountryFlag(team);
  if (country) return country;
  const asset = footballTeamAsset(team);
  return asset?.country ? countryFlag(asset.country) : teamInitials(team);
}

function teamFallbackIsFlag(team: string) {
  return Boolean(directCountryFlag(team) || footballTeamAsset(team)?.country);
}

function teamInitials(name: string) {
  const teams = String(name || "").split(/\s+(?:v|vs|versus)\.?\s+/i);
  const source = teams[0] || name;
  return source
    .replace(/[^a-z0-9\s]/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "SE";
}

function eventTicker(name: string, sport = "") {
  const teams = fixtureTeams(name);
  if (teams.length >= 2) {
    return teams.map((team) => teamTicker(team)).join("-");
  }
  const cleaned = String(name || "")
    .replace(/\b(?:will|the|a|an|and|or|to|in|on|for|of|fc|cf|sc)\b/gi, " ")
    .replace(/[^a-z0-9\s]/gi, " ")
    .trim();
  const initials = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || (SPORT_LABELS.get(sport) || sport || "SE").slice(0, 4).toUpperCase();
}

function compactMarketLabel(value: string) {
  const market = String(value || "").trim();
  const lower = market.toLowerCase();
  if (!market) return { code: "MKT", label: "Market" };
  if (lower.includes("moneyline") || lower.includes("match winner") || lower.includes("match odds")) {
    return { code: "MW", label: market };
  }
  if (lower.includes("over/under") || lower.includes("total") || /\bo\/u\b/i.test(market)) {
    const number = market.match(/\d+(?:\.\d+)?/)?.[0];
    return { code: number ? `OU ${number}` : "OU", label: market };
  }
  if (lower.includes("spread") || lower.includes("handicap")) {
    const number = market.match(/[+-]?\d+(?:\.\d+)?/)?.[0];
    return { code: number ? `SP ${number}` : "SP", label: market };
  }
  if (lower.includes("top 20")) return { code: "T20", label: market };
  if (lower.includes("top 10")) return { code: "T10", label: market };
  if (lower.includes("top 5")) return { code: "T5", label: market };
  if (lower.includes("make cut")) return { code: "CUT", label: market };
  if (lower.includes("winner") || lower.includes("champion")) return { code: "WIN", label: market };
  return {
    code: market
      .replace(/[^a-z0-9\s]/gi, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "MKT",
    label: market
  };
}

function fixtureTeams(name: string) {
  return String(name || "")
    .replace(/\s+-\s+More Markets.*$/i, "")
    .replace(/\s+-\s+Exact Score.*$/i, "")
    .replace(/\s+-\s+Player Props.*$/i, "")
    .replace(/\s+[-–]\s+More .*$/i, "")
    .split(/\s*(?:\/|\s+(?:v|vs|versus)\.?\s+)\s*/i)
    .map((team) => team.replace(/\s+(?:FC|CF|AFC|SC)$/i, "").trim())
    .filter(Boolean)
    .slice(0, 2);
}

type FootballTeamAsset = {
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

const FOOTBALL_TEAM_ASSETS: FootballTeamAsset[] = [
  { slug: "arsenal", ticker: "ARS", fullName: "Arsenal FC", shortName: "Arsenal", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t3.png", aliases: ["Arsenal", "Arsenal FC"] },
  { slug: "aston-villa", ticker: "AVL", fullName: "Aston Villa FC", shortName: "Aston Villa", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t7.png", aliases: ["Aston Villa", "Aston Villa FC"] },
  { slug: "bournemouth", ticker: "BOU", fullName: "AFC Bournemouth", shortName: "Bournemouth", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t91.png", aliases: ["Bournemouth", "AFC Bournemouth"] },
  { slug: "brentford", ticker: "BRE", fullName: "Brentford FC", shortName: "Brentford", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t94.png", aliases: ["Brentford", "Brentford FC"] },
  { slug: "brighton-hove-albion", ticker: "BHA", fullName: "Brighton & Hove Albion FC", shortName: "Brighton", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t36.png", aliases: ["Brighton", "Brighton & Hove Albion", "Brighton and Hove Albion", "Brighton & Hove Albion FC"] },
  { slug: "burnley", ticker: "BUR", fullName: "Burnley FC", shortName: "Burnley", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t90.png", aliases: ["Burnley", "Burnley FC"] },
  { slug: "chelsea", ticker: "CHE", fullName: "Chelsea FC", shortName: "Chelsea", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t8.png", aliases: ["Chelsea", "Chelsea FC"] },
  { slug: "crystal-palace", ticker: "CRY", fullName: "Crystal Palace FC", shortName: "Crystal Palace", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t31.png", aliases: ["Crystal Palace", "Crystal Palace FC"] },
  { slug: "everton", ticker: "EVE", fullName: "Everton FC", shortName: "Everton", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t11.png", aliases: ["Everton", "Everton FC"] },
  { slug: "fulham", ticker: "FUL", fullName: "Fulham FC", shortName: "Fulham", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t54.png", aliases: ["Fulham", "Fulham FC"] },
  { slug: "leeds-united", ticker: "LEE", fullName: "Leeds United FC", shortName: "Leeds", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t2.png", aliases: ["Leeds", "Leeds United", "Leeds United FC"] },
  { slug: "liverpool", ticker: "LIV", fullName: "Liverpool FC", shortName: "Liverpool", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t14.png", aliases: ["Liverpool", "Liverpool FC"] },
  { slug: "manchester-city", ticker: "MCI", fullName: "Manchester City FC", shortName: "Man City", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t43.png", aliases: ["Manchester City", "Manchester City FC", "Man City"] },
  { slug: "manchester-united", ticker: "MUN", fullName: "Manchester United FC", shortName: "Man Utd", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t1.png", aliases: ["Manchester United", "Manchester United FC", "Man United", "Man Utd"] },
  { slug: "newcastle-united", ticker: "NEW", fullName: "Newcastle United FC", shortName: "Newcastle", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t4.png", aliases: ["Newcastle United", "Newcastle United FC", "Newcastle"] },
  { slug: "nottingham-forest", ticker: "NFO", fullName: "Nottingham Forest FC", shortName: "Nott'm Forest", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t17.png", aliases: ["Nott'm Forest", "Nottingham Forest", "Nottingham Forest FC"] },
  { slug: "sunderland", ticker: "SUN", fullName: "Sunderland AFC", shortName: "Sunderland", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t56.png", aliases: ["Sunderland", "Sunderland AFC"] },
  { slug: "tottenham-hotspur", ticker: "TOT", fullName: "Tottenham Hotspur FC", shortName: "Spurs", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t6.png", aliases: ["Tottenham Hotspur", "Tottenham Hotspur FC", "Tottenham", "Spurs"] },
  { slug: "west-ham-united", ticker: "WHU", fullName: "West Ham United FC", shortName: "West Ham", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t21.png", aliases: ["West Ham United", "West Ham United FC", "West Ham"] },
  { slug: "wolverhampton-wanderers", ticker: "WOL", fullName: "Wolverhampton Wanderers FC", shortName: "Wolves", country: "England", currentLeague: "Premier League", logoUrl: "https://resources.premierleague.com/premierleague/badges/70/t39.png", aliases: ["Wolves", "Wolverhampton Wanderers", "Wolverhampton Wanderers FC"] },
  { slug: "bayern-munich", ticker: "BAY", fullName: "FC Bayern Munich", shortName: "Bayern", country: "Germany", currentLeague: "Bundesliga", logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/132.png", aliases: ["Bayern Munich", "Bayern München", "FC Bayern München", "FC Bayern Munich"] },
  { slug: "fc-cologne", ticker: "KOE", fullName: "1. FC Cologne", shortName: "Cologne", country: "Germany", currentLeague: "Bundesliga", logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/122.png", aliases: ["1. FC Köln", "1. FC Koln", "1. FC Cologne", "FC Cologne", "FC Koln", "Cologne"] },
  { slug: "barcelona", ticker: "FCB", fullName: "FC Barcelona", shortName: "Barcelona", country: "Spain", currentLeague: "La Liga", logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png", aliases: ["FC Barcelona", "Barcelona"] },
  { slug: "real-betis", ticker: "BET", fullName: "Real Betis Balompie", shortName: "Real Betis", country: "Spain", currentLeague: "La Liga", logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/244.png", aliases: ["Real Betis", "Real Betis Balompie", "Real Betis Balompié"] },
  { slug: "real-madrid", ticker: "RMA", fullName: "Real Madrid CF", shortName: "Real Madrid", country: "Spain", currentLeague: "La Liga", logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/86.png", aliases: ["Real Madrid", "Real Madrid CF"] },
  { slug: "sevilla", ticker: "SEV", fullName: "Sevilla FC", shortName: "Sevilla", country: "Spain", currentLeague: "La Liga", logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/243.png", aliases: ["Sevilla", "Sevilla FC"] },
  { slug: "juventus", ticker: "JUV", fullName: "Juventus FC", shortName: "Juventus", country: "Italy", currentLeague: "Serie A", logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/111.png", aliases: ["Juventus", "Juventus FC", "Juventus Turin"] },
  { slug: "ac-milan", ticker: "MIL", fullName: "AC Milan", shortName: "AC Milan", country: "Italy", currentLeague: "Serie A", logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/103.png", aliases: ["AC Milan", "Milan"] },
  { slug: "inter-milan", ticker: "INT", fullName: "FC Internazionale Milano", shortName: "Inter", country: "Italy", currentLeague: "Serie A", logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/110.png", aliases: ["Internazionale", "Inter Milan", "FC Internazionale Milano", "Inter"] },
  { slug: "paris-saint-germain", ticker: "PSG", fullName: "Paris Saint-Germain FC", shortName: "PSG", country: "France", currentLeague: "Ligue 1", logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/160.png", aliases: ["Paris Saint-Germain", "Paris Saint Germain", "Paris Saint-Germain FC", "PSG"] }
] as const;

const FOOTBALL_TEAM_BY_ALIAS = new Map<string, FootballTeamAsset>();

const FOOTBALL_TEAM_CANONICAL_ALIASES: Record<string, string> = {
  "bahir dar": "bahardar",
  "bahir dar kenema": "bahardar",
  "hadiyah hosanna": "hadiya hosaena",
  "hadiya hosanna": "hadiya hosaena",
  "hadiyah hossana": "hadiya hosaena",
  "ethiopia negd bank": "ethiopia nigd bank",
  "ethiopia niged bank": "ethiopia nigd bank",
  "ethiopia nigid bank": "ethiopia nigd bank",
  "wolaita dicha": "welayta dicha",
  "wolayita dicha": "welayta dicha",
  "wolayta dicha": "welayta dicha",
  "wolaita decha": "welayta dicha",
  "wolayita decha": "welayta dicha",
  "maroons fc": "maroons",
  "rtc fc": "rtc",
  "paro fc": "paro",
  "updf fc": "updf",
  "bul fc": "bul",
  "kitara fc": "kitara",
  "vipers sc": "vipers",
  "calvary fc": "calvary"
};

function canonicalFootballTeamKey(value: string) {
  const key = normalizeSelectionKey(value)
    .replace(/\bfootball club\b/g, "fc")
    .replace(/\bsports club\b/g, "sc")
    .replace(/\s+/g, " ")
    .trim();
  return FOOTBALL_TEAM_CANONICAL_ALIASES[key] || key;
}

function registerFootballTeamAssets(teams: FootballTeamAsset[]) {
  teams.forEach((team) => {
    const aliases = [team.fullName, team.shortName, team.slug, team.ticker, ...(team.aliases || [])];
    aliases.forEach((alias) => {
      FOOTBALL_TEAM_BY_ALIAS.set(normalizeSelectionKey(alias), team);
      FOOTBALL_TEAM_BY_ALIAS.set(canonicalFootballTeamKey(alias), team);
    });
  });
}

registerFootballTeamAssets(FOOTBALL_TEAM_ASSETS);

FOOTBALL_TEAM_ASSETS.forEach((team) => {
  [team.fullName, team.shortName, team.slug, team.ticker, ...team.aliases].forEach((alias) => {
    FOOTBALL_TEAM_BY_ALIAS.set(normalizeSelectionKey(alias), team);
  });
});

function footballTeamAsset(team: string) {
  const key = canonicalFootballTeamKey(team);
  const direct = FOOTBALL_TEAM_BY_ALIAS.get(key);
  if (direct) return direct;
  let best: FootballTeamAsset | undefined;
  let bestScore = 0;
  FOOTBALL_TEAM_BY_ALIAS.forEach((asset, alias) => {
    if (!alias || alias.length < 4) return;
    if (key === alias) {
      best = asset;
      bestScore = Number.MAX_SAFE_INTEGER;
      return;
    }
    if (key.includes(alias) || alias.includes(key)) {
      const score = Math.min(alias.length, key.length);
      if (score > bestScore) {
        best = asset;
        bestScore = score;
      }
    }
  });
  return best;
}

function teamTicker(team: string) {
  return footballTeamAsset(team)?.ticker || teamInitials(team).slice(0, 3);
}

const TEAM_LOGO_DOMAINS: Record<string, string> = {
  "manchester city": "mancity.com",
  "manchester city fc": "mancity.com",
  "crystal palace": "cpfc.co.uk",
  "crystal palace fc": "cpfc.co.uk",
  "arsenal": "arsenal.com",
  "arsenal fc": "arsenal.com",
  "burnley": "burnleyfootballclub.com",
  "burnley fc": "burnleyfootballclub.com",
  "fc barcelona": "fcbarcelona.com",
  "barcelona": "fcbarcelona.com",
  "liverpool": "liverpoolfc.com",
  "liverpool fc": "liverpoolfc.com",
  "aston villa": "avfc.co.uk",
  "aston villa fc": "avfc.co.uk",
  "bayern munchen": "fcbayern.com",
  "bayern munich": "fcbayern.com",
  "fc bayern munchen": "fcbayern.com",
  "paris saint germain": "psg.fr",
  "paris saint-germain fc": "psg.fr",
  "psg": "psg.fr",
  "real betis": "realbetisbalompie.es",
  "real betis balompie": "realbetisbalompie.es",
  "elche": "elchecf.es",
  "elche cf": "elchecf.es",
  "west ham united": "whufc.com",
  "west ham united fc": "whufc.com",
  "leeds united": "leedsunited.com",
  "leeds united fc": "leedsunited.com",
  "chelsea": "chelseafc.com",
  "chelsea fc": "chelseafc.com",
  "tottenham hotspur": "tottenhamhotspur.com",
  "tottenham hotspur fc": "tottenhamhotspur.com",
  "manchester united": "manutd.com",
  "manchester united fc": "manutd.com",
  "newcastle united": "newcastleunited.com",
  "newcastle united fc": "newcastleunited.com",
  "real madrid": "realmadrid.com",
  "real madrid cf": "realmadrid.com",
  "atletico madrid": "atleticodemadrid.com",
  "club atletico de madrid": "atleticodemadrid.com",
  "sevilla": "sevillafc.es",
  "sevilla fc": "sevillafc.es",
  "valencia": "valenciacf.com",
  "valencia cf": "valenciacf.com",
  "villarreal": "villarrealcf.es",
  "villarreal cf": "villarrealcf.es",
  "espanyol": "rcdespanyol.com",
  "rcd espanyol de barcelona": "rcdespanyol.com",
  "girona": "gironafc.cat",
  "girona fc": "gironafc.cat",
  "osasuna": "osasuna.es",
  "ca osasuna": "osasuna.es",
  "real sociedad": "realsociedad.eus",
  "rc celta de vigo": "rccelta.es",
  "celta vigo": "rccelta.es",
  "internazionale": "inter.it",
  "fc internazionale": "inter.it",
  "inter milan": "inter.it",
  "ac milan": "acmilan.com",
  "juventus": "juventus.com",
  "juventus fc": "juventus.com",
  "as roma": "asroma.com",
  "lazio": "sslazio.it",
  "napoli": "sscnapoli.it",
  "ssc napoli": "sscnapoli.it",
  "parma": "parmacalcio1913.com",
  "como": "comofootball.com",
  "werder bremen": "werder.de",
  "borussia dortmund": "bvb.de",
  "rb leipzig": "rbleipzig.com",
  "sc freiburg": "scfreiburg.com",
  "vfl wolfsburg": "vfl-wolfsburg.de",
  "fc st pauli": "fcstpauli.com",
  "bayer leverkusen": "bayer04.de",
  "ajax": "ajax.nl",
  "psv": "psv.nl",
  "celtic": "celticfc.com",
  "celtic fc": "celticfc.com",
  "rangers": "rangers.co.uk",
  "rangers fc": "rangers.co.uk",
  "motherwell": "motherwellfc.co.uk",
  "motherwell fc": "motherwellfc.co.uk",
  "harts": "heartsfc.co.uk",
  "hearts": "heartsfc.co.uk",
  "hoped": "heartsfc.co.uk",
  "new york yankees": "mlb.com/yankees",
  "yankees": "mlb.com/yankees",
  "boston red sox": "mlb.com/redsox",
  "red sox": "mlb.com/redsox",
  "los angeles lakers": "nba.com/lakers",
  "lakers": "nba.com/lakers",
  "boston celtics": "nba.com/celtics",
  "celtics": "nba.com/celtics",
  "golden state warriors": "nba.com/warriors",
  "warriors": "nba.com/warriors",
  "new york knicks": "nba.com/knicks",
  "knicks": "nba.com/knicks",
  "manchester city women": "mancity.com",
  "chelsea women": "chelseafc.com",
  "sunderland": "safc.com",
  "sunderland afc": "safc.com",
  "bournemouth": "afcb.co.uk",
  "afc bournemouth": "afcb.co.uk",
  "nottingham forest": "nottinghamforest.co.uk",
  "brentford": "brentfordfc.com",
  "brighton hove albion": "brightonandhovealbion.com",
  "fulham": "fulhamfc.com",
  "everton": "evertonfc.com",
  "leicester city": "lcfc.com",
  "southampton": "southamptonfc.com",
  "wolves": "wolves.co.uk",
  "wolverhampton wanderers": "wolves.co.uk",
  "ipswich town": "itfc.co.uk",
  "sheffield united": "sufc.co.uk",
  "norwich city": "canaries.co.uk",
  "middlesbrough": "mfc.co.uk",
  "blackburn rovers": "rovers.co.uk",
  "bolton wanderers": "bwfc.co.uk",
  "stockport county": "stockportcounty.com",
  "wrexham": "wrexhamafc.co.uk",
  "inter miami": "intermiamicf.com",
  "lafc": "lafc.com",
  "seattle sounders": "soundersfc.com",
  "la galaxy": "lagalaxy.com",
  "atlanta united": "atlutd.com",
  "new york city": "nycfc.com",
  "new york city fc": "nycfc.com",
  "olympique lyonnais": "ol.fr",
  "lyon": "ol.fr",
  "olympique de marseille": "om.fr",
  "marseille": "om.fr",
  "stade rennais": "staderennais.com",
  "stade rennais 1901": "staderennais.com",
  "lille osc": "losc.fr",
  "lille": "losc.fr",
  "aj auxerre": "aja.fr",
  "auxerre": "aja.fr",
  "racing club de lens": "rclens.fr",
  "lens": "rclens.fr",
  "ogc nice": "ogcnice.com",
  "nice": "ogcnice.com",
  "fc metz": "fcmetz.com",
  "metz": "fcmetz.com",
  "torino": "torinofc.it",
  "torino fc": "torinofc.it",
  "cagliari": "cagliaricalcio.com",
  "cagliari calcio": "cagliaricalcio.com",
  "sassuolo": "sassuolocalcio.it",
  "us sassuolo calcio": "sassuolocalcio.it",
  "lecce": "uslecce.it",
  "us lecce": "uslecce.it",
  "eintracht frankfurt": "eintracht.de",
  "vfb stuttgart": "vfb.de",
  "tsg 1899 hoffenheim": "tsg-hoffenheim.de",
  "hoffenheim": "tsg-hoffenheim.de",
  "borussia monchengladbach": "borussia.de",
  "borussia mönchengladbach": "borussia.de",
  "fc koln": "fc.de",
  "1 fc koln": "fc.de",
  "1 fc köln": "fc.de",
  "fc augsburg": "fcaugsburg.de",
  "augsburg": "fcaugsburg.de",
  "union berlin": "fc-union-berlin.de",
  "1 fc union berlin": "fc-union-berlin.de"
};

const TEAM_LOGO_URLS: Record<string, string> = {
  "arsenal": "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
  "chelsea": "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
  "chelsea fc": "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
  "liverpool": "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
  "liverpool fc": "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
  "manchester city": "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
  "manchester city fc": "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
  "manchester united": "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
  "manchester united fc": "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
  "tottenham hotspur": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
  "tottenham hotspur fc": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
  "newcastle united": "https://a.espncdn.com/i/teamlogos/soccer/500/361.png",
  "newcastle united fc": "https://a.espncdn.com/i/teamlogos/soccer/500/361.png",
  "everton": "https://a.espncdn.com/i/teamlogos/soccer/500/368.png",
  "everton fc": "https://a.espncdn.com/i/teamlogos/soccer/500/368.png",
  "aston villa": "https://a.espncdn.com/i/teamlogos/soccer/500/362.png",
  "aston villa fc": "https://a.espncdn.com/i/teamlogos/soccer/500/362.png",
  "burnley": "https://a.espncdn.com/i/teamlogos/soccer/500/379.png",
  "burnley fc": "https://a.espncdn.com/i/teamlogos/soccer/500/379.png",
  "west ham united": "https://a.espncdn.com/i/teamlogos/soccer/500/371.png",
  "west ham united fc": "https://a.espncdn.com/i/teamlogos/soccer/500/371.png",
  "crystal palace": "https://a.espncdn.com/i/teamlogos/soccer/500/384.png",
  "crystal palace fc": "https://a.espncdn.com/i/teamlogos/soccer/500/384.png",
  "leeds united": "https://a.espncdn.com/i/teamlogos/soccer/500/341.png",
  "leeds united fc": "https://a.espncdn.com/i/teamlogos/soccer/500/341.png",
  "real madrid": "https://a.espncdn.com/i/teamlogos/soccer/500/86.png",
  "real madrid cf": "https://a.espncdn.com/i/teamlogos/soccer/500/86.png",
  "barcelona": "https://a.espncdn.com/i/teamlogos/soccer/500/83.png",
  "fc barcelona": "https://a.espncdn.com/i/teamlogos/soccer/500/83.png",
  "atletico madrid": "https://a.espncdn.com/i/teamlogos/soccer/500/1068.png",
  "sevilla": "https://a.espncdn.com/i/teamlogos/soccer/500/243.png",
  "sevilla fc": "https://a.espncdn.com/i/teamlogos/soccer/500/243.png",
  "valencia": "https://a.espncdn.com/i/teamlogos/soccer/500/94.png",
  "valencia cf": "https://a.espncdn.com/i/teamlogos/soccer/500/94.png",
  "villarreal": "https://a.espncdn.com/i/teamlogos/soccer/500/102.png",
  "villarreal cf": "https://a.espncdn.com/i/teamlogos/soccer/500/102.png",
  "bayern munich": "https://a.espncdn.com/i/teamlogos/soccer/500/132.png",
  "bayern munchen": "https://a.espncdn.com/i/teamlogos/soccer/500/132.png",
  "1 cologne": "https://a.espncdn.com/i/teamlogos/soccer/500/122.png",
  "1 fc cologne": "https://a.espncdn.com/i/teamlogos/soccer/500/122.png",
  "fc cologne": "https://a.espncdn.com/i/teamlogos/soccer/500/122.png",
  "1 koln": "https://a.espncdn.com/i/teamlogos/soccer/500/122.png",
  "1 fc koln": "https://a.espncdn.com/i/teamlogos/soccer/500/122.png",
  "borussia dortmund": "https://a.espncdn.com/i/teamlogos/soccer/500/124.png",
  "psg": "https://a.espncdn.com/i/teamlogos/soccer/500/160.png",
  "paris saint germain": "https://a.espncdn.com/i/teamlogos/soccer/500/160.png",
  "juventus": "https://a.espncdn.com/i/teamlogos/soccer/500/111.png",
  "real betis": "https://a.espncdn.com/i/teamlogos/soccer/500/244.png",
  "real betis balompie": "https://a.espncdn.com/i/teamlogos/soccer/500/244.png",
  "ac milan": "https://a.espncdn.com/i/teamlogos/soccer/500/103.png",
  "inter milan": "https://a.espncdn.com/i/teamlogos/soccer/500/110.png",
  "internazionale": "https://a.espncdn.com/i/teamlogos/soccer/500/110.png",
  "fc nantes": "https://a.espncdn.com/i/teamlogos/soccer/500/165.png",
  "nantes": "https://a.espncdn.com/i/teamlogos/soccer/500/165.png",
  "toulouse": "https://a.espncdn.com/i/teamlogos/soccer/500/179.png",
  "toulouse fc": "https://a.espncdn.com/i/teamlogos/soccer/500/179.png"
};

function teamLogoAsset(team: string) {
  const key = normalizeSelectionKey(team);
  const flagUrl = countryFlagImageUrl(team);
  if (flagUrl) return { url: flagUrl, isFlag: true };
  const asset = footballTeamAsset(team);
  if (asset?.national && asset.flagUrl) return { url: asset.flagUrl, isFlag: true };
  if (asset?.logoUrl) return { url: asset.logoUrl, isFlag: false };
  if (asset?.flagUrl) return { url: asset.flagUrl, isFlag: true };
  return TEAM_LOGO_URLS[key] ? { url: TEAM_LOGO_URLS[key], isFlag: false } : null;
}

function eventLogoAsset(name: string) {
  const normalized = name.toLowerCase();
  if (/\bfifa\b|\bworld cup\b|\bclub world cup\b/.test(normalized)) {
    return { url: "/images/fifa-logo.svg", isFlag: false };
  }
  return null;
}

function teamLogoUrl(team: string) {
  return teamLogoAsset(team)?.url || "";
}

function TeamLogoStack({ name }: { name: string }) {
  const teams = fixtureTeams(name);
  if (teams.length === 0) {
    const eventLogo = eventLogoAsset(name);
    if (eventLogo) {
      return (
        <span className="team-logo-stack" aria-hidden="true">
          <span className="team-logo-frame event-logo" title={name}>
            <img src={eventLogo.url} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <span>{teamFallbackBadge(name)}</span>
          </span>
        </span>
      );
    }
    return <span className="team-badge">{teamInitials(name)}</span>;
  }
  return (
    <span className="team-logo-stack" aria-hidden="true">
      {teams.map((team) => {
        const logo = teamLogoAsset(team);
        return logo && !logo.isFlag ? (
          <span className="team-logo-frame" key={team} title={team}>
            <img src={logo.url} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <span>{teamInitials(team)}</span>
          </span>
        ) : (
          <span className="team-badge small" key={team}>{teamInitials(team)}</span>
        );
      })}
    </span>
  );
}

function FixtureTeamLogoStack({ fixture }: { fixture: FootballFixture }) {
  const teams = [fixture.home, fixture.away];
  return (
    <span className="team-logo-stack" aria-hidden="true">
      {teams.map((team) => {
        const fallbackLogo = teamLogoAsset(team.name);
        const logoUrl = team.logoUrl || fallbackLogo?.url || "";
        const useLogo = logoUrl && (team.logoUrl || !fallbackLogo?.isFlag);
        return useLogo ? (
          <span className="team-logo-frame" key={`${fixture.id}-${team.providerTeamId || team.name}`} title={team.name}>
            <img src={logoUrl} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <span>{teamInitials(team.name)}</span>
          </span>
        ) : (
          <span className="team-badge small" key={`${fixture.id}-${team.name}`}>
            {teamInitials(team.name)}
          </span>
        );
      })}
    </span>
  );
}

function MatrixEventCell({ name, sport }: { name: string; sport: string }) {
  const teams = fixtureTeams(name);
  if (teams.length >= 2) {
    return (
      <div className="matrix-event-teams" title={name}>
        {teams.map((team, index) => {
          const logo = teamLogoAsset(team);
          return (
            <Fragment key={`${team}-${index}`}>
              {index > 0 && <span className="matrix-event-vs">-</span>}
              <span className="matrix-team-side">
                {logo ? (
                  <span className={`team-logo-frame matrix-team-logo${logo.isFlag ? " flag-logo" : ""}`} title={team}>
                    <img src={logo.url} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                    <span>{teamInitials(team)}</span>
                  </span>
                ) : (
                  <span className={`team-badge small${teamFallbackIsFlag(team) ? " flag" : ""}`}>{teamFallbackBadge(team)}</span>
                )}
                <strong>{team}</strong>
              </span>
            </Fragment>
          );
        })}
      </div>
    );
  }
  return (
    <div className="matrix-event-display" title={name}>
      <TeamLogoStack name={name} />
      <div>
        <strong>{name}</strong>
        <span>{eventTicker(name, sport)}</span>
      </div>
    </div>
  );
}

function searchSport(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const terminalSport = TERMINAL_TOP_SPORTS.find((sport) =>
    sport.value.includes(normalized)
    || sport.label.toLowerCase().includes(normalized)
    || (sport.value === "horseracing" && ["horse", "racing", "horse racing"].some((alias) => alias.includes(normalized)))
  );
  if (terminalSport) return terminalSport.value;
  return PRIORITY_SPORTS.find((sport) =>
    sport.value.includes(normalized)
    || sport.label.toLowerCase().includes(normalized)
    || sport.newsAliases.some((alias) => alias.includes(normalized))
  )?.value || null;
}

type CommandOption = {
  label: string;
  detail: string;
  route: string;
  keywords: string[];
};

const COMMAND_OPTIONS: CommandOption[] = [
  { label: "Chelsea team profile", detail: "Open the detailed SportsEdge profile page", route: "#team/chelsea", keywords: ["chelsea", "team", "profile", "club"] },
  { label: "Upcoming fixtures", detail: "Open today's market dashboard", route: "#dashboard", keywords: ["fixtures", "upcoming", "today", "matches", "games"] },
  { label: "Bias Matrix", detail: "Open the football consensus matrix", route: "#matrix", keywords: ["matrix", "bias", "consensus", "prices"] },
  { label: "Arbs", detail: "Monitor Betfair exchange back and lay books", route: "#arbs", keywords: ["arb", "arbs", "arbitrage", "betfair", "back", "lay"] },
  { label: "Liquidity", detail: "Open the football exchange liquidity board", route: "#liquidity", keywords: ["ag", "agtest", "grid", "test", "liquidity", "prices"] },
  { label: "Bias Matrix", detail: "Open the odds alignment pill matrix", route: "#bias-matrix", keywords: ["agtest2", "alignment", "bias", "matrix", "odds", "unibet", "smarkets"] },
  { label: "Bloomberg mockup", detail: "Open the dense SportsEdge terminal mockup", route: "#bloomberg", keywords: ["bloomberg", "mockup", "terminal", "bb", "demo"] },
  { label: "Odds API diagnostics", detail: "Check provider fields and exchange classification", route: "#oddsapi", keywords: ["odds", "api", "diagnostics", "betfair", "matchbook", "smarkets", "betdaq", "bet365"] },
  { label: "Football markets", detail: "Open the football market board", route: "#liquidity", keywords: ["football", "soccer", "markets", "liquidity"] },
  { label: "News", detail: "Open SportsEdge social news stream", route: "#social-news", keywords: ["news", "twitter", "social", "x"] },
  { label: "Actual exchange feeds", detail: "Open raw venue diagnostics", route: "#actual", keywords: ["actual", "exchange", "betfair", "matchbook", "feeds"] }
];

function commandMatches(option: CommandOption, query: string) {
  const normalized = query.replace(/^\//, "").trim().toLowerCase();
  if (!normalized) return true;
  return [option.label, option.detail, ...option.keywords].some((value) => value.toLowerCase().includes(normalized));
}

function resolveCommand(query: string) {
  return COMMAND_OPTIONS.find((option) => commandMatches(option, query)) || null;
}

function footballTeamCommand(team: FootballTeamAsset): CommandOption {
  const name = team.shortName || team.fullName;
  return {
    label: `${name} profile`,
    detail: `${team.country || "Global"} / ${team.currentLeague || "Football"}${team.national ? " / national team" : ""}`,
    route: `#team/${team.slug}`,
    keywords: [
      team.slug,
      team.ticker,
      team.fullName,
      team.shortName,
      team.country,
      team.currentLeague,
      ...(team.aliases || [])
    ].filter(Boolean)
  };
}

function mergeCommandOptions(options: CommandOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = option.route;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function StandaloneNewsRail({ sport = "football", label, query = "" }: { sport?: string; label?: string; query?: string }) {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "40" });
    if (sport !== "all") params.set("sport", apiSportValue(sport));
    if (query.trim()) params.set("q", query.trim());
    fetch(`/api/news?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const text = await response.text();
        const payload = text ? JSON.parse(text) : {};
        if (!response.ok || !Array.isArray(payload.items)) throw new Error("News unavailable");
        setItems(payload.items);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setItems([]);
      });
    return () => controller.abort();
  }, [sport, query]);

  return (
    <aside className="entry-news-rail terminal-news-rail" aria-label="Live news feed">
      <div className="sport-news-head entry-news-tabs-head">
        <div>
          <h2>News</h2>
          <span>{label || `${displayLabel(sport, "all").toUpperCase()} SPORTSEDGE NEWS`}</span>
        </div>
      </div>
      <div className="sport-news-list">
        {items.slice(0, 40).map((item) => (
          <article className="sport-news-card" key={`standalone-news-${item.id}`} title={newsContextText(item)}>
            <div className={`sport-news-thumb${newsImageUrl(item) ? "" : " empty"}`}>
              {newsImageUrl(item) ? <img src={newsImageUrl(item)} alt="" loading="lazy" /> : <span>{teamInitials(item.source_name || item.sport || "SE")}</span>}
            </div>
            <div>
              <strong>{cleanText(item.title)}</strong>
              <p>{newsContextText(item) || displayLabel(item.source_name, "Source update")}</p>
            </div>
            <footer>
              <span>{displayLabel(item.sport, "news")}</span>
              {newsOpenUrl(item) && <a href={newsOpenUrl(item)} target="_blank" rel="noreferrer">Open</a>}
              <time>{formatDate(item.published_at || item.discovered_at)}</time>
            </footer>
          </article>
        ))}
        {items.length === 0 && (
          <div className="sport-news-empty">
            <Newspaper size={18} />
            <strong>No News yet</strong>
            <span>The shell is still alive; waiting for SportsEdge news.</span>
          </div>
        )}
      </div>
    </aside>
  );
}

class RouteErrorBoundary extends Component<
  { children: ReactNode; routeKey: string; fallback: (message: string) => ReactNode },
  { failedRoute: string | null; message: string }
> {
  state = { failedRoute: null, message: "" };

  static getDerivedStateFromError(error: Error) {
    return {
      failedRoute: window.location.hash || "#dashboard",
      message: error?.message || "Screen failed to render"
    };
  }

  componentDidUpdate(previousProps: { routeKey: string }) {
    if (previousProps.routeKey !== this.props.routeKey && this.state.failedRoute) {
      this.setState({ failedRoute: null, message: "" });
    }
  }

  render() {
    if (this.state.failedRoute) return this.props.fallback(this.state.message);
    return this.props.children;
  }
}

function TerminalRouteFallback({ message, onLogout }: { message: string; onLogout: () => void }) {
  return (
    <main className="testboard-shell">
      <SportsEdgeTopbar active="dashboard" onLogout={onLogout} />
      <section className="terminal-workspace">
        <div className="terminal-workspace-main route-error-panel">
          <AlertTriangle size={24} />
          <strong>Screen failed, shell preserved</strong>
          <span>{message || "The selected screen could not render."}</span>
          <a href="#dashboard">Back to dashboard</a>
        </div>
        <StandaloneNewsRail sport="all" label="ALL SPORTSEDGE NEWS" />
      </section>
    </main>
  );
}

function logoutToLogin() {
  window.localStorage.removeItem("sportsedge.auth.token");
  window.localStorage.removeItem("sportsedge.auth.user");
  window.location.hash = "#login";
}

type StoredAuthUser = {
  email?: string;
  login_id?: string;
  roles?: string[];
  subscription?: { level?: string; status?: string; plan_name?: string; includes_admin_tools?: boolean };
};

function readStoredAuthUser(): StoredAuthUser | null {
  try {
    return JSON.parse(window.localStorage.getItem("sportsedge.auth.user") || "null") as StoredAuthUser | null;
  } catch {
    return null;
  }
}

function storedUserIsAdmin(user: StoredAuthUser | null) {
  if (user?.subscription?.includes_admin_tools === true) return true;
  return (user?.roles || []).some((role) => ["admin", "superadmin", "owner"].includes(String(role).toLowerCase()));
}

function defaultRouteForUser(user: StoredAuthUser | null) {
  return storedUserIsAdmin(user) ? "#admin" : "#dashboard";
}

function SportsEdgeTopbar({
  active,
  onLogout = logoutToLogin,
  onSearchChange,
  searchPlaceholder = "Search sport, market, fixture, exchange..."
}: {
  active?: string;
  onLogout?: () => void;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [clockNow, setClockNow] = useState(() => new Date());
  const [commandOpen, setCommandOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [teamSearchResults, setTeamSearchResults] = useState<FootballTeamAsset[]>([]);
  const [sessionUser] = useState(readStoredAuthUser);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const options = useMemo(() => {
    const teamOptions = query.trim().replace(/^\//, "").length >= 2
      ? teamSearchResults.map(footballTeamCommand)
      : [];
    return mergeCommandOptions([
      ...teamOptions,
      ...COMMAND_OPTIONS.filter((option) => commandMatches(option, query))
    ]).slice(0, 10);
  }, [query, teamSearchResults]);

  useEffect(() => {
    const search = query.trim().replace(/^\//, "");
    if (search.length < 2) {
      setTeamSearchResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/assets/football-teams?q=${encodeURIComponent(search)}&active=true&limit=8`, {
          cache: "no-store",
          signal: controller.signal
        });
        const payload = await response.json();
        if (response.ok && Array.isArray(payload.teams)) setTeamSearchResults(payload.teams);
      } catch {
        if (!controller.signal.aborted) setTeamSearchResults([]);
      }
    }, 160);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleSlash(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        inputRef.current?.focus();
        setCommandOpen(true);
      }
    }
    window.addEventListener("keydown", handleSlash);
    return () => window.removeEventListener("keydown", handleSlash);
  }, []);

  function runCommand(option: CommandOption | null) {
    if (!option) return;
    window.location.hash = option.route;
    setQuery("");
    onSearchChange?.("");
    setCommandOpen(false);
    inputRef.current?.blur();
  }

  const localClock = formatLocalTopbarClock(clockNow);
  const loginId = sessionUser?.login_id || sessionUser?.email || "public";
  const membershipLevel = sessionUser?.subscription?.plan_name || sessionUser?.subscription?.level || sessionUser?.subscription?.status || "guest";
  const isAdmin = storedUserIsAdmin(sessionUser);
  const inFootballMode = active ? TERMINAL_FOOTBALL_MODE_VALUES.has(active) : false;
  const navItems = inFootballMode ? TERMINAL_FOOTBALL_NAV : TERMINAL_TOP_SPORTS;

  return (
    <header className="testboard-topbar global-terminal-topbar">
      <a className="testboard-brand" href="#dashboard" aria-label="SportsEdge dashboard">
        <img className="testboard-brand-logo" src={sportsEdgeMarketsLogo} alt="SportsEdge" />
      </a>
      <nav className={`testboard-nav${inFootballMode ? " football-mode" : ""}`} aria-label={inFootballMode ? "Football navigation" : "SportsEdge navigation"}>
        {navItems.map((sport) => (
          <button
            className={[active === sport.value ? "active" : "", "tone" in sport && sport.tone ? `nav-${sport.tone}` : ""].filter(Boolean).join(" ")}
            key={sport.value}
            type="button"
            onClick={() => { window.location.hash = sport.route; }}
          >
            {sport.label}
          </button>
        ))}
      </nav>
      <label className="testboard-search">
        <Search size={15} />
        <input
          ref={inputRef}
          value={query}
          onFocus={() => setCommandOpen(true)}
          onBlur={() => window.setTimeout(() => setCommandOpen(false), 160)}
          onChange={(event) => {
            setQuery(event.target.value);
            onSearchChange?.(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              runCommand(options[0] || resolveCommand(query) || null);
            }
            if (event.key === "Escape") {
              setCommandOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder={searchPlaceholder}
        />
        <kbd>/</kbd>
        {commandOpen && (
          <div className="testboard-command-menu">
            {options.map((option) => (
              <button type="button" key={option.route} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand(option)}>
                <strong>{option.label}</strong>
                <span>{option.detail}</span>
              </button>
            ))}
            {options.length === 0 && <em>No command found</em>}
          </div>
        )}
      </label>
      <div className="testboard-local-clock" aria-label={`Local time ${localClock}`}>
        <span>Local</span>
        <strong>{localClock}</strong>
      </div>
      <div className="testboard-account-chip" aria-label={`Logged in as ${loginId}, ${membershipLevel}`}>
        <span>{loginId}</span>
        <strong>{membershipLevel}</strong>
      </div>
      <div className="testboard-settings">
        <button
          className="testboard-icon-button"
          type="button"
          aria-label="Open settings"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <Settings size={16} />
        </button>
        {settingsOpen && (
          <div className="testboard-settings-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { window.location.hash = "#actual"; setSettingsOpen(false); }}>Actual feeds</button>
            {isAdmin && <button type="button" role="menuitem" onClick={() => { window.location.hash = "#admin"; setSettingsOpen(false); }}>Admin</button>}
            <button type="button" role="menuitem">Routing Rules</button>
            <button type="button" role="menuitem">Display Density</button>
            <div className="testboard-settings-version" role="presentation">
              <span>Version</span>
              <strong>{APP_VERSION}</strong>
            </div>
          </div>
        )}
      </div>
      <button className="testboard-logout" type="button" onClick={onLogout} aria-label="Log out">
        <LogOut size={15} />
      </button>
    </header>
  );
}

function formatLocalTopbarClock(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(value).replace(",", "");
}

function rowMatchesSelectedSport(row: BackendPriceRow, selectedSport: string) {
  const sports = [
    row.sportName,
    row.competitionName,
    ...Object.values(row.matches || {}).flatMap((match) => [
      match?.sportName,
      match?.competitionName
    ])
  ].map(normalizeSport).filter(Boolean);
  if (sports.some((sport) => sportMatchesNewsFilter(sport, selectedSport))) return true;
  const haystack = [
    row.name,
    row.marketName,
    row.marketType,
    row.competitionName
  ].join(" ").toLowerCase();
  if (selectedSport === "golf") return /\b(golf|pga|masters|us open|uspga|championship|round|golfer)\b/.test(haystack);
  return sports.length === 0;
}

function rowFixtureCountries(row: BackendPriceRow) {
  const values = [
    row.name,
    ...Object.values(row.matches || {}).map((match) => match?.name)
  ];
  return Array.from(new Set(values.flatMap((name) => (
    fixtureTeams(String(name || ""))
      .map((team) => footballTeamAsset(team)?.country)
      .filter(Boolean) as string[]
  ))));
}

function rowCompetitionCountries(row: BackendPriceRow) {
  const values = [
    row.competitionName,
    ...Object.values(row.matches || {}).map((match) => match?.competitionName)
  ];
  return Array.from(new Set(values
    .map((value) => countryNameFromTextPrefix(String(value || "")))
    .filter(Boolean)));
}

function rowHasEnglishContext(row: BackendPriceRow, competitionText: string) {
  const competitionCountries = rowCompetitionCountries(row);
  if (competitionCountries.some((country) => normalizeSelectionKey(country) !== "england")) return false;
  if (competitionCountries.some((country) => normalizeSelectionKey(country) === "england")) return true;

  const fixtureCountries = rowFixtureCountries(row);
  if (fixtureCountries.length > 0) {
    return fixtureCountries.every((country) => normalizeSelectionKey(country) === "england");
  }

  return /\b(england|english|efl|epl)\b/.test(competitionText);
}

function rowMatchesMarketGroup(row: BackendPriceRow, group: string) {
  if (group === "all") return true;
  const competitionText = [
    row.competitionName,
    ...Object.values(row.matches || {}).map((match) => match?.competitionName)
  ].join(" ").toLowerCase();
  const haystack = [
    row.name,
    row.sportName,
    row.competitionName,
    row.marketName,
    row.marketType,
    ...Object.values(row.matches || {}).flatMap((match) => [
      match?.name,
      match?.competitionName,
      match?.marketName,
      match?.marketType
    ])
  ].join(" ").toLowerCase();
  const isEnglishFootball = rowHasEnglishContext(row, competitionText);
  const start = row.startAt ? new Date(row.startAt) : null;
  const isToday = start && !Number.isNaN(start.getTime())
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(start) === new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())
    : false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = start && !Number.isNaN(start.getTime())
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(start) === new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(tomorrow)
    : false;
  const footballTerms = FOOTBALL_GROUP_TERMS[group];
  if (footballTerms) {
    if (["premier-league", "championship", "league-one", "league-two", "fa-cup", "efl-cup"].includes(group) && !isEnglishFootball) return false;
    return footballTerms.some((term) => ` ${haystack} `.includes(term));
  }
  if (group === "today") return Boolean(isToday);
  if (group === "tomorrow") return Boolean(isTomorrow);
  if (group === "live") return haystack.includes("live") || Boolean(isToday);
  if (group === "uk") return isEnglishFootball || ["scotland", "scottish", "wales", "welsh", "cymru", "northern ireland", "irish premiership", "nifl"].some((term) => haystack.includes(term));
  if (group === "england") return isEnglishFootball;
  if (group === "english") return isEnglishFootball;
  if (group === "scottish") return ["scotland", "scottish", "scottish premiership", "scottish championship"].some((term) => haystack.includes(term));
  if (group === "wales") return ["wales", "welsh", "cymru"].some((term) => haystack.includes(term));
  if (group === "northern-ireland") return ["northern ireland", "irish premiership", "nifl"].some((term) => haystack.includes(term));
  if (group === "uefa") return ["uefa", "champions league", "europa league", "conference league", "nations league"].some((term) => haystack.includes(term));
  if (group === "europe") return ["champions league", "europa", "euro", "spain", "la liga", "italy", "serie", "germany", "bundesliga", "france", "ligue"].some((term) => haystack.includes(term));
  if (group === "european") return ["europe", "european", "spain", "la liga", "italy", "serie", "germany", "bundesliga", "france", "ligue", "eredivisie", "primeira", "super lig"].some((term) => haystack.includes(term));
  if (group === "germany") return ["germany", "bundesliga", "dfb"].some((term) => haystack.includes(term));
  if (group === "spain") return ["spain", "spanish", "la liga", "segunda"].some((term) => haystack.includes(term));
  if (group === "italy") return ["italy", "italian", "serie a", "serie b", "coppa"].some((term) => haystack.includes(term));
  if (group === "france") return ["france", "french", "ligue 1", "ligue 2", "coupe"].some((term) => haystack.includes(term));
  if (group === "netherlands") return ["netherlands", "dutch", "eredivisie", "eerste divisie"].some((term) => haystack.includes(term));
  if (group === "portugal") return ["portugal", "portuguese", "primeira liga", "liga portugal"].some((term) => haystack.includes(term));
  if (group === "turkey") return ["turkey", "turkish", "super lig", "süper lig"].some((term) => haystack.includes(term));
  if (group === "international") return ["international", "national", "world cup", "euro", "copa", "afcon", "concacaf", "friendly"].some((term) => haystack.includes(term));
  if (group === "world") return ["world", "global", "fifa", "club world cup", "world cup", "international"].some((term) => haystack.includes(term));
  if (group === "usa") return ["usa", "mls", "mlb", "nba", "wnba", "pga"].some((term) => haystack.includes(term));
  if (group === "futures") return ["winner", "champion", "2026", "outright", "season"].some((term) => haystack.includes(term));
  if (group === "slam") return ["open", "wimbledon", "roland", "french", "australian", "us open"].some((term) => haystack.includes(term));
  if (group === "major") return ["masters", "open", "pga championship", "us open"].some((term) => haystack.includes(term));
  if (group === "matchup") return ["beat", "head", "h2h", "matchup"].some((term) => haystack.includes(term));
  return haystack.includes(group);
}

function quoteForFixtureExchange(snapshot: FixtureExchangeSnapshot | null) {
  if (!snapshot?.back || !snapshot?.lay) return null;
  return {
    bid: snapshot.back,
    ask: snapshot.lay,
    source: snapshot.source
  };
}

function fixtureArbSummary(quotes: Array<{ exchange: string; bid: number; ask: number; source: "api" | "wss" }>) {
  const valid = quotes.filter((quote) => Number.isFinite(quote.bid) && Number.isFinite(quote.ask) && quote.bid > 0 && quote.ask > 0);
  if (valid.length < 2) return null;
  const bestBack = valid.reduce((best, quote) => quote.bid > best.bid ? quote : best, valid[0]);
  const bestLay = valid.reduce((best, quote) => quote.ask < best.ask ? quote : best, valid[0]);
  const edge = bestBack.bid - bestLay.ask;
  return {
    isArb: edge > 0,
    edge,
    bestBack,
    bestLay,
    live: bestBack.source === "wss" || bestLay.source === "wss"
  };
}

type NewsItem = {
  feed?: string;
  id: string;
  sport: string | null;
  country: string | null;
  competition: string | null;
  entity_name: string | null;
  entity_type: string | null;
  source_name: string;
  source_type: string;
  feed_type?: string;
  source_url: string;
  canonical_url: string | null;
  image_url?: string | null;
  title: string;
  analysis_text?: string | null;
  display_summary: string | null;
  summary?: string | null;
  status: string;
  external_url?: string | null;
  published_at: string | null;
  discovered_at: string;
  facts: Record<string, unknown> | null;
  entities: unknown[] | Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  impact_assessment: ImpactAssessment | null;
  isNew?: boolean;
};

type BackendRunnerLevel = { odds: number; amount: number; level?: number };
type BackendRunnerPrice = BackendRunnerLevel | null;
type BackendRunner = {
  id: string;
  name: string;
  sortOrder?: number;
  back: BackendRunnerPrice;
  lay: BackendRunnerPrice;
  backLevels?: BackendRunnerLevel[];
  layLevels?: BackendRunnerLevel[];
};
type BackendExchangeMatch = {
  exchange: string;
  eventId: string;
  marketId: string;
  name: string;
  sportName?: string | null;
  competitionName?: string | null;
  marketName?: string | null;
  marketType?: string | null;
  startAt: string | null;
  observedAt: string | null;
  runners: BackendRunner[];
};
type BackendPriceRow = {
  id: string;
  name: string;
  sportName?: string | null;
  competitionName?: string | null;
  marketName?: string | null;
  marketType?: string | null;
  startAt: string | null;
  matches: Record<string, BackendExchangeMatch | undefined>;
  arbs?: Array<{ edgePct?: number; backExchange?: string; layExchange?: string; label?: string }>;
};

type ExchangeSportDiagnostic = {
  sport: string;
  events: number;
  activeEvents: number;
  liquidity: number;
  latestSeenAt: string | null;
};

type ExchangeEventDiagnostic = {
  id: string;
  name: string;
  sport: string;
  competition: string | null;
  startAt: string | null;
  status: string | null;
  liquidity: number;
  latestSeenAt: string | null;
};

type ExchangeEventPriceDiagnostic = {
  eventId: string;
  eventName: string;
  sport: string;
  competition: string | null;
  startAt: string | null;
  marketId: string;
  marketName: string;
  marketType: string | null;
  marketLiquidity: number;
  runnerId: string;
  runnerName: string;
  side: "back" | "lay" | string;
  ladderLevel: number;
  odds: number;
  amount: number;
  currency: string;
  observedAt: string | null;
};

type EntryEventRow = {
  id: string;
  name: string;
  sport: string;
  competition: string | null;
  startAt: string | null;
  status: string | null;
  liquidity: number;
  latestSeenAt: string | null;
  exchanges: string[];
};

type FootballFixture = {
  id: string;
  provider: string;
  providerFixtureId: string;
  providerLeagueId: string | null;
  season: number | null;
  round: string | null;
  leagueName: string | null;
  leagueType: string | null;
  country: string | null;
  countryCode: string | null;
  leagueLogoUrl: string | null;
  countryFlagUrl: string | null;
  kickoffAt: string | null;
  timezone: string | null;
  statusShort: string | null;
  statusLong: string | null;
  elapsed: number | null;
  venueName: string | null;
  venueCity: string | null;
  referee: string | null;
  home: { providerTeamId: string | null; name: string; logoUrl: string | null; winner: boolean | null };
  away: { providerTeamId: string | null; name: string; logoUrl: string | null; winner: boolean | null };
  goals: { home: number | null; away: number | null };
  syncedAt: string | null;
  updatedAt: string | null;
};

function backendExchangeCode(exchange: string) {
  if (exchange === "matchbook") return "mb";
  if (exchange === "betfair") return "bf";
  if (exchange === "sx") return "sx";
  if (exchange === "kalshi") return "ks";
  if (exchange === "polymarket") return "pm";
  if (exchange === "draftkings") return "draftkings";
  if (exchange === "circa") return "circa";
  return exchange;
}

function summarizeBackendMatch(match?: BackendExchangeMatch) {
  if (!match) return null;
  const priced = match.runners.filter((runner) => runner.back || runner.lay);
  const runnerValues = priced
    .map((runner) => ({
      runner,
      value: Number(runner.back?.amount || 0) + Number(runner.lay?.amount || 0)
    }))
    .sort((a, b) => b.value - a.value);
  const primaryRunner = runnerValues[0]?.runner;
  const value = priced.reduce((sum, runner) => sum + Number(runner.back?.amount || 0) + Number(runner.lay?.amount || 0), 0);
  return {
    value,
    markets: priced.length,
    selection: primaryRunner?.name,
    selectionKey: normalizeSelectionKey(primaryRunner?.name),
    back: primaryRunner?.back?.odds || undefined,
    backSize: primaryRunner?.back?.amount || undefined,
    lay: primaryRunner?.lay?.odds || undefined,
    laySize: primaryRunner?.lay?.amount || undefined,
    observedAt: match.observedAt
  };
}

function normalizeSelectionKey(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc|club|the|yes|no)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function exchangeRunnerQuotes(row: BackendPriceRow) {
  return Object.values(row.matches || {}).flatMap((match) => {
    if (!match) return [];
    const exchange = backendExchangeCode(match.exchange);
    return match.runners
      .filter((runner) => runner.back || runner.lay)
      .map((runner) => {
        const backAmount = Number(runner.back?.amount || 0);
        const layAmount = Number(runner.lay?.amount || 0);
        return {
          exchange,
          selection: runner.name,
          selectionKey: normalizeSelectionKey(runner.name),
          back: runner.back?.odds,
          backSize: backAmount || undefined,
          lay: runner.lay?.odds,
          laySize: layAmount || undefined,
          value: backAmount + layAmount,
          observedAt: match.observedAt
        };
      });
  });
}

function rowExchangeKeys(row?: BackendPriceRow | null) {
  if (!row) return [];
  return Object.values(row.matches || {})
    .map((match) => backendExchangeCode(match?.exchange || ""))
    .filter((value, index, array) => value && array.indexOf(value) === index);
}

function exchangeCoverage(row?: BackendPriceRow | null) {
  const keys = rowExchangeKeys(row);
  return BETTING_EXCHANGE_COLUMNS.map((exchange) => ({
    ...exchange,
    isAvailable: keys.includes(exchange.key)
  }));
}

function exchangeCoverageLabel(row?: BackendPriceRow | null) {
  const active = exchangeCoverage(row).filter((exchange) => exchange.isAvailable).map((exchange) => exchange.label);
  return active.length ? active.join(" + ") : "No exchange";
}

function rowHasBettingExchange(row?: BackendPriceRow | null) {
  return rowExchangeKeys(row).some((key) => ["bf", "mb", "sx"].includes(key));
}

function rowHasMultiBettingExchange(row?: BackendPriceRow | null) {
  return rowExchangeKeys(row).filter((key) => ["bf", "mb", "sx"].includes(key)).length >= 2;
}

function runnerOutcomeKey(value?: string | null) {
  const normalized = normalizeSelectionKey(value);
  if (!normalized) return "";
  if (normalized === "draw" || normalized === "the draw" || normalized.endsWith(" draw")) return "draw";
  return normalized;
}

function tradeableOutcomeRows(row?: BackendPriceRow | null) {
  if (!row) return [];
  const outcomes = new Map<string, {
    key: string;
    label: string;
    exchanges: Record<string, {
      runner: BackendRunner;
      match: BackendExchangeMatch;
      bestBack: BackendRunnerPrice;
      bestLay: BackendRunnerPrice;
    }>;
  }>();

  for (const match of Object.values(row.matches || {})) {
    if (!match) continue;
    const exchange = backendExchangeCode(match.exchange);
    if (!["bf", "mb", "sx"].includes(exchange)) continue;
    for (const runner of match.runners || []) {
      if (!runner.back && !runner.lay) continue;
      const key = runnerOutcomeKey(runner.name);
      if (!key) continue;
      const outcome = outcomes.get(key) || {
        key,
        label: runner.name,
        exchanges: {}
      };
      outcome.label = outcome.label || runner.name;
      outcome.exchanges[exchange] = {
        runner,
        match,
        bestBack: runner.back,
        bestLay: runner.lay
      };
      outcomes.set(key, outcome);
    }
  }

  return [...outcomes.values()].sort((a, b) => {
    if (a.key === "draw") return 1;
    if (b.key === "draw") return -1;
    return Object.keys(b.exchanges).length - Object.keys(a.exchanges).length || a.label.localeCompare(b.label);
  });
}

function formatOutcomeCell(
  outcome: ReturnType<typeof tradeableOutcomeRows>[number] | undefined,
  exchangeKey: string
) {
  const quote = outcome?.exchanges[exchangeKey];
  if (!quote) return "-";
  const parts = [];
  if (quote.bestBack?.odds) parts.push(`B ${quote.bestBack.odds.toFixed(2)}${quote.bestBack.amount ? ` ${formatExchangeMoney(quote.bestBack.amount, exchangeKey === "sx" ? "USD" : "GBP")}` : ""}`);
  if (quote.bestLay?.odds) parts.push(`L ${quote.bestLay.odds.toFixed(2)}${quote.bestLay.amount ? ` ${formatExchangeMoney(quote.bestLay.amount, exchangeKey === "sx" ? "USD" : "GBP")}` : ""}`);
  return parts.length ? parts.join(" / ") : "-";
}

function sportsEdgeMarketQuote(row?: BackendPriceRow | null) {
  if (!row) {
    return {
      liquidity: 0,
      coverage: 0,
      bestBack: undefined as number | undefined,
      bestBackSize: undefined as number | undefined,
      bestLay: undefined as number | undefined,
      bestLaySize: undefined as number | undefined,
      spread: undefined as number | undefined,
      edgePct: undefined as number | undefined,
      isArb: false,
      isFresh: false,
      route: "Pending",
      confidence: 0,
      updatedAt: ""
    };
  }

  const summaries = Object.values(row.matches || {})
    .map((match) => summarizeBackendMatch(match))
    .filter(Boolean) as NonNullable<ReturnType<typeof summarizeBackendMatch>>[];
  const coverage = summaries.length;
  const liquidity = summaries.reduce((sum, summary) => sum + Number(summary.value || 0), 0);
  const runnerGroups = new Map<string, ReturnType<typeof exchangeRunnerQuotes>>();
  for (const quote of exchangeRunnerQuotes(row)) {
    const key = quote.selectionKey || quote.selection || row.id;
    runnerGroups.set(key, [...(runnerGroups.get(key) || []), quote]);
  }
  const selectedGroup = [...runnerGroups.values()]
    .map((quotes) => {
      const value = quotes.reduce((sum, quote) => sum + Number(quote.value || 0), 0);
      const bestBackQuote = quotes.filter((quote) => quote.back).sort((a, b) => Number(b.back || 0) - Number(a.back || 0))[0];
      const bestLayQuote = quotes.filter((quote) => quote.lay).sort((a, b) => Number(a.lay || Infinity) - Number(b.lay || Infinity))[0];
      return { quotes, value, bestBackQuote, bestLayQuote };
    })
    .sort((a, b) => {
      const aTwoWay = a.bestBackQuote && a.bestLayQuote ? 1 : 0;
      const bTwoWay = b.bestBackQuote && b.bestLayQuote ? 1 : 0;
      return bTwoWay - aTwoWay || b.value - a.value;
    })[0];
  const bestBack = selectedGroup?.bestBackQuote?.back;
  const bestLay = selectedGroup?.bestLayQuote?.lay;
  const bestBackSize = selectedGroup?.bestBackQuote?.backSize;
  const bestLaySize = selectedGroup?.bestLayQuote?.laySize;
  const spread = bestBack && bestLay ? Number((bestLay - bestBack).toFixed(3)) : undefined;
  const rawEdge = bestBack && bestLay && bestBack > bestLay ? ((bestBack / bestLay) - 1) * 100 : 0;
  const edgePct = rawEdge ? Number(rawEdge.toFixed(2)) : undefined;
  const observedTimes = summaries
    .map((summary) => summary.observedAt ? new Date(summary.observedAt).getTime() : 0)
    .filter(Boolean);
  const latestObserved = observedTimes.length ? Math.max(...observedTimes) : 0;
  const isFresh = latestObserved > 0 && Date.now() - latestObserved < 30000;
  const confidence = Math.min(99, Math.max(40, Math.round(52 + coverage * 8 + Math.min(24, Math.log10(Math.max(liquidity, 1)) * 4))));

  return {
    liquidity,
    coverage,
    bestBack,
    bestBackSize,
    bestLay,
    bestLaySize,
    spread,
    edgePct,
    isArb: Boolean(edgePct && edgePct > 0),
    isFresh,
    route: coverage > 1 ? "SE Smart" : coverage === 1 ? "SE Direct" : "Pending",
    confidence,
    updatedAt: latestObserved ? new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Europe/Madrid",
      hour12: false
    }).format(new Date(latestObserved)) : ""
  };
}

function rowLatestObservedMs(row: BackendPriceRow) {
  return Object.values(row.matches || {})
    .map((match) => match?.observedAt ? new Date(match.observedAt).getTime() : 0)
    .filter(Boolean)
    .reduce((max, value) => Math.max(max, value), 0);
}

function matrixSportFromPayload(payload: unknown) {
  const sport = normalizeSport(textFromPayload(payload, ["sport", "sport_name", "category"]));
  return MATRIX_SPORT_VALUES.has(sport) ? sport : "";
}

function rowMatrixSport(row: BackendPriceRow) {
  const values = [
    row.sportName,
    ...Object.values(row.matches || {}).map((match) => match?.sportName)
  ].map(normalizeSport).filter((sport) => MATRIX_SPORT_VALUES.has(sport));
  return values[0] || "";
}

function rowHasMatrixVenue(row: BackendPriceRow) {
  return MATRIX_VENUES.some((venue) => Boolean(matchForMatrixVenue(row, venue)));
}

function rowIsTodayInMadrid(row: BackendPriceRow) {
  return isTodayInMadrid(row.startAt || Object.values(row.matches || {}).find((match) => match?.startAt)?.startAt || null);
}

function rowIsMatrixPrimaryMarket(row: BackendPriceRow) {
  const values = [
    row.marketName,
    row.marketType,
    ...Object.values(row.matches || {}).flatMap((match) => [match?.marketName, match?.marketType])
  ].join(" ").toLowerCase();
  if (/\b(total|over|under|handicap|spread|both teams|btts|correct score|half)\b/.test(values)) return false;
  return /\b(match odds|match_odds|one_x_two|moneyline|match winner|winner)\b/.test(values);
}

function consensusPriceFromQuote(quote: ReturnType<typeof sportsEdgeMarketQuote>) {
  if (quote.bestBack && quote.bestLay) return Number(((quote.bestBack + quote.bestLay) / 2).toFixed(3));
  return quote.bestBack || quote.bestLay;
}

function biasFromQuote(quote: ReturnType<typeof sportsEdgeMarketQuote>) {
  if (quote.isArb && quote.edgePct) return `ARB +${quote.edgePct.toFixed(2)}%`;
  const backSize = Number(quote.bestBackSize || 0);
  const laySize = Number(quote.bestLaySize || 0);
  if (!backSize && !laySize) return "Neutral";
  if (backSize > laySize * 1.25) return "Back pressure";
  if (laySize > backSize * 1.25) return "Lay pressure";
  return "Balanced";
}

function freshMatrixRow(row: BackendPriceRow, nowMs: number): BackendPriceRow {
  void nowMs;
  return row;
}

function matchForMatrixVenue(row: BackendPriceRow, venue: MatrixVenue) {
  for (const key of venue.matchKeys) {
    if (row.matches[key]) return row.matches[key];
  }
  return Object.entries(row.matches || {}).find(([key, match]) => (
    venue.matchKeys.includes(backendExchangeCode(key))
    || venue.matchKeys.includes(String(match?.exchange || "").toLowerCase())
  ))?.[1];
}

function matrixVenueSignal(row: BackendPriceRow, venue: MatrixVenue, sport: string, nowMs: number) {
  if (!venue.supports.includes(sport)) return null;
  const match = matchForMatrixVenue(row, venue);
  const observedMs = match?.observedAt ? new Date(match.observedAt).getTime() : 0;
  void nowMs;
  if (!match) return null;
  const summary = summarizeBackendMatch(match);
  if (!summary || (!summary.back && !summary.lay)) return null;
  const backSize = Number(summary.backSize || 0);
  const laySize = Number(summary.laySize || 0);
  const hasRealDepth = backSize > 0 || laySize > 0;
  const totalSize = Math.max(1, backSize + laySize);
  const pressure = hasRealDepth ? Math.abs(backSize - laySize) / totalSize : 0;
  const score = hasRealDepth
    ? Math.min(100, Math.max(50, Math.round(52 + pressure * 48 + Math.min(10, Math.log10(Math.max(summary.value, 1)) * 2))))
    : 58;
  const direction = !hasRealDepth || pressure < 0.16 ? "neutral" : backSize >= laySize ? "back" : "lay";
  return {
    venue,
    direction,
    score,
    value: Number(summary.value || 0),
    back: summary.back,
    lay: summary.lay,
    observedMs,
    weight: venue.weight
  };
}

function matrixVenueQuote(row: BackendPriceRow, venue: MatrixVenue, selection: string) {
  const match = matchForMatrixVenue(row, venue);
  if (!match) return null;
  const selectionKey = normalizeSelectionKey(selection);
  const runner = match.runners.find((candidate) => normalizeSelectionKey(candidate.name) === selectionKey)
    || match.runners.find((candidate) => candidate.back || candidate.lay)
    || null;
  if (!runner) return null;
  return {
    runner: runner.name,
    back: runner.back?.odds,
    backSize: runner.back?.amount,
    lay: runner.lay?.odds,
    laySize: runner.lay?.amount,
    observedAt: match.observedAt
  };
}

function matrixBestQuote(row: BackendPriceRow, selection: string, side: "back" | "lay") {
  const selectionKey = normalizeSelectionKey(selection);
  const quotes = exchangeRunnerQuotes(row);
  const matchingQuotes = quotes.filter((quote) => normalizeSelectionKey(quote.selection) === selectionKey);
  const candidates = matchingQuotes.length ? matchingQuotes : quotes;
  const priced = candidates.filter((quote) => Number(quote[side] || 0) > 0);
  const quote = priced.sort((a, b) => side === "back"
    ? Number(b.back || 0) - Number(a.back || 0)
    : Number(a.lay || Infinity) - Number(b.lay || Infinity)
  )[0];
  if (!quote) return null;
  return {
    exchange: quote.exchange.toUpperCase(),
    odds: side === "back" ? quote.back : quote.lay,
    size: side === "back" ? quote.backSize : quote.laySize,
    observedAt: quote.observedAt
  };
}

function matrixOddsText(value: number | undefined) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(3).replace(/\.?0+$/, "") : "-";
}

function matrixQuoteSizeText(value: number | undefined) {
  return Number(value || 0) > 0 ? formatExchangeMoney(Number(value), "GBP") : "no size";
}

function matrixDirectionLabel(direction: string) {
  if (direction === "back") return "Back";
  if (direction === "lay") return "Lay";
  if (direction === "mixed") return "Mixed";
  return "Neutral";
}

function matrixSignalShort(direction: string) {
  if (direction === "back") return "B";
  if (direction === "lay") return "L";
  return "N";
}

function matrixSourceLabel(row: BackendPriceRow) {
  const labels = Object.values(row.matches || {})
    .map((match) => backendExchangeCode(match.exchange).toUpperCase())
    .filter((value, index, array) => value && array.indexOf(value) === index);
  return labels.length ? labels.join(" + ") : "-";
}

function livePriceRowId(payload: unknown, includeSelection = false) {
  const eventName = textFromPayload(payload, ["event_name", "eventName", "fixture", "fixture_name", "event"]);
  const startAt = textFromPayload(payload, ["start_at", "startAt"]);
  const marketName = textFromPayload(payload, ["market_name", "marketName"]);
  const marketType = textFromPayload(payload, ["market_type", "marketType"]);
  const runnerName = textFromPayload(payload, ["runner_name", "runnerName", "selection", "outcome"]);
  const normalizedEvent = normalizeFixtureText(eventName);
  if (!normalizedEvent) return "";
  const normalizedMarket = normalizeFixtureText(marketType || marketName);
  const marketBucket = /match odds|match result|moneyline|winner|one x two|one_x_two/i.test(`${marketType} ${marketName}`)
    ? "primary"
    : (normalizedMarket || "market");
  const selectionBucket = includeSelection ? `:${normalizeSelectionKey(runnerName) || "selection"}` : "";
  return `${normalizedEvent}:${startAt || "live"}:${marketBucket}${selectionBucket}`;
}

function backendRowStartTimeMs(row: Pick<BackendPriceRow, "startAt" | "name">) {
  if (!row.startAt) return Number.MAX_SAFE_INTEGER;
  const direct = new Date(row.startAt);
  if (!Number.isNaN(direct.getTime())) return direct.getTime();
  const normalized = new Date(String(row.startAt).replace(" ", "T"));
  return Number.isNaN(normalized.getTime()) ? Number.MAX_SAFE_INTEGER : normalized.getTime();
}

function displayStartTime(row: Pick<BackendPriceRow, "startAt" | "name" | "marketName" | "marketType">) {
  const start = row.startAt ? new Date(row.startAt) : null;
  if (start && !Number.isNaN(start.getTime())) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
      hour12: false
    }).format(start);
  }
  const text = `${row.name || ""} ${row.marketName || ""} ${row.marketType || ""}`.toLowerCase();
  if (/\b(winner|futures?|outright|championship|league|2026|2027)\b/.test(text)) return "FUT";
  return "TBD";
}

function footballFixtureName(fixture: FootballFixture) {
  return `${fixture.home.name} vs ${fixture.away.name}`;
}

function footballFixtureCompetition(fixture: FootballFixture) {
  const country = String(fixture.country || "").trim();
  const league = String(fixture.leagueName || "").trim();
  if (!country && !league) return "Football";
  if (!league) return country;
  const genericLeagueMap: Record<string, Record<string, string>> = {
    norway: { "premier league": "Eliteserien", "1. division": "First Division" }
  };
  const mappedLeague = genericLeagueMap[normalizeSelectionKey(country)]?.[normalizeSelectionKey(league)] || league;
  return country ? `${country} / ${mappedLeague}` : mappedLeague;
}

function isDisplayableFootballFixture(fixture: FootballFixture) {
  const status = String(fixture.statusShort || "").toUpperCase();
  return !["CANC", "ABD", "PST", "SUSP"].includes(status);
}

function footballFixtureConflictKey(fixture: FootballFixture) {
  const start = fixture.kickoffAt ? new Date(fixture.kickoffAt).getTime() : 0;
  const minuteBucket = start && Number.isFinite(start) ? Math.round(start / 60000) : 0;
  const teams = [fixture.home, fixture.away]
    .map((team) => team.providerTeamId ? `id:${team.providerTeamId}` : normalizeSelectionKey(team.name))
    .filter(Boolean)
    .sort();
  return `${minuteBucket}:${teams.join("|")}`;
}

function cleanFootballFixtures(fixtures: FootballFixture[]) {
  const seen = new Set<string>();
  return fixtures
    .filter(isDisplayableFootballFixture)
    .filter((fixture) => {
      const key = footballFixtureConflictKey(fixture);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function formatFootballFixtureTime(fixture: FootballFixture) {
  const start = fixture.kickoffAt ? new Date(fixture.kickoffAt) : null;
  if (!start || Number.isNaN(start.getTime())) return "TBD";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
    hour12: false
  }).format(start);
}

function fixtureBackendKey(name: string, startAt: string | null) {
  return displayFixtureKey({ name, startAt });
}

function footballFixtureMatchesMarketGroup(fixture: FootballFixture, group: string) {
  return rowMatchesMarketGroup({
    id: fixture.id,
    name: footballFixtureName(fixture),
    sportName: "football",
    competitionName: [fixture.country, fixture.leagueName].filter(Boolean).join(" "),
    marketName: "Match Odds",
    marketType: "one_x_two",
    startAt: fixture.kickoffAt,
    matches: {}
  }, group);
}

function displayEventName(name: string) {
  return String(name || "")
    .replace(/\s+-\s+More Markets.*$/i, "")
    .replace(/\s+-\s+Exact Score.*$/i, "")
    .replace(/\s+-\s+Player Props.*$/i, "")
    .trim();
}

function displayFixtureKey(row: Pick<BackendPriceRow, "name" | "startAt">) {
  const date = row.startAt ? String(row.startAt).slice(0, 10) : "";
  const normalized = displayEventName(row.name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+-\s+(player props?|halftime result|half time result|more markets|match odds|moneyline|winner).*$/i, "")
    .replace(/\b(vs?|versus|at)\b/g, " v ")
    .replace(/\bman city\b/g, "manchester city")
    .replace(/\bman utd\b/g, "manchester united")
    .replace(/\b(the|fc|cf|sc|club|afc|cd|ca|de|la|las|los|real|balompie|hotspur)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  return `${date}:${normalized}`;
}

function fixtureTeamParts(name: string) {
  return displayEventName(name)
    .split(/\s+(?:v|vs|versus|at)\s+/i)
    .map((value) => normalizeSelectionKey(value)
      .replace(/\b(if|il|bk|sk|fk|kbk|dff|sad|women|woman|w|u21|u23|u19|u18|reserves?|ii|b)\b/g, " ")
      .trim()
      .replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, 2);
}

function teamTextSimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));
  const shared = [...aTokens].filter((token) => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size || 1;
  const tokenScore = shared / union;
  const compactA = a.replace(/\s+/g, "");
  const compactB = b.replace(/\s+/g, "");
  const compactScore = compactA.includes(compactB) || compactB.includes(compactA)
    ? Math.min(compactA.length, compactB.length) / Math.max(compactA.length, compactB.length)
    : 0;
  return Math.max(tokenScore, compactScore);
}

function fixtureMatchesBackendRow(fixture: FootballFixture, row: BackendPriceRow) {
  if (!fixture.kickoffAt || !row.startAt) return false;
  const fixtureMs = new Date(fixture.kickoffAt).getTime();
  const rowMs = new Date(String(row.startAt).replace(" ", "T") + "Z").getTime();
  if (!Number.isFinite(fixtureMs) || !Number.isFinite(rowMs)) return false;
  if (Math.abs(fixtureMs - rowMs) > 15 * 60 * 1000) return false;
  const fixtureTeams = fixtureTeamParts(footballFixtureName(fixture));
  const rowTeams = fixtureTeamParts(displayEventName(row.name));
  if (fixtureTeams.length < 2 || rowTeams.length < 2) return false;
  const direct = (teamTextSimilarity(fixtureTeams[0], rowTeams[0]) + teamTextSimilarity(fixtureTeams[1], rowTeams[1])) / 2;
  const flipped = (teamTextSimilarity(fixtureTeams[0], rowTeams[1]) + teamTextSimilarity(fixtureTeams[1], rowTeams[0])) / 2;
  return Math.max(direct, flipped) >= 0.72;
}

function findMarketRowForFootballFixture(
  fixture: FootballFixture,
  rows: Array<{ row: BackendPriceRow; totalValue: number; marketCount: number }>
) {
  const exact = rows.find((item) => fixtureBackendKey(displayEventName(item.row.name), item.row.startAt) === fixtureBackendKey(footballFixtureName(fixture), fixture.kickoffAt));
  if (exact) return exact;
  return rows
    .filter((item) => fixtureMatchesBackendRow(fixture, item.row))
    .sort((a, b) => Number(b.totalValue || 0) - Number(a.totalValue || 0))[0];
}

function displayMarketKey(row: Pick<BackendPriceRow, "marketName" | "marketType">) {
  const raw = `${row.marketType || ""} ${row.marketName || ""}`;
  const normalized = normalizeFixtureText(raw);
  if (!normalized) return "market";
  if (/match odds|match result|moneyline|winner|one x two|1x2/i.test(raw)) return "primary";
  return normalized;
}

function stableDisplayRowKey(row: BackendPriceRow) {
  return `${displayFixtureKey(row)}:${displayMarketKey(row)}`;
}

function fixtureMarketPriority(row: BackendPriceRow) {
  const label = `${row.marketName || ""} ${row.marketType || ""}`.toLowerCase();
  if (/(match odds|match result|moneyline|winner|match winner|one x two|1x2|\bmw\b)/.test(label)) return 5;
  if (/(both teams|total|over|under|spread|handicap)/.test(label)) return 3;
  if (/(more markets|player props?)/.test(label)) return 0;
  return 1;
}

function collapseRowsByFixture(rows: BackendPriceRow[]) {
  const byFixture = new Map<string, { row: BackendPriceRow; totalValue: number; marketCount: number }>();
  rows.forEach((row) => {
    const key = displayFixtureKey(row);
    const totalValue = rowMatchedValue(row);
    const existing = byFixture.get(key);
    if (!existing) {
      byFixture.set(key, { row, totalValue, marketCount: 1 });
      return;
    }
    existing.totalValue += totalValue;
    existing.marketCount += 1;
    const existingPriority = fixtureMarketPriority(existing.row);
    const nextPriority = fixtureMarketPriority(row);
    if (
      nextPriority > existingPriority ||
      (nextPriority === existingPriority && totalValue > rowMatchedValue(existing.row))
    ) {
      existing.row = row;
    }
  });
  return Array.from(byFixture.values());
}

function exchangeCoverageCount(row: BackendPriceRow) {
  return new Set(Object.keys(row.matches || {}).map(backendExchangeCode)).size;
}

function rowMatchedValue(row: BackendPriceRow) {
  return Object.values(row.matches || {}).reduce((sum, match) => {
    const summary = summarizeBackendMatch(match);
    return sum + (summary?.value || 0);
  }, 0);
}

function mergeDisplayPriceRows(rows: BackendPriceRow[]) {
  const merged = new Map<string, BackendPriceRow>();
  for (const row of rows) {
    const key = stableDisplayRowKey(row) || row.id;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...row, matches: { ...row.matches }, arbs: [...(row.arbs || [])] });
      continue;
    }
    existing.matches = { ...existing.matches, ...row.matches };
    existing.arbs = [...(existing.arbs || []), ...(row.arbs || [])];
    if (backendRowStartTimeMs(row) < backendRowStartTimeMs(existing)) {
      existing.startAt = row.startAt;
    }
    if (row.name && row.name.length < existing.name.length) {
      existing.name = row.name;
    }
  }
  return Array.from(merged.values()).sort((a, b) => (
    backendRowStartTimeMs(a) - backendRowStartTimeMs(b)
    || String(a.name || "").localeCompare(String(b.name || ""))
    || String(a.marketName || a.marketType || "").localeCompare(String(b.marketName || b.marketType || ""))
  ));
}

function isPrimaryTradingMarket(payload: unknown, selectedSport: string) {
  const marketType = textFromPayload(payload, ["market_type", "marketType"]).toLowerCase();
  const marketName = textFromPayload(payload, ["market_name", "marketName"]).toLowerCase();
  const eventName = textFromPayload(payload, ["event_name", "eventName", "fixture", "fixture_name", "event", "name", "title"]).toLowerCase();
  const marketText = `${eventName} ${marketType} ${marketName}`;
  if (selectedSport === "football") {
    if ([
      "player prop",
      "player props",
      "halftime",
      "half time",
      "1st half",
      "first half",
      "more markets",
      "correct score",
      "total goals",
      "goalscorer",
      "to score",
      "corner",
      "cards",
      "card",
      "handicap",
      "spread"
    ].some((value) => marketText.includes(value))) {
      return false;
    }
    return [
      "one_x_two",
      "match_odds",
      "match-odds",
      "moneyline",
      "winner"
    ].some((value) => marketType.includes(value))
      || marketName.includes("match odds")
      || marketName.includes("match result")
      || marketName.includes("moneyline")
      || marketName.includes("winner")
      || marketName.includes(" win ");
  }
  if (selectedSport === "tennis") {
    return marketType.includes("winner") || marketName.includes("match odds") || marketName.includes("moneyline") || marketName.includes("winner");
  }
  if (selectedSport === "baseball" || selectedSport === "basketball") {
    return marketType.includes("moneyline") || marketName.includes("moneyline") || marketName.includes("match odds") || marketName.includes("winner");
  }
  if (selectedSport === "golf" || selectedSport === "horseracing") {
    return true;
  }
  return true;
}

function mergeLivePriceRows(rows: BackendPriceRow[], channel: string, payload: unknown, selectedSport: string, primaryOnly = true, maxRows = 80) {
  const exchangeKey = exchangeFromEvent(channel, payload);
  const exchange = EXCHANGE_COLUMNS.find((item) => item.key === exchangeKey);
  if (!exchange?.supports.includes(selectedSport)) return rows;

  const sport = normalizeSport(textFromPayload(payload, ["sport", "sport_name", "category"]));
  if (sport && sport !== selectedSport && !sportMatchesNewsFilter(sport, selectedSport)) return rows;
  if (primaryOnly && !isPrimaryTradingMarket(payload, selectedSport)) return rows;

  const eventName = textFromPayload(payload, ["event_name", "eventName", "fixture", "fixture_name", "event"]);
  const runnerName = textFromPayload(payload, ["runner_name", "runnerName", "selection", "outcome"]);
  const rowId = livePriceRowId(payload, !primaryOnly);
  if (!rowId || !runnerName) return rows;

  const side = textFromPayload(payload, ["side"]).toLowerCase();
  const odds = firstPositiveNumber(payload, ["odds", "price", "decimal_odds", "decimalOdds"]);
  const amount = firstPositiveNumber(payload, ["available_amount", "availableAmount", "amount", "size"]) || 0;
  const ladderLevel = Number(firstPositiveNumber(payload, ["ladder_level", "ladderLevel", "level"]) || 1);
  if (!odds || !["back", "lay"].includes(side)) return rows;

  const exchangeName = exchange.name.toLowerCase();
  const eventId = textFromPayload(payload, ["exchange_event_id", "exchangeEventId", "event_id", "eventId"]) || rowId;
  const marketId = textFromPayload(payload, ["exchange_market_id", "exchangeMarketId", "market_id", "marketId"]) || rowId;
  const runnerId = textFromPayload(payload, ["exchange_runner_id", "exchangeRunnerId", "runner_id", "runnerId"]) || normalizeFixtureText(runnerName);
  const startAt = textFromPayload(payload, ["start_at", "startAt"]) || null;
  const observedAt = textFromPayload(payload, ["observed_at", "observedAt"]) || new Date().toISOString();
  const competitionName = textFromPayload(payload, ["competition", "competition_name", "competitionName", "league", "league_name"]) || null;
  const marketName = textFromPayload(payload, ["market_name", "marketName"]) || null;
  const marketType = textFromPayload(payload, ["market_type", "marketType"]) || null;

  const nextRows = [...rows];
  let row = nextRows.find((item) => item.id === rowId);
  if (!row) {
    row = {
      id: rowId,
      name: eventName,
      sportName: selectedSport,
      competitionName,
      marketName,
      marketType,
      startAt,
      matches: {}
    };
    nextRows.push(row);
  }

  const matches = { ...row.matches };
  const existingMatch = matches[exchangeKey] || matches[exchangeName];
  const match: BackendExchangeMatch = existingMatch
    ? { ...existingMatch, runners: [...existingMatch.runners] }
    : {
        exchange: exchangeName,
        eventId,
        marketId,
        name: eventName,
        sportName: selectedSport,
        competitionName,
        marketName,
        marketType,
        startAt,
        observedAt,
        runners: []
      };

  match.observedAt = observedAt;
  let runner = match.runners.find((item) => item.id === runnerId);
  if (!runner) {
    runner = { id: runnerId, name: runnerName, back: null, lay: null, backLevels: [], layLevels: [] };
    match.runners.push(runner);
  }
  const price = { odds, amount, level: ladderLevel };
  if (side === "back") {
    runner.backLevels = [...(runner.backLevels || []).filter((item) => item.level !== ladderLevel), price].sort((a, b) => Number(a.level || 1) - Number(b.level || 1));
    runner.back = runner.backLevels[0] || price;
  }
  if (side === "lay") {
    runner.layLevels = [...(runner.layLevels || []).filter((item) => item.level !== ladderLevel), price].sort((a, b) => Number(a.level || 1) - Number(b.level || 1));
    runner.lay = runner.layLevels[0] || price;
  }

  matches[exchangeKey] = match;
  row.matches = matches;
  row.startAt = row.startAt || startAt;
  row.name = row.name || eventName;
  row.sportName = row.sportName || selectedSport;
  row.competitionName = row.competitionName || competitionName;
  row.marketName = row.marketName || marketName;
  row.marketType = row.marketType || marketType;

  return nextRows.slice(0, maxRows);
}

type ImpactAssessment = {
  event_type: string;
  impact_score: number;
  confidence: number | string;
  urgency: string;
  affected_markets: string[];
  expected_direction: Record<string, unknown>;
  trading_note: string;
  watch_items: string[];
  assessed_at: string;
  assessment_method: string;
};

type SourceHealth = {
  sport: string;
  total_sources: string | number;
  enabled_sources: string | number;
  working_sources: string | number;
  failing_sources: string | number;
};

type SourceFailure = {
  sport: string;
  name: string;
  feed_type: string;
  url: string;
  last_error: string | null;
  last_polled_at: string | null;
  last_success_at: string | null;
};

type SourcePoll = {
  sport: string;
  name: string;
  feed_type: string;
  poll_status: string;
  started_at: string | null;
  finished_at: string | null;
  items_seen: string | number;
  items_inserted: string | number;
  items_updated: string | number;
  error: string | null;
};

type NewsResponse = {
  items: NewsItem[];
  facets: {
    sports: string[];
    source_names: string[];
    source_types: string[];
    countries: string[];
    competitions: string[];
    statuses: string[];
  };
  sourceHealth: SourceHealth[];
  latestFailures: SourceFailure[];
  latestPolls: SourcePoll[];
};

type AdminNewsSource = {
  key: string;
  kind: "official" | "realtime";
  id: string;
  name: string;
  url: string;
  sport: string;
  country: string;
  competition: string;
  source_type: string;
  feed_type: string;
  language: string;
  enabled: number;
  last_polled_at: string | null;
  last_success_at: string | null;
  consecutive_failures: string | number;
  last_error: string | null;
  events_fetched: string | number;
  polls_seen: string | number;
  latest_event_at: string | null;
  is_rss: boolean;
  ever_worked: boolean;
};

type AdminNewsSourcesResponse = {
  sources: AdminNewsSource[];
  summary: {
    total: number;
    enabled: number;
    disabled: number;
    rss: number;
    never_worked: number;
    failing: number;
  };
};

type AdminUserRow = {
  id: string;
  email: string;
  full_name?: string | null;
  status?: string;
  account_type?: string;
  roles?: string[];
  subscription?: { level?: string; plan_name?: string; status?: string };
  created_at?: string | null;
  last_login_at?: string | null;
};

type AdminSessionRow = {
  id: string;
  user_id: string;
  email: string;
  full_name?: string | null;
  account_type?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
  last_seen_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
  active?: boolean;
};

type AdminAnalyticsResponse = {
  summary?: {
    pageviews?: number;
    unique_visitors?: number;
    sessions?: number;
    countries?: number;
    events?: number;
    avg_page_load_ms?: number;
  };
  daily?: Array<{ day: string; pageviews: number; visitors: number; sessions: number }>;
  topPages?: Array<{ path: string; pageviews: number; visitors: number }>;
  referrers?: Array<{ referrer: string; pageviews: number }>;
  countries?: Array<{ country: string; pageviews: number; visitors: number }>;
  latestVisitors?: Array<{
    site_name?: string;
    domain?: string;
    visitor_uid: string;
    last_seen_at: string;
    last_ip?: string;
    last_country_code?: string;
    browser_name?: string;
    os_name?: string;
    device_type?: string;
    pageviews: number;
    sessions: number;
  }>;
  latestPageviews?: Array<Record<string, unknown>>;
};

type AdminBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  status: "draft" | "published" | "archived";
  tags: string[];
  author_email?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Filters = {
  q: string;
  sport: string;
  source_name: string;
  source_type: string;
  country: string;
  competition: string;
  status: string;
  date_from: string;
  date_to: string;
};

function formatDate(value: string | null) {
  if (!value) return "Undated";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTimeAgo(value: string | null) {
  if (!value) return "-";
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  return `${Math.floor(deltaHours / 24)}d ago`;
}

function asNumber(value: string | number | null | undefined) {
  return Number(value || 0);
}

function authHeaders(): Record<string, string> {
  const token = window.localStorage.getItem("sportsedge.auth.token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchAdminJson<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || `Admin request failed: ${path}`);
  return payload as T;
}

function objectEntries(value: Record<string, unknown> | null | undefined) {
  if (!value || Array.isArray(value)) return [];
  return Object.entries(value).filter(([, item]) => item !== null && item !== "" && item !== undefined);
}

function shortValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item))).slice(0, 3).join(", ") : "none";
  if (value && typeof value === "object") return JSON.stringify(value);
  return cleanText(String(value));
}

function analyticsCellValue(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (value === null || value === undefined || value === "") return "-";
  if (/(_at|date|time)$/i.test(key) && typeof value === "string") return formatDate(value);
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("en-GB") : "-";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return shortValue(value);
}

function cleanText(value: string | null | undefined) {
  if (!value) return "";
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value
    .replace(/\s*\[(?:\.{3}|…|&#8230;)\]\s*/g, " ")
    .replace(/\s*The post .+ first appeared on .+\.?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function displayLabel(value: string | null | undefined, fallback = "Unclassified") {
  return cleanText(value) || fallback;
}

function isSocialNewsItem(item: NewsItem) {
  const sourceType = String(item.source_type || "").toLowerCase();
  const feedType = String(item.feed_type || "").toLowerCase();
  const feed = String(item.feed || "").toLowerCase();
  const sourceName = String(item.source_name || "").toLowerCase();
  const urls = [item.external_url, item.canonical_url, item.source_url].join(" ").toLowerCase();
  const headline = String(item.title || "").toLowerCase();
  return (
    feed === "social" ||
    sourceType.includes("twitter") ||
    sourceType === "x" ||
    sourceType.includes("social") ||
    feedType.includes("twitter") ||
    feedType === "x" ||
    urls.includes("twitter.com/") ||
    urls.includes("x.com/") ||
    headline.includes("https://t.co/") ||
    headline.includes("http://t.co/") ||
    /\b(fabrizioromano|plettigoal|talksport|eyefootball)\b/.test(sourceName) && headline.includes("t.co/")
  );
}

function newsImageUrl(item: NewsItem) {
  const url = String(item.image_url || "").trim();
  if (!url) return "";
  if (url.startsWith("http://")) return `https://${url.slice("http://".length)}`;
  return url;
}

function newsCanonicalUrl(item: NewsItem) {
  return String(item.canonical_url || item.source_url || "")
    .toLowerCase()
    .replace(/^https?:\/\/(?:www\.)?/, "")
    .replace(/[?#].*$/, "")
    .replace(/\/$/, "");
}

function newsOpenUrl(item: NewsItem) {
  return String(item.external_url || item.canonical_url || item.source_url || "").trim();
}

function newsContextText(item: NewsItem) {
  return cleanText(item.analysis_text || item.summary || item.display_summary || item.title);
}

function socialNewsFingerprint(item: NewsItem) {
  const url = newsCanonicalUrl(item);
  if (url) return `url:${url}`;
  const image = newsImageUrl(item).replace(/[?#].*$/, "").toLowerCase();
  const text = normalizeFixtureText(`${item.title || ""} ${item.display_summary || ""}`)
    .split(" ")
    .filter((token) => !["https", "http", "co", "t", "x", "com", "status"].includes(token))
    .slice(0, 18)
    .join(" ");
  return `social:${normalizeSport(item.sport)}:${String(item.source_name || "").toLowerCase()}:${image}:${text}`;
}

function newsFingerprint(item: NewsItem) {
  return isSocialNewsItem(item)
    ? socialNewsFingerprint(item)
    : `${normalizeFixtureText(item.title)}:${normalizeSport(item.sport)}:${String(item.source_name || "").toLowerCase()}`;
}

function mergeNewsItems(primary: NewsItem[], secondary: NewsItem[]) {
  const byKey = new Map<string, NewsItem>();
  [...primary, ...secondary].forEach((item) => {
    const key = item.id || newsFingerprint(item);
    const fallbackKey = newsFingerprint(item);
    const existing = byKey.get(key) || byKey.get(fallbackKey);
    if (!existing) {
      byKey.set(key, item);
      return;
    }
    const merged = {
      ...item,
      ...existing,
      image_url: existing.image_url || item.image_url,
      analysis_text: existing.analysis_text || item.analysis_text,
      display_summary: existing.display_summary || item.display_summary,
      summary: existing.summary || item.summary,
      external_url: existing.external_url || item.external_url,
      published_at: existing.published_at || item.published_at,
      discovered_at: existing.discovered_at || item.discovered_at,
      isNew: existing.isNew || item.isNew
    };
    byKey.set(key, merged);
    byKey.set(fallbackKey, merged);
  });
  return Array.from(new Set(byKey.values()));
}

function imageFirstNews(items: NewsItem[]) {
  const withImage = items.filter(newsImageUrl);
  const withoutImage = items.filter((item) => !newsImageUrl(item));
  if (withImage.length >= 6) return [...withImage, ...withoutImage];
  return items;
}

function uniqueNewsItems(items: NewsItem[]) {
  return mergeNewsItems(items, []);
}

function newsScopeText(item: NewsItem) {
  return [
    item.sport,
    item.country,
    item.competition,
    item.entity_name,
    item.entity_type,
    item.source_name,
    item.title,
    item.display_summary,
    item.summary,
    item.analysis_text,
    item.metadata ? JSON.stringify(item.metadata) : "",
    item.facts ? JSON.stringify(item.facts) : ""
  ].filter(Boolean).join(" ").toLowerCase();
}

function footballNewsGroupTerms(group: string) {
  const footballGroup = FOOTBALL_LEAGUE_GROUPS[group] || footballLeagueByValue(group) ? group : "";
  if (footballLeagueByValue(group)) return [footballLeagueByValue(group)?.label || group];
  if (footballGroup === "english") return ["england", "english", "premier league", "championship", "league one", "league two", "fa cup", "efl cup", "burnley", "chelsea", "arsenal", "newcastle", "manchester", "liverpool", "tottenham", "fulham"];
  if (footballGroup === "scottish") return ["scotland", "scottish", "celtic", "rangers", "hibs", "hearts"];
  if (footballGroup === "uefa") return ["uefa", "champions league", "europa league", "conference league"];
  if (footballGroup === "european") return ["europe", "la liga", "serie a", "bundesliga", "ligue 1", "eredivisie"];
  if (footballGroup === "international") return ["international", "world cup", "euro", "copa", "afcon", "concacaf"];
  if (footballGroup === "world") return ["world", "fifa", "club world cup"];
  return [];
}

function terminalNewsItemVisible(item: NewsItem, selectedSport: string, marketGroup: string, isEntryDashboard: boolean) {
  if (isEntryDashboard) return true;
  if (!sportMatchesNewsFilter(item.sport, selectedSport)) return false;
  if (selectedSport !== "football" || marketGroup === "all") return true;
  const terms = footballNewsGroupTerms(marketGroup).map((term) => term.toLowerCase());
  if (!terms.length) return true;
  const text = newsScopeText(item);
  return terms.some((term) => text.includes(term));
}

function terminalNewsContextLabel(selectedSport: string, marketGroup: string, isEntryDashboard: boolean) {
  if (isEntryDashboard) return "All SportsEdge news";
  const sportLabel = SPORT_LABELS.get(selectedSport) || displayLabel(selectedSport, "Sport");
  if (selectedSport !== "football" || marketGroup === "all") return `${sportLabel} news`;
  const league = footballLeagueByValue(marketGroup);
  if (league) return `${sportLabel} / ${league.label}`;
  const region = footballRegionByValue(marketGroup);
  return region ? `${sportLabel} / ${region.label}` : `${sportLabel} news`;
}

function terminalNewsSubscribeFilters(selectedSport: string, marketGroup: string, isEntryDashboard: boolean) {
  if (isEntryDashboard) return {};
  const filters: Record<string, string> = { sport: apiSportValue(selectedSport) };
  if (selectedSport === "football" && marketGroup !== "all") {
    const league = footballLeagueByValue(marketGroup);
    const region = footballRegionByValue(league?.region || marketGroup);
    if (league) filters.competition = league.label;
    if (region?.value === "english") filters.country = "England";
    if (region?.value === "scottish") filters.country = "Scotland";
  }
  return filters;
}

function terminalNewsTimeLabel(item: Pick<NewsItem, "published_at" | "discovered_at">) {
  const { date, source } = newsDisplayTimestamp(item);
  if (!date) return "--";
  const rawDeltaSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const deltaSeconds = Math.max(0, rawDeltaSeconds);
  const clock = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: NEWS_DISPLAY_TIME_ZONE
  }).format(date);
  if (source === "scheduled" || rawDeltaSeconds < -30) return `sch / ${clock}`;
  if (deltaSeconds < 60) return `${deltaSeconds}s / ${clock}`;
  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) return `${deltaMinutes}m / ${clock}`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h / ${clock}`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: NEWS_DISPLAY_TIME_ZONE
  }).format(date);
}

function terminalNewsExactTimeLabel(item: Pick<NewsItem, "published_at" | "discovered_at">) {
  const publishedAt = parseSportsEdgeUtcTimestamp(item.published_at);
  const discoveredAt = parseSportsEdgeUtcTimestamp(item.discovered_at);
  if (!publishedAt && !discoveredAt) return "Undated";
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: NEWS_DISPLAY_TIME_ZONE
  });
  return [
    publishedAt ? `published ${formatter.format(publishedAt)}` : "",
    discoveredAt ? `discovered ${formatter.format(discoveredAt)}` : ""
  ].filter(Boolean).join(" / ");
}

function terminalNewsTag(item: NewsItem) {
  const base = item.entity_name || item.competition || item.sport || item.source_name || "NEWS";
  const words = cleanText(base).split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map((word) => word[0]).join("").slice(0, 5).toUpperCase();
  return cleanText(base).replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase() || "NEWS";
}

function terminalNewsUrgency(item: NewsItem) {
  const score = Number(item.impact_assessment?.impact_score || 0);
  const urgency = String(item.impact_assessment?.urgency || "").toLowerCase();
  if (urgency === "immediate" || score >= 75) return "1";
  if (urgency === "high" || score >= 50) return "2";
  if (score >= 25 || item.impact_assessment) return "3";
  return "4";
}

function terminalNewsImpactText(item: NewsItem) {
  const impact = newsImpactLabel(item.impact_assessment);
  if (impact) return [impact.eventType, impact.score ? `${impact.score}` : "", impact.direction].filter(Boolean).join(" / ");
  return displayLabel(item.competition || item.entity_name || item.sport, "Monitor");
}

function terminalNewsHeadline(item: NewsItem) {
  return cleanText(item.impact_assessment?.trading_note || item.analysis_text || item.display_summary || item.summary || item.title);
}

function isTodayInMadrid(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date) === formatter.format(new Date());
}

function madridDateKey(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value).includes("T") ? value : String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function madridOffsetDateKey(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return madridDateKey(date);
}

function isTomorrowInMadrid(value: string | null | undefined) {
  return Boolean(value) && madridDateKey(value) === madridOffsetDateKey(1);
}

function madridEventTime(value: string | null | undefined) {
  if (!value) return "TBD";
  const date = new Date(String(value).includes("T") ? value : String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Madrid"
  }).format(date);
}

function exchangeOddsRowToEntryEvent(row: BackendPriceRow, fallbackSport: string): EntryEventRow {
  const matches = Object.entries(row.matches || {}).filter(([, match]) => Boolean(match)) as Array<[string, BackendExchangeMatch]>;
  const firstMatch = matches[0]?.[1];
  const exchangeLabels = matches.map(([key, match]) => {
    const exchangeKey = String(match.exchange || key).toLowerCase();
    return ENTRY_DASHBOARD_EXCHANGES.find((exchange) => exchange.key === exchangeKey)?.label || displayLabel(exchangeKey, exchangeKey);
  });
  const latestSeenAtMs = rowLatestObservedMs(row);
  return {
    id: stableDisplayRowKey(row) || row.id,
    name: displayEventName(row.name || firstMatch?.name || "Market"),
    sport: normalizeSport(row.sportName || firstMatch?.sportName || fallbackSport),
    competition: row.competitionName || firstMatch?.competitionName || null,
    startAt: row.startAt || firstMatch?.startAt || null,
    status: null,
    liquidity: rowMatchedValue(row),
    latestSeenAt: latestSeenAtMs ? new Date(latestSeenAtMs).toISOString() : firstMatch?.observedAt || null,
    exchanges: Array.from(new Set(exchangeLabels))
  };
}

function entryEventKey(event: Pick<EntryEventRow, "name" | "sport" | "startAt">) {
  const date = event.startAt ? String(event.startAt).slice(0, 10) : "nodate";
  return `${normalizeSport(event.sport)}:${date}:${normalizeFixtureText(event.name)}`;
}

function eventStartSortValue(value: string | null | undefined) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}

function impactClass(assessment: ImpactAssessment | null) {
  if (!assessment) return "";
  if (assessment.urgency === "immediate" || assessment.impact_score >= 75) return "high";
  if (assessment.urgency === "high" || assessment.impact_score >= 50) return "medium";
  return "low";
}

function newsImpactLabel(assessment: ImpactAssessment | null) {
  if (!assessment) return null;
  const direction = String((assessment.expected_direction as Record<string, unknown> | undefined)?.direction || (assessment as unknown as { direction?: string }).direction || "").toUpperCase();
  return {
    eventType: displayLabel(assessment.event_type || "impact", "impact").toUpperCase(),
    score: Number(assessment.impact_score) || 0,
    direction: direction && direction !== "NONE" ? direction : ""
  };
}

const FALLBACK_BLOG_ARTICLES = [
  { title: "Market structure", excerpt: "Why exchange liquidity, bookmaker anchors and news timing need one screen." },
  { title: "Football coverage", excerpt: "How SportsEdge separates fixture truth from venue-specific market availability." },
  { title: "Bias signals", excerpt: "Turning fragmented prices into a readable institutional market picture." }
];

function MarketingLandingPage({ section = "home" }: { section?: "home" | "signup" | "about" | "terms" | "privacy" }) {
  const [accessOpen, setAccessOpen] = useState(section === "signup");
  const [blogPosts, setBlogPosts] = useState<AdminBlogPost[]>([]);
  const policyCopy = section === "terms"
    ? "Terminal access is permissioned, data is source-attributed, and production trading features are subject to venue terms, account approval and risk controls."
    : "SportsEdge collects only the account, session and operational data required to run the terminal, secure access, and improve market intelligence workflows.";
  const articles = blogPosts.length ? blogPosts.slice(0, 3) : FALLBACK_BLOG_ARTICLES;

  useEffect(() => {
    let cancelled = false;
    async function loadBlogPosts() {
      try {
        const response = await fetch(sportsEdgeApiUrl("/blog-posts"), { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.posts)) return;
        if (!cancelled) setBlogPosts(payload.posts);
      } catch {
        // Static landing notes remain available if the CMS endpoint is not live.
      }
    }
    loadBlogPosts();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="landing-page">
      <header className="landing-topbar">
        <a className="landing-brand" href="/" aria-label="SportsEdge landing">
          <img src={sportsEdgeMarketsLogo} alt="SportsEdge" />
        </a>
        <nav aria-label="SportsEdge site navigation">
          <a className={section === "about" ? "active" : ""} href="#about">About</a>
          <a href="#blog">Blog</a>
          <a href="#login">Login</a>
          <button className="primary" type="button" onClick={() => setAccessOpen(true)}>Sign up</button>
        </nav>
      </header>

      <section className="landing-hero" aria-label="SportsEdge terminal overview">
        <img src={loginSportsImage} alt="" />
        <div className="landing-hero-overlay" />
        <div className="landing-hero-content">
          <span>SportsEdge Terminal</span>
          <h1>One market picture for sports trading intelligence.</h1>
          <p>Exchange-backed fixtures, liquidity, news context and bias signals in a professional terminal built for fast scanning.</p>
          <div className="landing-actions">
            <a href="#login">Login</a>
            <button type="button" onClick={() => setAccessOpen(true)}>Request access</button>
          </div>
        </div>
        <div className="landing-terminal-stage" aria-hidden="true">
          <div className="landing-terminal-duo">
            <div className="landing-terminal-mockup primary-screen">
              <div className="landing-terminal-top">
                <span>SportsEdge Football</span>
                <span>BF / MB / SX</span>
                <strong>Live</strong>
              </div>
              <div className="landing-terminal-tabs">
                {["Today", "UK", "UEFA", "Bias Matrix", "Arbs"].map((item) => <span key={item}>{item}</span>)}
              </div>
              <div className="landing-terminal-kpis">
                {[
                  ["Markets", "1974"],
                  ["Live", "312"],
                  ["Liquidity", "£4.8m"],
                  ["Fresh", "1.2s"]
                ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
              </div>
              <div className="landing-terminal-grid">
                <div className="landing-terminal-head">
                  <span>Time</span><span>Fixture</span><span>Coverage</span><span>Bias</span><span>Liquidity</span>
                </div>
                {[
                  ["15:00", "Brighton vs Manchester United", "BF MB SX", "Consensus +0.8", "£470k"],
                  ["15:00", "Crystal Palace vs Arsenal", "BF MB", "Away pressure", "£318k"],
                  ["17:30", "Hull City vs Southampton", "MB", "Single route", "£113k"],
                  ["20:00", "SC Freiburg vs Aston Villa", "BF MB", "Watch spread", "£82k"],
                  ["20:30", "Palermo vs Catanzaro", "MB", "Book drift", "£44k"]
                ].map((row) => (
                  <div className="landing-terminal-row" key={row.join("-")}>
                    <span>{row[0]}</span>
                    <strong>{row[1]}</strong>
                    <em>{row[2]}</em>
                    <span>{row[3]}</span>
                    <b>{row[4]}</b>
                  </div>
                ))}
              </div>
              <div className="landing-terminal-panel-row">
                <div>
                  <span>Bias Matrix</span>
                  <strong>ARS 1.84 / 1.87</strong>
                  <small>Spread 0.03 • £142k usable</small>
                </div>
                <div>
                  <span>Route Quality</span>
                  <strong>2/3 venues</strong>
                  <small>BF fresh • MB fresh • SX watch</small>
                </div>
              </div>
            </div>
            <div className="landing-terminal-mockup secondary-screen">
              <div className="landing-terminal-top">
                <span>Intelligence Rail</span>
                <span>News / Profiles / Risk</span>
                <strong>WSS</strong>
              </div>
              <div className="landing-terminal-profile">
                <div>
                  <span>Team Profile</span>
                  <strong>Arsenal</strong>
                  <small>Venue, squad, staff, form, injuries</small>
                </div>
                <div>
                  <span>Market Signal</span>
                  <strong>Home price firming</strong>
                  <small>News sensitivity high</small>
                </div>
              </div>
              <div className="landing-terminal-news-list">
                {[
                  ["1m", "INJURY", "Saka returns to full training", "impact 68"],
                  ["3m", "LINEUP", "United rotate midfield", "impact 51"],
                  ["7m", "TRANSFER", "Villa striker bid rejected", "watch"],
                  ["12m", "VENUE", "Weather risk easing", "low"]
                ].map((item) => (
                  <div key={item.join("-")}>
                    <span>{item[0]}</span>
                    <em>{item[1]}</em>
                    <strong>{item[2]}</strong>
                    <small>{item[3]}</small>
                  </div>
                ))}
              </div>
              <div className="landing-terminal-depth">
                <span>Exchange Depth</span>
                <div><b>Back</b><i style={{ width: "72%" }} /><strong>£84k</strong></div>
                <div><b>Lay</b><i style={{ width: "58%" }} /><strong>£61k</strong></div>
                <div><b>News</b><i style={{ width: "86%" }} /><strong>High</strong></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-band landing-metrics" aria-label="Platform highlights">
        {[
          ["Exchange feeds", "Betfair, Matchbook and extensible venue coverage"],
          ["Market spine", "Football-first fixture identity and liquidity ranking"],
          ["News rail", "Team, player and sport-aware intelligence stream"],
          ["Bias matrix", "Consensus, freshness and routing context"]
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="landing-content" id="about">
        <div>
          <span>About</span>
          <h2>Built for the moment before a price becomes obvious.</h2>
        </div>
        <p>SportsEdge combines fixture truth, venue coverage, live prices and news into a single operating surface. The goal is not another odds table; it is a clean read on where attention, liquidity and risk are moving.</p>
      </section>

      <section className="landing-content" id="blog">
        <div>
          <span>Latest</span>
          <h2>Research notes and product thinking.</h2>
        </div>
        <div className="landing-articles">
          {articles.map((article) => (
            <article key={article.title}>
              <strong>{article.title}</strong>
              <p>{article.excerpt}</p>
            </article>
          ))}
        </div>
        <a className="landing-text-link" href="#blog">Open the blog</a>
      </section>

      {(section === "terms" || section === "privacy") && (
        <section className="landing-content landing-policy">
          <div>
            <span>{section === "terms" ? "Terms & Conditions" : "Privacy Policy"}</span>
            <h2>{section === "terms" ? "Access and usage terms." : "Privacy and data handling."}</h2>
          </div>
          <p>{policyCopy}</p>
        </section>
      )}

      <footer className="landing-footer">
        <div>
          <img src={sportsEdgeMark} alt="" />
          <span>SportsEdge Markets</span>
        </div>
        <nav aria-label="Legal links">
          <a href="#terms">T&C</a>
          <a href="#privacy">Privacy Policy</a>
          <a href="#about">About</a>
          <a href="#blog">Blog</a>
        </nav>
        <div className="landing-socials" aria-label="Social channels inactive">
          <span>X</span>
          <span>LinkedIn</span>
          <span>YouTube</span>
        </div>
      </footer>

      {accessOpen && (
        <div className="landing-modal-backdrop" role="presentation" onMouseDown={() => setAccessOpen(false)}>
          <section className="landing-modal" role="dialog" aria-modal="true" aria-labelledby="access-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="landing-modal-close" type="button" aria-label="Close request access" onClick={() => setAccessOpen(false)}>×</button>
            <div>
              <span>Sign up</span>
              <h2 id="access-title">Request terminal access.</h2>
              <p>Tell us who you are and what you want to use SportsEdge for. New accounts are reviewed before terminal access is enabled.</p>
            </div>
            <form>
              <label>
                <span>Email</span>
                <input type="email" placeholder="you@example.com" />
              </label>
              <label>
                <span>Use case</span>
                <input type="text" placeholder="Trading, research, operations..." />
              </label>
              <label>
                <span>Organisation</span>
                <input type="text" placeholder="Company or desk name" />
              </label>
              <button type="button">Request invite</button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function BlogPage() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadPosts() {
      setLoading(true);
      try {
        const response = await fetch(sportsEdgeApiUrl("/blog-posts"), { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.posts)) throw new Error(payload.detail || "Blog posts unavailable");
        if (!cancelled) {
          setPosts(payload.posts);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Blog posts unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPosts();
    return () => {
      cancelled = true;
    };
  }, []);

  const articles = posts.length ? posts : FALLBACK_BLOG_ARTICLES;

  return (
    <main className="landing-page blog-page">
      <header className="landing-topbar">
        <a className="landing-brand" href="/" aria-label="SportsEdge landing">
          <img src={sportsEdgeMarketsLogo} alt="SportsEdge" />
        </a>
        <nav aria-label="SportsEdge site navigation">
          <a href="#about">About</a>
          <a className="active" href="#blog">Blog</a>
          <a href="#login">Login</a>
          <a className="primary" href="#signup">Sign up</a>
        </nav>
      </header>

      <section className="blog-hero">
        <span>SportsEdge Blog</span>
        <h1>Market structure, product notes, and trading intelligence.</h1>
        <p>Longer-form notes on fixture truth, exchange liquidity, news timing, and the SportsEdge terminal build-out.</p>
      </section>

      <section className="blog-list" aria-label="SportsEdge blog posts">
        {loading && <div className="blog-state">Loading blog posts.</div>}
        {error && <div className="blog-state error">{error}</div>}
        {!loading && articles.map((post) => (
          <article className="blog-card" key={post.title}>
            <div>
              <span>{("status" in post && post.status) || "research"}</span>
              {"published_at" in post && post.published_at ? <time>{formatDate(post.published_at)}</time> : null}
            </div>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
            {"tags" in post && post.tags?.length ? (
              <footer>{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</footer>
            ) : null}
          </article>
        ))}
      </section>

      <footer className="landing-footer">
        <div>
          <img src={sportsEdgeMark} alt="" />
          <span>SportsEdge Markets</span>
        </div>
        <nav>
          <a href="#about">About</a>
          <a href="#blog">Blog</a>
          <a href="#terms">T&amp;C</a>
          <a href="#privacy">Privacy Policy</a>
        </nav>
        <div className="landing-socials" aria-label="Social channels inactive">
          <span>X</span>
          <span>LinkedIn</span>
          <span>YouTube</span>
        </div>
      </footer>
    </main>
  );
}

function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authUser, setAuthUser] = useState<{
    email: string;
    roles?: string[];
    subscription?: { level?: string; status?: string; plan_name?: string; includes_admin_tools?: boolean };
  } | null>(null);

  useEffect(() => {
    const hash = window.location.hash || "";
    const queryIndex = hash.indexOf("?");
    if (queryIndex === -1) return;

    const params = new URLSearchParams(hash.slice(queryIndex + 1));
    const oauthError = params.get("oauth_error");
    const token = params.get("auth_token");
    const encodedUser = params.get("auth_user");

    if (oauthError) {
      setAuthError(oauthError);
      window.history.replaceState(null, "", "#login");
      return;
    }

    if (!token || !encodedUser) return;

    try {
      const base64 = encodedUser.replace(/-/g, "+").replace(/_/g, "/");
      const user = JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")));
      window.localStorage.setItem("sportsedge.auth.token", token);
      window.localStorage.setItem("sportsedge.auth.user", JSON.stringify(user));
      setAuthUser(user);
      setAuthError("");
      window.location.hash = defaultRouteForUser(user);
    } catch {
      setAuthError("OAuth sign in completed, but the session could not be read.");
      window.history.replaceState(null, "", "#login");
    }
  }, []);

  function startOAuth(provider: "apple" | "google") {
    setAuthError("");
    window.location.href = `/auth/oauth/${provider}/start`;
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthUser(null);
    setIsSigningIn(true);

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.detail || "Sign in failed");
      }

      window.localStorage.setItem("sportsedge.auth.token", payload.token);
      window.localStorage.setItem("sportsedge.auth.user", JSON.stringify(payload.user));
      setAuthUser(payload.user);
      setPassword("");
      window.location.hash = defaultRouteForUser(payload.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <main className="login-shell">
      <section
        className="login-visual"
        aria-label="SportsEdge sports trading visual"
      >
        <img className="login-visual-image" src={loginSportsImage} alt="Multiple sports in a live trading market environment" />
        <div className="visual-overlay" />
        <a className="visual-brand" href="https://sportsedge.markets/" aria-label="SportsEdge Markets home">
          <img className="brand-logo" src={sportsEdgeMarketsLogo} alt="SportsEdge Markets logo" />
        </a>
        <div className="visual-market-card">
          <div>
            <span>Data policy</span>
            <strong>Source only</strong>
          </div>
          <div>
            <span>Prices</span>
            <strong>Exchange feed</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>Login required</strong>
          </div>
        </div>
      </section>

      <section className="login-panel" aria-label="Login form">
        <div className="login-card">
          <div className="login-kicker">Sports trading terminal</div>
          <div className="login-card-head">
            <div className="mini-mark">
              <ShieldCheck size={19} />
            </div>
            <div>
              <h1>Terminal Login</h1>
              <p>Access live markets, orders, signals, and risk.</p>
            </div>
          </div>

          <div className="social-row">
            <button className="social-button" type="button" onClick={() => startOAuth("apple")}>
              <Apple size={18} />
              Apple
            </button>
            <button className="social-button" type="button" onClick={() => startOAuth("google")}>
              <span className="google-mark">G</span>
              Google
            </button>
          </div>

          <div className="divider">
            <span>or use email</span>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <label className="auth-field">
              <span>Email address</span>
              <div>
                <Mail size={17} />
                <input
                  type="email"
                  placeholder=""
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div>
                <Lock size={17} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <div className="login-options">
              <label>
                <input type="checkbox" defaultChecked />
                <span>Remember device</span>
              </label>
              <button type="button">Reset password</button>
            </div>

            {authError ? <p className="auth-message error">{authError}</p> : null}
            {authUser ? (
              <p className="auth-message success">
                Signed in as {authUser.email} · {(authUser.roles || []).join(", ") || "user"} · {authUser.subscription?.plan_name || authUser.subscription?.level || "active"}
              </p>
            ) : null}

            <button className="login-submit" type="submit" disabled={isSigningIn}>
              <Zap size={17} />
              {isSigningIn ? "Signing In" : "Sign In"}
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="secure-note">
            <span>2FA required</span>
            <span>Encrypted session</span>
            <span>Risk lock active</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function DashboardPage({ onLogout }: { onLogout?: () => void }) {
  const [isSportsMenuOpen, setIsSportsMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<"markets" | "news" | "social" | "sport">(() => window.location.hash === "#social-news" ? "social" : window.location.hash === "#news" ? "news" : window.location.hash.startsWith("#sport") ? "sport" : "markets");
  const [selectedSport, setSelectedSport] = useState(() => sportFromHash());
  const [sportNewsMode, setSportNewsMode] = useState<"media" | "social">("media");
  const [isSportPickerOpen, setIsSportPickerOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [newsFilters, setNewsFilters] = useState({ sport: "", competition: "" });
  const [socialSport, setSocialSport] = useState("");
  const [liveNews, setLiveNews] = useState<NewsItem[]>([]);
  const [seedMediaNews, setSeedMediaNews] = useState<NewsItem[]>([]);
  const [sportRailCache, setSportRailCache] = useState<Record<string, NewsItem[]>>({});
  const [fixtureExchangeUpdates, setFixtureExchangeUpdates] = useState<Record<string, FixtureExchangeSnapshot>>({});
  const [socketStatus, setSocketStatus] = useState<"offline" | "connecting" | "live" | "waiting">("offline");
  const socketRef = useRef<WebSocket | null>(null);
  const selectedSportRef = useRef(selectedSport);
  const sportFixturesRef = useRef<FixtureRow[]>([]);
  const reconnectTimerRef = useRef<number | null>(null);
  const newsFlashTimersRef = useRef<number[]>([]);
  const sports = PRIORITY_SPORTS;
  const sportOptions = PRIORITY_SPORTS;
  const sportDashboard = SPORT_DASHBOARDS[selectedSport] || SPORT_DASHBOARDS.football;
  const selectedSportLabel = SPORT_LABELS.get(selectedSport) || "Football";

  const formattedClock = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Madrid",
    timeZoneName: "short",
    hour12: false,
  }).format(now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isEntryDashboard || diagnosticExchange) return;
    let cancelled = false;

    async function loadEntryEvents() {
      setEntryEventsLoading(true);
      try {
        const requests = ENTRY_DASHBOARD_SPORTS.flatMap((sport) => (
          ENTRY_DASHBOARD_EXCHANGES.map((exchange) => {
            const params = new URLSearchParams({
              exchange: exchange.key,
              sport: apiSportValue(sport.value),
              limit: "300"
            });
            return fetch(`/api/exchange-sport-events?${params.toString()}`, { cache: "no-store" })
              .then((response) => response.ok ? response.json() : Promise.resolve({ rows: [] }))
              .then((payload) => ({
                exchange: exchange.label,
                sport: sport.value,
                rows: Array.isArray(payload.rows) ? payload.rows as ExchangeEventDiagnostic[] : []
              }))
              .catch(() => ({ exchange: exchange.label, sport: sport.value, rows: [] as ExchangeEventDiagnostic[] }));
          })
        ));
        const payloads = await Promise.all(requests);
        const merged = new Map<string, EntryEventRow>();

        for (const payload of payloads) {
          for (const row of payload.rows) {
            if (!row.name || !isTodayInMadrid(row.startAt)) continue;
            const entry: EntryEventRow = {
              id: row.id,
              name: row.name,
              sport: normalizeSport(row.sport || payload.sport),
              competition: row.competition,
              startAt: row.startAt,
              status: row.status,
              liquidity: Number(row.liquidity || 0),
              latestSeenAt: row.latestSeenAt,
              exchanges: [payload.exchange]
            };
            const key = entryEventKey(entry);
            const existing = merged.get(key);
            if (!existing) {
              merged.set(key, entry);
              continue;
            }
            existing.liquidity += entry.liquidity;
            existing.exchanges = Array.from(new Set([...existing.exchanges, payload.exchange]));
            if (eventStartSortValue(entry.startAt) < eventStartSortValue(existing.startAt)) existing.startAt = entry.startAt;
            if (eventStartSortValue(entry.latestSeenAt) > eventStartSortValue(existing.latestSeenAt)) existing.latestSeenAt = entry.latestSeenAt;
          }
        }

        const rows = Array.from(merged.values())
          .sort((a, b) => {
            const startDiff = eventStartSortValue(a.startAt) - eventStartSortValue(b.startAt);
            if (startDiff !== 0) return startDiff;
            return b.liquidity - a.liquidity;
          })
          .slice(0, 120);

        if (!cancelled) {
          setEntryEvents(rows);
          setEntryEventsError("");
        }
      } catch (error) {
        if (!cancelled) setEntryEventsError(error instanceof Error ? error.message : "today events failed");
      } finally {
        if (!cancelled) setEntryEventsLoading(false);
      }
    }

    loadEntryEvents();
    const timer = window.setInterval(loadEntryEvents, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isEntryDashboard, diagnosticExchange]);

  useEffect(() => {
    selectedSportRef.current = selectedSport;
    sportFixturesRef.current = sportDashboard.fixtures;
  }, [selectedSport, sportDashboard.fixtures]);

  useEffect(() => {
    function syncRouteFromHash() {
      const hash = window.location.hash;
      if (hash.startsWith("#sport")) {
        const sport = sportFromHash(hash);
        setSelectedSport(sport);
        setNewsFilters((filters) => ({ ...filters, sport }));
        setSocialSport(sport === "horseracing" ? "horse-racing" : sport);
        setActiveView("sport");
        return;
      }
      if (hash === "#news") {
        setActiveView("news");
        return;
      }
      if (hash === "#social-news") {
        setActiveView("social");
        return;
      }
      if (hash === "#dashboard") {
        setActiveView("markets");
      }
    }

    syncRouteFromHash();
    window.addEventListener("hashchange", syncRouteFromHash);
    return () => window.removeEventListener("hashchange", syncRouteFromHash);
  }, []);

  useEffect(() => {
    const token = window.localStorage.getItem("sportsedge.auth.token");
    let closedByEffect = false;

    function clearReconnect() {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function subscribe(socket: WebSocket) {
      socket.send(JSON.stringify({
        type: "subscribe",
        channel: "news",
        filters: {}
      }));
      socket.send(JSON.stringify({
        type: "subscribe",
        channel: "*"
      }));
    }

    function connect() {
      clearReconnect();

      if (!token) {
        setSocketStatus("waiting");
        return;
      }

      setSocketStatus("connecting");
      const socket = new WebSocket(sportsEdgeWsUrl(token));
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setSocketStatus("live");
        subscribe(socket);
      });

      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === "event" && message.payload) {
            const update = extractFixtureExchangeUpdate(
              String(message.channel || ""),
              message.payload,
              selectedSportRef.current,
              sportFixturesRef.current
            );
            if (update) {
              setFixtureExchangeUpdates((updates) => ({
                ...updates,
                [update.key]: update.snapshot
              }));
            }
            return;
          }

          if (message?.type !== "news.item" || !message.payload) return;

          setLiveNews((items) => {
            const nextItem = { ...(message.payload as NewsItem), isNew: true };
            const withoutDuplicate = items.filter((item) => item.id !== nextItem.id);
            return [nextItem, ...withoutDuplicate].slice(0, 160);
          });

          const itemId = String(message.payload.id);
          const flashTimer = window.setTimeout(() => {
            setLiveNews((items) => items.map((item) => (
              item.id === itemId ? { ...item, isNew: false } : item
            )));
          }, 2000);
          newsFlashTimersRef.current.push(flashTimer);
        } catch {
          // Ignore malformed socket messages; the stream will continue.
        }
      });

      socket.addEventListener("close", () => {
        if (closedByEffect) return;
        setSocketStatus("offline");
        reconnectTimerRef.current = window.setTimeout(connect, 2500);
      });

      socket.addEventListener("error", () => {
        setSocketStatus("offline");
      });
    }

    connect();

    return () => {
      closedByEffect = true;
      clearReconnect();
      newsFlashTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      newsFlashTimersRef.current = [];
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "subscribe",
        channel: "news",
        filters: {}
      }));
    }
  }, [selectedSport]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "80" });
    params.set("sport", apiSportValue(selectedSport));
    fetch(`/api/news?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (!Array.isArray(payload.items)) return;
        setSeedMediaNews(payload.items.map((item: NewsItem) => ({ ...item, feed: item.feed || "official" })));
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setSeedMediaNews([]);
      });
    return () => controller.abort();
  }, [selectedSport]);

  const blotterRows: string[][] = [];

  const events: string[][] = [];

  const runners: Array<{ name: string; matched: string; prices: string[][] }> = [];

  const positions: string[][] = [];

  const ladder: Array<[string, string, string, number]> = [];
  const filteredLiveNews = liveNews.filter((item) => (
    sportMatchesNewsFilter(item.sport, newsFilters.sport) &&
    (!newsFilters.competition.trim() || String(item.competition || "").toLowerCase().includes(newsFilters.competition.trim().toLowerCase()))
  ));
  const socialNews = liveNews.filter((item) => item.feed === "social" || item.source_type === "twitter" || item.feed_type === "twitter");
  const filteredSocialNews = socialNews.filter((item) => sportMatchesAliases(item.sport, socialSportAliases(socialSport)));
  const sportStreamNews = liveNews.filter((item) => sportMatchesNewsFilter(item.sport, selectedSport));
  const seedSportMediaNews = seedMediaNews.filter((item) => sportMatchesNewsFilter(item.sport, selectedSport));
  const liveSportMediaNews = sportStreamNews.filter((item) => item.feed !== "social" && item.source_type !== "twitter" && item.feed_type !== "twitter");
  const sportMediaNews = imageFirstNews(mergeNewsItems(liveSportMediaNews, seedSportMediaNews));
  const sportSocialNews = uniqueNewsItems(sportStreamNews.filter((item) => item.feed === "social" || item.source_type === "twitter" || item.feed_type === "twitter"));
  const sportRailNews = sportSocialNews;
  const sportRailCacheKey = `${selectedSport}:news`;
  const visibleSportRailNews = sportRailNews.length ? sportRailNews : sportRailCache[sportRailCacheKey] || [];

  useEffect(() => {
    if (!sportRailNews.length) return;
    setSportRailCache((cache) => {
      const existing = cache[sportRailCacheKey] || [];
      const merged = [...sportRailNews, ...existing.filter((item) => !sportRailNews.some((next) => next.id === item.id))].slice(0, 40);
      if (existing.length === merged.length && existing.every((item, index) => item.id === merged[index]?.id && item.isNew === merged[index]?.isNew)) {
        return cache;
      }
      return { ...cache, [sportRailCacheKey]: merged };
    });
  }, [sportRailCacheKey, sportRailNews]);

  return (
    <main className="terminal-shell">
      <div
        className={`sports-drawer-layer${isSportsMenuOpen ? " open" : ""}`}
        aria-hidden={!isSportsMenuOpen}
      >
        <button
          className="sports-drawer-scrim"
          type="button"
          aria-label="Close sports menu"
          onClick={() => setIsSportsMenuOpen(false)}
          tabIndex={isSportsMenuOpen ? 0 : -1}
        />
        <aside className="sports-drawer" aria-label="Sports menu">
          <div className="sports-drawer-head">
            <button
              className="sports-drawer-logo"
              type="button"
              aria-label="Close sports menu"
              onClick={() => setIsSportsMenuOpen(false)}
            >
              <img src={sportsEdgeMark} alt="" />
            </button>
            <div>
              <strong>SportsEdge</strong>
              <span>Sports Markets</span>
            </div>
          </div>
          <div className="sports-drawer-list">
            {sports.map((sport, index) => (
              <button
                className={newsFilters.sport ? newsFilters.sport === sport.value ? "active" : "" : index === 0 ? "active" : ""}
                type="button"
                key={sport.value}
                onClick={() => {
                  setSelectedSport(sport.value);
                  setNewsFilters((filters) => ({ ...filters, sport: sport.value }));
                  setSocialSport(sport.value === "horseracing" ? "horse-racing" : sport.value);
                  setActiveView("sport");
                  window.history.replaceState(null, "", `#sport-${sport.value}`);
                  setIsSportsMenuOpen(false);
                }}
              >
                <span>{sport.label}</span>
                <small>{sport.detail}</small>
              </button>
            ))}
          </div>
          <div className="sports-drawer-news">
            <div className="drawer-section-title">
              <Newspaper size={15} />
              <span>News</span>
              <strong>{socketStatus === "live" ? "Live" : socketStatus}</strong>
            </div>
            <button
              className="drawer-news-link"
              type="button"
              onClick={() => {
                setActiveView("news");
                window.history.replaceState(null, "", "#news");
                setIsSportsMenuOpen(false);
              }}
            >
              News page
            </button>
            <button
              className="drawer-news-link"
              type="button"
              onClick={() => {
                setActiveView("social");
                window.history.replaceState(null, "", "#social-news");
                setIsSportsMenuOpen(false);
              }}
            >
              Social News
            </button>
            <label className="news-filter-field">
              <span>Sport filter</span>
              <select
                value={newsFilters.sport}
                onChange={(event) => setNewsFilters((filters) => ({ ...filters, sport: event.target.value }))}
              >
                <option value="">Priority sports</option>
                {sportOptions.map((sport) => (
                  <option key={sport.value} value={sport.value}>{sport.label}</option>
                ))}
              </select>
            </label>
            <label className="news-filter-field">
              <span>Competition filter</span>
              <input
                value={newsFilters.competition}
                onChange={(event) => setNewsFilters((filters) => ({ ...filters, competition: event.target.value }))}
                placeholder="Premier League"
              />
            </label>
          </div>
          <div className="sports-drawer-status">
            <span><Activity size={15} /> Live feed <strong>Source</strong></span>
            <span><Lock size={15} /> Risk lock <strong>On</strong></span>
            <button className="sports-logout" type="button" onClick={onLogout}>
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </aside>
      </div>

      <section className="workspace">
        <div className="command-bar">
          <button
            className="sports-menu-trigger"
            type="button"
            aria-label={isSportsMenuOpen ? "Close sports menu" : "Open sports menu"}
            aria-expanded={isSportsMenuOpen}
            onClick={() => setIsSportsMenuOpen((open) => !open)}
          >
            <img src={sportsEdgeMark} alt="" />
          </button>
          <div className="search-box">
            <Search size={18} />
            <span>Search markets, runners, leagues, orders</span>
          </div>
          <div className="market-clock">
            <CalendarClock size={16} />
            <strong>{formattedClock}</strong>
          </div>
          <div className="top-metric">
            <span>Balance</span>
            <strong>-</strong>
          </div>
          <a className="testboard-route-link dashboard-testboard-link" href="#dashboard">Dashboard</a>
          <button className="primary-action" type="button">
            <Zap size={16} />
            Auto-Trade
          </button>
        </div>

        <div className="ticker-strip">
          <span><strong>EXCHANGE FEEDS ONLY</strong></span>
          <span>Prices: source exchange WSS/API</span>
          <span>Arbs: hidden until cross-exchange quotes exist</span>
          <span>Risk: waiting for account feed</span>
          <span>Matched today: waiting for source totals</span>
        </div>

        <div className="match-strip">
          <div
            className="league-select sport-strip-picker"
            onMouseEnter={() => setIsSportPickerOpen(true)}
            onMouseLeave={() => setIsSportPickerOpen(false)}
          >
            <Radio size={14} />
            <button
              type="button"
              onClick={() => setIsSportPickerOpen((open) => !open)}
              aria-expanded={isSportPickerOpen}
              aria-label="Select sport"
            >
              <span>{selectedSportLabel}</span>
              <strong>{activeView === "sport" ? "Today" : "Premier League"}</strong>
            </button>
            <div className={`sport-strip-menu${isSportPickerOpen ? " open" : ""}`}>
              {sports.map((sport) => (
                <button
                  className={selectedSport === sport.value ? "active" : ""}
                  type="button"
                  key={sport.value}
                  onClick={() => {
                    setSelectedSport(sport.value);
                    setNewsFilters((filters) => ({ ...filters, sport: sport.value }));
                    setSocialSport(sport.value === "horseracing" ? "horse-racing" : sport.value);
                    setActiveView("sport");
                    setIsSportPickerOpen(false);
                    window.history.replaceState(null, "", `#sport-${sport.value}`);
                  }}
                >
                  <span>{sport.label}</span>
                  <small>{sport.detail}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="scoreline">
            <button type="button" aria-label="Watch market">
              <Star size={18} />
            </button>
            <strong>No market selected</strong>
            <span>-</span>
            <strong>Source exchange only</strong>
            <em>Waiting</em>
          </div>
          <div className="view-tools">
            <button className="tool-button" type="button">Chart</button>
            <button className="tool-button" type="button">Ladder</button>
            <button className="tool-button" type="button" aria-label="More views">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        <div className="market-tabs">
          {["Match Odds", "Correct Score", "Over/Under 2.5", "Both Teams To Score", "Asian Handicap", "Draw No Bet", "+"].map((tab, index) => (
            <button
              className={activeView === "markets" && index === 0 ? "active" : ""}
              key={tab}
              type="button"
              onClick={() => {
                setActiveView("markets");
                window.history.replaceState(null, "", "#dashboard");
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeView === "sport" ? (
          <section className="sport-dashboard" aria-label={`${selectedSportLabel} dashboard`}>
            <section className="sport-main">
              <div className="sport-kpi-grid">
                {sportDashboard.signals.map((signal) => (
                  <div className="sport-kpi" key={signal[0]}>
                    <span>{signal[0]}</span>
                    <strong>{signal[1]}</strong>
                    <em>{signal[2]}</em>
                  </div>
                ))}
              </div>

              <section className="panel sport-fixtures-panel">
                <div className="panel-head compact">
                  <div>
                    <h2>Today's Fixtures</h2>
                    <p>Trading value and volume by connected exchange.</p>
                  </div>
                  <CalendarClock size={16} />
                </div>
                <div className="sport-fixture-table">
                  <table className="fixture-trading-table">
                    <thead>
                      <tr>
                        <th scope="col">Time</th>
                        <th scope="col">Fixture</th>
                        <th scope="col">Market</th>
                        <th scope="col">Arb</th>
                        {EXCHANGE_COLUMNS.map((exchange) => (
                          <th scope="col" title={exchange.name} key={exchange.key}>{exchange.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sportDashboard.fixtures.map((fixture, fixtureIndex) => {
                        const rowQuotes = EXCHANGE_COLUMNS.flatMap((exchange) => {
                          const updateKey = fixtureExchangeUpdateKey(selectedSport, fixture, exchange.key);
                          const exchangeValue = fixtureExchangeUpdates[updateKey] || fixtureExchangeValue(selectedSport, fixture, exchange);
                          if (!exchangeValue) return [];
                          const quote = quoteForFixtureExchange(exchangeValue);
                          if (!quote) return [];
                          return [{ exchange: exchange.label, bid: quote.bid, ask: quote.ask, source: quote.source }];
                        });
                        const arb = fixtureArbSummary(rowQuotes);
                        return (
                          <tr key={`${fixture[0]}-${fixture[1]}`}>
                            <td className="fixture-time"><strong>{fixture[0]}</strong></td>
                            <td className="fixture-name">
                              <span>{fixture[1]}</span>
                              <small>{fixtureGroupLabel(fixture[2])}</small>
                            </td>
                            <td className="fixture-market"><em>{fixture[3]}</em></td>
                            <td>
                              <span className={`arb-pill${arb?.isArb ? " active" : ""}${arb?.live ? " live" : ""}`}>
                                {arb?.isArb ? `+${arb.edge.toFixed(2)}` : "None"}
                              </span>
                            </td>
                            {EXCHANGE_COLUMNS.map((exchange) => {
                              const updateKey = fixtureExchangeUpdateKey(selectedSport, fixture, exchange.key);
                              const seededValue = fixtureExchangeValue(selectedSport, fixture, exchange);
                              const exchangeValue = fixtureExchangeUpdates[updateKey] || seededValue;
                              const isLiveTick = Boolean(fixtureExchangeUpdates[updateKey] && now.getTime() - fixtureExchangeUpdates[updateKey].updatedAt < 6500);
                              return (
                                <td key={exchange.key}>
                                  <div className={`fixture-exchange-cell${exchangeValue ? "" : " muted"}${isLiveTick ? " live-tick" : ""}`}>
                                    {exchangeValue ? (
                                      <>
                                        <strong>{formatExchangeMoney(exchangeValue.value, exchangeValue.currency)}</strong>
                                        <small>{exchangeValue.volume} mkts{exchangeValue.source === "wss" ? " live" : ""}</small>
                                      </>
                                    ) : (
                                      <span>—</span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="sport-lower-grid">
                <div className="panel">
                  <div className="panel-head compact">
                    <div>
                      <h2>Exchange Coverage</h2>
                      <p>Liquidity and movement by venue.</p>
                    </div>
                    <Database size={16} />
                  </div>
                  <div className="sport-market-list">
                    {sportDashboard.markets.map((market) => (
                      <div className="sport-market-row" key={market[0]}>
                        <span>{market[0]}</span>
                        <strong>{market[1]}</strong>
                        <em>{market[2]}</em>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head compact">
                    <div>
                      <h2>Trading Notes</h2>
                      <p>Operational prompts for the selected sport.</p>
                    </div>
                    <Target size={16} />
                  </div>
                  <div className="sport-notes">
                    <span><Zap size={15} /> Watch late lineup / team-sheet swings before accepting model edge.</span>
                    <span><AlertTriangle size={15} /> Treat social-only moves as discovery until confirmed by media or official source.</span>
                    <span><Activity size={15} /> Cross-check Matchbook, SX, and Kalshi overlap before flagging arb.</span>
                  </div>
                </div>
              </section>
            </section>

            <aside className="sport-news-rail" aria-label={`${selectedSportLabel} live news`}>
              <div className="sport-news-head">
                <h2>News</h2>
              </div>
              <div className="sport-news-list">
                {visibleSportRailNews.slice(0, 18).map((item) => (
                  <article className={`sport-news-card${item.isNew ? " is-new" : ""}`} key={`news-${item.id}`} title={newsContextText(item)}>
                    <div className={`sport-news-thumb${newsImageUrl(item) ? "" : " empty"}`}>
                      {newsImageUrl(item) ? (
                        <img src={newsImageUrl(item)} alt="" loading="lazy" />
                      ) : (
                        <span>{String(item.source_name || item.feed || "SE").slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <strong>{cleanText(item.title)}</strong>
                      <p>{newsContextText(item) || displayLabel(item.source_name, "X source")}</p>
                      {newsImpactLabel(item.impact_assessment) && (
                        <div className={`news-impact-strip ${impactClass(item.impact_assessment)}`}>
                          <span>{newsImpactLabel(item.impact_assessment)?.eventType}</span>
                          <b>{newsImpactLabel(item.impact_assessment)?.score}</b>
                          {newsImpactLabel(item.impact_assessment)?.direction && <em>{newsImpactLabel(item.impact_assessment)?.direction}</em>}
                        </div>
                      )}
                    </div>
                    <footer>
                      <span>{displayLabel(item.source_name, "news")}</span>
                      {newsOpenUrl(item) && <a href={newsOpenUrl(item)} target="_blank" rel="noreferrer">Open</a>}
                      <time>{formatDate(item.discovered_at || item.published_at)}</time>
                    </footer>
                  </article>
                ))}
                {visibleSportRailNews.length === 0 && (
                  <div className="sport-news-empty">
                    <Newspaper size={22} />
                    <strong>Waiting for News</strong>
                    <span>The WSS subscription is filtered to X posts for {selectedSportLabel}.</span>
                  </div>
                )}
              </div>
            </aside>
          </section>
        ) : activeView === "social" ? (
          <section className="dashboard-news-page social-news-page" aria-label="Social news page">
            <div className="dashboard-news-header">
              <div>
                <span className="live-dot">Social</span>
                <h2>Social News</h2>
                <p>HL Twitter/X posts pushed over the authenticated SportsEdge WSS stream.</p>
              </div>
              <div className="dashboard-news-status">
                <span>Socket</span>
                <strong>{socketStatus}</strong>
              </div>
            </div>
            <div className="social-sport-filter" aria-label="Social news sport filters">
              {SOCIAL_NEWS_SPORTS.map((sport) => (
                <button
                  className={socialSport === sport.value ? "active" : ""}
                  key={sport.value || "all"}
                  type="button"
                  onClick={() => setSocialSport(sport.value)}
                >
                  <span>{sport.mark}</span>
                  <strong>{sport.label}</strong>
                </button>
              ))}
            </div>
            <div className="dashboard-news-list social-news-list">
              {filteredSocialNews.map((item) => (
                <article className={`dashboard-news-item social-news-item${item.isNew ? " is-new" : ""}`} key={`social-${item.id}`} title={newsContextText(item)}>
                  <div className="social-avatar" aria-hidden="true">{String(item.source_name || item.entity_name || "X").slice(0, 2).toUpperCase()}</div>
                  <div>
                    <strong>{cleanText(item.title)}</strong>
                    <p>{newsContextText(item) || displayLabel(item.source_name, "Social source")}</p>
                  </div>
                  <aside>
                    <span>{SPORT_LABELS.get(String(item.sport || "").toLowerCase()) || displayLabel(item.sport, "social")}</span>
                    <span>{displayLabel(item.source_name || item.entity_name, "x")}</span>
                    {newsOpenUrl(item) && <a href={newsOpenUrl(item)} target="_blank" rel="noreferrer">Open</a>}
                    <time>{formatDate(item.discovered_at || item.published_at)}</time>
                  </aside>
                </article>
              ))}
              {filteredSocialNews.length === 0 && (
                <div className="dashboard-news-empty">
                  <Radio size={22} />
                  <strong>Waiting for social news</strong>
                  <span>All WSS news is received by the terminal; this view shows HL Twitter/X posts by sport.</span>
                </div>
              )}
            </div>
          </section>
        ) : activeView === "news" ? (
          <section className="dashboard-news-page" aria-label="Realtime news page">
            <div className="dashboard-news-header">
              <div>
                <span className="live-dot">News</span>
                <h2>Realtime SportsEdge News</h2>
                <p>Incoming `news.item` messages from the authenticated SportsEdge WSS stream.</p>
              </div>
              <div className="dashboard-news-status">
                <span>Socket</span>
                <strong>{socketStatus}</strong>
              </div>
            </div>
            <div className="dashboard-news-filters">
              <label className="news-filter-field">
                <span>Sport</span>
                <select
                  value={newsFilters.sport}
                  onChange={(event) => setNewsFilters((filters) => ({ ...filters, sport: event.target.value }))}
                >
                  <option value="">Priority sports</option>
                  {sportOptions.map((sport) => (
                    <option key={sport.value} value={sport.value}>{sport.label}</option>
                  ))}
                </select>
              </label>
              <label className="news-filter-field">
                <span>Competition</span>
                <input
                  value={newsFilters.competition}
                  onChange={(event) => setNewsFilters((filters) => ({ ...filters, competition: event.target.value }))}
                  placeholder="Premier League"
                />
              </label>
            </div>
            <div className="dashboard-news-list">
              {filteredLiveNews.map((item) => (
                <article className={`dashboard-news-item${item.isNew ? " is-new" : ""}`} key={item.id} title={newsContextText(item)}>
                  {item.image_url && (
                    <img className="dashboard-news-image" src={item.image_url} alt="" loading="lazy" />
                  )}
                  <div>
                    <strong>{cleanText(item.title)}</strong>
                    <p>{newsContextText(item) || "No display summary yet."}</p>
                  </div>
                  <aside>
                    <span>{SPORT_LABELS.get(String(item.sport || "").toLowerCase()) || displayLabel(item.sport, "news")}</span>
                    <span>{displayLabel(item.competition, "n/a")}</span>
                    {newsOpenUrl(item) && <a href={newsOpenUrl(item)} target="_blank" rel="noreferrer">Open</a>}
                    <time>{formatDate(item.discovered_at || item.published_at)}</time>
                  </aside>
                </article>
              ))}
              {filteredLiveNews.length === 0 && (
                <div className="dashboard-news-empty">
                  <Newspaper size={22} />
                  <strong>Waiting for live news</strong>
                  <span>The dashboard is subscribed to `news`; new WSS `news.item` payloads will appear here.</span>
                </div>
              )}
            </div>
          </section>
        ) : (
        <div className="terminal-grid">
          <section className="panel market-panel">
            <div className="panel-head terminal-head">
              <h2>Market Blotter</h2>
              <div className="head-metrics">
                <span className="live-dot">In-play</span>
                <span>RTP 98.7%</span>
                <span>Matched GBP 12,862,193</span>
              </div>
            </div>
            <div className="mini-blotter">
              <div className="mini-row header">
                <span>Time</span><span>Selection</span><span>Price</span><span>Size</span><span>B/L</span><span>Trader</span><span>Matched</span>
              </div>
              {blotterRows.map((row) => (
                <div className="mini-row" key={`${row[0]}-${row[1]}-${row[5]}`}>
                  {row.map((cell, index) => (
                    <span className={index === 1 && cell === "Newcastle" ? "amber" : index === 4 && cell === "B" ? "back" : index === 4 ? "lay" : ""} key={index}>{cell}</span>
                  ))}
                </div>
              ))}
              {blotterRows.length === 0 && <div className="empty-row">Waiting for backend exchange trades.</div>}
            </div>
            <div className="submarket-tabs">
              <button className="active" type="button">All Markets</button>
              <button type="button">Favourites</button>
              <button type="button">In-play (24)</button>
              <button type="button">Soccer (132)</button>
            </div>
            <div className="orders-list">
              {events.map((event, index) => (
                <div className="order-row" key={event[1]}>
                  <strong className="mono">{event[0]}</strong>
                  <span><strong>{event[1]}</strong><small>{event[2]}</small></span>
                  <span>{index === 0 ? "LIVE" : ""}</span>
                  <span>{event[3]}</span>
                  <span />
                </div>
              ))}
            </div>
          </section>

          <section className="panel odds-panel">
            <div className="panel-head terminal-head">
              <h2>Match Odds</h2>
              <div className="head-metrics">
                <span>BSP</span>
                <span className="live-dot">ON</span>
                <span>GBP 25.00</span>
              </div>
            </div>
            <div className="odds-matrix">
              {runners.map((runner) => (
                <div className="runner-book" key={runner.name}>
                  <div className="runner-head">
                    <div>
                      <strong>{runner.name}</strong>
                      <span>{runner.matched}</span>
                    </div>
                  </div>
                  <div className="runner-cols">
                    <span>Back</span>
                    <span>Price</span>
                    <span>Lay</span>
                  </div>
                  {runner.prices.map((price) => (
                    <div className="book-row" key={`${runner.name}-${price[1]}`}>
                      <span className="book-size back-cell">GBP {price[0]}</span>
                      <strong>{price[1]}</strong>
                      <span className="book-size lay-cell">GBP {price[2]}</span>
                    </div>
                  ))}
                </div>
              ))}
              {runners.length === 0 && <div className="empty-row">Waiting for real backend prices.</div>}
            </div>
          </section>

          <section className="panel chart-panel">
            <div className="panel-head compact">
              <div>
                <h2>Price Movement</h2>
                <p>Waiting for backend price ticks</p>
              </div>
              <button className="tool-button" type="button">1m</button>
            </div>
            <svg className="spark-chart" viewBox="0 0 300 130" role="img" aria-label="Price movement chart">
              <defs>
                <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.42" />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="spark-grid" d="M0 25H300M0 65H300M0 105H300" />
              <path className="spark-fill" d="M0 92L18 84L36 90L54 82L72 74L90 77L108 70L126 62L144 66L162 58L180 50L198 53L216 45L234 38L252 43L270 34L288 28L300 31V130H0Z" />
              <path className="spark-line" d="M0 92L18 84L36 90L54 82L72 74L90 77L108 70L126 62L144 66L162 58L180 50L198 53L216 45L234 38L252 43L270 34L288 28L300 31" />
            </svg>
            <div className="metric-row">
              <div><span>Best Back</span><strong>-</strong></div>
              <div><span>Best Lay</span><strong>-</strong></div>
              <div><span>Spread</span><strong>-</strong></div>
            </div>
          </section>

          <section className="panel ladder-panel">
            <div className="panel-head compact">
              <div>
                <h2>Market Depth</h2>
                <p>Cumulative back / lay volume</p>
              </div>
              <SlidersHorizontal size={16} />
            </div>
            <div className="depth-chart">
              <svg viewBox="0 0 300 70" role="img" aria-label="Market depth chart">
                <path className="depth-back" d="M0 10L40 18L80 26L120 30L160 38L190 52L190 70H0Z" />
                <path className="depth-lay" d="M190 52L220 40L250 32L280 20L300 12V70H190Z" />
                <path className="depth-back-line" d="M0 10L40 18L80 26L120 30L160 38L190 52" />
                <path className="depth-lay-line" d="M190 52L220 40L250 32L280 20L300 12" />
              </svg>
            </div>
            <div className="ladder">
              {ladder.map((row) => (
                <div className="ladder-row" key={row[0]}>
                  <i className="depth" style={{ width: `${row[3]}%` }} />
                  <strong>{row[0]}</strong>
                  <span className="back">{row[1]}</span>
                  <span className="lay">{row[2]}</span>
                </div>
              ))}
              {ladder.length === 0 && <div className="empty-row">Waiting for backend ladder.</div>}
            </div>
          </section>

          <section className="panel orders-panel">
            <div className="panel-head compact">
              <div>
                <h2>Open Positions</h2>
                <p>Live P/L by market</p>
              </div>
              <WalletCards size={16} />
            </div>
            <div className="position-table">
              <div className="position-row header"><span>Market</span><span>Selection</span><span>Side</span><span>Avg</span><span>Size</span><span>P/L</span></div>
              {positions.map((position) => (
                <div className="position-row" key={`${position[0]}-${position[1]}`}>
                  <span>{position[0]}</span><span>{position[1]}</span><span className={position[2] === "BACK" ? "back" : "lay"}>{position[2]}</span><span>{position[3]}</span><span>{position[4]}</span><span className={position[5].startsWith("+") ? "positive" : "negative"}>{position[5]}</span>
                </div>
              ))}
              {positions.length === 0 && <div className="empty-row">No backend positions loaded.</div>}
            </div>
          </section>

          <section className="panel ticket-panel">
            <div className="panel-head compact">
              <div>
                <h2>Execution Ticket</h2>
                <p>Smart order routing</p>
              </div>
              <Target size={16} />
            </div>
            <div className="ticket-event">
              <span>No source market selected</span>
              <strong>Waiting for live exchange quote</strong>
            </div>
            <div className="trade-toggle">
              <button className="selected" type="button">Back</button>
              <button type="button">Lay</button>
            </div>
            <label className="field">
              <span>Stake</span>
              <input type="range" min="0" max="100" defaultValue="23" />
            </label>
            <div className="ticket-summary">
              <div><span>Exposure</span><strong>-</strong></div>
              <div><span>Model Edge</span><strong>-</strong></div>
            </div>
            <button className="execute-button" type="button">
              <Zap size={16} />
              Route Order
            </button>
          </section>

          <section className="panel alerts-panel">
            <div className="panel-head compact">
              <div>
                <h2>Alerts & News</h2>
                <p>Model, feed, and execution events</p>
              </div>
              <Bell size={16} />
            </div>
            <div className="alerts-list">
              {liveNews.slice(0, 3).map((item) => (
                <div className="alert-row news" key={item.id}>
                  <Newspaper size={15} />
                  <span>{cleanText(item.title)}</span>
                  <strong>{displayLabel(item.sport, "news")}</strong>
                </div>
              ))}
              {liveNews.length === 0 && (
                <div className="alert-row"><AlertTriangle size={15} /><span>Waiting for source exchange events.</span><strong>-</strong></div>
              )}
            </div>
          </section>

          <section className="panel risk-panel">
            <div className="panel-head compact">
              <div>
                <h2>Risk Heatmap</h2>
                <p>Cross-exchange liability</p>
              </div>
              <BriefcaseBusiness size={16} />
            </div>
            <div className="heatmap">
              {["ok", "ok", "warn", "danger", "ok", "warn", "ok", "danger", "warn", "ok", "ok", "danger"].map((level, index) => (
                <span className={`heat ${level}`} key={index}>{index % 4 === 0 ? "BF" : index % 4 === 1 ? "MB" : index % 4 === 2 ? "SX" : "KS"}</span>
              ))}
            </div>
            <div className="risk-scale">
              <span>Low</span>
              <span>Moderate</span>
              <span>High</span>
            </div>
          </section>
        </div>
        )}
      </section>
    </main>
  );
}

function TestboardPage({ onLogout }: { onLogout?: () => void }) {
  const [selectedSport, setSelectedSport] = useState(() => terminalSportFromHash(window.location.hash));
  const [isEntryDashboard, setIsEntryDashboard] = useState(() => !window.location.hash || window.location.hash === "#dashboard" || window.location.hash === "#testboard");
  const [isMatrixPage, setIsMatrixPage] = useState(() => window.location.hash === "#matrix");
  const [diagnosticExchange, setDiagnosticExchange] = useState<string | null>(() => window.location.hash === "#actual" ? "polymarket" : null);
  const [diagnosticRows, setDiagnosticRows] = useState<ExchangeSportDiagnostic[]>([]);
  const [diagnosticEventRows, setDiagnosticEventRows] = useState<Record<string, ExchangeEventDiagnostic[]>>({});
  const [diagnosticPriceRows, setDiagnosticPriceRows] = useState<Record<string, ExchangeEventPriceDiagnostic[]>>({});
  const [expandedDiagnosticSport, setExpandedDiagnosticSport] = useState<string | null>(null);
  const [expandedDiagnosticEvent, setExpandedDiagnosticEvent] = useState<ExchangeEventDiagnostic | null>(null);
  const [diagnosticError, setDiagnosticError] = useState("");
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticEventsLoading, setDiagnosticEventsLoading] = useState(false);
  const [diagnosticPricesLoading, setDiagnosticPricesLoading] = useState(false);
  const [selectedFixtureIndex, setSelectedFixtureIndex] = useState<number | null>(null);
  const [backendRows, setBackendRows] = useState<BackendPriceRow[]>([]);
  const [liveRows, setLiveRows] = useState<BackendPriceRow[]>([]);
  const [backendError, setBackendError] = useState("");
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);
  const [marketSearch, setMarketSearch] = useState("");
  const [teamSearchResults, setTeamSearchResults] = useState<FootballTeamAsset[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [marketGroup, setMarketGroup] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [, setTeamAssetVersion] = useState(0);
  const [fixtureExchangeUpdates, setFixtureExchangeUpdates] = useState<Record<string, FixtureExchangeSnapshot>>({});
  const [socketStatus, setSocketStatus] = useState<"offline" | "connecting" | "live" | "waiting">("offline");
  const [entryEvents, setEntryEvents] = useState<EntryEventRow[]>([]);
  const [entryEventsLoading, setEntryEventsLoading] = useState(false);
  const [entryEventsError, setEntryEventsError] = useState("");
  const [footballFixtures, setFootballFixtures] = useState<FootballFixture[]>([]);
  const [footballFixturesLoading, setFootballFixturesLoading] = useState(false);
  const [footballFixturesError, setFootballFixturesError] = useState("");
  const [entryNews, setEntryNews] = useState<NewsItem[]>([]);
  const [now, setNow] = useState(() => new Date());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const pendingPriceEventsRef = useRef<Array<{ channel: string; payload: unknown }>>([]);
  const priceFlushTimerRef = useRef<number | null>(null);
  const newsFlashTimersRef = useRef<number[]>([]);
  const marketSearchRef = useRef<HTMLInputElement | null>(null);
  const matrixSnapshotLoadingRef = useRef(false);
  const selectedSportRef = useRef(selectedSport);
  const isMatrixPageRef = useRef(isMatrixPage);
  const isEntryDashboardRef = useRef(isEntryDashboard);
  const marketGroupRef = useRef(marketGroup);
  const subscribedPriceChannelsRef = useRef<Set<string>>(new Set());
  const fixturesRef = useRef<FixtureRow[]>([]);
  const rowOrderRef = useRef<Record<string, number>>({});
  const nextRowOrderRef = useRef(0);
  const sportDashboard = SPORT_DASHBOARDS[selectedSport] || SPORT_DASHBOARDS.football;
  const sessionUser = useMemo(readStoredAuthUser, []);
  const isAdmin = storedUserIsAdmin(sessionUser);
  const commandOptions = useMemo(() => {
    const teamOptions = marketSearch.trim().replace(/^\//, "").length >= 2
      ? teamSearchResults.map(footballTeamCommand)
      : [];
    return mergeCommandOptions([
      ...teamOptions,
      ...COMMAND_OPTIONS.filter((option) => commandMatches(option, marketSearch))
    ]).slice(0, 10);
  }, [marketSearch, teamSearchResults]);

  function runCommand(option: CommandOption | null) {
    if (!option) return;
    setCommandOpen(false);
    setMarketSearch("");
    window.location.hash = option.route;
  }

  useEffect(() => {
    function applyRoute() {
      const hash = window.location.hash || "#dashboard";
      if (hash === "#matrix") {
        setIsMatrixPage(true);
        setIsEntryDashboard(false);
        setDiagnosticExchange(null);
        setSelectedFixtureIndex(null);
        return;
      }
      if (hash === "#actual") {
        setIsMatrixPage(false);
        setIsEntryDashboard(false);
        setDiagnosticExchange((exchange) => exchange || "polymarket");
        setSelectedFixtureIndex(null);
        return;
      }
      if (isTerminalSportHash(hash)) {
        setSelectedSport(terminalSportFromHash(hash));
        setIsMatrixPage(false);
        setIsEntryDashboard(false);
        setDiagnosticExchange(null);
        setSelectedFixtureIndex(null);
        return;
      }
      if (hash === "#dashboard" || hash === "#testboard" || !hash) {
        setIsEntryDashboard(true);
        setIsMatrixPage(false);
        setDiagnosticExchange(null);
        setSelectedFixtureIndex(null);
      }
    }

    applyRoute();
    window.addEventListener("hashchange", applyRoute);
    return () => window.removeEventListener("hashchange", applyRoute);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadFootballTeamAssets() {
      try {
        const response = await fetch("/api/assets/football-teams?active=true&limit=25000", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.teams)) return;
        if (!cancelled) {
          registerFootballTeamAssets(payload.teams as FootballTeamAsset[]);
          setTeamAssetVersion((version) => version + 1);
        }
      } catch {
        // The static seed still keeps major teams readable if the asset API is unavailable.
      }
    }

    loadFootballTeamAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const search = marketSearch.trim().replace(/^\//, "");
    if (search.length < 2) {
      setTeamSearchResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/assets/football-teams?q=${encodeURIComponent(search)}&active=true&limit=10`, {
          cache: "no-store",
          signal: controller.signal
        });
        const payload = await response.json();
        if (response.ok && Array.isArray(payload.teams)) setTeamSearchResults(payload.teams as FootballTeamAsset[]);
      } catch {
        if (!controller.signal.aborted) setTeamSearchResults([]);
      }
    }, 160);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [marketSearch]);

  useEffect(() => {
    if (selectedSport !== "football" || diagnosticExchange) return;
    let cancelled = false;

    async function loadFootballFixtures() {
      setFootballFixturesLoading(true);
      try {
        const params = new URLSearchParams({
          days: "4",
          limit: "2000",
          timezone: "Europe/London"
        });
        const response = await fetch(`/api/football/fixtures?${params.toString()}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.fixtures)) {
          throw new Error(payload.detail || "football fixtures failed");
        }
        if (!cancelled) {
          setFootballFixtures(payload.fixtures as FootballFixture[]);
          setFootballFixturesError("");
        }
      } catch (error) {
        if (!cancelled) setFootballFixturesError(error instanceof Error ? error.message : "football fixtures failed");
      } finally {
        if (!cancelled) setFootballFixturesLoading(false);
      }
    }

    loadFootballFixtures();
    const timer = window.setInterval(loadFootballFixtures, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedSport, diagnosticExchange]);

  useEffect(() => {
    if (!isEntryDashboard || diagnosticExchange) return;
    let cancelled = false;

    async function loadEntryEvents() {
      setEntryEventsLoading(true);
      try {
        const requests = ENTRY_DASHBOARD_SPORTS.map((sport) => {
          const params = new URLSearchParams({
            sport: apiSportValue(sport.value),
            exchanges: ENTRY_DASHBOARD_EXCHANGES.map((exchange) => exchange.key).join(","),
            segment: "today",
            limit: "200"
          });
          return fetch(`/api/exchange-odds?${params.toString()}`, { cache: "no-store" })
            .then((response) => response.ok ? response.json() : Promise.resolve({ rows: [] }))
            .then((payload) => ({
              sport: sport.value,
              rows: Array.isArray(payload.rows) ? payload.rows as BackendPriceRow[] : []
            }))
            .catch(() => ({ sport: sport.value, rows: [] as BackendPriceRow[] }));
        });
        const payloads = await Promise.all(requests);
        const merged = new Map<string, EntryEventRow>();

        for (const payload of payloads) {
          for (const row of payload.rows) {
            const entry = exchangeOddsRowToEntryEvent(row, payload.sport);
            if (!entry.startAt || !isTodayInMadrid(entry.startAt) || !entry.exchanges.length) continue;
            const key = entryEventKey(entry);
            const existing = merged.get(key);
            if (!existing) {
              merged.set(key, entry);
              continue;
            }
            existing.liquidity += entry.liquidity;
            existing.exchanges = Array.from(new Set([...existing.exchanges, ...entry.exchanges]));
            if (eventStartSortValue(entry.latestSeenAt) > eventStartSortValue(existing.latestSeenAt)) existing.latestSeenAt = entry.latestSeenAt;
          }
        }

        const rows = Array.from(merged.values())
          .sort((a, b) => {
            const startDiff = eventStartSortValue(a.startAt) - eventStartSortValue(b.startAt);
            if (startDiff !== 0) return startDiff;
            return b.liquidity - a.liquidity;
          })
          .slice(0, 120);

        if (!cancelled) {
          setEntryEvents(rows);
          setEntryEventsError("");
        }
      } catch (error) {
        if (!cancelled) setEntryEventsError(error instanceof Error ? error.message : "today events failed");
      } finally {
        if (!cancelled) setEntryEventsLoading(false);
      }
    }

    loadEntryEvents();
    const timer = window.setInterval(loadEntryEvents, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isEntryDashboard, diagnosticExchange]);

  const selectedSportLabel = SPORT_LABELS.get(selectedSport) || "Football";
  const marketGroups = SPORT_MARKET_GROUPS[selectedSport] || SPORT_MARKET_GROUPS.football;
  const selectedFootballLeague = selectedSport === "football" ? footballLeagueByValue(marketGroup) : null;
  const selectedFootballRegionValue = selectedSport === "football"
    ? selectedFootballLeague?.region || (FOOTBALL_LEAGUE_GROUPS[marketGroup] ? marketGroup : null)
    : null;
  const selectedFootballRegion = selectedFootballRegionValue ? footballRegionByValue(selectedFootballRegionValue) : null;
  const footballStripOptions = selectedFootballRegionValue
    ? FOOTBALL_LEAGUE_GROUPS[selectedFootballRegionValue] || []
    : SPORT_MARKET_GROUPS.football;
  const diagnosticLabel = DIAGNOSTIC_EXCHANGES.find((exchange) => exchange.key === diagnosticExchange)?.label || "";
  const expandedDiagnosticPrices = expandedDiagnosticEvent?.id ? diagnosticPriceRows[expandedDiagnosticEvent.id] || [] : [];
  const entryNewsItems = uniqueNewsItems(entryNews.filter(isSocialNewsItem));
  const terminalNewsItems = entryNewsItems.filter((item) => terminalNewsItemVisible(item, selectedSport, marketGroup, isEntryDashboard));
  const terminalNewsLabel = terminalNewsContextLabel(selectedSport, marketGroup, isEntryDashboard);
  const diagnosticMarkets = useMemo(() => {
    const markets = new Map<string, {
      id: string;
      name: string;
      type: string | null;
      liquidity: number;
      runners: Map<string, {
        id: string;
        name: string;
        backLevels: ExchangeEventPriceDiagnostic[];
        layLevels: ExchangeEventPriceDiagnostic[];
      }>;
    }>();

    for (const row of expandedDiagnosticPrices) {
      const marketId = row.marketId || "market";
      if (!markets.has(marketId)) {
        markets.set(marketId, {
          id: marketId,
          name: row.marketName || row.marketType || "Market",
          type: row.marketType,
          liquidity: row.marketLiquidity,
          runners: new Map()
        });
      }
      const market = markets.get(marketId);
      if (!market) continue;
      const runnerId = row.runnerId || row.runnerName || "runner";
      if (!market.runners.has(runnerId)) {
        market.runners.set(runnerId, {
          id: runnerId,
          name: row.runnerName || runnerId,
          backLevels: [],
          layLevels: []
        });
      }
      const runner = market.runners.get(runnerId);
      if (!runner) continue;
      if (row.side === "back") runner.backLevels.push(row);
      if (row.side === "lay") runner.layLevels.push(row);
    }

    return Array.from(markets.values()).map((market) => ({
      ...market,
      runners: Array.from(market.runners.values()).map((runner) => ({
        ...runner,
        backLevels: runner.backLevels.sort((a, b) => a.ladderLevel - b.ladderLevel).slice(0, 3),
        layLevels: runner.layLevels.sort((a, b) => a.ladderLevel - b.ladderLevel).slice(0, 3)
      }))
    }));
  }, [expandedDiagnosticPrices]);

  function derivedBinaryLayLevel(level?: ExchangeEventPriceDiagnostic) {
    if (!level?.odds || level.odds <= 1) return null;
    const probability = 1 / level.odds;
    const layOdds = 1 / Math.max(0.0001, 1 - probability);
    return {
      ...level,
      odds: layOdds,
      side: "lay"
    } as ExchangeEventPriceDiagnostic;
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || target?.isContentEditable) return;
      event.preventDefault();
      marketSearchRef.current?.focus();
      marketSearchRef.current?.select();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    selectedSportRef.current = selectedSport;
    fixturesRef.current = sportDashboard.fixtures;
    setLiveRows([]);
    setBackendRows([]);
    setSnapshotLoaded(false);
    setFixtureExchangeUpdates({});
    setSelectedFixtureIndex(null);
    setMarketGroup("all");
    rowOrderRef.current = {};
    nextRowOrderRef.current = 0;
  }, [selectedSport, sportDashboard.fixtures]);

  useEffect(() => {
    isMatrixPageRef.current = isMatrixPage;
    if (!isMatrixPage) return;
    setLiveRows([]);
    setBackendRows([]);
    setSnapshotLoaded(true);
    setFixtureExchangeUpdates({});
    setSelectedFixtureIndex(null);
    rowOrderRef.current = {};
    nextRowOrderRef.current = 0;
  }, [isMatrixPage]);

  useEffect(() => {
    isEntryDashboardRef.current = isEntryDashboard;
    marketGroupRef.current = marketGroup;
  }, [isEntryDashboard, marketGroup]);

  useEffect(() => {
    setExpandedDiagnosticEvent(null);
    setDiagnosticPriceRows({});
  }, [diagnosticExchange, expandedDiagnosticSport]);

  useEffect(() => {
    if (!diagnosticExchange) return;
    let cancelled = false;
    async function loadDiagnostics() {
      setDiagnosticLoading(true);
      try {
        const response = await fetch(`/api/exchange-sports?exchange=${encodeURIComponent(diagnosticExchange)}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.rows)) {
          throw new Error(payload.detail || "diagnostics failed");
        }
        if (!cancelled) {
          setDiagnosticRows(payload.rows);
          setDiagnosticError("");
        }
      } catch (error) {
        if (!cancelled) {
          setDiagnosticError(error instanceof Error ? error.message : "diagnostics failed");
        }
      } finally {
        if (!cancelled) setDiagnosticLoading(false);
      }
    }

    loadDiagnostics();
    const timer = window.setInterval(loadDiagnostics, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [diagnosticExchange]);

  useEffect(() => {
    if (!diagnosticExchange || !expandedDiagnosticSport) return;
    let cancelled = false;
    async function loadDiagnosticEvents() {
      setDiagnosticEventsLoading(true);
      try {
        const params = new URLSearchParams({
          exchange: diagnosticExchange || "",
          sport: expandedDiagnosticSport || "",
          limit: "250"
        });
        const response = await fetch(`/api/exchange-sport-events?${params.toString()}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.rows)) {
          throw new Error(payload.detail || "event diagnostics failed");
        }
        if (!cancelled) {
          const rows = payload.rows as ExchangeEventDiagnostic[];
          setDiagnosticEventRows((rows) => ({
            ...rows,
            [expandedDiagnosticSport]: payload.rows
          }));
          setExpandedDiagnosticEvent((current) => {
            if (current && rows.some((event) => event.id === current.id)) return current;
            return rows[0] || null;
          });
          setDiagnosticError("");
        }
      } catch (error) {
        if (!cancelled) {
          setDiagnosticError(error instanceof Error ? error.message : "event diagnostics failed");
        }
      } finally {
        if (!cancelled) setDiagnosticEventsLoading(false);
      }
    }

    loadDiagnosticEvents();
    const timer = window.setInterval(loadDiagnosticEvents, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [diagnosticExchange, expandedDiagnosticSport]);

  useEffect(() => {
    if (!diagnosticExchange || !expandedDiagnosticEvent?.id) return;
    let cancelled = false;
    async function loadDiagnosticPrices() {
      setDiagnosticPricesLoading(true);
      try {
        const params = new URLSearchParams({
          exchange: diagnosticExchange || "",
          eventId: expandedDiagnosticEvent?.id || "",
          limit: "120"
        });
        const response = await fetch(`/api/exchange-event-prices?${params.toString()}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.rows)) {
          throw new Error(payload.detail || "price diagnostics failed");
        }
        if (!cancelled) {
          setDiagnosticPriceRows((rows) => ({
            ...rows,
            [expandedDiagnosticEvent.id]: payload.rows
          }));
          setDiagnosticError("");
        }
      } catch (error) {
        if (!cancelled) {
          setDiagnosticError(error instanceof Error ? error.message : "price diagnostics failed");
        }
      } finally {
        if (!cancelled) setDiagnosticPricesLoading(false);
      }
    }

    loadDiagnosticPrices();
    const timer = window.setInterval(loadDiagnosticPrices, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [diagnosticExchange, expandedDiagnosticEvent]);

  useEffect(() => {
    if (isMatrixPage) {
      let cancelled = false;
      async function loadMatrixSnapshot() {
        if (matrixSnapshotLoadingRef.current) return;
        matrixSnapshotLoadingRef.current = true;
        try {
          const params = new URLSearchParams({
            sport: MATRIX_ACTIVE_SPORT,
            exchanges: "betfair,matchbook,sx",
            limit: "500"
          });
          const response = await fetch(`/api/exchange-odds?${params.toString()}`, { cache: "no-store" });
          const text = await response.text();
          let payload: { rows?: BackendPriceRow[]; detail?: string; error?: string };
          try {
            payload = JSON.parse(text);
          } catch {
            throw new Error("Price refresh failed; keeping last good rows");
          }
          if (!response.ok || !Array.isArray(payload.rows)) {
            throw new Error(payload.detail || payload.error || "matrix snapshot failed");
          }
          if (!cancelled) {
            setBackendRows(payload.rows);
            setBackendError("");
            setSnapshotLoaded(true);
          }
        } catch (error) {
          if (!cancelled) {
            setBackendError(error instanceof Error ? error.message : "Price refresh failed; keeping last good rows");
            setSnapshotLoaded(true);
          }
        } finally {
          matrixSnapshotLoadingRef.current = false;
        }
      }
      loadMatrixSnapshot();
      const timer = window.setInterval(loadMatrixSnapshot, 2000);
      return () => {
        cancelled = true;
        matrixSnapshotLoadingRef.current = false;
        window.clearInterval(timer);
      };
    }
    let cancelled = false;
    async function loadSnapshot() {
      try {
        const params = new URLSearchParams({
          sport: apiSportValue(selectedSport),
          limit: selectedSport === "football" ? "500" : "120"
        });
        if (selectedSport === "football") params.set("exchanges", "betfair,matchbook,sx");
        const response = await fetch(`/api/exchange-odds?${params.toString()}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.rows)) {
          throw new Error(payload.detail || "price snapshot failed");
        }
        if (!cancelled) {
          setBackendRows(payload.rows);
          setBackendError("");
          setSnapshotLoaded(true);
        }
      } catch (error) {
        if (!cancelled) {
          setBackendError(error instanceof Error ? error.message : "price snapshot failed");
          setSnapshotLoaded(true);
        }
      }
    }

    loadSnapshot();
    const timer = window.setInterval(loadSnapshot, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedSport, isMatrixPage]);

  useEffect(() => {
    const token = window.localStorage.getItem("sportsedge.auth.token");
    let closedByEffect = false;

    function clearReconnect() {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function subscribeSelectedSport(socket: WebSocket) {
      const matrixMode = isMatrixPageRef.current;
      const activeChannels = new Set(
        EXCHANGE_COLUMNS
          .filter((exchange) => (matrixMode ? MATRIX_EXCHANGE_KEYS.has(exchange.key) : exchange.supports.includes(selectedSportRef.current)))
          .map(exchangePriceChannel)
      );

      subscribedPriceChannelsRef.current.forEach((channel) => {
        if (!activeChannels.has(channel) && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "unsubscribe", channel }));
        }
      });

      activeChannels.forEach((channel) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        socket.send(JSON.stringify({
          type: "subscribe",
          channel,
          filters: { sport: apiSportValue(matrixMode ? MATRIX_ACTIVE_SPORT : selectedSportRef.current) }
        }));
      });

      subscribedPriceChannelsRef.current = activeChannels;
    }

    function connect() {
      clearReconnect();
      if (!token) {
        setSocketStatus("waiting");
        return;
      }

      setSocketStatus("connecting");
      const socket = new WebSocket(sportsEdgeWsUrl(token));
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setSocketStatus("live");
        subscribeSelectedSport(socket);
        socket.send(JSON.stringify({
          type: "subscribe",
          channel: "news",
          filters: terminalNewsSubscribeFilters(selectedSportRef.current, marketGroupRef.current, isEntryDashboardRef.current)
        }));
      });

      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === "news.item" && message.payload) {
            setEntryNews((items) => {
              const nextItem = { ...(message.payload as NewsItem), isNew: true };
              const withoutDuplicate = items.filter((item) => item.id !== nextItem.id);
              return [nextItem, ...withoutDuplicate].slice(0, 180);
            });
            const itemId = String(message.payload.id);
            const flashTimer = window.setTimeout(() => {
              setEntryNews((items) => items.map((item) => (
                item.id === itemId ? { ...item, isNew: false } : item
              )));
            }, 2000);
            newsFlashTimersRef.current.push(flashTimer);
            return;
          }
          if (message?.type !== "event" || !message.payload) return;
          const activeSport = isMatrixPageRef.current ? matrixSportFromPayload(message.payload) : selectedSportRef.current;
          if (isMatrixPageRef.current && activeSport !== MATRIX_ACTIVE_SPORT) return;
          if (!activeSport || (!isMatrixPageRef.current && !isPrimaryTradingMarket(message.payload, activeSport))) return;
          pendingPriceEventsRef.current.push({
            channel: String(message.channel || ""),
            payload: message.payload
          });
          if (!priceFlushTimerRef.current) {
            priceFlushTimerRef.current = window.setTimeout(() => {
              const events = pendingPriceEventsRef.current.splice(0);
              priceFlushTimerRef.current = null;
              if (!events.length) return;
              setLiveRows((rows) => events.reduce(
                (nextRows, item) => {
                  const sport = isMatrixPageRef.current ? matrixSportFromPayload(item.payload) : selectedSportRef.current;
                  return sport ? mergeLivePriceRows(nextRows, item.channel, item.payload, sport, !isMatrixPageRef.current) : nextRows;
                },
                rows
              ));
            }, 50);
          }
          if (isMatrixPageRef.current) return;
          const update = extractFixtureExchangeUpdate(
            String(message.channel || ""),
            message.payload,
            selectedSportRef.current,
            fixturesRef.current
          );
          if (!update) return;
          setFixtureExchangeUpdates((updates) => ({
            ...updates,
            [update.key]: update.snapshot
          }));
        } catch {
          // Ignore malformed socket payloads.
        }
      });

      socket.addEventListener("close", () => {
        if (closedByEffect) return;
        setSocketStatus("offline");
        reconnectTimerRef.current = window.setTimeout(connect, 2500);
      });

      socket.addEventListener("error", () => setSocketStatus("offline"));
    }

    connect();

    return () => {
      closedByEffect = true;
      clearReconnect();
      if (priceFlushTimerRef.current) {
        window.clearTimeout(priceFlushTimerRef.current);
        priceFlushTimerRef.current = null;
      }
      newsFlashTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      newsFlashTimersRef.current = [];
      pendingPriceEventsRef.current = [];
      subscribedPriceChannelsRef.current = new Set();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const matrixMode = isMatrixPage;
    const activeChannels = new Set(
      EXCHANGE_COLUMNS
        .filter((exchange) => (matrixMode ? MATRIX_EXCHANGE_KEYS.has(exchange.key) : exchange.supports.includes(selectedSport)))
        .map(exchangePriceChannel)
    );

    subscribedPriceChannelsRef.current.forEach((channel) => {
      if (!activeChannels.has(channel)) {
        socket.send(JSON.stringify({ type: "unsubscribe", channel }));
      }
    });

    activeChannels.forEach((channel) => {
      socket.send(JSON.stringify({
        type: "subscribe",
        channel,
        filters: { sport: apiSportValue(matrixMode ? MATRIX_ACTIVE_SPORT : selectedSport) }
      }));
    });

    subscribedPriceChannelsRef.current = activeChannels;
  }, [selectedSport, isMatrixPage]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
      type: "subscribe",
      channel: "news",
      filters: terminalNewsSubscribeFilters(selectedSport, marketGroup, isEntryDashboard)
    }));
  }, [selectedSport, marketGroup, isEntryDashboard]);

  const clock = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Madrid",
    hour12: false
  }).format(now);

  const priceRows = snapshotLoaded ? mergeDisplayPriceRows([
    ...liveRows,
    ...backendRows.filter((row) => !liveRows.some((liveRow) => liveRow.id === row.id))
  ])
    .filter((row) => {
      if (!rowMatchesSelectedSport(row, selectedSport)) return false;
      if (!rowMatchesMarketGroup(row, marketGroup)) return false;
      const query = marketSearch.trim().toLowerCase();
      if (!query) return true;
      return [
        row.name,
        row.sportName,
        row.competitionName,
        row.marketName,
        row.marketType,
        ...Object.values(row.matches || {}).flatMap((match) => [
          match?.name,
          match?.competitionName,
          match?.marketName,
          match?.marketType
        ])
      ].some((value) => String(value || "").toLowerCase().includes(query));
    })
    .sort((a, b) => {
      const aKey = stableDisplayRowKey(a);
      const bKey = stableDisplayRowKey(b);
      if (rowOrderRef.current[aKey] == null) rowOrderRef.current[aKey] = nextRowOrderRef.current++;
      if (rowOrderRef.current[bKey] == null) rowOrderRef.current[bKey] = nextRowOrderRef.current++;
      return rowOrderRef.current[aKey] - rowOrderRef.current[bKey];
    })
    .slice(0, 80) : [];
  const displayPriceRows = selectedSport === "football" && !isMatrixPage
    ? collapseRowsByFixture(priceRows)
    : priceRows.map((row) => ({ row, totalValue: rowMatchedValue(row), marketCount: 1 }));
  const hasBackendRows = displayPriceRows.length > 0;
  const displayFootballFixtures = cleanFootballFixtures(footballFixtures);
  const providerFootballRows = selectedSport === "football" && !isMatrixPage && displayFootballFixtures.length
    ? displayFootballFixtures
      .filter((fixture) => footballFixtureMatchesMarketGroup(fixture, marketGroup))
      .map((fixture, fixtureIndex) => {
        const name = footballFixtureName(fixture);
        const competition = footballFixtureCompetition(fixture);
        const matched = findMarketRowForFootballFixture(fixture, displayPriceRows);
        const backend = matched?.row || {
          id: `fixture:${fixture.id}`,
          name,
          sportName: "football",
          competitionName: competition,
          marketName: "Provider fixture",
          marketType: "fixture",
          startAt: fixture.kickoffAt,
          matches: {},
          arbs: []
        };
        return {
          fixture: [formatFootballFixtureTime(fixture), name, competition, matched ? (matched.row.marketName || matched.row.marketType || "Exchange prices") : "Provider fixture"] as FixtureRow,
          fixtureIndex,
          totalValue: matched?.totalValue || 0,
          marketCount: matched?.marketCount || 0,
          backend
        };
      })
    : [];
  const matrixRows = providerFootballRows.length ? providerFootballRows : hasBackendRows ? displayPriceRows.map(({ row, totalValue, marketCount }, fixtureIndex) => {
    const time = displayStartTime(row);
    const rawCompetition = row.competitionName || Object.values(row.matches || {}).find(Boolean)?.competitionName || selectedSportLabel;
    const competition = fixtureCompetitionLabel(rawCompetition, row.name);
    const primaryMarket = row.marketName || row.marketType || Object.values(row.matches || {}).find(Boolean)?.marketName || "Exchange prices";
    const market = marketCount > 1 ? `${primaryMarket} + ${marketCount - 1} markets` : primaryMarket;
    return {
      fixture: [time, displayEventName(row.name), competition, market] as FixtureRow,
      fixtureIndex,
      totalValue,
      marketCount,
      backend: row
    };
  }) : [];
  const activeExchangeCount = (selectedSport === "football" ? BETTING_EXCHANGE_COLUMNS : EXCHANGE_COLUMNS)
    .filter((exchange) => exchange.supports.includes(selectedSport)).length;
  const totalMatched = matrixRows.reduce((sum, row) => sum + row.totalValue, 0);
  const liveUpdateCount = Object.values(fixtureExchangeUpdates).filter((item) => now.getTime() - item.updatedAt < 30000).length;
  const isFootballDashboard = selectedSport === "football"
    && !isEntryDashboard
    && !isMatrixPage
    && !diagnosticExchange
    && marketGroup === "all"
    && selectedFixtureIndex == null
    && !marketSearch.trim();
  fixturesRef.current = matrixRows.map((row) => row.fixture);
  const biasMatrixRows = mergeDisplayPriceRows([
    ...liveRows,
    ...backendRows.filter((row) => !liveRows.some((liveRow) => liveRow.id === row.id))
  ])
    .filter(rowHasMatrixVenue)
    .filter(rowIsTodayInMadrid)
    .filter(rowIsMatrixPrimaryMarket)
    .filter((row) => {
      const query = marketSearch.trim().toLowerCase();
      if (!query) return true;
      return [
        row.name,
        row.sportName,
        row.competitionName,
        row.marketName,
        row.marketType,
        ...Object.values(row.matches || {}).flatMap((match) => [
          match?.name,
          match?.competitionName,
          match?.marketName,
          match?.marketType,
          match?.exchange,
          ...((match?.runners || []).map((runner) => runner.name))
        ])
      ].some((value) => String(value || "").toLowerCase().includes(query));
    })
    .map((row) => {
      const sport = rowMatrixSport(row);
      const freshRow = freshMatrixRow(row, now.getTime());
      const quote = sportsEdgeMarketQuote(freshRow);
      const latestMs = rowLatestObservedMs(freshRow);
      const consensus = consensusPriceFromQuote(quote);
      const key = stableDisplayRowKey(row) || row.id;
      if (rowOrderRef.current[key] == null) rowOrderRef.current[key] = nextRowOrderRef.current++;
      const primaryRunner = exchangeRunnerQuotes(freshRow)
        .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];
      const venueSignals = MATRIX_VENUES.map((venue) => matrixVenueSignal(freshRow, venue, sport, now.getTime()));
      const validSignals = venueSignals.filter(Boolean) as NonNullable<ReturnType<typeof matrixVenueSignal>>[];
      const directionalSignals = validSignals.filter((signal) => signal.direction !== "neutral");
      const directionScores = {
        back: directionalSignals.filter((signal) => signal.direction === "back").reduce((sum, signal) => sum + signal.weight, 0),
        lay: directionalSignals.filter((signal) => signal.direction === "lay").reduce((sum, signal) => sum + signal.weight, 0)
      };
      const backCount = directionalSignals.filter((signal) => signal.direction === "back").length;
      const layCount = directionalSignals.filter((signal) => signal.direction === "lay").length;
      const dominantDirection = directionScores.back === directionScores.lay
        ? (validSignals.length ? "neutral" : "")
        : directionScores.back > directionScores.lay ? "back" : "lay";
      const agreeingSignals = dominantDirection
        ? validSignals.filter((signal) => signal.direction === dominantDirection || (dominantDirection === "neutral" && signal.direction === "neutral"))
        : [];
      const liveVenueCount = validSignals.length;
      const alignment = liveVenueCount ? Math.round((agreeingSignals.length / liveVenueCount) * 100) : 0;
      const collectiveSwing = !liveVenueCount
        ? "neutral"
        : backCount && layCount && Math.abs(backCount - layCount) <= 1 ? "mixed"
        : dominantDirection || "neutral";
      const weightedScore = liveVenueCount
        ? validSignals.reduce((sum, signal) => sum + signal.score * signal.weight, 0) / validSignals.reduce((sum, signal) => sum + signal.weight, 0)
        : 0;
      const freshnessBoost = latestMs && now.getTime() - latestMs <= 5000 ? 10 : latestMs && now.getTime() - latestMs <= 15000 ? 4 : 0;
      const spreadPenalty = quote.spread ? Math.min(12, Math.max(0, quote.spread * 3)) : 5;
      const confidence = Math.min(99, Math.max(0, Math.round((alignment * 0.46) + (Math.min(100, Math.log10(Math.max(quote.liquidity, 1)) * 16) * 0.18) + (weightedScore * 0.26) + freshnessBoost - spreadPenalty)));
      const isFlagged = alignment >= 80 && confidence >= 70 && agreeingSignals.length >= 3 && latestMs > 0 && now.getTime() - latestMs < 300000;
      return {
        row: freshRow,
        quote,
        latestMs,
        sport,
        consensus,
        key,
        order: rowOrderRef.current[key],
        selection: primaryRunner?.selection || "Consensus",
        ageMs: latestMs ? now.getTime() - latestMs : Number.MAX_SAFE_INTEGER,
        venueSignals,
        validSignals,
        liveVenueCount,
        collectiveSwing,
        alignment: liveVenueCount >= 2 ? alignment : 0,
        alignmentLabel: liveVenueCount >= 2 ? `${alignment}%` : `${liveVenueCount}V`,
        confidence,
        liquidity: quote.liquidity,
        liquidityLabel: quote.liquidity ? formatExchangeMoney(quote.liquidity, "GBP") : "Ref only",
        isFlagged
      };
    })
    .filter((item) => item.sport === MATRIX_ACTIVE_SPORT && item.consensus && item.liveVenueCount > 0)
    .sort((a, b) => (
      b.liveVenueCount - a.liveVenueCount
      || Number(b.liquidity || 0) - Number(a.liquidity || 0)
      || a.order - b.order
    ))
    .slice(0, 300);
  const flaggedMatrixRows = biasMatrixRows.filter((row) => row.isFlagged);
  const liveMatrixVenues = new Set(biasMatrixRows.flatMap((row) => row.validSignals.map((signal) => signal.venue.key)));
  const bestBackPressure = biasMatrixRows
    .flatMap((row) => row.validSignals.filter((signal) => signal.direction === "back").map((signal) => ({ row, signal })))
    .sort((a, b) => b.signal.score - a.signal.score)[0];
  const bestLayPressure = biasMatrixRows
    .flatMap((row) => row.validSignals.filter((signal) => signal.direction === "lay").map((signal) => ({ row, signal })))
    .sort((a, b) => b.signal.score - a.signal.score)[0];
  const matrixLatestMs = biasMatrixRows.reduce((max, row) => Math.max(max, row.latestMs || 0), 0);

  function backendSummaryWithLive(backend: BackendPriceRow | null | undefined, fixture: FixtureRow, exchange: ExchangeColumn) {
    const backendMatch = backend?.matches[exchange.key] || backend?.matches[exchange.name.toLowerCase()] || backend?.matches[Object.keys(backend?.matches || {}).find((key) => backendExchangeCode(key) === exchange.key) || ""];
    const summary = summarizeBackendMatch(backendMatch);
    const live = fixtureExchangeUpdates[fixtureExchangeUpdateKey(selectedSport, fixture, exchange.key)];
    if (!summary && !live) return { backendMatch, summary: null, live: null };
    if (!live) return { backendMatch, summary, live: null };
    return {
      backendMatch,
      live,
      summary: {
        value: live.value || summary?.value || 0,
        markets: live.volume || summary?.markets || 1,
        back: live.back || summary?.back,
        backSize: live.backSize || summary?.backSize,
        lay: live.lay || summary?.lay,
        laySize: live.laySize || summary?.laySize,
        observedAt: new Date(live.updatedAt).toISOString()
      }
    };
  }

  function renderDiagnosticPricePanel() {
    if (!expandedDiagnosticEvent) return null;
    return (
      <div className="diag-price-panel">
        <div className="diag-events-head">
          <strong>{expandedDiagnosticEvent.name || expandedDiagnosticEvent.id}</strong>
          <span>{diagnosticPricesLoading ? "LIVE refreshing prices" : `${expandedDiagnosticPrices.length} live price levels`}</span>
        </div>
        {diagnosticMarkets.map((market) => (
          <div className="diag-market-card" key={market.id}>
            <div className="diag-market-title">
              <strong>{market.name}</strong>
              <span>{market.liquidity ? formatExchangeMoney(market.liquidity, "GBP") : market.type || "market"}</span>
            </div>
            <div className="diag-price-grid header">
              <span>Runner</span>
              <span>Back 1</span>
              <span>Back 2</span>
              <span>Back 3</span>
              <span>Lay 1</span>
              <span>Lay 2</span>
              <span>Lay 3</span>
              <span>Latest</span>
            </div>
            {market.runners.map((runner) => {
              const isBinaryExchange = diagnosticExchange === "polymarket" || diagnosticExchange === "kalshi";
              const oppositeRunner = isBinaryExchange
                ? market.runners.find((item) => item.id !== runner.id && /^(yes|no)$/i.test(item.name) && /^(yes|no)$/i.test(runner.name))
                : null;
              const displayLayLevels = runner.layLevels.length
                ? runner.layLevels
                : (oppositeRunner?.backLevels || []).map(derivedBinaryLayLevel).filter(Boolean) as ExchangeEventPriceDiagnostic[];
              const latest = [...runner.backLevels, ...runner.layLevels]
                .map((level) => level.observedAt ? new Date(level.observedAt).getTime() : 0)
                .sort((a, b) => b - a)[0];
              return (
                <div className="diag-price-grid" key={runner.id}>
                  <strong>{runner.name}</strong>
                  {[0, 1, 2].map((index) => {
                    const level = runner.backLevels[index];
                    return <span className="diag-price back" key={`b-${index}`}>{level ? `${level.odds.toFixed(2)} / ${formatExchangeMoney(level.amount, level.currency || "GBP")}` : "-"}</span>;
                  })}
                  {[0, 1, 2].map((index) => {
                    const level = displayLayLevels[index];
                    return <span className="diag-price lay" key={`l-${index}`}>{level ? `${level.odds.toFixed(2)} / ${formatExchangeMoney(level.amount, level.currency || "GBP")}` : "-"}</span>;
                  })}
                  <span className="mono">{latest ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Madrid", hour12: false }).format(new Date(latest)) : "-"}</span>
                </div>
              );
            })}
          </div>
        ))}
        {!diagnosticMarkets.length && (
          <div className="diag-event-empty">{diagnosticPricesLoading ? "Loading live prices." : "No live prices returned for this event."}</div>
        )}
      </div>
    );
  }

  function renderTerminalNewsRail() {
    return (
      <aside className="entry-news-rail terminal-news-rail" aria-label="Live news feed">
        <div className="sport-news-head entry-news-tabs-head">
          <div>
            <h2>News</h2>
            <span>{terminalNewsLabel}</span>
          </div>
          <strong>{terminalNewsItems.length} live</strong>
        </div>
        <div className="terminal-news-tape">
          <div className="terminal-news-tape-head">
            <span>Age / ES</span>
            <span>Tag</span>
            <span>U</span>
            <span>Headline</span>
          </div>
          {terminalNewsItems.slice(0, 40).map((item) => (
            <article className={`terminal-news-row${item.isNew ? " is-new" : ""}`} key={`news-${item.id}`} title={terminalNewsExactTimeLabel(item)}>
              <time>{terminalNewsTimeLabel(item)}</time>
              <b>{terminalNewsTag(item)}</b>
              <i className={`urgency u${terminalNewsUrgency(item)}`}>{terminalNewsUrgency(item)}</i>
              <div>
                <strong>{cleanText(item.title)}</strong>
                <p>{terminalNewsHeadline(item)}</p>
                <footer>
                  <span>{displayLabel(item.source_name || item.source_type, "SE NEWS").toUpperCase().slice(0, 18)}</span>
                  <em>{terminalNewsImpactText(item)}</em>
                  {newsOpenUrl(item) && <a href={newsOpenUrl(item)} target="_blank" rel="noreferrer">Open</a>}
                </footer>
              </div>
            </article>
          ))}
          {terminalNewsItems.length === 0 && (
            <div className="sport-news-empty terminal-news-empty">
              <Newspaper size={18} />
              <strong>No News yet</strong>
              <span>Waiting for {terminalNewsLabel.toLowerCase()} from the SportsEdge WSS stream.</span>
            </div>
          )}
        </div>
      </aside>
    );
  }

  function renderTerminalWorkspace(content: ReactNode, hasFootballStrip = false) {
    return (
      <section className={`terminal-workspace${hasFootballStrip ? " has-football-strip" : ""}`}>
        <div className="terminal-workspace-main">
          {content}
        </div>
        {renderTerminalNewsRail()}
      </section>
    );
  }

  function renderEntryDashboard() {
    const todayLiquidity = entryEvents.reduce((sum, event) => sum + Number(event.liquidity || 0), 0);
    const liveCount = entryEvents.filter((event) => (
      event.latestSeenAt && Date.now() - new Date(event.latestSeenAt).getTime() < 60000
    )).length;
    const sportCounts = ENTRY_DASHBOARD_SPORTS.map((sport) => ({
      ...sport,
      count: entryEvents.filter((event) => normalizeSport(event.sport) === sport.value).length,
      liquidity: entryEvents
        .filter((event) => normalizeSport(event.sport) === sport.value)
        .reduce((sum, event) => sum + Number(event.liquidity || 0), 0),
      venues: new Set(entryEvents
        .filter((event) => normalizeSport(event.sport) === sport.value)
        .flatMap((event) => event.exchanges)).size
    }));
    const multiVenueCount = entryEvents.filter((event) => event.exchanges.length > 1).length;
    const venueCount = new Set(entryEvents.flatMap((event) => event.exchanges)).size;
    const topLiquidEvent = [...entryEvents].sort((a, b) => Number(b.liquidity || 0) - Number(a.liquidity || 0))[0];
    const latestUpdateAt = entryEvents
      .map((event) => event.latestSeenAt ? new Date(event.latestSeenAt).getTime() : 0)
      .reduce((max, value) => Math.max(max, value), 0);
    const highImpactNews = entryNewsItems.filter((item) => Number(item.impact_assessment?.impact_score || 0) >= 50);
    const topImpactNews = [...entryNewsItems]
      .sort((a, b) => Number(b.impact_assessment?.impact_score || 0) - Number(a.impact_assessment?.impact_score || 0))[0];
    const leadingSport = [...sportCounts].sort((a, b) => b.count - a.count)[0];
    const latestUpdateLabel = latestUpdateAt
      ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Madrid", hour12: false }).format(new Date(latestUpdateAt))
      : "-";
    return (
      <section className="entry-dashboard" aria-label="SportsEdge today dashboard">
        <div className="entry-main">
          <div className="entry-head">
            <div>
              <h1>Today’s Market Dashboard</h1>
              <p>Betfair and Matchbook events happening today, ranked by available liquidity and latest exchange state.</p>
            </div>
            <div className="entry-kpis">
              <div><span>Events</span><strong>{entryEvents.length}</strong></div>
              <div><span>Live</span><strong>{liveCount}</strong></div>
              <div><span>Liquidity</span><strong>{todayLiquidity ? formatExchangeMoney(todayLiquidity, "GBP") : "-"}</strong></div>
            </div>
          </div>

          <div className="entry-sport-strip" aria-label="Today sports summary">
            {sportCounts.map((sport) => (
              <button
                type="button"
                key={sport.value}
                onClick={() => {
                  setIsMatrixPage(false);
                  setIsEntryDashboard(false);
                  setDiagnosticExchange(null);
                  setSelectedSport(sport.value);
                  setMarketSearch("");
                  setSelectedFixtureIndex(null);
                }}
              >
                <span>{sport.label}</span>
                <strong>{sport.count}</strong>
                <em>{sport.liquidity ? formatExchangeMoney(sport.liquidity, "GBP") : "-"}</em>
                <small>{sport.venues}/{ENTRY_DASHBOARD_EXCHANGES.length} venues</small>
              </button>
            ))}
          </div>

          <div className="entry-insight-grid" aria-label="SportsEdge market intelligence summary">
            <article>
              <span>Route coverage</span>
              <strong>{entryEvents.length ? `${multiVenueCount}/${entryEvents.length}` : "-"}</strong>
              <p>Events visible on more than one venue.</p>
            </article>
            <article>
              <span>Venue health</span>
              <strong>{venueCount}/{ENTRY_DASHBOARD_EXCHANGES.length}</strong>
              <p>{venueCount ? "Betfair / Matchbook routes available." : "Waiting for BF/MB exchange state."}</p>
            </article>
            <article>
              <span>Top liquidity</span>
              <strong>{topLiquidEvent?.liquidity ? formatExchangeMoney(topLiquidEvent.liquidity, "GBP") : "-"}</strong>
              <p>{topLiquidEvent?.name || "No leading market yet."}</p>
            </article>
            <article>
              <span>News impact</span>
              <strong>{highImpactNews.length}</strong>
              <p>{topImpactNews?.impact_assessment ? `${displayLabel(topImpactNews.impact_assessment.event_type, "impact")} ${topImpactNews.impact_assessment.impact_score}` : "Awaiting scored X alerts."}</p>
            </article>
            <article>
              <span>Priority sport</span>
              <strong>{leadingSport?.count ? leadingSport.label : "-"}</strong>
              <p>{leadingSport?.count ? `${leadingSport.count} events in the current board.` : "No priority sport leading yet."}</p>
            </article>
            <article>
              <span>Last exchange tick</span>
              <strong>{latestUpdateLabel}</strong>
              <p>{liveCount ? `${liveCount} markets updated in the last minute.` : "No fresh market tick in the last minute."}</p>
            </article>
          </div>

          <div className="entry-table-wrap">
            <table className="entry-events-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Sport</th>
                  <th>Competition</th>
                  <th>Liquidity</th>
                  <th>BF / MB</th>
                  <th>Latest</th>
                </tr>
              </thead>
              <tbody>
                {entryEvents.map((event) => (
                  <tr
                    className="clickable-row"
                    key={`${event.id}-${event.exchanges.join("-")}`}
                    onClick={() => {
                      setIsMatrixPage(false);
                      setIsEntryDashboard(false);
                      setSelectedSport(normalizeSport(event.sport));
                      setMarketSearch(event.name);
                    }}
                  >
                    <td className="mono positive">{event.startAt ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid", hour12: false }).format(new Date(event.startAt)) : "TBD"}</td>
                    <td className="entry-event-name">
                      <div className="fixture-title-line">
                        <TeamLogoStack name={event.name} />
                        <strong>{event.name}</strong>
                      </div>
                    </td>
                    <td>{SPORT_LABELS.get(normalizeSport(event.sport)) || event.sport}</td>
                    <td><span>{event.competition || "Global"}</span></td>
                    <td className="mono">{event.liquidity ? formatExchangeMoney(event.liquidity, "GBP") : "-"}</td>
                    <td>
                      <div className="entry-venue-stack">
                        {event.exchanges.slice(0, 4).map((exchange) => <span key={exchange}>{exchange}</span>)}
                      </div>
                    </td>
                    <td className="mono">{event.latestSeenAt ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Madrid", hour12: false }).format(new Date(event.latestSeenAt)) : "-"}</td>
                  </tr>
                ))}
                {entryEvents.length === 0 && (
                  <tr>
                    <td className="empty" colSpan={7}>
                      {entryEventsLoading ? "Loading today’s exchange-backed events." : entryEventsError || "No today events returned by the exchange feeds yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {renderTerminalNewsRail()}
      </section>
    );
  }

  function renderFootballDashboard() {
    const matchedRowsByFixture = new Map(matrixRows.map((row) => [fixtureBackendKey(row.fixture[1], row.backend.startAt), row]));
    const fixtureRows = displayFootballFixtures
      .filter((fixture) => footballFixtureMatchesMarketGroup(fixture, marketGroup))
      .slice(0, 300)
      .map((fixture, fixtureIndex) => {
        const name = footballFixtureName(fixture);
        const matched = matchedRowsByFixture.get(fixtureBackendKey(name, fixture.kickoffAt));
        return { fixture, fixtureIndex, matched };
      });
    const rows = fixtureRows.slice(0, 120);
    const liquidRows = [...matrixRows].sort((a, b) => b.totalValue - a.totalValue).slice(0, 6);
    const liveRows = matrixRows.filter((item) => sportsEdgeMarketQuote(item.backend).isFresh).length;
    const competitions = new Set(fixtureRows.map((item) => footballFixtureCompetition(item.fixture)).filter(Boolean));
    const bestLiquidity = liquidRows[0];
    const latestTick = backendRows
      .flatMap((row) => Object.values(row.matches || {}))
      .map((match) => match?.observedAt ? new Date(match.observedAt).getTime() : 0)
      .reduce((max, value) => Math.max(max, value), 0);
    const latestTickLabel = latestTick
      ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Madrid", hour12: false }).format(new Date(latestTick))
      : "-";

    return (
      <section className="football-dashboard" aria-label="Football dashboard">
        <div className="entry-head football-dashboard-head">
          <div>
            <h1>Football Dashboard</h1>
            <p>Today’s API-Football fixture spine, team logos, league context, and SportsEdge market overlays.</p>
          </div>
          <div className="entry-kpis">
            <div><span>Fixtures</span><strong>{fixtureRows.length}</strong></div>
            <div><span>Live rows</span><strong>{liveRows}</strong></div>
            <div><span>Liquidity</span><strong>{totalMatched ? formatExchangeMoney(totalMatched, "GBP") : "-"}</strong></div>
          </div>
        </div>

        <div className="entry-insight-grid football-insight-grid" aria-label="Football market summary">
          <article>
            <span>Competition coverage</span>
            <strong>{competitions.size || "-"}</strong>
            <p>Countries/leagues from the fixture provider cache.</p>
          </article>
          <article>
            <span>Top fixture</span>
            <strong>{bestLiquidity?.totalValue ? formatExchangeMoney(bestLiquidity.totalValue, "GBP") : "-"}</strong>
            <p>{bestLiquidity?.fixture[1] || "Waiting for football liquidity."}</p>
          </article>
          <article>
            <span>Venue coverage</span>
            <strong>{activeExchangeCount}/{BETTING_EXCHANGE_COLUMNS.length}</strong>
            <p>Betfair, Matchbook, and SX availability by fixture.</p>
          </article>
          <article>
            <span>Latest price tick</span>
            <strong>{latestTickLabel}</strong>
            <p>{backendError || "Redis/API snapshot with WSS patching."}</p>
          </article>
        </div>

        <div className="football-dashboard-grid">
          <section className="football-dashboard-panel">
            <div className="panel-head compact">
              <div>
                <h2>Top Liquidity</h2>
                <p>Best football markets by usable liquidity</p>
              </div>
            </div>
            <div className="football-liquidity-list">
              {liquidRows.map(({ fixture, totalValue, backend }) => {
                const quote = sportsEdgeMarketQuote(backend);
                return (
                  <button
                    type="button"
                    key={`${fixture[0]}-${fixture[1]}-${fixture[3]}`}
                    onClick={() => {
                      const index = matrixRows.findIndex((item) => item.fixture[1] === fixture[1] && item.fixture[3] === fixture[3]);
                      if (index >= 0) setSelectedFixtureIndex(index);
                    }}
                  >
                    <span className="fixture-title-line">
                      <TeamLogoStack name={fixture[1]} />
                      <strong>{fixture[1]}</strong>
                    </span>
                    <em>{fixtureGroupLabel(fixture[2])}</em>
                    <b>{formatExchangeMoney(totalValue, "GBP")}</b>
                    <small>{quote.bestBack ? `Back ${quote.bestBack.toFixed(2)}` : "No back"} / {quote.bestLay ? `Lay ${quote.bestLay.toFixed(2)}` : "No lay"}</small>
                  </button>
                );
              })}
              {liquidRows.length === 0 && <div className="dashboard-empty">Waiting for football market state.</div>}
            </div>
          </section>

          <section className="football-dashboard-panel fixtures">
            <div className="panel-head compact">
              <div>
                <h2>Today Fixtures</h2>
                <p>Provider fixtures first; market prices attach when matched</p>
              </div>
            </div>
            <div className="entry-table-wrap">
              <table className="entry-events-table football-fixtures-table">
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Fixture</th>
                    <th>Competition</th>
                    <th>Exchange Coverage</th>
                    <th>Bias</th>
                    <th>Best Back</th>
                    <th>Best Lay</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ fixture, matched }) => {
                    const name = footballFixtureName(fixture);
                    const competition = footballFixtureCompetition(fixture);
                    const quote = matched ? sportsEdgeMarketQuote(matched.backend) : { liquidity: 0, bestBack: null, bestLay: null };
                    const coverage = exchangeCoverage(matched?.backend);
                    const tradeableOutcomes = tradeableOutcomeRows(matched?.backend);
                    const biasLabel = matched?.backend
                      ? (rowHasMultiBettingExchange(matched.backend) ? biasFromQuote(sportsEdgeMarketQuote(matched.backend)) : "Single route")
                      : "No route";
                    return (
                      <tr
                        className={matched ? "clickable-row" : ""}
                        key={fixture.id}
                        onClick={() => {
                          if (matched) setSelectedFixtureIndex(matched.fixtureIndex);
                          else setMarketSearch(name);
                        }}
                      >
                        <td className="mono positive">{formatFootballFixtureTime(fixture)}</td>
                        <td className="entry-event-name">
                          <div className="fixture-title-line">
                            <FixtureTeamLogoStack fixture={fixture} />
                            <strong>{name}</strong>
                          </div>
                        </td>
                        <td><span>{fixtureGroupLabel(competition)}</span></td>
                        <td>
                          <div className="exchange-coverage" aria-label={`${name} exchange coverage`}>
                            {coverage.map((exchange) => (
                              <span className={exchange.isAvailable ? "available" : ""} key={exchange.key}>{exchange.label}</span>
                            ))}
                          </div>
                        </td>
                        <td><span className={`bias-pill ${rowHasMultiBettingExchange(matched?.backend) ? "active" : ""}`}>{biasLabel}</span></td>
                        <td className="mono positive">{quote.bestBack ? quote.bestBack.toFixed(2) : "-"}</td>
                        <td className="mono sell">{quote.bestLay ? quote.bestLay.toFixed(2) : tradeableOutcomes.length ? "-" : "-"}</td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td className="empty" colSpan={7}>{footballFixturesLoading ? "Loading provider football fixtures." : footballFixturesError || "No provider football fixtures returned yet."}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    );
  }

  function renderBiasMatrix() {
    const latestLabel = matrixLatestMs
      ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Madrid", hour12: false }).format(new Date(matrixLatestMs))
      : "-";
    return (
      <>
        <section className="matrix-simple-status" aria-label="Matrix status">
          <strong>Football today</strong>
          <span>{biasMatrixRows.length} rows</span>
          <span>Betfair + Matchbook + SX</span>
          <span>Updated {latestLabel}</span>
        </section>
        <section className="testboard-matrix matrix-simple" aria-label="Realtime SportsEdge football prices">
          <table className="matrix-simple-table">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Event</th>
                <th scope="col">Market</th>
                <th scope="col">Selection</th>
                <th scope="col">Consensus</th>
                <th scope="col">Back</th>
                <th scope="col">Lay</th>
                <th scope="col">Spread</th>
                <th scope="col">Liquidity</th>
                <th scope="col">Sources</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {biasMatrixRows.map((item) => {
                const market = item.row.marketName || item.row.marketType || Object.values(item.row.matches || {}).find(Boolean)?.marketName || "Primary market";
                const compactMarket = compactMarketLabel(market);
                const bestBack = matrixBestQuote(item.row, item.selection, "back");
                const bestLay = matrixBestQuote(item.row, item.selection, "lay");
                const spread = bestBack?.odds && bestLay?.odds ? Number((bestLay.odds - bestBack.odds).toFixed(3)) : null;
                const latest = item.latestMs
                  ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Madrid", hour12: false }).format(new Date(item.latestMs))
                  : "-";
                return (
                  <tr key={item.key}>
                    <td className="mono positive">{displayStartTime(item.row)}</td>
                    <td className="matrix-simple-event">
                      <MatrixEventCell name={item.row.name} sport={item.sport} />
                    </td>
                    <td className="matrix-market-cell" title={market}>
                      <strong>{compactMarket.code}</strong>
                      <span>{compactMarket.label}</span>
                    </td>
                    <td>{item.selection}</td>
                    <td className="mono price-cell back">{item.consensus?.toFixed(3)}</td>
                    <td className={`quote-side back ${bestBack ? "" : "missing"}`}>
                      <strong>{bestBack ? matrixOddsText(bestBack.odds) : "NO BACK"}</strong>
                      <span>{bestBack ? `${bestBack.exchange} ${matrixQuoteSizeText(bestBack.size)}` : "no live back offer"}</span>
                    </td>
                    <td className={`quote-side lay ${bestLay ? "" : "missing"}`}>
                      <strong>{bestLay ? matrixOddsText(bestLay.odds) : "NO LAY"}</strong>
                      <span>{bestLay ? `${bestLay.exchange} ${matrixQuoteSizeText(bestLay.size)}` : "no live lay offer"}</span>
                    </td>
                    <td className={`mono spread-cell ${spread != null && spread < 0 ? "negative" : ""}`}>{spread == null ? "-" : spread.toFixed(3)}</td>
                    <td className="mono">{item.liquidityLabel}</td>
                    <td className="mono source-cell">{matrixSourceLabel(item.row)}</td>
                    <td className="mono">{latest}</td>
                  </tr>
                );
              })}
              {biasMatrixRows.length === 0 && (
                <tr>
                  <td className="empty" colSpan={11}>
                    {socketStatus === "live"
                      ? "Waiting for today's Betfair and Matchbook football prices."
                      : "Loading today's Betfair and Matchbook football prices."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </>
    );
  }

  return (
    <main className="testboard-shell">
      <header className="testboard-topbar">
        <a
          className="testboard-brand"
          href="#dashboard"
          aria-label="SportsEdge today dashboard"
          onClick={() => {
            setIsEntryDashboard(true);
            setIsMatrixPage(false);
            setDiagnosticExchange(null);
            setSelectedFixtureIndex(null);
          }}
        >
          <img className="testboard-brand-logo" src={sportsEdgeMarketsLogo} alt="SportsEdge" />
        </a>
        <nav className="testboard-nav" aria-label="Sports">
          {TERMINAL_TOP_SPORTS.map((sport) => (
            <button
              className={!isEntryDashboard && !diagnosticExchange && !isMatrixPage && selectedSport === sport.value ? "active" : ""}
              type="button"
              key={sport.value}
              onClick={() => {
                if (!TERMINAL_SPORT_VALUES.has(sport.value)) {
                  window.location.hash = sport.route;
                  return;
                }
                setIsMatrixPage(false);
                setIsEntryDashboard(false);
                setDiagnosticExchange(null);
                setSelectedSport(sport.value);
                setMarketGroup("all");
                setMarketSearch("");
                setSelectedFixtureIndex(null);
                window.location.hash = sport.route;
              }}
            >
              {sport.label}
            </button>
          ))}
        </nav>
        <label className="testboard-search">
          <Search size={15} />
          <input
            ref={marketSearchRef}
            value={marketSearch}
            onFocus={() => setCommandOpen(true)}
            onBlur={() => window.setTimeout(() => setCommandOpen(false), 160)}
            onChange={(event) => {
              const value = event.target.value;
              setMarketSearch(value);
              const sport = searchSport(value);
              if (sport && sport !== selectedSport) {
                setIsMatrixPage(false);
                setIsEntryDashboard(false);
                setSelectedSport(sport);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                runCommand(commandOptions[0] || resolveCommand(marketSearch) || null);
              }
              if (event.key === "Escape") {
                setCommandOpen(false);
                marketSearchRef.current?.blur();
              }
            }}
            placeholder="Search sport, market, fixture, exchange..."
          />
          <kbd>/</kbd>
          {commandOpen && (
            <div className="testboard-command-menu">
              {commandOptions.map((option) => (
                <button type="button" key={option.route} onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand(option)}>
                  <strong>{option.label}</strong>
                  <span>{option.detail}</span>
                </button>
              ))}
              {commandOptions.length === 0 && <em>No command found</em>}
            </div>
          )}
        </label>
        <div className="testboard-settings">
          <button
            className="testboard-icon-button"
            type="button"
            aria-label="Open settings"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <Settings size={16} />
          </button>
          {settingsOpen && (
            <div className="testboard-settings-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMatrixPage(false);
                  setIsEntryDashboard(false);
                  setDiagnosticExchange(diagnosticExchange || "polymarket");
                  setExpandedDiagnosticSport(null);
                  setDiagnosticEventRows({});
                  setSelectedFixtureIndex(null);
                  setSettingsOpen(false);
                  window.location.hash = "#actual";
                }}
              >
                Actual feeds
              </button>
              {isAdmin && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSettingsOpen(false);
                    window.location.hash = "#admin";
                  }}
                >
                  Admin
                </button>
              )}
              <button type="button" role="menuitem">Routing Rules</button>
              <button type="button" role="menuitem">Display Density</button>
              <div className="testboard-settings-version" role="presentation">
                <span>Version</span>
                <strong>{APP_VERSION}</strong>
              </div>
            </div>
          )}
        </div>
        <button className="testboard-logout" type="button" onClick={onLogout} aria-label="Log out">
          <LogOut size={15} />
        </button>
      </header>

      {!diagnosticExchange && !isMatrixPage && !isEntryDashboard && selectedSport === "football" && (
        <section className="football-region-strip" aria-label="Football regions">
          {selectedFootballRegion && (
            <div className="football-region-breadcrumb" aria-label="Football breadcrumb">
              <button
                type="button"
                className="parent"
                onClick={() => {
                  setMarketGroup("all");
                  setSelectedFixtureIndex(null);
                }}
              >
                All
              </button>
              <span>/</span>
              <button
                type="button"
                className={!selectedFootballLeague ? "active" : "parent"}
                onClick={() => {
                  setMarketGroup(selectedFootballRegion.value);
                  setSelectedFixtureIndex(null);
                }}
              >
                {selectedFootballRegion.label}
              </button>
              {selectedFootballLeague && <span>/</span>}
            </div>
          )}
          <nav className="football-region-tabs" aria-label="Football regions">
            {footballStripOptions.map((region) => (
              <button
                type="button"
                className={marketGroup === region.value ? "active" : ""}
                key={region.value}
                onClick={() => {
                  setMarketGroup(region.value);
                  setSelectedFixtureIndex(null);
                }}
              >
                {region.label}
              </button>
            ))}
          </nav>
          <div className="football-region-status">
            <strong>{matrixRows.length} markets</strong>
            <span>{activeExchangeCount}/{EXCHANGE_COLUMNS.length} venues</span>
            <b>{totalMatched ? formatExchangeMoney(totalMatched, "GBP") : "-"}</b>
            <em>{backendError || `${clock} CET`}</em>
          </div>
        </section>
      )}

      {diagnosticExchange ? (
        renderTerminalWorkspace(
          <>
          <section className="testboard-marketbar" aria-label="Exchange diagnostics context">
            <div className="testboard-sport-title">
              <Database size={15} />
              <strong>Actual</strong>
              <span>{diagnosticLabel} sports available to trade</span>
            </div>
            <nav className="actual-exchange-switcher" aria-label="Actual exchange selector">
              {DIAGNOSTIC_EXCHANGES.map((exchange) => (
                <button
                  className={diagnosticExchange === exchange.key ? "active" : ""}
                  key={exchange.key}
                  type="button"
                  onClick={() => {
                    setDiagnosticExchange(exchange.key);
                    setExpandedDiagnosticSport(null);
                    setDiagnosticEventRows({});
                    setSelectedFixtureIndex(null);
                    window.location.hash = "#actual";
                  }}
                >
                  {exchange.label}
                </button>
              ))}
            </nav>
            <div className="testboard-live-strip">
              <span className={diagnosticError ? "" : "positive"}>{diagnosticError ? "error" : "live"}</span>
              <strong>{diagnosticRows.length} sports</strong>
              <em>{diagnosticLoading ? "refreshing" : "current state"}</em>
              <b>{diagnosticRows.reduce((sum, row) => sum + Number(row.liquidity || 0), 0) ? formatExchangeMoney(diagnosticRows.reduce((sum, row) => sum + Number(row.liquidity || 0), 0), "GBP") : "-"}</b>
              <small>{diagnosticError || `${clock} CET`}</small>
            </div>
          </section>
          <section className="testboard-matrix diag-console" aria-label={`${diagnosticLabel} sports diagnostics`}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Sport</th>
                  <th scope="col">Events</th>
                  <th scope="col">Active</th>
                  <th scope="col">Liquidity</th>
                  <th scope="col">Latest Seen</th>
                </tr>
              </thead>
              <tbody>
                {diagnosticRows.map((row) => {
                  const expanded = expandedDiagnosticSport === row.sport;
                  const events = diagnosticEventRows[row.sport] || [];
                  return (
                    <Fragment key={row.sport}>
                      <tr
                        className="clickable-row"
                        key={row.sport}
                        onClick={() => {
                          setExpandedDiagnosticSport(row.sport);
                          const existingEvents = diagnosticEventRows[row.sport] || [];
                          if (existingEvents.length) setExpandedDiagnosticEvent(existingEvents[0]);
                        }}
                      >
                        <td className="testboard-fixture">
                          <div className="fixture-title-line">
                            <span className="team-badge">{teamInitials(row.sport)}</span>
                            <strong>{SPORT_LABELS.get(normalizeSport(row.sport)) || row.sport}</strong>
                          </div>
                        </td>
                        <td className="mono positive">{row.events.toLocaleString()}</td>
                        <td className="mono">{row.activeEvents.toLocaleString()}</td>
                        <td className="mono">{row.liquidity ? formatExchangeMoney(row.liquidity, "GBP") : "-"}</td>
                        <td className="mono">{row.latestSeenAt ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Madrid", hour12: false }).format(new Date(row.latestSeenAt)) : "-"}</td>
                      </tr>
                      {expanded && (
                        <tr className="diag-events-row" key={`${row.sport}-events`}>
                          <td colSpan={5}>
                            <div className="diag-events-panel">
                              <div className="diag-events-head">
                                <strong>{diagnosticLabel} {SPORT_LABELS.get(normalizeSport(row.sport)) || row.sport} events</strong>
                                <span>{diagnosticEventsLoading ? "refreshing live state" : `${events.length} shown`}</span>
                              </div>
                              {expandedDiagnosticEvent && expandedDiagnosticSport === row.sport && renderDiagnosticPricePanel()}
                              <div className="diag-event-grid header">
                                <span>Date</span>
                                <span>Event</span>
                                <span>Competition</span>
                                <span>Liquidity</span>
                                <span>Latest</span>
                              </div>
                              {events.map((event) => (
                                <button
                                  className={`diag-event-grid diag-event-button${expandedDiagnosticEvent?.id === event.id ? " active" : ""}`}
                                  key={event.id || event.name}
                                  type="button"
                                  onMouseDown={() => setExpandedDiagnosticEvent(event)}
                                  onClick={() => setExpandedDiagnosticEvent(event)}
                                >
                                  <span className="mono positive">{event.startAt ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid", hour12: false }).format(new Date(event.startAt)) : "TBD"}</span>
                                  <strong>{event.name || event.id}</strong>
                                  <span>{event.competition || event.sport}</span>
                                  <span className="mono">{event.liquidity ? formatExchangeMoney(event.liquidity, "GBP") : "-"}</span>
                                  <span className="mono">{event.latestSeenAt ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Madrid", hour12: false }).format(new Date(event.latestSeenAt)) : "-"}</span>
                                </button>
                              ))}
                              {!events.length && (
                                <div className="diag-event-empty">{diagnosticEventsLoading ? "Loading events." : "No events returned for this sport."}</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {!diagnosticRows.length && (
                  <tr>
                    <td className="empty" colSpan={5}>{diagnosticLoading ? "Loading exchange sports." : "No sports returned for this exchange."}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          </>,
          false
        )
      ) : isMatrixPage ? (
        renderTerminalWorkspace(renderBiasMatrix(), false)
      ) : isEntryDashboard ? (
        renderEntryDashboard()
      ) : isFootballDashboard ? (
        renderTerminalWorkspace(renderFootballDashboard(), true)
      ) : (
        renderTerminalWorkspace(
          <>
      {selectedSport !== "football" && (
        <section className="testboard-marketbar" aria-label="Market context">
          <div className="testboard-sport-title">
            <Radio size={15} />
            <strong>{selectedSportLabel}</strong>
            <span>{marketGroup === "all" ? "All markets" : marketGroups.find((group) => group.value === marketGroup)?.label}</span>
          </div>
          <nav className="testboard-market-tabs" aria-label={`${selectedSportLabel} market groups`}>
            {marketGroups.map((group) => (
              <button
                className={marketGroup === group.value ? "active" : ""}
                key={group.value}
                type="button"
                onClick={() => {
                  setMarketGroup(group.value);
                  setSelectedFixtureIndex(null);
                }}
              >
                {group.label}
              </button>
            ))}
          </nav>
          <div className="testboard-live-strip">
            <span className={socketStatus === "live" ? "positive" : ""}>{socketStatus}</span>
            <strong>{matrixRows.length} markets</strong>
            <em>{activeExchangeCount}/{EXCHANGE_COLUMNS.length} venues</em>
            <b>{totalMatched ? formatExchangeMoney(totalMatched, "GBP") : "-"}</b>
            <small>{backendError || `${clock} CET`}</small>
          </div>
        </section>
      )}

      <section className="testboard-matrix" aria-label={`${selectedSportLabel} exchange matrix`}>
        {selectedFixtureIndex != null ? (() => {
          const matrixRow = matrixRows[selectedFixtureIndex] || matrixRows[0];
          if (!matrixRow) {
            return (
              <div className="fixture-detail-empty">
                <strong>No real prices loaded yet</strong>
                <span>Waiting for exchange WSS ticks from the backend.</span>
              </div>
            );
          }
          const fixture = matrixRow.fixture;
          const routeColumns = selectedSport === "football" ? BETTING_EXCHANGE_COLUMNS : EXCHANGE_COLUMNS;
          const venueRows = routeColumns.map((exchange) => {
            if (matrixRow.backend) {
              const { backendMatch, summary, live } = backendSummaryWithLive(matrixRow.backend, fixture, exchange);
              if (!backendMatch || !summary) return null;
              return {
                exchange,
                exchangeValue: {
                  value: summary.value,
                  volume: summary.markets,
                  currency: exchange.currency,
                  back: summary.back,
                  lay: summary.lay,
                  backSize: summary.backSize,
                  laySize: summary.laySize,
                  updatedAt: summary.observedAt ? new Date(summary.observedAt).getTime() : Date.now(),
                  source: live ? "wss" as const : "api" as const
                },
                quote: summary.back && summary.lay ? { bid: summary.back, ask: summary.lay, source: live ? "wss" as const : "api" as const } : null,
                runners: backendMatch.runners,
                isLive: Boolean(live || (summary.observedAt && Date.now() - new Date(summary.observedAt).getTime() < 30000))
              };
            }
            const key = fixtureExchangeUpdateKey(selectedSport, fixture, exchange.key);
            const exchangeValue = fixtureExchangeUpdates[key] || fixtureExchangeValue(selectedSport, fixture, exchange);
            if (!exchangeValue) return null;
            const quote = quoteForFixtureExchange(exchangeValue);
            if (!quote) return null;
            return {
              exchange,
              exchangeValue,
              quote,
              runners: [],
              isLive: Boolean(fixtureExchangeUpdates[key] && now.getTime() - fixtureExchangeUpdates[key].updatedAt < 6500)
            };
          }).filter(Boolean) as Array<{
            exchange: ExchangeColumn;
            exchangeValue: FixtureExchangeSnapshot;
            quote: { bid: number; ask: number; source: "api" | "wss" } | null;
            runners: BackendRunner[];
            isLive: boolean;
          }>;
          const seQuote = sportsEdgeMarketQuote(matrixRow.backend);
          const hasLiveVenue = venueRows.some((venue) => venue.isLive);

          return (
            <div className="fixture-detail-screen">
              <div className="fixture-detail-head">
                <button type="button" onClick={() => setSelectedFixtureIndex(null)}>
                  <ArrowRight size={15} />
                  Back
                </button>
                <div>
                  <span>{selectedSportLabel} / {fixtureGroupLabel(fixture[2])}</span>
                  <strong>{fixture[1]}</strong>
                </div>
                <div className="fixture-detail-status">
                  <span className={hasLiveVenue ? "live" : ""}>{hasLiveVenue ? "Realtime SportsEdge book" : "Waiting for route state"}</span>
                  <strong>{seQuote.isArb ? `Arb +${seQuote.edgePct?.toFixed(2)}%` : seQuote.route}</strong>
                </div>
              </div>
              <div className="fixture-ladder-grid">
                {venueRows.map((venue, index) => (
                  <section className="fixture-ladder-card" key={`${venue.exchange.key}-${index}`}>
                    <div className="fixture-ladder-head">
                      <div>
                        <span>SportsEdge route {index + 1}</span>
                        <strong>{formatExchangeMoney(venue.exchangeValue.value, venue.exchangeValue.currency)}</strong>
                      </div>
                      <em className={venue.isLive ? "live" : ""}>{venue.isLive ? "live" : venue.exchangeValue.source}</em>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>Runner</th>
                          <th>Back Size</th>
                          <th>Back</th>
                          <th>Lay</th>
                          <th>Lay Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {venue.runners.length ? venue.runners.flatMap((runner) => {
                          const maxLevels = Math.max(runner.backLevels?.length || 0, runner.layLevels?.length || 0, 1);
                          return Array.from({ length: maxLevels }).map((_, index) => {
                            const back = runner.backLevels?.[index] || (index === 0 ? runner.back : null);
                            const lay = runner.layLevels?.[index] || (index === 0 ? runner.lay : null);
                            return (
                              <tr className="mid" key={`${runner.id}-${index}`}>
                                <td className="runner-cell">{index === 0 ? runner.name : `L${index + 1}`}</td>
                                <td>{back?.amount ? formatExchangeMoney(back.amount, venue.exchangeValue.currency) : "-"}</td>
                                <td className="price-cell buy">{back?.odds ? back.odds.toFixed(2) : "-"}</td>
                                <td className="price-cell sell">{lay?.odds ? lay.odds.toFixed(2) : "-"}</td>
                                <td>{lay?.amount ? formatExchangeMoney(lay.amount, venue.exchangeValue.currency) : "-"}</td>
                              </tr>
                            );
                          });
                        }) : (
                          <tr className="mid">
                            <td className="runner-cell">Best</td>
                            <td>{venue.exchangeValue.backSize ? formatExchangeMoney(venue.exchangeValue.backSize, venue.exchangeValue.currency) : "-"}</td>
                            <td className="price-cell buy">{venue.quote?.bid ? venue.quote.bid.toFixed(2) : "-"}</td>
                            <td className="price-cell sell">{venue.quote?.ask ? venue.quote.ask.toFixed(2) : "-"}</td>
                            <td>{venue.exchangeValue.laySize ? formatExchangeMoney(venue.exchangeValue.laySize, venue.exchangeValue.currency) : "-"}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </section>
                ))}
                {venueRows.length === 0 && (
                  <div className="fixture-detail-empty">
                    <strong>No backend prices for this fixture</strong>
                    <span>Waiting for API snapshot or WSS exchange ticks.</span>
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
        <table className="sportsedge-broker-table">
          <colgroup>
            <col className="col-time" />
            <col className="col-market" />
            <col className="col-coverage" />
            <col className="col-contract" />
            <col className="col-exchange-price" />
            <col className="col-exchange-price" />
            <col className="col-exchange-price" />
            <col className="col-bias" />
            <col className="col-liquidity" />
            <col className="col-fresh" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Market</th>
                    <th scope="col">Coverage</th>
                    <th scope="col">Outcome</th>
                    <th scope="col">Betfair</th>
                    <th scope="col">Matchbook</th>
                    <th scope="col">SX</th>
                    <th scope="col">Bias</th>
                    <th scope="col">Liquidity</th>
                    <th scope="col">Fresh</th>
                  </tr>
                </thead>
                <tbody>
            {matrixRows.map(({ fixture, fixtureIndex, totalValue, backend }) => {
              const quote = sportsEdgeMarketQuote(backend);
              const rowKey = backend ? stableDisplayRowKey(backend) : `${fixture[0]}-${fixture[1]}-${fixture[3]}-${fixtureIndex}`;
              const outcomes = tradeableOutcomeRows(backend);
              const visibleOutcomes = outcomes.slice(0, 3);
              const coverage = exchangeCoverage(backend);
              const coverageText = exchangeCoverageLabel(backend);
              const biasLabel = rowHasMultiBettingExchange(backend) ? biasFromQuote(quote) : rowHasBettingExchange(backend) ? "Single route" : "No route";
              return (
                <tr
                  className="clickable-row"
                  key={rowKey}
                  onClick={() => setSelectedFixtureIndex(fixtureIndex)}
                >
                  <td className="mono positive">{fixture[0]}</td>
                  <td className="testboard-fixture">
                    <div className="fixture-title-line">
                      <TeamLogoStack name={fixture[1]} />
                      <strong>{fixture[1]}</strong>
                    </div>
                    <span><em>{countryFlag(competitionCountry(fixture[2]))}</em>{fixtureGroupLabel(fixture[2])}</span>
                  </td>
                  <td>
                    <div className="exchange-coverage" title={coverageText}>
                      {coverage.map((exchange) => (
                        <span className={exchange.isAvailable ? "available" : ""} key={exchange.key}>{exchange.label}</span>
                      ))}
                    </div>
                  </td>
                  <td className="contract-cell">
                    <div className="outcome-stack">
                      {visibleOutcomes.length ? visibleOutcomes.map((outcome) => (
                        <span key={outcome.key}>{outcome.label}</span>
                      )) : <span>{fixture[3]}</span>}
                    </div>
                  </td>
                  <td className="mono exchange-odds-cell">
                    <div className="outcome-stack price-stack">
                      {visibleOutcomes.length ? visibleOutcomes.map((outcome) => (
                        <span key={`${outcome.key}-bf`}>{formatOutcomeCell(outcome, "bf")}</span>
                      )) : <span>-</span>}
                    </div>
                  </td>
                  <td className="mono exchange-odds-cell">
                    <div className="outcome-stack price-stack">
                      {visibleOutcomes.length ? visibleOutcomes.map((outcome) => (
                        <span key={`${outcome.key}-mb`}>{formatOutcomeCell(outcome, "mb")}</span>
                      )) : <span>-</span>}
                    </div>
                  </td>
                  <td className="mono exchange-odds-cell">
                    <div className="outcome-stack price-stack">
                      {visibleOutcomes.length ? visibleOutcomes.map((outcome) => (
                        <span key={`${outcome.key}-sx`}>{formatOutcomeCell(outcome, "sx")}</span>
                      )) : <span>-</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`bias-pill ${rowHasMultiBettingExchange(backend) ? "active" : ""}`}>{biasLabel}</span>
                  </td>
                  <td className="mono">{quote.liquidity || totalValue ? formatExchangeMoney(quote.liquidity || totalValue, "GBP") : "-"}</td>
                  <td className="mono">{quote.isFresh ? quote.updatedAt || "Live" : quote.updatedAt || "watch"}</td>
                </tr>
              );
            })}
            {matrixRows.length === 0 && (
              <tr>
                <td className="empty" colSpan={10}>Waiting for SportsEdge market state.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      </section>
          </>,
          selectedSport === "football"
        )
      )}
    </main>
  );
}

function FootballIntelligenceDemoPage() {
  const profileTeams = [
    {
      name: "Manchester City",
      league: "Premier League",
      country: "England",
      form: "W W D W L",
      liquidity: "GBP 1.8m",
      signal: "Back pressure",
      rating: "91"
    },
    {
      name: "Chelsea",
      league: "Premier League",
      country: "England",
      form: "W L W D W",
      liquidity: "GBP 940k",
      signal: "Mixed",
      rating: "76"
    },
    {
      name: "Arsenal",
      league: "Premier League",
      country: "England",
      form: "D W W W D",
      liquidity: "GBP 1.2m",
      signal: "Sharp buy",
      rating: "84"
    }
  ];
  const players = [
    ["Erling Haaland", "Forward", "Anytime scorer", "0.64 xG", "+11%"],
    ["Bukayo Saka", "Right wing", "Assist market", "3.2 key passes", "+7%"],
    ["Cole Palmer", "Attacking mid", "Shot volume", "4 shots", "+9%"]
  ];
  const fixtures = [
    ["Today 19:45", "Chelsea - Manchester City", "Match Winner", "GBP 2.1m", "4 venues"],
    ["Tomorrow 15:00", "Arsenal - Newcastle United", "Total Goals", "GBP 1.4m", "3 venues"],
    ["Tomorrow 17:30", "Liverpool - Tottenham Hotspur", "Match Winner", "GBP 1.7m", "4 venues"]
  ];

  return (
    <main className="football-demo-page">
      <SportsEdgeTopbar active="football" />

      <section className="football-demo-hero">
        <div>
          <span>Football Intelligence Demo</span>
          <h1>Teams, players, fixtures, stats, and market signals in one profile layer.</h1>
          <p>
            This is the proposed main-site layout for football coverage: clean club profiles,
            player cards, fixture context, live market state, and news signals feeding into SportsEdge.
          </p>
        </div>
        <div className="football-demo-live-card">
          <span>Profile engine</span>
          <strong>Premier League ready</strong>
          <em>Team logo table + aliases + fixture matching</em>
        </div>
      </section>

      <section className="football-demo-grid">
        <article className="football-demo-panel team-profiles">
          <div className="football-demo-panel-head">
            <span>Team Profiles</span>
            <strong>Official badges, aliases, league, country</strong>
          </div>
          <div className="football-demo-team-list">
            {profileTeams.map((team) => (
              <button type="button" key={team.name}>
                <div className="football-demo-team-title">
                  <TeamLogoStack name={team.name} />
                  <div>
                    <strong>{team.name}</strong>
                    <span>{team.country} / {team.league}</span>
                  </div>
                </div>
                <div className="football-demo-team-stats">
                  <span>Form <b>{team.form}</b></span>
                  <span>Liquidity <b>{team.liquidity}</b></span>
                  <span>Signal <b>{team.signal}</b></span>
                  <span>Rating <b>{team.rating}</b></span>
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className="football-demo-panel player-profiles">
          <div className="football-demo-panel-head">
            <span>Player Profiles</span>
            <strong>Market-relevant player context</strong>
          </div>
          <div className="football-demo-player-grid">
            {players.map((player) => (
              <div key={player[0]}>
                <span>{player[1]}</span>
                <strong>{player[0]}</strong>
                <p>{player[2]}</p>
                <footer>
                  <b>{player[3]}</b>
                  <em>{player[4]}</em>
                </footer>
              </div>
            ))}
          </div>
        </article>

        <article className="football-demo-panel fixture-intel">
          <div className="football-demo-panel-head">
            <span>Fixture Intelligence</span>
            <strong>Upcoming games linked to markets</strong>
          </div>
          <table>
            <thead>
              <tr>
                <th>Kickoff</th>
                <th>Fixture</th>
                <th>Market</th>
                <th>Liquidity</th>
                <th>Venues</th>
              </tr>
            </thead>
            <tbody>
              {fixtures.map((fixture) => (
                <tr key={fixture[1]}>
                  <td>{fixture[0]}</td>
                  <td>
                    <div className="fixture-title-line">
                      <TeamLogoStack name={fixture[1]} />
                      <strong>{fixture[1]}</strong>
                    </div>
                  </td>
                  <td>{fixture[2]}</td>
                  <td className="mono positive">{fixture[3]}</td>
                  <td>{fixture[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="football-demo-panel stats-stack">
          <div className="football-demo-panel-head">
            <span>Stats Layer</span>
            <strong>Profile data that feeds bias</strong>
          </div>
          <div className="football-demo-stat-bars">
            {[
              ["Team news sensitivity", 86],
              ["Liquidity overlap", 74],
              ["Line movement", 68],
              ["News impact", 91]
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}%</strong>
                <i style={{ width: `${value}%` }} />
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

type FootballTeamProfile = {
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

type FootballPlayerStat = {
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

type FootballStaffProfile = {
  id: string;
  name: string;
  age: number | null;
  nationality: string | null;
  photoUrl: string | null;
  role: string;
  syncedAt: string | null;
};

type FootballPlayerProfile = FootballTeamProfile["squad"][number] & {
  team?: {
    id: string;
    name: string;
    logoUrl: string | null;
    country: string | null;
  } | null;
};

const PRODUCT_MOCKUP_DATA: Record<string, {
  label: string;
  headline: string;
  events: Array<{ time: string; event: string; market: string; liquidity: string; alert: string }>;
  matrix: Array<{ selection: string; consensus: string; swing: string; align: string; confidence: string; bf: string; mb: string; se: string }>;
  profiles: Array<{ name: string; role: string; status: string; impact: string }>;
  players: Array<{ name: string; role: string; signal: string; note: string }>;
  news: Array<{ source: string; title: string; tag: string; time: string }>;
}> = {
  football: {
    label: "Football",
    headline: "Chelsea - Manchester City",
    events: [
      { time: "19:30", event: "Chelsea - Manchester City", market: "Match Odds", liquidity: "GBP 2.1m", alert: "Lineup watch" },
      { time: "15:00", event: "Arsenal - Burnley", market: "Match Odds", liquidity: "GBP 254k", alert: "Home pressure" },
      { time: "17:30", event: "Newcastle - West Ham", market: "Total Goals", liquidity: "GBP 188k", alert: "News drift" }
    ],
    matrix: [
      { selection: "Chelsea", consensus: "3.45", swing: "Lay", align: "67%", confidence: "72", bf: "L 64", mb: "N 52", se: "Watch" },
      { selection: "Draw", consensus: "3.30", swing: "Neutral", align: "41%", confidence: "58", bf: "N 55", mb: "N 50", se: "Quiet" },
      { selection: "Man City", consensus: "2.08", swing: "Back", align: "83%", confidence: "81", bf: "B 79", mb: "B 86", se: "Flag" }
    ],
    profiles: [
      { name: "Chelsea FC", role: "Team profile", status: "Premier League", impact: "High news sensitivity" },
      { name: "Manchester City FC", role: "Team profile", status: "Premier League", impact: "Sharp venue weighting" }
    ],
    players: [
      { name: "Cole Palmer", role: "Attacking mid", signal: "Shots + assists", note: "Market moves on confirmed start" },
      { name: "Erling Haaland", role: "Forward", signal: "Scorer pressure", note: "Anytime scorer drives totals" },
      { name: "Rodri", role: "Midfield", signal: "Team balance", note: "Absence moves match odds" }
    ],
    news: [
      { source: "@FabrizioRomano", title: "Chelsea expected to rotate wide players before Manchester City", tag: "Lineup", time: "12:34" },
      { source: "@talkSPORT", title: "Manchester City travel squad update lands before market open", tag: "Squad", time: "12:21" },
      { source: "@SkySportsPL", title: "Manager comments point to unchanged City front line", tag: "Press", time: "11:58" }
    ]
  },
  tennis: {
    label: "Tennis",
    headline: "Alcaraz - Sinner",
    events: [
      { time: "14:10", event: "Alcaraz - Sinner", market: "Match Winner", liquidity: "GBP 410k", alert: "Serve hold" },
      { time: "16:20", event: "Swiatek - Gauff", market: "Set Winner", liquidity: "GBP 180k", alert: "Momentum" },
      { time: "18:00", event: "Djokovic - Rune", market: "Total Games", liquidity: "GBP 132k", alert: "Fitness" }
    ],
    matrix: [
      { selection: "Alcaraz", consensus: "1.82", swing: "Back", align: "80%", confidence: "77", bf: "B 76", mb: "B 84", se: "Flag" },
      { selection: "Sinner", consensus: "2.16", swing: "Lay", align: "64%", confidence: "68", bf: "L 61", mb: "N 55", se: "Watch" }
    ],
    profiles: [
      { name: "Carlos Alcaraz", role: "Player profile", status: "ATP", impact: "Clay strength" },
      { name: "Jannik Sinner", role: "Player profile", status: "ATP", impact: "Fitness watch" }
    ],
    players: [
      { name: "Carlos Alcaraz", role: "Return pressure", signal: "Break points", note: "Bias follows second serve win rate" },
      { name: "Jannik Sinner", role: "Serve quality", signal: "Aces + holds", note: "Watch medical/social feed" }
    ],
    news: [
      { source: "@TennisTV", title: "Alcaraz talks court speed and heavy baseline conditions", tag: "Surface", time: "12:08" },
      { source: "@ATP", title: "Sinner warm-up session completed without trainer call", tag: "Fitness", time: "11:44" }
    ]
  },
  horseracing: {
    label: "Horse Racing",
    headline: "Newmarket 15:05",
    events: [
      { time: "13:50", event: "Southwell 6f Handicap", market: "Win Market", liquidity: "GBP 310k", alert: "Going" },
      { time: "15:05", event: "Newmarket Listed Stakes", market: "Win Market", liquidity: "GBP 1.2m", alert: "Late steam" },
      { time: "16:10", event: "Chelmsford Nursery", market: "Place Market", liquidity: "GBP 420k", alert: "Non-runner" }
    ],
    matrix: [
      { selection: "Favourite", consensus: "3.80", swing: "Back", align: "79%", confidence: "75", bf: "B 77", mb: "B 82", se: "Watch" },
      { selection: "Second Fav", consensus: "5.20", swing: "Neutral", align: "51%", confidence: "60", bf: "N 56", mb: "N 50", se: "Quiet" },
      { selection: "Drifter", consensus: "11.50", swing: "Lay", align: "84%", confidence: "78", bf: "L 81", mb: "L 87", se: "Flag" }
    ],
    profiles: [
      { name: "Newmarket", role: "Course profile", status: "Flat racing", impact: "Going sensitive" },
      { name: "Southwell", role: "Course profile", status: "All-weather", impact: "Late money sensitive" }
    ],
    players: [
      { name: "Trainer form", role: "Stable profile", signal: "7 day strike", note: "Bias moves with yard strength" },
      { name: "Jockey booking", role: "Rider profile", signal: "Course record", note: "Sharp money follows booking upgrades" }
    ],
    news: [
      { source: "@RacingTV", title: "Going update posted before Newmarket feature race", tag: "Going", time: "10:33" },
      { source: "@AtTheRaces", title: "Non-runner alert changes place market shape", tag: "NR", time: "09:41" }
    ]
  },
  baseball: {
    label: "Baseball",
    headline: "Yankees - Red Sox",
    events: [
      { time: "00:05", event: "Yankees - Red Sox", market: "Moneyline", liquidity: "GBP 227k", alert: "Pitcher confirmed" },
      { time: "01:10", event: "Mets - Braves", market: "Run Line", liquidity: "GBP 93k", alert: "Bullpen" },
      { time: "02:40", event: "Dodgers - Giants", market: "Total Runs", liquidity: "GBP 165k", alert: "Weather" }
    ],
    matrix: [
      { selection: "Yankees", consensus: "1.78", swing: "Back", align: "75%", confidence: "74", bf: "-", mb: "B 71", se: "Watch" },
      { selection: "Red Sox", consensus: "2.18", swing: "Lay", align: "62%", confidence: "66", bf: "-", mb: "L 69", se: "Quiet" }
    ],
    profiles: [
      { name: "New York Yankees", role: "Team profile", status: "MLB", impact: "Pitcher led" },
      { name: "Boston Red Sox", role: "Team profile", status: "MLB", impact: "Bullpen risk" }
    ],
    players: [
      { name: "Probable starter", role: "Pitcher", signal: "Confirmed", note: "Primary market mover" },
      { name: "Leadoff hitter", role: "Batting order", signal: "Lineup card", note: "Totals sensitivity" }
    ],
    news: [
      { source: "@MLB", title: "Probable pitchers confirmed ahead of Yankees-Red Sox", tag: "Lineup", time: "10:19" },
      { source: "@Yankees", title: "Clubhouse update before tonight's rivalry game", tag: "Official", time: "09:57" }
    ]
  },
  basketball: {
    label: "Basketball",
    headline: "Lakers - Celtics",
    events: [
      { time: "01:30", event: "Lakers - Celtics", market: "Moneyline", liquidity: "GBP 620k", alert: "Injury report" },
      { time: "03:00", event: "Knicks - Heat", market: "Spread", liquidity: "GBP 312k", alert: "Minutes cap" },
      { time: "04:30", event: "Warriors - Suns", market: "Total Points", liquidity: "GBP 410k", alert: "Pace" }
    ],
    matrix: [
      { selection: "Lakers", consensus: "2.24", swing: "Lay", align: "70%", confidence: "71", bf: "-", mb: "L 74", se: "Watch" },
      { selection: "Celtics", consensus: "1.74", swing: "Back", align: "82%", confidence: "80", bf: "-", mb: "B 83", se: "Flag" }
    ],
    profiles: [
      { name: "Los Angeles Lakers", role: "Team profile", status: "NBA", impact: "Injury sensitivity" },
      { name: "Boston Celtics", role: "Team profile", status: "NBA", impact: "Sharp weighting" }
    ],
    players: [
      { name: "Star forward", role: "Questionable", signal: "Q tag", note: "Market waits for injury report" },
      { name: "Starting guard", role: "Usage", signal: "High minutes", note: "Props and spread driver" }
    ],
    news: [
      { source: "@UnderdogNBA", title: "Celtics starter upgraded to probable on injury report", tag: "Injury", time: "13:02" },
      { source: "@NBA", title: "Projected starting lineups updated for late game", tag: "Lineup", time: "12:48" }
    ]
  },
  golf: {
    label: "Golf",
    headline: "PGA Championship",
    events: [
      { time: "12:00", event: "PGA Championship", market: "Outright Winner", liquidity: "GBP 890k", alert: "Weather" },
      { time: "13:20", event: "Scheffler - McIlroy", market: "Matchup", liquidity: "GBP 625k", alert: "Tee time" },
      { time: "14:10", event: "Top 10 Finish", market: "Placement", liquidity: "GBP 210k", alert: "Course fit" }
    ],
    matrix: [
      { selection: "Scheffler", consensus: "3.20", swing: "Back", align: "78%", confidence: "76", bf: "B 73", mb: "B 80", se: "Watch" },
      { selection: "McIlroy", consensus: "5.60", swing: "Mixed", align: "50%", confidence: "58", bf: "N 53", mb: "L 61", se: "Quiet" }
    ],
    profiles: [
      { name: "Scottie Scheffler", role: "Player profile", status: "PGA", impact: "Course fit" },
      { name: "Rory McIlroy", role: "Player profile", status: "PGA", impact: "Weather sensitive" }
    ],
    players: [
      { name: "Scottie Scheffler", role: "Approach play", signal: "Strong", note: "Course model supports price" },
      { name: "Rory McIlroy", role: "Driving", signal: "Volatile", note: "News and weather amplify" }
    ],
    news: [
      { source: "@PGATOUR", title: "Wind expected to build for afternoon wave", tag: "Weather", time: "10:33" },
      { source: "@GolfChannel", title: "Course setup favors long approach play", tag: "Course", time: "09:41" }
    ]
  }
};

function SportsEdgeProductMockupPage() {
  const sport = "football";
  const active = PRODUCT_MOCKUP_DATA[sport] || PRODUCT_MOCKUP_DATA.football;

  return (
    <main className="product-mockup-page">
      <SportsEdgeTopbar active={sport} />

      {sport === "football" && (
        <section className="football-region-strip" aria-label="Football regions">
          {SPORT_MARKET_GROUPS.football.map((region) => (
            <button type="button" className={region.value === "all" ? "active" : ""} key={region.value}>
              {region.label}
            </button>
          ))}
        </section>
      )}

      <section className="product-mockup-hero">
        <div>
          <span>SportsEdge workspace</span>
          <h1>{active.label}: one sport selected, one live market picture.</h1>
        </div>
        <div className="product-mockup-metrics">
          <div><span>Primary event</span><strong>{active.headline}</strong></div>
          <div><span>Live modules</span><strong>Matrix / Profiles / News</strong></div>
          <div><span>Decision layer</span><strong>Consensus + bias</strong></div>
        </div>
      </section>

      <section className="product-mockup-grid">
        <article className="product-mockup-panel events">
          <div className="product-mockup-panel-head">
            <span>Today</span>
            <strong>{active.label} events</strong>
          </div>
          <div className="product-mockup-event-list">
            {active.events.map((event, index) => (
              <button type="button" className={index === 0 ? "active" : ""} key={`${event.time}-${event.event}`}>
                <span>{event.time}</span>
                <strong>{event.event}</strong>
                <em>{event.market}</em>
                <b>{event.liquidity}</b>
                <i>{event.alert}</i>
              </button>
            ))}
          </div>
        </article>

        <article className="product-mockup-panel matrix">
          <div className="product-mockup-panel-head">
            <span>Odds matrix</span>
            <strong>{active.headline}</strong>
          </div>
          <table>
            <thead>
              <tr>
                <th>Selection</th>
                <th>Consensus</th>
                <th>Swing</th>
                <th>Align</th>
                <th>Conf</th>
                <th>BF</th>
                <th>MB</th>
                <th>SE</th>
              </tr>
            </thead>
            <tbody>
              {active.matrix.map((row) => (
                <tr key={row.selection}>
                  <td>{row.selection}</td>
                  <td className="mono positive">{row.consensus}</td>
                  <td className={row.swing === "Lay" ? "negative" : row.swing === "Back" ? "positive" : ""}>{row.swing}</td>
                  <td>{row.align}</td>
                  <td>{row.confidence}</td>
                  <td><span className={row.bf.startsWith("B") ? "signal buy" : row.bf.startsWith("L") ? "signal sell" : "signal neutral"}>{row.bf}</span></td>
                  <td><span className={row.mb.startsWith("B") ? "signal buy" : row.mb.startsWith("L") ? "signal sell" : "signal neutral"}>{row.mb}</span></td>
                  <td><span className={row.se === "Flag" ? "route flag" : "route"}>{row.se}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <aside className="product-mockup-panel news">
          <div className="product-mockup-panel-head">
            <span>News</span>
            <strong>Sport filtered</strong>
          </div>
          <div className="product-mockup-news-list">
            {active.news.map((item) => (
              <article key={`${item.source}-${item.time}`}>
                <b>{item.tag}</b>
                <strong>{item.title}</strong>
                <span>{item.source}</span>
                <time>{item.time}</time>
              </article>
            ))}
          </div>
        </aside>

        <article className="product-mockup-panel profiles">
          <div className="product-mockup-panel-head">
            <span>Profiles</span>
            <strong>Teams / players / competitors</strong>
          </div>
          <div className="product-mockup-profile-grid">
            {active.profiles.map((profile) => (
              <div key={profile.name}>
                <TeamLogoStack name={profile.name} />
                <strong>{profile.name}</strong>
                <span>{profile.role}</span>
                <em>{profile.status}</em>
                <b>{profile.impact}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="product-mockup-panel players">
          <div className="product-mockup-panel-head">
            <span>Player layer</span>
            <strong>Market relevant signals</strong>
          </div>
          <div className="product-mockup-player-list">
            {active.players.map((player) => (
              <div key={player.name}>
                <span>{player.role}</span>
                <strong>{player.name}</strong>
                <b>{player.signal}</b>
                <em>{player.note}</em>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function AgtestBloombergMockupPage() {
  const [screen, setScreen] = useState<"monitor" | "match" | "diagnostics">("monitor");
  const rows = [
    ["19:45", "ARS-TOT", "Premier League", "Arsenal", "2.04", "2.01", "+1.5%", "GBP 1.42m", "84", "12s", "LINEUP"],
    ["19:45", "ARS-TOT", "Premier League", "Draw", "3.72", "3.80", "-2.1%", "GBP 860k", "71", "12s", "WATCH"],
    ["19:45", "ARS-TOT", "Premier League", "Tottenham", "3.96", "4.08", "-2.9%", "GBP 1.08m", "78", "12s", "DRIFT"],
    ["20:00", "CHE-MCI", "Premier League", "Man City", "1.88", "1.84", "+2.2%", "GBP 2.31m", "91", "8s", "SHARP"],
    ["20:00", "CHE-MCI", "Premier League", "Chelsea", "4.50", "4.62", "-2.6%", "GBP 1.16m", "73", "8s", "NEWS"],
    ["20:15", "LIV-NEW", "Premier League", "Over 2.5", "1.74", "1.70", "+2.4%", "GBP 774k", "69", "18s", "TOTALS"],
    ["21:00", "PSG-RMA", "Champions League", "Real Madrid", "2.92", "2.86", "+2.1%", "GBP 1.91m", "82", "21s", "UEFA"],
    ["Tomorrow", "SAKA", "Player Props", "Assist", "3.35", "3.22", "+4.0%", "GBP 184k", "76", "44s", "PLAYER"]
  ];
  const news = [
    ["12:34", "ARS", "Saka pictured in full training; assist and shot markets firm"],
    ["12:31", "EPL", "Fixture congestion model raises rotation risk for top-six sides"],
    ["12:25", "MCI", "City travel squad confirmed with no late forward absence"],
    ["12:17", "TOT", "Defensive injuries keep Arsenal win pressure elevated"],
    ["12:04", "UEFA", "Madrid lineup leak moves away side by 2.1%"],
    ["11:58", "NEWS", "TalkSPORT segment flags Chelsea tactical switch"]
  ];
  const venues = [
    ["Betfair", "2.02", "2.06", "GBP 620k", "live", "27ms"],
    ["Matchbook", "2.00", "2.08", "GBP 418k", "live", "41ms"],
    ["SX", "2.04", "2.10", "GBP 92k", "live", "88ms"],
    ["Kalshi", "-", "-", "-", "mapped", "310ms"],
    ["Polymarket", "2.01", "2.09", "USD 141k", "watch", "155ms"]
  ];

  return (
    <>
      <SportsEdgeTopbar active="liquidity" searchPlaceholder="ARSENAL, EPL, PLAYER: SAKA, MATCH: ARS-TOT, NEWS, MATRIX..." />
      <main className="agtest-page bb-demo-shell">
        <section className="agtest-subbar bb-demo-subbar" aria-label="Liquidity mockup controls">
          <nav aria-label="Mockup screens">
            {(["monitor", "match", "diagnostics"] as const).map((key) => (
              <button className={screen === key ? "active" : ""} key={key} type="button" onClick={() => setScreen(key)}>
                {key}
              </button>
            ))}
          </nav>
          <div>
            <span>Liquidity layout demo</span>
            <span>SportsEdge-first</span>
            <span>WSS live</span>
          </div>
        </section>
        <div className="bb-demo-layout">
          <aside className="bb-demo-left">
            <section>
              <strong>Sports</strong>
              {["Football", "Tennis", "Baseball", "Basketball", "Golf"].map((item, index) => <button className={index === 0 ? "active" : ""} type="button" key={item}>{item}</button>)}
            </section>
            <section>
              <strong>Leagues</strong>
              {["Premier League", "Champions League", "La Liga", "NBA", "ATP"].map((item) => <button type="button" key={item}>{item}</button>)}
            </section>
            <section>
              <strong>Watchlists</strong>
              {["London derby", "Sharp moves", "Lineup risk", "Saved: EPL Close"].map((item) => <button type="button" key={item}>{item}</button>)}
            </section>
            <section>
              <strong>Alerts</strong>
              <div className="bb-demo-alert">4 price flags</div>
              <div className="bb-demo-alert hot">2 news shocks</div>
            </section>
          </aside>

          <section className="bb-demo-center">
            {screen === "monitor" && (
              <>
                <div className="bb-demo-strip"><span>SportsEdge picture</span><strong>Football / EPL / Top Liquidity</strong><em>Consensus first. Venues one layer down.</em></div>
                <table className="bb-demo-table">
                  <thead><tr>{["Time", "Code", "League", "Selection", "SE Fair", "Mkt", "Edge", "Liquidity", "Conf", "Fresh", "Flag"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
                  <tbody>{rows.map((row) => <tr key={`${row[1]}-${row[3]}`}>{row.map((cell, index) => <td className={index === 6 ? (cell.startsWith("+") ? "bb-pos" : "bb-neg") : index === 10 ? "bb-flag" : index >= 4 && index <= 9 ? "bb-mono" : ""} key={`${cell}-${index}`}>{cell}</td>)}</tr>)}</tbody>
                </table>
              </>
            )}

            {screen === "match" && (
              <div className="bb-demo-match">
                <div className="bb-demo-match-head">
                  <div><span>MATCH: ARS-TOT</span><h1>Arsenal - Tottenham Hotspur</h1><p>Premier League / Emirates Stadium / live market picture</p></div>
                  <div><b>SE Fair 2.04</b><strong className="bb-pos">+1.5% edge</strong><em>Confidence 84 / Fresh 12s</em></div>
                </div>
                <div className="bb-demo-kpis">{[["Consensus", "Arsenal lean"], ["Liquidity", "GBP 1.42m"], ["Bias", "Home pressure"], ["News impact", "Lineup +72"], ["Risk", "Rotation watch"]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
                <table className="bb-demo-table compact">
                  <thead><tr>{["Market", "Selection", "SE Fair", "Market", "Edge", "Liquidity", "Flag"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
                  <tbody>{rows.slice(0, 3).map((row) => <tr key={`match-${row[3]}`}><td>Match Odds</td><td>{row[3]}</td><td className="bb-mono">{row[4]}</td><td className="bb-mono">{row[5]}</td><td className={row[6].startsWith("+") ? "bb-pos bb-mono" : "bb-neg bb-mono"}>{row[6]}</td><td className="bb-mono">{row[7]}</td><td className="bb-flag">{row[10]}</td></tr>)}</tbody>
                </table>
                <div className="bb-demo-subgrid"><section><strong>Player Context</strong><p>Bukayo Saka: assist market +4.0%, full training signal, lineup probability 86%.</p></section><section><strong>Team Context</strong><p>Arsenal home trend and Tottenham defensive injuries align with home pressure.</p></section></div>
              </div>
            )}

            {screen === "diagnostics" && (
              <div className="bb-demo-diagnostics">
                <div className="bb-demo-strip"><span>Diagnostics</span><strong>Raw exchange route state for ARS-TOT / Arsenal</strong><em>Hidden from main client view unless opened.</em></div>
                <table className="bb-demo-table">
                  <thead><tr>{["Venue", "Back", "Lay", "Depth", "Status", "Latency"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
                  <tbody>{venues.map((row) => <tr key={row[0]}><td>{row[0]}</td><td className="bb-pos bb-mono">{row[1]}</td><td className="bb-neg bb-mono">{row[2]}</td><td className="bb-mono">{row[3]}</td><td className="bb-flag">{row[4]}</td><td className="bb-mono">{row[5]}</td></tr>)}</tbody>
                </table>
                <div className="bb-demo-json"><span>route.composite</span><code>{"{ fair: 2.04, market: 2.01, edge: 0.015, confidence: 84, flags: ['LINEUP','SHARP'] }"}</code></div>
              </div>
            )}
          </section>

          <aside className="bb-demo-news">
            <div className="bb-demo-news-head"><strong>News</strong><span>{screen === "match" ? "MATCH: ARS-TOT" : "FOOTBALL / EPL"}</span></div>
            {news.map((item) => <article key={`${item[0]}-${item[1]}`}><time>{item[0]}</time><b>{item[1]}</b><p>{item[2]}</p></article>)}
          </aside>
        </div>
      </main>
    </>
  );
}

type TwitterNewsRow = {
  tweet_id: string;
  source_id: string;
  source_type: string;
  sport: string;
  account_handle: string;
  author_name: string;
  text: string;
  analysis_text?: string;
  url?: string;
  published_at: string | null;
  discovered_at: string;
  news_type?: string;
  market_relevance?: number;
  impact_score?: number;
  confidence?: number;
  urgency?: string;
  direction?: string;
  affected_entity?: string;
  affected_side?: string;
  reason?: string;
};

const NEWS_FEED_SPORT_FILTERS = [
  ["all", "Top"],
  ["football", "Football"],
  ["tennis", "Tennis"],
  ["baseball", "Baseball"],
  ["basketball", "Basketball"],
  ["golf", "Golf"],
  ["horse_racing", "Racing"],
  ["rugby", "Rugby"],
  ["cricket", "Cricket"],
  ["formula_1", "F1"],
  ["mma", "MMA"],
  ["ice_hockey", "Hockey"]
] as const;

const NEWS_DISPLAY_TIME_ZONE = "Europe/Madrid";

function parseSportsEdgeUtcTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const hasExplicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const normalized = hasExplicitZone ? raw.replace(" ", "T") : `${raw.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date : null;
}

function newsTimestamp(item: Pick<NewsItem, "published_at" | "discovered_at"> | Pick<TwitterNewsRow, "published_at" | "discovered_at">) {
  return parseSportsEdgeUtcTimestamp(item.published_at) || parseSportsEdgeUtcTimestamp(item.discovered_at);
}

function newsDisplayTimestamp(item: Pick<NewsItem, "published_at" | "discovered_at"> | Pick<TwitterNewsRow, "published_at" | "discovered_at">) {
  const publishedAt = parseSportsEdgeUtcTimestamp(item.published_at);
  const discoveredAt = parseSportsEdgeUtcTimestamp(item.discovered_at);
  const now = Date.now();
  if (publishedAt && publishedAt.getTime() <= now + 30000) return { date: publishedAt, source: "published" as const };
  if (discoveredAt) return { date: discoveredAt, source: "discovered" as const };
  if (publishedAt) return { date: publishedAt, source: "scheduled" as const };
  return { date: null, source: "missing" as const };
}

function BloombergNewsFeedMockupPage() {
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [twitterRows, setTwitterRows] = useState<TwitterNewsRow[]>([]);
  const [feedMode, setFeedMode] = useState<"all" | "sites" | "twitter">("all");
  const [intelligenceView, setIntelligenceView] = useState("top");
  const [sport, setSport] = useState("football");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socketStatus, setSocketStatus] = useState<"offline" | "connecting" | "live" | "waiting">("offline");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const sportRef = useRef(sport);

  useEffect(() => {
    sportRef.current = sport;
  }, [sport]);

  function storyTime(item: NewsItem) {
    return compactPublishedLabel(newsDisplayTimestamp(item));
  }

  function formatNewsClock(date: Date | null, options: Intl.DateTimeFormatOptions = {}) {
    if (!date) return "";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: NEWS_DISPLAY_TIME_ZONE,
      ...options
    }).format(date);
  }

  function exactPublishedLabel(item: Pick<NewsItem, "published_at" | "discovered_at"> | Pick<TwitterNewsRow, "published_at" | "discovered_at">) {
    const publishedAt = parseSportsEdgeUtcTimestamp(item.published_at);
    const discoveredAt = parseSportsEdgeUtcTimestamp(item.discovered_at);
    if (!publishedAt && !discoveredAt) return "Undated";
    const timeZoneName = new Intl.DateTimeFormat("en-GB", {
      timeZone: NEWS_DISPLAY_TIME_ZONE,
      timeZoneName: "short"
    }).formatToParts(publishedAt || discoveredAt || new Date()).find((part) => part.type === "timeZoneName")?.value || "ES";
    const parts = [];
    if (publishedAt) parts.push(`published ${formatNewsClock(publishedAt)} ${timeZoneName}`);
    if (discoveredAt) parts.push(`discovered ${formatNewsClock(discoveredAt)} ${timeZoneName}`);
    return parts.join(" / ");
  }

  function compactPublishedLabel(timestamp: ReturnType<typeof newsDisplayTimestamp>) {
    const { date, source } = timestamp;
    if (!date) return "--";
    const rawDeltaSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const deltaSeconds = Math.max(0, rawDeltaSeconds);
    const clock = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: NEWS_DISPLAY_TIME_ZONE
    }).format(date);
    if (source === "scheduled" || rawDeltaSeconds < -30) return `sch / ${clock}`;
    if (deltaSeconds < 60) return `${deltaSeconds}s / ${clock}`;
    const deltaMinutes = Math.floor(deltaSeconds / 60);
    if (deltaMinutes < 60) return `${deltaMinutes}m / ${clock}`;
    const deltaHours = Math.floor(deltaMinutes / 60);
    if (deltaHours < 24) return `${deltaHours}h / ${clock}`;
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: NEWS_DISPLAY_TIME_ZONE
    }).format(date);
  }

  function storyTag(item: NewsItem) {
    const base = item.entity_name || item.competition || item.sport || item.source_name || "NEWS";
    const words = cleanText(base).split(/\s+/).filter(Boolean);
    if (words.length >= 2) return words.map((word) => word[0]).join("").slice(0, 5).toUpperCase();
    return cleanText(base).replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase() || "NEWS";
  }

  function storyUrgency(item: NewsItem) {
    const score = Number(item.impact_assessment?.impact_score || 0);
    const urgency = String(item.impact_assessment?.urgency || "").toLowerCase();
    if (urgency === "immediate" || score >= 75) return "1";
    if (urgency === "high" || score >= 50) return "2";
    if (score >= 25 || item.impact_assessment) return "3";
    return "4";
  }

  function storyImpact(item: NewsItem) {
    const impact = newsImpactLabel(item.impact_assessment);
    if (impact) {
      return [impact.eventType, impact.score ? `${impact.score}` : "", impact.direction].filter(Boolean).join(" / ");
    }
    return displayLabel(item.competition || item.entity_name || item.sport, "Monitor");
  }

  function storyBody(item: NewsItem) {
    return cleanText(item.impact_assessment?.trading_note || item.analysis_text || item.display_summary || item.summary || item.title);
  }

  function rowTime(row: Pick<TwitterNewsRow, "published_at" | "discovered_at">) {
    return compactPublishedLabel(newsDisplayTimestamp(row));
  }

  function twitterUrgency(row: TwitterNewsRow) {
    const score = Number(row.impact_score || 0);
    const urgency = String(row.urgency || "").toLowerCase();
    if (urgency === "immediate" || score >= 75) return "1";
    if (urgency === "high" || score >= 50) return "2";
    if (urgency === "medium" || score >= 25) return "3";
    return "4";
  }

  function cleanSocialText(value: string | null | undefined) {
    return cleanText(value)
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/\bpic\.twitter\.com\/\S+/gi, "")
      .replace(/\s+#/g, " #")
      .replace(/\s+/g, " ")
      .trim();
  }

  function twitterSummary(row: TwitterNewsRow) {
    const reason = cleanSocialText(row.reason);
    const text = cleanSocialText(row.text);
    const type = displayLabel(row.news_type, "update").toLowerCase();
    const score = Number(row.impact_score || 0);
    if (reason && !/^no clear market-moving phrase/i.test(reason)) {
      return `${displayLabel(row.account_handle || row.author_name, "Twitter/X")} ${type}: ${reason}`;
    }
    if (score >= 40) return `${displayLabel(row.account_handle || row.author_name, "Twitter/X")} ${type}: ${text}`;
    return text;
  }

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadNewsFeed() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "160", include_context: "1" });
        if (sport !== "all") params.set("sport", apiSportValue(sport));
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/news?${params.toString()}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(payload.items)) {
          throw new Error(payload.message || payload.detail || "News feed unavailable");
        }
        if (!cancelled) {
          setItems((current) => mergeNewsItems(payload.items as NewsItem[], current).slice(0, 180));
          setError("");
        }
      } catch (err) {
        if (!cancelled && !controller.signal.aborted) setError(err instanceof Error ? err.message : "News feed unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadNewsFeed();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [sport, query]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadTwitterNews() {
      if (feedMode === "sites") return;
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "160" });
        if (sport !== "all") params.set("sport", apiSportValue(sport));
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/twitter-news?${params.toString()}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(payload.rows)) throw new Error(payload.message || payload.detail || "Twitter/X feed unavailable");
        if (!cancelled) {
          setTwitterRows(payload.rows as TwitterNewsRow[]);
          setError("");
        }
      } catch (err) {
        if (!cancelled && !controller.signal.aborted) setError(err instanceof Error ? err.message : "Twitter/X feed unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTwitterNews();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [feedMode, sport, query]);

  useEffect(() => {
    const token = window.localStorage.getItem("sportsedge.auth.token");
    let closedByEffect = false;

    function clearReconnect() {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function subscribe(socket: WebSocket) {
      socket.send(JSON.stringify({
        type: "subscribe",
        channel: "news",
        filters: sportRef.current === "all" ? {} : { sport: apiSportValue(sportRef.current) }
      }));
    }

    function connect() {
      clearReconnect();
      if (!token) {
        setSocketStatus("waiting");
        return;
      }
      setSocketStatus("connecting");
      const socket = new WebSocket(sportsEdgeWsUrl(token));
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setSocketStatus("live");
        subscribe(socket);
      });

      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type !== "news.item" || !message.payload) return;
          const item = { ...(message.payload as NewsItem), isNew: true };
          if (sportRef.current !== "all" && !sportMatchesNewsFilter(item.sport, sportRef.current)) return;
          setItems((current) => mergeNewsItems([item], current).slice(0, 180));
        } catch {
          // Keep the feed alive if one socket payload is malformed.
        }
      });

      socket.addEventListener("close", () => {
        if (closedByEffect) return;
        setSocketStatus("offline");
        reconnectTimerRef.current = window.setTimeout(connect, 2500);
      });

      socket.addEventListener("error", () => setSocketStatus("offline"));
    }

    connect();
    return () => {
      closedByEffect = true;
      clearReconnect();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
      type: "subscribe",
      channel: "news",
      filters: sport === "all" ? {} : { sport: apiSportValue(sport) }
    }));
  }, [sport]);

  const stories = useMemo(() => {
    const socialStories = twitterRows
        .filter((row) => sport === "all" || normalizeSport(row.sport) === normalizeSport(apiSportValue(sport)))
        .map((row) => ({
          id: `twitter:${row.tweet_id}`,
          kind: "social",
          twitter: row,
          time: rowTime(row),
          exactTime: exactPublishedLabel(row),
          sortTime: newsDisplayTimestamp(row).date?.getTime() || 0,
          tag: (row.account_handle || row.sport || "X").replace(/^@/, "").slice(0, 8).toUpperCase(),
          urgency: twitterUrgency(row),
          source: "SOCIAL",
          headline: cleanSocialText(row.text) || cleanSocialText(row.analysis_text),
          rawType: row.news_type || "",
          rawScore: Number(row.impact_score || 0),
          impact: [row.news_type, row.impact_score ? `${row.impact_score}` : "", row.direction].filter(Boolean).join(" / ") || "Monitor",
          body: twitterSummary(row)
        }));
    const mediaStories = uniqueNewsItems(items)
        .filter((item) => sport === "all" || sportMatchesNewsFilter(item.sport, sport))
        .filter((item) => !isSocialNewsItem(item))
        .map((item) => ({
          id: item.id || newsFingerprint(item),
          kind: "media",
          item,
          time: storyTime(item),
          exactTime: exactPublishedLabel(item),
          sortTime: newsDisplayTimestamp(item).date?.getTime() || 0,
          tag: storyTag(item),
          urgency: storyUrgency(item),
          source: displayLabel(item.source_name || item.source_type, "SE NEWS").toUpperCase().slice(0, 18),
          headline: cleanText(item.title),
          rawType: [item.source_type, item.entity_type, item.impact_assessment?.event_type].filter(Boolean).join(" "),
          rawScore: Number(item.impact_assessment?.impact_score || 0),
          impact: storyImpact(item),
          body: storyBody(item)
        }));
    const merged = feedMode === "twitter" ? socialStories : feedMode === "sites" ? mediaStories : [...socialStories, ...mediaStories];
    return merged
      .filter((story) => {
        const text = `${story.rawType} ${story.headline} ${story.impact}`.toLowerCase();
        if (intelligenceView === "impact") return story.rawScore >= 50 || story.urgency === "1" || story.urgency === "2";
        if (intelligenceView === "official") return text.includes("official") || text.includes("club") || text.includes("league");
        if (intelligenceView === "rumours") return text.includes("rumour") || text.includes("rumor") || text.includes("transfer");
        if (intelligenceView === "lineups") return text.includes("lineup") || text.includes("squad") || text.includes("team_news");
        if (intelligenceView === "injuries") return text.includes("injur") || text.includes("fitness") || text.includes("doubtful");
        if (intelligenceView === "transfers") return text.includes("transfer") || text.includes("sign") || text.includes("contract");
        return true;
      })
      .sort((a, b) => b.sortTime - a.sortTime || b.rawScore - a.rawScore)
      .slice(0, 220);
  }, [feedMode, intelligenceView, items, sport, twitterRows]);

  useEffect(() => {
    if (!stories.length) return;
    if (!selectedId || !stories.some((story) => story.id === selectedId)) setSelectedId(stories[0].id);
  }, [selectedId, stories]);

  const selected = stories.find((story) => story.id === selectedId) || stories[0];

  return (
    <>
      <SportsEdgeTopbar active="news" onSearchChange={setQuery} searchPlaceholder="NEWS, ARS, EPL, PLAYER: SAKA, MATCH: ARS-TOT..." />
      <main className="agtest-page bb-news-page">
        <section className="agtest-subbar bb-demo-subbar" aria-label="News feed controls">
          <nav aria-label="News feed modes">
            <button className={feedMode === "all" ? "active" : ""} type="button" onClick={() => setFeedMode("all")}>All</button>
            <button className={feedMode === "sites" ? "active" : ""} type="button" onClick={() => setFeedMode("sites")}>Media</button>
            <button className={feedMode === "twitter" ? "active" : ""} type="button" onClick={() => setFeedMode("twitter")}>Social</button>
            {NEWS_FEED_SPORT_FILTERS.map(([value, label]) => (
              <button className={sport === value ? "active" : ""} type="button" key={value} onClick={() => setSport(value)}>
                {label}
              </button>
            ))}
          </nav>
          <div>
            <span>{stories.length}{query.trim() ? ` / ${feedMode === "twitter" ? twitterRows.length : feedMode === "sites" ? items.length : twitterRows.length + items.length}` : ""} headlines</span>
            <span>{sport === "all" ? "all sports" : sport}</span>
            <span>{feedMode === "twitter" ? "social" : feedMode === "sites" ? "media" : "all feeds"}</span>
          </div>
        </section>
        <div className="bb-news-layout">
          <aside className="bb-news-filters">
            <strong>News Functions</strong>
            {[
              ["top", "Top"],
              ["impact", "High Impact"],
              ["official", "Official"],
              ["rumours", "Rumours"],
              ["lineups", "Lineups"],
              ["injuries", "Injuries"],
              ["transfers", "Transfers"],
              ["alerts", "Alerts"],
              ["saved", "Saved"]
            ].map(([value, label]) => (
              <button className={intelligenceView === value ? "active" : ""} type="button" key={value} onClick={() => setIntelligenceView(value)}>
                {label}
              </button>
            ))}
            <div className="bb-news-filter-card">
              <span>Live Feed</span>
              <b>{loading ? "Loading" : error ? "Needs attention" : "Connected"}</b>
              <em>{error || "One intelligence tape ranked from media and social sources."}</em>
            </div>
          </aside>

          <section className="bb-news-tape" aria-label="Bloomberg style news headline tape">
            <div className="bb-news-tape-head">
              <span>Age / ES Time</span>
              <span>Tag</span>
              <span>U</span>
              <span>Source</span>
              <span>Headline</span>
              <span>Market Impact</span>
            </div>
            {loading && stories.length === 0 && <div className="bb-news-state">Loading SportsEdge news feed.</div>}
            {error && stories.length === 0 && <div className="bb-news-state error">{error}</div>}
            {stories.map((story) => (
              <button className={story.id === selected.id ? "selected" : ""} type="button" key={story.id} onClick={() => setSelectedId(story.id)}>
                <time title={story.exactTime}>{story.time}</time>
                <b>{story.tag}</b>
                <i className={`urgency u${story.urgency}`}>{story.urgency}</i>
                <span>{story.source}</span>
                <strong>{story.headline}</strong>
                <em>{story.impact}</em>
              </button>
            ))}
            {!loading && !error && stories.length === 0 && <div className="bb-news-state">No real news matched the current filter.</div>}
          </section>

          <aside className="bb-news-detail">
            {selected ? (
              <>
                <div className="bb-news-detail-head">
                  <span>{selected.source}</span>
                  <b>{selected.exactTime}</b>
                </div>
                <h1>{selected.headline}</h1>
                <div className="bb-news-impact">
                  <span>SportsEdge Impact</span>
                  <strong>{selected.impact}</strong>
                </div>
                <p>{selected.body}</p>
                <table>
                  <tbody>
                    <tr>
                      <th>Original</th>
                      <td>
                        {selected.twitter?.url || selected.item?.external_url || selected.item?.canonical_url || selected.item?.source_url ? (
                          <a className="bb-news-source-link" href={selected.twitter?.url || selected.item?.external_url || selected.item?.canonical_url || selected.item?.source_url || "#"} target="_blank" rel="noreferrer">
                            {selected.twitter ? `@${selected.twitter.account_handle || selected.twitter.author_name || "source"}` : selected.item?.source_name || selected.source}
                          </a>
                        ) : (
                          selected.source
                        )}
                      </td>
                    </tr>
                    <tr><th>Published</th><td>{selected.exactTime}</td></tr>
                    <tr><th>Linked markets</th><td>{selected.item?.impact_assessment?.affected_markets?.join(", ") || selected.twitter?.affected_entity || displayLabel(selected.item?.competition, "Market watch")}</td></tr>
                    <tr><th>Entities</th><td>{selected.twitter ? [selected.twitter.account_handle, selected.twitter.sport, selected.twitter.news_type].filter(Boolean).join(", ") : [selected.item?.entity_name, selected.item?.competition, selected.item?.sport].filter(Boolean).join(", ") || selected.tag}</td></tr>
                    <tr><th>Action</th><td>{selected.item?.impact_assessment?.watch_items?.join(", ") || selected.twitter?.reason || "Keep headline visible in rail and update confidence, not raw venue columns."}</td></tr>
                  </tbody>
                </table>
              </>
            ) : (
              <div className="bb-news-state">Select a headline to inspect the real SportsEdge item.</div>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}

function BloombergProfileMockupPage() {
  const [profileMode, setProfileMode] = useState<"team" | "player">("team");
  const teamKpis = [
    ["SE Rating", "82.4", "+1.8", "bb-pos"],
    ["Market Bias", "Home pressure", "+2.1%", "bb-pos"],
    ["Liquidity", "GBP 4.8m", "5 venues", ""],
    ["News Impact", "Lineup +72", "11m fresh", "bb-pos"],
    ["Confidence", "86", "stable", ""]
  ];
  const playerKpis = [
    ["SE Rating", "88.1", "+2.4", "bb-pos"],
    ["Prop Bias", "Assist lean", "+4.0%", "bb-pos"],
    ["Minutes", "82 est", "starts 86%", ""],
    ["News Impact", "Training +64", "9m fresh", "bb-pos"],
    ["Risk", "Low", "fitness clear", ""]
  ];
  const markets = [
    ["ARS-TOT", "Match Odds", "Arsenal", "2.04", "2.01", "+1.5%", "GBP 1.42m", "84", "LINEUP"],
    ["ARS-TOT", "Asian Handicap", "Arsenal -0.5", "2.08", "2.03", "+2.5%", "GBP 620k", "78", "SHARP"],
    ["ARS-TOT", "Total Goals", "Over 2.5", "1.74", "1.70", "+2.4%", "GBP 774k", "69", "TOTALS"],
    ["ARS-NEW", "Match Odds", "Arsenal", "1.62", "1.59", "+1.9%", "GBP 580k", "73", "WATCH"]
  ];
  const playerMarkets = [
    ["ARS-TOT", "Player Assist", "Bukayo Saka", "3.35", "3.22", "+4.0%", "GBP 184k", "76", "TRAIN"],
    ["ARS-TOT", "Anytime Goal", "Bukayo Saka", "3.10", "3.18", "-2.5%", "GBP 240k", "71", "PRICE"],
    ["ARS-TOT", "Shots On Target", "Saka 1+", "1.82", "1.77", "+2.8%", "GBP 96k", "68", "PROP"],
    ["ARS-NEW", "Player Assist", "Bukayo Saka", "3.55", "3.41", "+4.1%", "GBP 72k", "62", "EARLY"]
  ];
  const squad = [
    ["Bukayo Saka", "RW", "88.1", "+4.0%", "86%", "Fit", "Assist"],
    ["Martin Odegaard", "AM", "84.6", "+1.7%", "91%", "Fit", "Key pass"],
    ["Declan Rice", "DM", "81.8", "+0.9%", "94%", "Fit", "Control"],
    ["Gabriel", "CB", "78.4", "-0.4%", "88%", "Watch", "Cards"],
    ["Kai Havertz", "FW", "76.9", "+1.2%", "74%", "Rotate", "Goal"]
  ];
  const stats = [
    ["Premier League", "32", "16", "9", "7.42", "2.7", "4.0%", "86%"],
    ["Champions League", "10", "4", "3", "7.31", "2.3", "2.6%", "79%"],
    ["All Competitions", "44", "22", "13", "7.39", "2.6", "3.8%", "84%"]
  ];
  const news = [
    ["23:22", "ARS", "Saka pictured in full training; assist market firms"],
    ["23:17", "EPL", "Fixture congestion model raises Arsenal rotation watch"],
    ["23:09", "TOT", "Spurs defensive injuries keep home pressure elevated"],
    ["22:58", "SOCIAL", "Lineup accounts converge on unchanged Arsenal front three"],
    ["22:44", "MEDIA", "Club notes confirm no late attacking absence"]
  ];
  const leftItems = profileMode === "team"
    ? ["Overview", "Market Picture", "Squad", "Fixtures", "News", "Diagnostics", "Alerts", "Saved"]
    : ["Overview", "Props", "Stats", "Fitness", "Team Link", "News", "Diagnostics", "Alerts"];
  const activeMarkets = profileMode === "team" ? markets : playerMarkets;
  const activeKpis = profileMode === "team" ? teamKpis : playerKpis;

  return (
    <>
      <SportsEdgeTopbar active="profile-mockup" searchPlaceholder="TEAM: ARSENAL, PLAYER: SAKA, NEWS, PROPS, DIAGNOSTICS..." />
      <main className="agtest-page bb-profile-page">
        <section className="agtest-subbar bb-demo-subbar" aria-label="Profile mockup controls">
          <nav aria-label="Profile type">
            <button className={profileMode === "team" ? "active" : ""} type="button" onClick={() => setProfileMode("team")}>Team</button>
            <button className={profileMode === "player" ? "active" : ""} type="button" onClick={() => setProfileMode("player")}>Player</button>
            <button type="button">Markets</button>
            <button type="button">News</button>
            <button type="button">Diagnostics</button>
          </nav>
          <div>
            <span>{profileMode === "team" ? "TEAM: ARSENAL" : "PLAYER: SAKA"}</span>
            <span>Football / Premier League</span>
            <span>SportsEdge profile</span>
          </div>
        </section>

        <div className="bb-profile-layout">
          <aside className="bb-news-filters">
            <strong>Profile Functions</strong>
            {leftItems.map((item, index) => (
              <button className={index === 0 ? "active" : ""} type="button" key={item}>{item}</button>
            ))}
            <div className="bb-news-filter-card">
              <span>Context</span>
              <b>{profileMode === "team" ? "Arsenal / EPL" : "Bukayo Saka / Arsenal"}</b>
              <em>Profile as a live market object, not a static biography.</em>
            </div>
          </aside>

          <section className="bb-profile-main">
            <div className="bb-profile-identity">
              <div className="bb-profile-badge">
                {profileMode === "team" ? <img src="https://resources.premierleague.com/premierleague/badges/70/t3.png" alt="Arsenal crest" /> : <span>BS</span>}
              </div>
              <div>
                <span>{profileMode === "team" ? "ARS LN / FOOTBALL TEAM" : "SAKA / PLAYER PROP OBJECT"}</span>
                <h1>{profileMode === "team" ? "Arsenal FC" : "Bukayo Saka"}</h1>
                <p>{profileMode === "team" ? "England / Premier League / Emirates Stadium / next: Tottenham" : "Arsenal / Right Wing / England / next: Tottenham"}</p>
              </div>
              <div className="bb-profile-score">
                <span>SportsEdge Fair</span>
                <strong>{profileMode === "team" ? "2.04" : "3.35"}</strong>
                <em className="bb-pos">{profileMode === "team" ? "+1.5% edge" : "+4.0% assist edge"}</em>
              </div>
            </div>

            <div className="bb-profile-kpis">
              {activeKpis.map(([label, value, delta, className]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <em className={className}>{delta}</em>
                </div>
              ))}
            </div>

            <div className="bb-demo-strip"><span>SportsEdge Picture</span><strong>{profileMode === "team" ? "Arsenal live market surface" : "Bukayo Saka player prop surface"}</strong><em>Consensus, confidence and flags first.</em></div>
            <table className="bb-demo-table bb-profile-market-table">
              <thead><tr>{["Code", "Market", "Selection", "SE Fair", "Mkt", "Edge", "Liquidity", "Conf", "Flag"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
              <tbody>
                {activeMarkets.map((row) => (
                  <tr key={`${row[0]}-${row[1]}-${row[2]}`}>
                    {row.map((cell, index) => (
                      <td className={index === 5 ? (cell.startsWith("+") ? "bb-pos bb-mono" : "bb-neg bb-mono") : index >= 3 ? "bb-mono" : ""} key={`${cell}-${index}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bb-profile-grid">
              <section>
                <div className="bb-demo-strip"><span>{profileMode === "team" ? "Squad Lens" : "Season Lens"}</span><strong>{profileMode === "team" ? "Players ranked by market relevance" : "Production, price and minutes context"}</strong><em>Expandable rows.</em></div>
                <table className="bb-demo-table compact">
                  <thead><tr>{(profileMode === "team" ? ["Player", "Pos", "SE Rt", "Edge", "Start", "Status", "Flag"] : ["Competition", "Apps", "Goals", "Assists", "Rating", "Shots", "Edge", "Start"]).map((item) => <th key={item}>{item}</th>)}</tr></thead>
                  <tbody>
                    {(profileMode === "team" ? squad : stats).map((row) => (
                      <tr key={row.join("-")}>{row.map((cell, index) => <td className={index >= 2 ? "bb-mono" : ""} key={`${cell}-${index}`}>{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section>
                <div className="bb-demo-strip"><span>Diagnostics</span><strong>{profileMode === "team" ? "Why Arsenal moved" : "Why Saka moved"}</strong><em>One layer down.</em></div>
                <div className="bb-profile-diagnostics">
                  <div><span>Model Drivers</span><strong>{profileMode === "team" ? "Lineup strength, home pressure, opponent injuries" : "Training signal, projected minutes, chance creation"}</strong></div>
                  <div><span>Data Freshness</span><strong>Prices 12s / News 9m / Team sheet est 84m</strong></div>
                  <div><span>Flags</span><strong className="bb-flag">{profileMode === "team" ? "LINEUP / SHARP / SOCIAL" : "TRAIN / PROP / SOCIAL"}</strong></div>
                  <div><span>Raw Venues</span><strong>Betfair, Matchbook, SX, Polymarket hidden until opened</strong></div>
                </div>
              </section>
            </div>
          </section>

          <aside className="bb-demo-news">
            <div className="bb-demo-news-head"><strong>Intelligence</strong><span>{profileMode === "team" ? "ARSENAL" : "SAKA"}</span></div>
            {news.map((item) => <article key={`${item[0]}-${item[1]}-${item[2]}`}><time>{item[0]}</time><b>{item[1]}</b><p>{item[2]}</p></article>)}
          </aside>
        </div>
      </main>
    </>
  );
}

function TodayDashboardMockupPage() {
  const sportRows = [
    ["Football", "42", "18", "GBP 8.42m", "12s", "Lineups, injuries", "+3"],
    ["Tennis", "31", "9", "GBP 2.18m", "18s", "Retirement watch", "+1"],
    ["Basketball", "14", "6", "GBP 1.74m", "22s", "Team news", "0"],
    ["Baseball", "16", "7", "GBP 1.29m", "31s", "Pitchers confirmed", "0"],
    ["Golf", "8", "3", "GBP 840k", "44s", "Round markets", "+2"],
    ["Racing", "56", "24", "GBP 3.66m", "9s", "Going changes", "+4"]
  ];
  const eventRows = [
    ["19:45", "ARS-TOT", "Football", "Match Odds", "GBP 1.42m", "84", "LINEUP"],
    ["20:00", "CHE-MCI", "Football", "Match Odds", "GBP 2.31m", "91", "SHARP"],
    ["18:30", "Sinner v Alcaraz", "Tennis", "Moneyline", "GBP 620k", "78", "LIVE"],
    ["21:05", "Lakers v Knicks", "Basketball", "Spread", "GBP 510k", "73", "TEAM NEWS"],
    ["22:10", "Yankees v Red Sox", "Baseball", "Moneyline", "GBP 430k", "69", "PITCHERS"],
    ["Today", "Ascot R4", "Racing", "Win", "GBP 290k", "64", "GOING"]
  ];
  const alerts = [
    ["10:42", "FOOTBALL", "Arsenal lineup sensitivity elevated before London derby"],
    ["10:38", "TENNIS", "Liquidity building on Sinner-Alcaraz moneyline"],
    ["10:31", "RACING", "Going update pushed two Ascot markets into watch"],
    ["10:26", "MEDIA", "Official team-news windows opening for evening fixtures"],
    ["10:19", "SOCIAL", "Basketball beat reporters flag questionable starters"]
  ];

  return (
    <>
      <SportsEdgeTopbar active="today-demo" searchPlaceholder="TODAY, FOOTBALL, TENNIS, LIQUIDITY, NEWS, ALERTS..." />
      <main className="agtest-page bb-today-page">
        <section className="agtest-subbar bb-demo-subbar" aria-label="Today dashboard controls">
          <nav aria-label="Today views">
            {["Today", "Live", "Upcoming", "Liquidity", "Alerts", "Diagnostics"].map((item, index) => (
              <button className={index === 0 ? "active" : ""} type="button" key={item}>{item}</button>
            ))}
          </nav>
          <div>
            <span>Client login view</span>
            <span>Demo data</span>
            <span>SportsEdge today</span>
          </div>
        </section>

        <div className="bb-today-layout">
          <aside className="bb-news-filters">
            <strong>Market Menu</strong>
            {["All Sports", "High Liquidity", "Starting Soon", "Live Now", "My Watchlist", "Sharp Moves", "News Alerts", "Saved Screens"].map((item, index) => (
              <button className={index === 0 ? "active" : ""} type="button" key={item}>{item}</button>
            ))}
            <div className="bb-news-filter-card">
              <span>Session</span>
              <b>Today Overview</b>
              <em>First screen after login: where money and attention are concentrated now.</em>
            </div>
          </aside>

          <section className="bb-today-main">
            <div className="bb-today-hero">
              <div>
                <span>SportsEdge Today</span>
                <h1>What is on, what is liquid, what needs attention</h1>
              </div>
              <div className="bb-today-clock">
                <span>As of</span>
                <strong>10:45</strong>
                <em>prices 9-44s fresh</em>
              </div>
            </div>

            <div className="bb-profile-kpis bb-today-kpis">
              {[
                ["Sports Active", "6", "today"],
                ["Events Tracked", "167", "live + upcoming"],
                ["Linked Liquidity", "GBP 18.1m", "demo"],
                ["High Impact Alerts", "10", "+4 last hour"],
                ["Feed Health", "Live", "WSS + API"]
              ].map(([label, value, delta]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <em>{delta}</em>
                </div>
              ))}
            </div>

            <div className="bb-demo-strip"><span>Sports On Today</span><strong>Liquidity and attention by sport</strong><em>Rows open sport dashboards.</em></div>
            <table className="bb-demo-table bb-today-sports-table">
              <thead><tr>{["Sport", "Events", "Liquid", "Liquidity", "Fresh", "Market Focus", "Alerts"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
              <tbody>
                {sportRows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, index) => (
                      <td className={index === 3 || index === 4 ? "bb-mono" : index === 6 && cell !== "0" ? "bb-flag" : ""} key={`${cell}-${index}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bb-demo-strip"><span>Top Markets</span><strong>Largest available liquidity now and next</strong><em>SportsEdge fair fields appear when linked.</em></div>
            <table className="bb-demo-table bb-today-events-table">
              <thead><tr>{["Time", "Code", "Sport", "Market", "Liquidity", "Conf", "Flag"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
              <tbody>
                {eventRows.map((row) => (
                  <tr key={`${row[1]}-${row[3]}`}>
                    {row.map((cell, index) => (
                      <td className={index >= 4 ? "bb-mono" : index === 6 ? "bb-flag" : ""} key={`${cell}-${index}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <aside className="bb-demo-news bb-profile-news-rail">
            <div className="bb-demo-news-head"><strong>Intelligence</strong><span>TODAY</span></div>
            {alerts.map((item) => <article key={`${item[0]}-${item[1]}`}><time>{item[0]}</time><b>{item[1]}</b><p>{item[2]}</p></article>)}
          </aside>
        </div>
      </main>
    </>
  );
}

type ProfileBreadcrumbItem = { label: string; href?: string };

function ProfileBreadcrumbs({ items }: { items: ProfileBreadcrumbItem[] }) {
  return (
    <nav className="profile-breadcrumbs football-region-breadcrumb" aria-label="Profile breadcrumb">
      {items.map((item, index) => (
        <Fragment key={`${item.href || "current"}-${item.label}-${index}`}>
          {item.href ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>}
          {index < items.length - 1 && <span>/</span>}
        </Fragment>
      ))}
    </nav>
  );
}

function ProfileBreadcrumbStrip({ items }: { items: ProfileBreadcrumbItem[] }) {
  return (
    <section className="football-region-strip profile-region-strip" aria-label="Profile navigation">
      <ProfileBreadcrumbs items={items} />
    </section>
  );
}

function storySourceTag(item: NewsItem) {
  const source = item.source_name || item.source_type || item.sport || "NEWS";
  const words = cleanText(source).split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map((word) => word[0]).join("").slice(0, 6).toUpperCase();
  return cleanText(source).replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "NEWS";
}

function ProfileTextNewsRail({ sport = "football", label, query = "" }: { sport?: string; label: string; query?: string }) {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "32", include_context: "1" });
    if (sport !== "all") params.set("sport", apiSportValue(sport));
    if (query.trim()) params.set("q", query.trim());
    fetch(`/api/news?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(payload.items)) throw new Error("News unavailable");
        setItems(payload.items);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setItems([]);
      });
    return () => controller.abort();
  }, [sport, query]);

  return (
    <aside className="bb-demo-news bb-profile-news-rail" aria-label="Profile intelligence rail">
      <div className="bb-demo-news-head"><strong>Intelligence</strong><span>{label}</span></div>
      {items.map((item) => (
        <article key={`profile-news-${item.id}`}>
          <time>{formatTimeAgo(item.published_at || item.discovered_at)}</time>
          <b>{storySourceTag(item)}</b>
          <p>{cleanText(item.title)}</p>
        </article>
      ))}
      {items.length === 0 && (
        <div className="bb-news-state">No matched news yet.</div>
      )}
    </aside>
  );
}

function FootballProfileShell({
  breadcrumbs,
  newsLabel,
  newsQuery,
  mode = "team",
  contextLabel,
  children
}: {
  breadcrumbs: ProfileBreadcrumbItem[];
  newsLabel: string;
  newsQuery: string;
  mode?: "team" | "player";
  contextLabel?: string;
  children: ReactNode;
}) {
  const functions = mode === "team"
    ? ["Overview", "Market Picture", "Squad", "Fixtures", "News", "Diagnostics", "Alerts", "Saved"]
    : ["Overview", "Props", "Stats", "Fitness", "Team Link", "News", "Diagnostics", "Alerts"];

  return (
    <main className="agtest-page bb-profile-page">
      <SportsEdgeTopbar active="football" searchPlaceholder="TEAM: ARSENAL, PLAYER: SAKA, NEWS, PROPS, DIAGNOSTICS..." />
      <section className="agtest-subbar bb-demo-subbar profile-command-subbar" aria-label="Profile navigation">
        <nav aria-label="Profile breadcrumb">
          {breadcrumbs.map((item, index) => item.href ? (
            <button type="button" key={`${item.label}-${index}`} onClick={() => { window.location.hash = item.href || "#dashboard"; }}>{item.label}</button>
          ) : (
            <button className="active" type="button" key={`${item.label}-${index}`}>{item.label}</button>
          ))}
        </nav>
        <div>
          <span>{mode === "team" ? "Team profile" : "Player profile"}</span>
          <span>{contextLabel || newsLabel}</span>
          <span>SportsEdge picture</span>
        </div>
      </section>
      <div className="bb-profile-layout">
        <aside className="bb-news-filters">
          <strong>Profile Functions</strong>
          {functions.map((item, index) => (
            <button className={index === 0 ? "active" : ""} type="button" key={item}>{item}</button>
          ))}
          <div className="bb-news-filter-card">
            <span>Context</span>
            <b>{contextLabel || newsLabel}</b>
            <em>Live profile object: identity, stats, news and market readiness.</em>
          </div>
        </aside>
        <section className="bb-profile-main">
          {children}
        </section>
        <ProfileTextNewsRail sport="football" label={newsLabel} query={newsQuery} />
      </div>
    </main>
  );
}

function TeamProfilePage({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<FootballTeamProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/football/teams/${encodeURIComponent(slug)}/profile`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.detail || "Team profile unavailable");
        setProfile(payload.profile || null);
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") setError(fetchError.message || "Team profile unavailable");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [slug]);

  const routeTeamName = decodeURIComponent(slug).replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const name = profile?.asset?.fullName || profile?.name || routeTeamName || "Team";
  const shortName = profile?.asset?.shortName || profile?.name || routeTeamName || "Team";
  const logoUrl = profile?.asset?.logoUrl || profile?.logoUrl || teamLogoUrl(name);
  const venue = profile?.venue;
  const venueName = venue?.name || "Home venue";
  const venueAddress = [venue?.address, venue?.city].filter(Boolean).join(", ") || venue?.city || "Address unavailable";
  const venueCapacity = venue?.capacity ? `${venue.capacity.toLocaleString()} capacity` : "";
  const teamCode = profile?.asset?.ticker || profile?.code || teamTicker(name);
  const venueFacts = [
    { label: "Venue", value: venueName },
    { label: "Address", value: [venueAddress, venueCapacity].filter(Boolean).join(" / "), wide: true },
    { label: "Code", value: teamCode }
  ];
  const profileStats = [
    ["Code", teamCode],
    ["Country", profile?.country || "-"],
    ["League", profile?.asset?.currentLeague || "-"],
    ["Founded", profile?.founded || "-"],
    ["Provider ID", profile?.providerTeamId || "-"],
    ["Synced", profile?.syncedAt ? formatTimeAgo(profile.syncedAt) : "seeded"]
  ];
  const marketContext = [
    ["Primary markets", "Match odds, totals, handicap"],
    ["Matrix role", "Football consensus + venue alignment"],
    ["News sensitivity", "Transfers, injuries, lineups, manager comments"],
    ["Profile source", "API-Football cache + SportsEdge team registry"]
  ];
  const aliases = Array.from(new Set((profile?.asset?.aliases?.length ? profile.asset.aliases : [name, shortName, teamCode]).filter(Boolean)));
  const squadRows = profile?.squad || [];
  const staffRows = profile?.staff || [];
  const statRowCount = squadRows.reduce((sum, player) => sum + (player.stats?.length || 0), 0);
  const profileStatus = loading ? "Loading" : error ? "Needs attention" : profile ? "Enriched" : "Waiting";
  const enrichedFreshness = profile?.syncedAt ? formatTimeAgo(profile.syncedAt) : profile ? "seeded" : "not enriched";
  const enrichedRows = [
    ["Team Identity", name, profile ? "Enriched" : "Waiting", profile?.provider || "api-football", enrichedFreshness, "High", "PROFILE"],
    ["Squad", `${squadRows.length} players`, squadRows.length ? "Enriched" : "Waiting", "api-football", enrichedFreshness, squadRows.length ? "High" : "Pending", "SQUAD"],
    ["Staff", `${staffRows.length} staff`, staffRows.length ? "Enriched" : "Waiting", "api-football", enrichedFreshness, staffRows.length ? "Medium" : "Pending", "STAFF"],
    ["Stats", `${statRowCount} rows`, statRowCount ? "Enriched" : "Waiting", "api-football", enrichedFreshness, statRowCount ? "Medium" : "Pending", "STATS"],
    ["Market Link", "SportsEdge fair", "Waiting", "matrix", "not linked", "Pending", "NO FAKE PRICE"]
  ];

  return (
    <FootballProfileShell
      breadcrumbs={[
        { label: "All", href: "#dashboard" },
        { label: "Football", href: "#football" },
        { label: name }
      ]}
      newsLabel={`${name.toUpperCase()} NEWS`}
      newsQuery={name}
      mode="team"
      contextLabel={`${profile?.country || "Football"} / ${profile?.asset?.currentLeague || venueName}`}
    >
      <div className="bb-profile-identity">
        <div className="bb-profile-badge">
          {logoUrl ? <img src={logoUrl} alt={`${shortName} crest`} /> : <span>{teamTicker(name)}</span>}
        </div>
        <div>
          <span>{teamCode} / FOOTBALL TEAM</span>
          <h1>{name}</h1>
          <p>{[profile?.country, profile?.asset?.currentLeague, venueName].filter(Boolean).join(" / ") || "Football profile"}</p>
        </div>
        <div className="bb-profile-score">
          <span>Profile Status</span>
          <strong>{profileStatus}</strong>
          <em className={profile ? "bb-pos" : ""}>{enrichedFreshness}</em>
        </div>
      </div>

      <div className="bb-profile-kpis">
        {[
          ["Players", `${squadRows.length}`, squadRows.length ? "enriched" : "waiting"],
          ["Staff", `${staffRows.length}`, staffRows.length ? "enriched" : "waiting"],
          ["Stat Rows", `${statRowCount}`, statRowCount ? "enriched" : "waiting"],
          ["Venue", venue?.name ? "Enriched" : "Waiting", venue?.city || "pending"],
          ["Market Data", "Waiting", "field reserved"]
        ].map(([label, value, delta]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <em className={String(delta).includes("enriched") ? "bb-pos" : ""}>{delta}</em>
          </div>
        ))}
      </div>

      {loading && <div className="bb-news-state">Loading team profile.</div>}
      {error && <div className="bb-news-state error">{error}</div>}

      <div className="bb-demo-strip"><span>SportsEdge Picture</span><strong>{name} profile enrichment surface</strong><em>Price fields remain reserved until real market data is linked.</em></div>
      <table className="bb-demo-table bb-profile-market-table">
        <thead><tr>{["Surface", "Object", "Status", "Source", "Fresh", "Conf", "Flag"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
        <tbody>
          {enrichedRows.map((row) => (
            <tr key={`${row[0]}-${row[1]}`}>
              {row.map((cell, index) => <td className={index >= 4 ? "bb-mono" : index === 6 ? "bb-flag" : ""} key={`${cell}-${index}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bb-profile-grid">
        <section>
          <div className="bb-demo-strip"><span>Squad Lens</span><strong>Players ranked by cached profile coverage</strong><em>{squadRows.length} rows.</em></div>
          <table className="bb-demo-table compact">
            <thead><tr>{["Player", "Pos", "Age", "Apps", "Mins", "Rating", "G+A", "Status"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
            <tbody>
              {squadRows.slice(0, 16).map((player) => {
                const latest = player.stats?.[0];
                return (
                  <tr key={player.id}>
                    <td><a className="bb-profile-table-link" href={`#player/${encodeURIComponent(player.id)}`}>{player.name}</a></td>
                    <td>{player.position || "-"}</td>
                    <td className="bb-mono">{player.age ?? "-"}</td>
                    <td className="bb-mono">{latest?.appearances ?? "-"}</td>
                    <td className="bb-mono">{latest?.minutes ?? "-"}</td>
                    <td className="bb-mono">{latest?.rating ?? "-"}</td>
                    <td className="bb-mono">{(latest?.goalsTotal ?? 0) + (latest?.assists ?? 0) || "-"}</td>
                    <td className={player.injured ? "bb-neg" : "bb-pos"}>{player.injured ? "Injury flag" : latest ? "Enriched" : "Waiting"}</td>
                  </tr>
                );
              })}
              {!squadRows.length && <tr><td colSpan={8}>Squad enrichment is waiting for this team.</td></tr>}
            </tbody>
          </table>
        </section>
        <section>
          <div className="bb-demo-strip"><span>Diagnostics</span><strong>Enrichment and market readiness</strong><em>Raw data one layer down.</em></div>
          <div className="bb-profile-diagnostics">
            <div><span>Venue</span><strong>{[venueName, venueAddress, venueCapacity].filter(Boolean).join(" / ") || "Waiting for venue enrichment"}</strong></div>
            <div><span>Aliases</span><strong>{aliases.join(", ") || "Waiting"}</strong></div>
            <div><span>Market Fields</span><strong>SE Fair, market price, edge, liquidity and confidence are reserved; values appear only when real market data is linked.</strong></div>
            <div><span>Provider</span><strong>{profile?.provider || "api-football"} / {profile?.providerTeamId || "waiting"}</strong></div>
          </div>
        </section>
      </div>
    </FootballProfileShell>
  );

  const content = (
    <div className="team-profile-page">
      <section
        className={`team-profile-hero${venue?.imageUrl ? " has-venue-image" : ""}`}
        style={venue?.imageUrl ? { backgroundImage: `linear-gradient(90deg, rgba(3, 5, 8, 0.94) 0%, rgba(3, 5, 8, 0.82) 42%, rgba(3, 5, 8, 0.56) 100%), linear-gradient(180deg, rgba(3, 5, 8, 0.2), rgba(3, 5, 8, 0.88)), url("${venue.imageUrl}")` } : undefined}
      >
        <div className="team-profile-title">
          <div className="team-profile-crest">
            {logoUrl ? <img src={logoUrl} alt={`${shortName} crest`} /> : <span>{teamTicker(name)}</span>}
          </div>
          <div className="team-profile-title-copy">
            <span>SportsEdge football profile</span>
            <h1>{name}</h1>
            <div className="team-profile-hero-facts" aria-label="Home venue details">
              {venueFacts.map((fact) => (
                <span className={fact.wide ? "wide" : ""} key={fact.label}>
                  <b>{fact.label}</b>
                  <strong>{fact.value}</strong>
                </span>
              ))}
            </div>
            <p>
              Canonical team identity, venue details, provider profile data, aliases, and
              market context ready to link into the Matrix and fixture pages.
            </p>
          </div>
        </div>
      </section>

      <section className="team-profile-grid">
        <article className="team-profile-panel main">
          <div className="team-profile-panel-head">
            <span>Team Details</span>
            <strong>{profile?.provider || "api-football"}</strong>
          </div>
          <div className="team-profile-stat-grid">
            {profileStats.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="team-profile-aliases">
            <span>Aliases</span>
            <div>
              {aliases.map((alias, index) => (
                <b key={`${alias}-${index}`}>{alias}</b>
              ))}
            </div>
          </div>
        </article>

        <article className="team-profile-panel context">
          <div className="team-profile-panel-head">
            <span>Trading Context</span>
            <strong>How SportsEdge uses it</strong>
          </div>
          <div className="team-profile-list">
            {marketContext.map(([label, value]) => (
              <span key={label}><b>{label}</b>{value}</span>
            ))}
          </div>
        </article>

        <article className="team-profile-panel staff">
          <div className="team-profile-panel-head">
            <span>Staff</span>
            <strong>{profile?.staff?.length || 0} cached</strong>
          </div>
          {profile?.staff?.length ? (
            <div className="team-profile-squad-grid staff-grid">
              {profile.staff.map((staff) => (
                <div key={staff.id}>
                  {staff.photoUrl ? <img src={staff.photoUrl} alt="" /> : <span>{teamInitials(staff.name)}</span>}
                  <strong>{staff.name}</strong>
                  <em>{staff.role || "Staff"} {staff.nationality ? `/ ${staff.nationality}` : ""}</em>
                </div>
              ))}
            </div>
          ) : (
            <p className="team-profile-empty">Staff sync is queued for this team.</p>
          )}
        </article>

        <article className="team-profile-panel squad">
          <div className="team-profile-panel-head">
            <span>Player Profiles</span>
            <strong>{profile?.squad?.length || 0} cached</strong>
          </div>
          {profile?.squad?.length ? (
          <div className="team-profile-squad-grid">
              {profile.squad.map((player) => (
                <a className="team-player-card" href={`#player/${encodeURIComponent(player.id)}`} key={player.id}>
                  <div className="team-player-card-head">
                    {player.photoUrl ? <img src={player.photoUrl} alt="" /> : <span>{teamInitials(player.name)}</span>}
                    <div>
                      <strong>{player.name}</strong>
                      <em>{player.position || "Player"} {player.number ? `#${player.number}` : ""}</em>
                    </div>
                  </div>
                  {player.stats?.[0] ? (
                    <div className="team-player-stat-strip">
                      <span><b>Season</b>{player.stats[0].season}</span>
                      <span><b>League</b>{player.stats[0].leagueName || "-"}</span>
                      <span><b>Apps</b>{player.stats[0].appearances ?? "-"}</span>
                      <span><b>Starts</b>{player.stats[0].lineups ?? "-"}</span>
                      <span><b>Mins</b>{player.stats[0].minutes ?? "-"}</span>
                      <span><b>Rating</b>{player.stats[0].rating ?? "-"}</span>
                      <span><b>Goals</b>{player.stats[0].goalsTotal ?? "-"}</span>
                      <span><b>Assists</b>{player.stats[0].assists ?? "-"}</span>
                      <span><b>Shots</b>{player.stats[0].shotsTotal ?? "-"}</span>
                      <span><b>Passes</b>{player.stats[0].passesTotal ?? "-"}</span>
                      <span><b>Tackles</b>{player.stats[0].tacklesTotal ?? "-"}</span>
                      <span><b>Duels</b>{player.stats[0].duelsTotal ?? "-"}</span>
                      <span><b>Dribbles</b>{player.stats[0].dribblesAttempts ?? "-"}</span>
                      <span><b>Fouls Won</b>{player.stats[0].foulsDrawn ?? "-"}</span>
                      <span><b>YC/RC</b>{player.stats[0].cardsYellow ?? "-"} / {player.stats[0].cardsRed ?? "-"}</span>
                      <span><b>Pens</b>{player.stats[0].penaltiesScored ?? "-"} / {player.stats[0].penaltiesMissed ?? "-"}</span>
                    </div>
                  ) : (
                    <div className="team-player-stat-empty">Stats queued</div>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <p className="team-profile-empty">
              Player profile sync is queued for this team.
            </p>
          )}
        </article>
      </section>
    </div>
  );

  return (
    <FootballProfileShell
      breadcrumbs={[
          { label: "All", href: "#dashboard" },
          { label: "Football", href: "#football" },
          { label: name }
      ]}
      newsLabel={`${name.toUpperCase()} NEWS`}
      newsQuery={name}
    >
      {content}
    </FootballProfileShell>
  );
}

function PlayerProfilePage({ id }: { id: string }) {
  const [profile, setProfile] = useState<FootballPlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/football/players/${encodeURIComponent(id)}/profile`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.detail || "Player profile unavailable");
        setProfile(payload.profile || null);
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") setError(fetchError.message || "Player profile unavailable");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id]);

  const name = profile?.name || "Player";
  const stats = profile?.stats || [];
  const latestStat = stats[0];
  const teamName = profile?.team?.name || "Team";
  const teamHref = profile?.team?.name ? `#team/${encodeURIComponent(profile.team.name)}` : "#football";
  const profileStats = [
    ["Position", profile?.position || latestStat?.position || "Player"],
    ["Nationality", profile?.nationality || "Unknown"],
    ["Age", profile?.age || "-"],
    ["Height", profile?.height || "-"],
    ["Weight", profile?.weight || "-"],
    ["Injury", profile?.injured ? "Flagged" : "Clear"]
  ];
  const playerStatus = loading ? "Loading" : error ? "Needs attention" : profile ? "Enriched" : "Waiting";
  const statFreshness = latestStat?.syncedAt ? formatTimeAgo(latestStat.syncedAt) : stats.length ? "cached" : "not enriched";
  const playerSurfaceRows = [
    ["Player Identity", name, profile ? "Enriched" : "Waiting", "api-football", statFreshness, profile ? "High" : "Pending", "PROFILE"],
    ["Current Team", teamName, profile?.team ? "Enriched" : "Waiting", "api-football", statFreshness, profile?.team ? "High" : "Pending", "TEAM"],
    ["Season Stats", `${stats.length} rows`, stats.length ? "Enriched" : "Waiting", "api-football", statFreshness, stats.length ? "Medium" : "Pending", "STATS"],
    ["Fitness", profile?.injured ? "Injury flag" : "Clear", profile ? "Enriched" : "Waiting", "api-football", statFreshness, profile?.injured ? "High" : "Medium", profile?.injured ? "INJURY" : "CLEAR"],
    ["Prop Market Link", "SE fair / edge / liquidity", "Waiting", "matrix", "not linked", "Pending", "NO FAKE PRICE"]
  ];

  return (
    <FootballProfileShell
      breadcrumbs={[
          { label: "All", href: "#dashboard" },
          { label: "Football", href: "#football" },
          { label: teamName, href: teamHref },
          { label: name }
      ]}
      newsLabel={`${name.toUpperCase()} NEWS`}
      newsQuery={name}
      mode="player"
      contextLabel={`${teamName} / ${profile?.position || latestStat?.position || "Player"}`}
    >
      <div className="bb-profile-identity">
        <div className="bb-profile-badge player-photo">
          {profile?.photoUrl ? <img src={profile.photoUrl} alt={`${name} profile`} /> : <span>{teamInitials(name)}</span>}
        </div>
        <div>
          <span>PLAYER / FOOTBALL PROFILE</span>
          <h1>{name}</h1>
          <p>{[teamName, profile?.position || latestStat?.position, profile?.nationality].filter(Boolean).join(" / ") || "Player profile"}</p>
        </div>
        <div className="bb-profile-score">
          <span>Profile Status</span>
          <strong>{playerStatus}</strong>
          <em className={profile ? "bb-pos" : ""}>{statFreshness}</em>
        </div>
      </div>

      <div className="bb-profile-kpis">
        {[
          ["Position", profile?.position || latestStat?.position || "Waiting", profile ? "enriched" : "waiting"],
          ["Team", teamName, profile?.team ? "enriched" : "waiting"],
          ["Stat Rows", `${stats.length}`, stats.length ? "enriched" : "waiting"],
          ["Apps", `${latestStat?.appearances ?? "-"}`, latestStat ? "latest row" : "waiting"],
          ["Market Data", "Waiting", "field reserved"]
        ].map(([label, value, delta]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <em className={String(delta).includes("enriched") ? "bb-pos" : ""}>{delta}</em>
          </div>
        ))}
      </div>

      {loading && <div className="bb-news-state">Loading player profile.</div>}
      {error && <div className="bb-news-state error">{error}</div>}

      <div className="bb-demo-strip"><span>SportsEdge Picture</span><strong>{name} profile and prop readiness</strong><em>Prop price fields stay blank until real data is linked.</em></div>
      <table className="bb-demo-table bb-profile-market-table">
        <thead><tr>{["Surface", "Object", "Status", "Source", "Fresh", "Conf", "Flag"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
        <tbody>
          {playerSurfaceRows.map((row) => (
            <tr key={`${row[0]}-${row[1]}`}>
              {row.map((cell, index) => <td className={index >= 4 ? "bb-mono" : index === 6 ? "bb-flag" : ""} key={`${cell}-${index}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bb-profile-grid">
        <section>
          <div className="bb-demo-strip"><span>Season Lens</span><strong>Cached player production rows</strong><em>{stats.length} rows.</em></div>
          <table className="bb-demo-table compact">
            <thead><tr>{["Season", "League", "Apps", "Mins", "Goals", "Assists", "Rating", "Cards"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.id}>
                  <td className="bb-mono">{row.season}</td>
                  <td>{row.leagueName || row.teamName || "-"}</td>
                  <td className="bb-mono">{row.appearances ?? "-"}</td>
                  <td className="bb-mono">{row.minutes ?? "-"}</td>
                  <td className="bb-mono">{row.goalsTotal ?? "-"}</td>
                  <td className="bb-mono">{row.assists ?? "-"}</td>
                  <td className="bb-mono">{row.rating ?? "-"}</td>
                  <td className="bb-mono">{row.cardsYellow ?? "-"} / {row.cardsRed ?? "-"}</td>
                </tr>
              ))}
              {!stats.length && <tr><td colSpan={8}>Stats enrichment is waiting for this player.</td></tr>}
            </tbody>
          </table>
        </section>
        <section>
          <div className="bb-demo-strip"><span>Diagnostics</span><strong>Player enrichment and prop readiness</strong><em>Raw context one layer down.</em></div>
          <div className="bb-profile-diagnostics">
            <div><span>Player Details</span><strong>{profileStats.map(([label, value]) => `${label}: ${value}`).join(" / ")}</strong></div>
            <div><span>Team Link</span><strong>{profile?.team ? `${profile.team.name}${profile.team.country ? ` / ${profile.team.country}` : ""}` : "Waiting for team link"}</strong></div>
            <div><span>Market Fields</span><strong>SE Fair, market price, edge, liquidity and confidence are reserved; values appear only when real prop data is linked.</strong></div>
            <div><span>Provider</span><strong>{profile?.providerPlayerId || "waiting"} / {statFreshness}</strong></div>
          </div>
        </section>
      </div>
    </FootballProfileShell>
  );

  return (
    <FootballProfileShell
      breadcrumbs={[
          { label: "All", href: "#dashboard" },
          { label: "Football", href: "#football" },
          { label: teamName, href: teamHref },
          { label: name }
      ]}
      newsLabel={`${name.toUpperCase()} NEWS`}
      newsQuery={name}
    >
          <div className="team-profile-page player-profile-page">
            <section className="team-profile-hero">
              <div className="team-profile-title">
                <div className="team-profile-crest player-photo">
                  {profile?.photoUrl ? <img src={profile.photoUrl} alt={`${name} profile`} /> : <span>{teamInitials(name)}</span>}
                </div>
                <div>
                  <span>SportsEdge player profile</span>
                  <h1>{name}</h1>
                  <p>
                    Player identity, squad link, season stat rows, and news filtered to this player.
                  </p>
                </div>
              </div>
            </section>

            {loading && <p className="team-profile-empty">Loading player profile.</p>}
            {error && <p className="team-profile-empty">{error}</p>}

            {!loading && !error && (
              <section className="team-profile-grid">
                <article className="team-profile-panel main">
                  <div className="team-profile-panel-head">
                    <span>Player Details</span>
                    <strong>{profile?.providerPlayerId || "api-football"}</strong>
                  </div>
                  <div className="team-profile-stat-grid">
                    {profileStats.map(([label, value]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  {profile?.team && (
                    <a className="player-team-link" href={`#team/${encodeURIComponent(profile.team.name)}`}>
                      {profile.team.logoUrl ? <img src={profile.team.logoUrl} alt="" /> : <TeamLogoStack name={profile.team.name} />}
                      <strong>{profile.team.name}</strong>
                      <span>{profile.team.country || "Football"}</span>
                    </a>
                  )}
                </article>

                <article className="team-profile-panel stats">
                  <div className="team-profile-panel-head">
                    <span>Season Stats</span>
                    <strong>{stats.length} rows</strong>
                  </div>
                  <div className="player-stat-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Season</th>
                          <th>League</th>
                          <th>Apps</th>
                          <th>Mins</th>
                          <th>Goals</th>
                          <th>Assists</th>
                          <th>Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.map((row) => (
                          <tr key={row.id}>
                            <td>{row.season}</td>
                            <td>{row.leagueName || row.teamName || "-"}</td>
                            <td>{row.appearances ?? "-"}</td>
                            <td>{row.minutes ?? "-"}</td>
                            <td>{row.goalsTotal ?? "-"}</td>
                            <td>{row.assists ?? "-"}</td>
                            <td>{row.rating ?? "-"}</td>
                          </tr>
                        ))}
                        {stats.length === 0 && (
                          <tr><td colSpan={7}>Stats sync is queued for this player.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>
            )}
          </div>
    </FootballProfileShell>
  );
}

function NewsPage() {
  const [filters, setFilters] = useState<Filters>({
    q: "",
    sport: "all",
    source_name: "all",
    source_type: "all",
    country: "all",
    competition: "all",
    status: "all",
    date_from: "",
    date_to: "",
  });
  const [data, setData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.sport !== "all") params.set("sport", filters.sport);
    if (filters.source_name !== "all") params.set("source_name", filters.source_name);
    if (filters.source_type !== "all") params.set("source_type", filters.source_type);
    if (filters.country !== "all") params.set("country", filters.country);
    if (filters.competition !== "all") params.set("competition", filters.competition);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    params.set("limit", "200");
    return params.toString();
  }, [filters]);

  async function loadNews() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/news?${queryString}`);
      const payload = await response.json();
      if (!response.ok || payload.ok === false || !Array.isArray(payload.items)) {
        const details = [payload.message, payload.hint || payload.detail].filter(Boolean);
        throw new Error(details.join("\n") || "Unable to load news");
      }
      setData(payload);
      setSelectedId((current) => current && payload.items.some((item: NewsItem) => item.id === current) ? current : payload.items[0]?.id || null);
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load news");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
  }, [queryString]);

  const items = data?.items || [];
  const facets = data?.facets || {
    sports: [],
    source_names: [],
    source_types: [],
    countries: [],
    competitions: [],
    statuses: [],
  };
  const health = data?.sourceHealth || [];
  const failures = data?.latestFailures || [];
  const polls = data?.latestPolls || [];
  const totalSources = health.reduce((sum, row) => sum + asNumber(row.total_sources), 0);
  const enabledSources = health.reduce((sum, row) => sum + asNumber(row.enabled_sources), 0);
  const failingSources = health.reduce((sum, row) => sum + asNumber(row.failing_sources), 0);
  const selectedItem = items.find((item) => item.id === selectedId) || items[0] || null;
  const selectedFacts = objectEntries(selectedItem?.facts);
  const selectedMetadata = objectEntries(selectedItem?.metadata);
  const selectedEntities = Array.isArray(selectedItem?.entities) ? selectedItem.entities : objectEntries(selectedItem?.entities);

  return (
    <main className="news-shell">
      <aside className="news-rail">
        <a href="https://sportsedge.markets/" aria-label="SportsEdge Markets home">
          <img className="news-logo" src={sportsEdgeMarketsLogo} alt="SportsEdge Markets logo" />
        </a>
        <nav>
          <a className="active" href="#">
            <Newspaper size={16} />
            Console
          </a>
          <a href="#simple-news">
            <Newspaper size={16} />
            News
          </a>
          <a href="#login">
            <ShieldCheck size={16} />
            Login
          </a>
        </nav>
        <div className="rail-card">
          <span>Source</span>
          <strong>sportsedge.news</strong>
          <small>ClickHouse read-only</small>
        </div>
        <div className="rail-card">
          <span>Schema</span>
          <strong>news</strong>
          <small>items / sources / polls</small>
        </div>
      </aside>

      <section className="news-workspace">
        <header className="news-topbar">
          <div>
            <h1>News Console</h1>
            <p>Read-only operational feed from sportsedge.news, ordered by latest discovery.</p>
          </div>
          <div className="news-kpis" aria-label="News source health summary">
            <span><strong>{items.length}</strong> items</span>
            <span><strong>{enabledSources}</strong> enabled</span>
            <span className={failingSources > 0 ? "danger" : ""}><strong>{failingSources}</strong> failing</span>
          </div>
          <button className="refresh-button" onClick={loadNews} type="button">
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        <section className="news-filters" aria-label="News filters">
          <label className="news-search">
            <Search size={17} />
            <input
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="Search title or display summary"
            />
          </label>
          <FilterSelect label="Sport" value={filters.sport} options={facets.sports} onChange={(sport) => setFilters((current) => ({ ...current, sport }))} />
          <FilterSelect label="Source" value={filters.source_name} options={facets.source_names} onChange={(source_name) => setFilters((current) => ({ ...current, source_name }))} />
          <FilterSelect label="Type" value={filters.source_type} options={facets.source_types} onChange={(source_type) => setFilters((current) => ({ ...current, source_type }))} />
          <FilterSelect label="Country" value={filters.country} options={facets.countries} onChange={(country) => setFilters((current) => ({ ...current, country }))} />
          <FilterSelect label="Competition" value={filters.competition} options={facets.competitions} onChange={(competition) => setFilters((current) => ({ ...current, competition }))} />
          <FilterSelect label="Status" value={filters.status} options={facets.statuses} onChange={(status) => setFilters((current) => ({ ...current, status }))} />
          <label className="filter-select">
            <span>From</span>
            <input type="date" value={filters.date_from} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} />
          </label>
          <label className="filter-select">
            <span>To</span>
            <input type="date" value={filters.date_to} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} />
          </label>
        </section>

        {loading && <div className="news-state">Loading news from Postgres...</div>}
        {error && !loading && (
          <div className="news-state error">
            <strong>Database connection unavailable</strong>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="news-console-grid">
            <section className="news-panel health-panel" aria-label="Source health">
              <div className="news-panel-head">
                <span><Activity size={15} /> Source health</span>
                <strong>{totalSources} total</strong>
              </div>
              <table className="health-table">
                <thead>
                  <tr>
                    <th>Sport</th>
                    <th>Total</th>
                    <th>Enabled</th>
                    <th>Working</th>
                    <th>Failing</th>
                  </tr>
                </thead>
                <tbody>
                  {health.map((row) => (
                    <tr key={row.sport}>
                      <td>{row.sport}</td>
                      <td>{row.total_sources}</td>
                      <td>{row.enabled_sources}</td>
                      <td>{row.working_sources}</td>
                      <td className={asNumber(row.failing_sources) > 0 ? "danger-cell" : ""}>{row.failing_sources}</td>
                    </tr>
                  ))}
                  {health.length === 0 && (
                    <tr>
                      <td colSpan={5}>No source health rows returned.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="news-panel failures-panel" aria-label="Latest source failures">
              <div className="news-panel-head">
                <span><AlertTriangle size={15} /> Current source failures</span>
                <strong>{failures.length}</strong>
              </div>
              <div className="failure-list">
                {failures.slice(0, 8).map((failure) => (
                  <a className="failure-row" href={failure.url} target="_blank" rel="noreferrer" key={`${failure.sport}-${failure.name}`}>
                    <span>{failure.sport}</span>
                    <strong>{failure.name}</strong>
                    <small>{failure.last_error || "Unknown failure"} - {formatDate(failure.last_polled_at)}</small>
                  </a>
                ))}
                {failures.length === 0 && <div className="empty-row">No enabled sources are reporting errors.</div>}
              </div>
            </section>

            <section className="news-panel polls-panel" aria-label="Latest source polls">
              <div className="news-panel-head">
                <span><Database size={15} /> Recent poll activity</span>
                <strong>{polls.length}</strong>
              </div>
              <div className="poll-grid">
                {polls.slice(0, 6).map((poll) => (
                  <div className="poll-row" key={`${poll.name}-${poll.started_at}`}>
                    <strong>{poll.name}</strong>
                    <span className={poll.poll_status === "failed" ? "danger-cell" : ""}>{poll.poll_status}</span>
                    <small>{poll.items_seen} seen / {poll.items_inserted} new / {formatDate(poll.started_at)}</small>
                  </div>
                ))}
                {polls.length === 0 && <div className="empty-row">No recent poll rows returned.</div>}
              </div>
            </section>

            <section className="news-list news-panel" aria-label="News results">
              <div className="news-list-head">
                <strong>{items.length} results</strong>
                <span>Select a headline for the SportsEdge intelligence view</span>
              </div>
              {items.map((item) => (
                <article className={`news-item ${selectedItem?.id === item.id ? "selected" : ""}`} key={item.id}>
                  <div className="news-item-main">
                    <button type="button" onClick={() => setSelectedId(item.id)}>
                      {cleanText(item.title)}
                    </button>
                    <p>{newsContextText(item) || "No display summary available."}</p>
                    <div className="news-meta">
                      <span>{displayLabel(item.country, "Global")}</span>
                      <span>{displayLabel(item.competition, "No competition")}</span>
                      <span>{displayLabel(item.entity_name || item.entity_type, "No entity")}</span>
                    </div>
                  </div>
                  <div className="news-item-side">
                    <span>{displayLabel(item.sport, "Unknown")}</span>
                    <span>{displayLabel(item.source_type, "Source")}</span>
                    <span>{displayLabel(item.source_name, "Unknown source")}</span>
                    <strong>{item.status}</strong>
                    <time>
                      <CalendarClock size={13} />
                      {formatDate(item.published_at || item.discovered_at)}
                    </time>
                    <a className="source-link" href={newsOpenUrl(item)} target="_blank" rel="noreferrer" aria-label={`Open source for ${item.title}`}>
                      <ExternalLink size={13} />
                      Source
                    </a>
                  </div>
                </article>
              ))}
              {items.length === 0 && <div className="empty-row">No news matched the selected filters.</div>}
            </section>

            <aside className="news-detail news-panel" aria-label="Selected news detail">
              <div className="news-panel-head">
                <span><Newspaper size={15} /> Story intelligence</span>
                <strong>{selectedItem ? selectedItem.source_type : "none"}</strong>
              </div>
              {selectedItem ? (
                <div className="detail-body">
                  <div className="detail-status-row">
                    <span>{displayLabel(selectedItem.sport, "Unknown sport")}</span>
                    <span>{displayLabel(selectedItem.competition, "No competition")}</span>
                    <strong>{selectedItem.status}</strong>
                  </div>
                  <h2>{cleanText(selectedItem.title)}</h2>
                  <p>{cleanText(selectedItem.display_summary) || "No display summary available."}</p>
                  <div className="detail-actions">
                    <a href={selectedItem.canonical_url || selectedItem.source_url} target="_blank" rel="noreferrer">
                      <ExternalLink size={15} />
                      Open source
                    </a>
                    <span>{displayLabel(selectedItem.source_name, "Unknown source")}</span>
                  </div>
                  <div className="detail-grid">
                    <div>
                      <span>Published</span>
                      <strong>{formatDate(selectedItem.published_at)}</strong>
                    </div>
                    <div>
                      <span>Discovered</span>
                      <strong>{formatDate(selectedItem.discovered_at)}</strong>
                    </div>
                    <div>
                      <span>Country</span>
                      <strong>{displayLabel(selectedItem.country, "Global")}</strong>
                    </div>
                    <div>
                      <span>Entity</span>
                      <strong>{displayLabel(selectedItem.entity_name || selectedItem.entity_type, "No entity")}</strong>
                    </div>
                  </div>
                  <DetailSection title="Extracted Facts" entries={selectedFacts} />
                  <DetailSection title="Entities" entries={selectedEntities.map((entity, index) => [String(index + 1), entity] as [string, unknown])} />
                  <DetailSection title="Metadata" entries={selectedMetadata.slice(0, 8)} />
                </div>
              ) : (
                <div className="empty-row">Select a news item to inspect its summary, source, facts, and entities.</div>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function SimpleNewsPage() {
  const [sport, setSport] = useState("all");
  const [data, setData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (sport !== "all") params.set("sport", sport);
    params.set("limit", "80");
    return params.toString();
  }, [sport]);

  async function loadSimpleNews() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/news?${queryString}`);
      const payload = await response.json();
      if (!response.ok || payload.ok === false || !Array.isArray(payload.items)) {
        const details = [payload.message, payload.hint || payload.detail].filter(Boolean);
        throw new Error(details.join("\n") || "Unable to load news");
      }
      setData(payload);
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load news");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSimpleNews();
  }, [queryString]);

  const items = data?.items || [];
  const sports = data?.facets?.sports || [];

  return (
    <main className="simple-news-shell">
      <aside className="simple-news-rail">
        <a href="https://sportsedge.markets/" aria-label="SportsEdge Markets home">
          <img className="simple-news-logo" src={sportsEdgeMarketsLogo} alt="SportsEdge Markets logo" />
        </a>
        <nav>
          <a className="active" href="#simple-news">
            <Newspaper size={16} />
            News
          </a>
          <a href="#">
            <Database size={16} />
            Console
          </a>
          <a href="#login">
            <ShieldCheck size={16} />
            Login
          </a>
        </nav>
      </aside>

      <section className="simple-news-main">
        <header className="simple-news-header">
          <div>
            <h1>News</h1>
            <p>Latest SportsEdge stories by sport.</p>
          </div>
          <label className="simple-sport-select">
            <span>Sport</span>
            <select value={sport} onChange={(event) => setSport(event.target.value)}>
              <option value="all">All sports</option>
              {sports.map((option) => (
                <option key={option} value={option}>
                  {displayLabel(option)}
                </option>
              ))}
            </select>
          </label>
        </header>

        {loading && <div className="simple-news-state">Loading news...</div>}
        {error && !loading && <div className="simple-news-state error">{error}</div>}

        {!loading && !error && (
          <section className="simple-news-list" aria-label="News list">
            <div className="simple-news-count">{items.length} stories</div>
            {items.map((item) => (
              <article className="simple-story" key={item.id}>
                <a href={newsOpenUrl(item)} target="_blank" rel="noreferrer">
                  {cleanText(item.title)}
                </a>
                <p>{newsContextText(item) || "No display summary available."}</p>
                {item.impact_assessment && (
                  <div className={`simple-impact ${impactClass(item.impact_assessment)}`}>
                    <strong>{item.impact_assessment.impact_score}</strong>
                    <span>{displayLabel(item.impact_assessment.event_type, "impact")}</span>
                    <p>{cleanText(item.impact_assessment.trading_note)}</p>
                  </div>
                )}
                <div>
                  <span>{displayLabel(item.sport, "Sport")}</span>
                  <span>{displayLabel(item.source_name, "Source")}</span>
                  <time>{formatDate(item.published_at || item.discovered_at)}</time>
                </div>
              </article>
            ))}
            {items.length === 0 && <div className="simple-news-state">No news found for this sport.</div>}
          </section>
        )}
      </section>
    </main>
  );
}

function StandaloneLiveNewsPage() {
  const [sport, setSport] = useState("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socketStatus, setSocketStatus] = useState<"offline" | "connecting" | "live" | "waiting">("offline");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const flashTimersRef = useRef<number[]>([]);
  const sportRef = useRef(sport);

  useEffect(() => {
    sportRef.current = sport;
  }, [sport]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadNews() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "160" });
        if (sport !== "all") params.set("sport", apiSportValue(sport));
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/news?${params.toString()}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.items)) throw new Error(payload.detail || "news failed");
        if (!cancelled) {
          setItems((current) => mergeNewsItems(payload.items as NewsItem[], current).slice(0, 180));
          setError("");
        }
      } catch (err) {
        if (!cancelled && !controller.signal.aborted) setError(err instanceof Error ? err.message : "news failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadNews();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [sport, query]);

  useEffect(() => {
    const token = window.localStorage.getItem("sportsedge.auth.token");
    let closedByEffect = false;

    function clearReconnect() {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function subscribe(socket: WebSocket) {
      socket.send(JSON.stringify({
        type: "subscribe",
        channel: "news",
        filters: sportRef.current === "all" ? {} : { sport: apiSportValue(sportRef.current) }
      }));
    }

    function connect() {
      clearReconnect();
      if (!token) {
        setSocketStatus("waiting");
        return;
      }
      setSocketStatus("connecting");
      const socket = new WebSocket(sportsEdgeWsUrl(token));
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setSocketStatus("live");
        subscribe(socket);
      });

      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type !== "news.item" || !message.payload) return;
          const nextItem = { ...(message.payload as NewsItem), isNew: true };
          setItems((current) => mergeNewsItems([nextItem], current).slice(0, 180));
          const itemId = String(nextItem.id);
          const timer = window.setTimeout(() => {
            setItems((current) => current.map((item) => item.id === itemId ? { ...item, isNew: false } : item));
          }, 2200);
          flashTimersRef.current.push(timer);
        } catch {
          // Keep the news window alive if one socket message is malformed.
        }
      });

      socket.addEventListener("close", () => {
        if (closedByEffect) return;
        setSocketStatus("offline");
        reconnectTimerRef.current = window.setTimeout(connect, 2500);
      });

      socket.addEventListener("error", () => setSocketStatus("offline"));
    }

    connect();
    return () => {
      closedByEffect = true;
      clearReconnect();
      flashTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      flashTimersRef.current = [];
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
      type: "subscribe",
      channel: "news",
      filters: sport === "all" ? {} : { sport: apiSportValue(sport) }
    }));
  }, [sport]);

  const filteredItems = useMemo(() => {
    const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
    return uniqueNewsItems(items)
      .filter((item) => sport === "all" || sportMatchesNewsFilter(item.sport, sport))
      .filter((item) => {
        if (!terms.length) return true;
        const haystack = normalizeFixtureText([
          item.title,
          newsContextText(item),
          item.sport,
          item.competition,
          item.source_name,
          item.entity_name
        ].join(" "));
        return terms.every((term) => haystack.includes(term));
      })
      .slice(0, 160);
  }, [items, query, sport]);

  return (
    <>
      <SportsEdgeTopbar
        active="liquidity"
        onSearchChange={setQuery}
        searchPlaceholder="Search news, team, player, source..."
      />
      <main className="standalone-news-page">
        <section className="standalone-news-toolbar" aria-label="News controls">
          <div>
            <strong>SportsEdge News</strong>
            <span>{socketStatus === "live" ? "WSS live" : socketStatus}</span>
            <span>{filteredItems.length}{query.trim() ? ` / ${items.length}` : ""} items</span>
          </div>
          <nav aria-label="News sport filters">
            <button className={sport === "all" ? "active" : ""} type="button" onClick={() => setSport("all")}>All</button>
            {PRIORITY_SPORTS.slice(0, 5).map((option) => (
              <button
                className={sport === option.value ? "active" : ""}
                key={option.value}
                type="button"
                onClick={() => setSport(option.value)}
              >
                {option.label}
              </button>
            ))}
          </nav>
        </section>

        <section className="standalone-news-list" aria-label="Live SportsEdge news">
          {filteredItems.map((item) => (
            <article className={`standalone-news-card${item.isNew ? " is-new" : ""}`} key={`window-news-${item.id}`} title={newsContextText(item)}>
              <div className={`standalone-news-media${newsImageUrl(item) ? "" : " empty"}`}>
                {newsImageUrl(item) ? <img src={newsImageUrl(item)} alt="" loading="lazy" /> : <span>{teamInitials(item.source_name || item.sport || "SE")}</span>}
              </div>
              <div className="standalone-news-body">
                <div className="standalone-news-meta">
                  <span>{displayLabel(item.sport, "news")}</span>
                  <span>{displayLabel(item.source_name || item.source_type, "source")}</span>
                  <time>{formatDate(item.published_at || item.discovered_at)}</time>
                </div>
                <h2>{cleanText(item.title)}</h2>
                <p>{newsContextText(item) || displayLabel(item.entity_name || item.competition, "SportsEdge update")}</p>
              </div>
              <aside>
                <span>{displayLabel(item.competition, "Market news")}</span>
                {newsOpenUrl(item) && <a href={newsOpenUrl(item)} target="_blank" rel="noreferrer">Open</a>}
              </aside>
            </article>
          ))}
          {loading && filteredItems.length === 0 && <div className="standalone-news-state">Loading SportsEdge news.</div>}
          {error && !loading && filteredItems.length === 0 && <div className="standalone-news-state error">{error}</div>}
          {!loading && !error && filteredItems.length === 0 && <div className="standalone-news-state">No news matched the current filter.</div>}
        </section>
      </main>
    </>
  );
}

function AdminConsolePage() {
  const [panel, setPanel] = useState<"overview" | "users" | "sessions" | "analytics" | "blog" | "newsSources">("overview");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [sessions, setSessions] = useState<AdminSessionRow[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [blogDraft, setBlogDraft] = useState({
    id: "",
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    status: "draft" as AdminBlogPost["status"],
    tags: ""
  });

  async function loadAdmin() {
    setLoading(true);
    const nextErrors: Record<string, string> = {};
    const [userResult, sessionResult, analyticsResult, blogResult] = await Promise.allSettled([
      fetchAdminJson<{ users: AdminUserRow[] }>("/auth/admin/users"),
      fetchAdminJson<{ sessions: AdminSessionRow[] }>("/auth/admin/sessions"),
      fetchAdminJson<AdminAnalyticsResponse>("/auth/admin/analytics?days=30"),
      fetchAdminJson<{ posts: AdminBlogPost[] }>("/auth/admin/blog-posts")
    ]);

    if (userResult.status === "fulfilled") setUsers(userResult.value.users || []);
    else nextErrors.users = userResult.reason instanceof Error ? userResult.reason.message : "Users endpoint failed";
    if (sessionResult.status === "fulfilled") setSessions(sessionResult.value.sessions || []);
    else nextErrors.sessions = sessionResult.reason instanceof Error ? sessionResult.reason.message : "Sessions endpoint failed";
    if (analyticsResult.status === "fulfilled") setAnalytics(analyticsResult.value);
    else nextErrors.analytics = analyticsResult.reason instanceof Error ? analyticsResult.reason.message : "Analytics endpoint failed";
    if (blogResult.status === "fulfilled") setPosts(blogResult.value.posts || []);
    else nextErrors.blog = blogResult.reason instanceof Error ? blogResult.reason.message : "Blog endpoint failed";

    setErrors(nextErrors);
    setLoading(false);
  }

  useEffect(() => {
    loadAdmin();
  }, []);

  async function revokeSession(session: AdminSessionRow) {
    setBusy(session.id);
    try {
      await fetchAdminJson(`/auth/admin/sessions/${encodeURIComponent(session.id)}/revoke`, { method: "POST" });
      await loadAdmin();
    } catch (error) {
      setErrors((current) => ({ ...current, sessions: error instanceof Error ? error.message : "Session revoke failed" }));
    } finally {
      setBusy("");
    }
  }

  async function revokeAllSessions() {
    if (!window.confirm("Force out every active session except this admin session?")) return;
    setBusy("all-sessions");
    try {
      await fetchAdminJson("/auth/admin/sessions/revoke-all", { method: "POST" });
      await loadAdmin();
    } catch (error) {
      setErrors((current) => ({ ...current, sessions: error instanceof Error ? error.message : "Session revoke failed" }));
    } finally {
      setBusy("");
    }
  }

  async function saveBlogPost(event: FormEvent) {
    event.preventDefault();
    setBusy("blog");
    try {
      const body = JSON.stringify({
        title: blogDraft.title,
        slug: blogDraft.slug,
        excerpt: blogDraft.excerpt,
        body: blogDraft.body,
        status: blogDraft.status,
        tags: blogDraft.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
      });
      if (blogDraft.id) {
        await fetchAdminJson(`/auth/admin/blog-posts/${encodeURIComponent(blogDraft.id)}`, { method: "PATCH", body });
      } else {
        await fetchAdminJson("/auth/admin/blog-posts", { method: "POST", body });
      }
      setBlogDraft({ id: "", title: "", slug: "", excerpt: "", body: "", status: "draft", tags: "" });
      await loadAdmin();
    } catch (error) {
      setErrors((current) => ({ ...current, blog: error instanceof Error ? error.message : "Blog save failed" }));
    } finally {
      setBusy("");
    }
  }

  function editPost(post: AdminBlogPost) {
    setPanel("blog");
    setBlogDraft({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      body: post.body || "",
      status: post.status,
      tags: (post.tags || []).join(", ")
    });
  }

  const activeSessions = sessions.filter((session) => session.active);
  const publishedPosts = posts.filter((post) => post.status === "published");
  const summary = analytics?.summary || {};
  const latestPageviews = analytics?.latestPageviews || [];
  const pageviewColumns = [
    "occurred_at",
    "domain",
    "site_name",
    "path",
    "url",
    "title",
    "referrer",
    "referrer_host",
    "visitor_id",
    "session_id",
    "country_code",
    "ip",
    "ip_address",
    "page_load_ms",
    "browser_name",
    "os_name",
    "device_type",
    "user_agent",
    "screen_width",
    "screen_height",
    "language"
  ].filter((key) => latestPageviews.some((row) => Object.prototype.hasOwnProperty.call(row, key)));

  return (
    <main className="admin-news-shell admin-console-shell">
      <aside className="news-rail admin-console-rail">
        <a href="#dashboard" aria-label="SportsEdge dashboard">
          <img className="news-logo mark-only" src={sportsEdgeMark} alt="SportsEdge Markets logo" />
        </a>
        <nav>
          <button className={panel === "overview" ? "active" : ""} type="button" onClick={() => setPanel("overview")}><Activity size={16} /> Overview</button>
          <button className={panel === "users" ? "active" : ""} type="button" onClick={() => setPanel("users")}><ShieldCheck size={16} /> Users</button>
          <button className={panel === "sessions" ? "active" : ""} type="button" onClick={() => setPanel("sessions")}><Lock size={16} /> Sessions</button>
          <button className={panel === "analytics" ? "active" : ""} type="button" onClick={() => setPanel("analytics")}><Target size={16} /> Analytics</button>
          <button className={panel === "blog" ? "active" : ""} type="button" onClick={() => setPanel("blog")}><Newspaper size={16} /> Blog</button>
          <button className={panel === "newsSources" ? "active" : ""} type="button" onClick={() => setPanel("newsSources")}><Database size={16} /> News Sources</button>
          <a href="#dashboard"><Activity size={16} /> Terminal</a>
        </nav>
        <div className="rail-card">
          <span>Admin</span>
          <strong>Control</strong>
          <small>users / sessions / analytics / blog</small>
          <button className="admin-rail-logout" type="button" onClick={logoutToLogin}>
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      <section className="admin-news-main admin-console-main">
        <header className="news-topbar">
          <div>
            <h1>Admin Console</h1>
            <p>User control, live sessions, SportsEdge site analytics, and public blog publishing.</p>
          </div>
          <div className="news-kpis">
            <span><strong>{users.length}</strong> users</span>
            <span><strong>{activeSessions.length}</strong> active sessions</span>
            <span><strong>{Number(summary.pageviews || 0).toLocaleString("en-GB")}</strong> visits</span>
            <span><strong>{publishedPosts.length}</strong> published</span>
          </div>
          <button className="refresh-button" onClick={loadAdmin} type="button" disabled={loading}>
            <RefreshCw size={16} />
            {loading ? "Loading" : "Refresh"}
          </button>
        </header>

        <section className="admin-console-grid" aria-label="Admin summary">
          <article><span>Users</span><strong>{users.length}</strong><p>{errors.users || "Registered terminal accounts."}</p></article>
          <article><span>Active Sessions</span><strong>{activeSessions.length}</strong><p>{errors.sessions || "Currently valid access sessions."}</p></article>
          <article><span>Pageviews</span><strong>{Number(summary.pageviews || 0).toLocaleString("en-GB")}</strong><p>{errors.analytics || "Last 30 days SportsEdge traffic."}</p></article>
          <article><span>Blog Posts</span><strong>{posts.length}</strong><p>{errors.blog || "Draft, publish, and edit public posts."}</p></article>
        </section>

        {panel === "overview" && (
          <section className="news-panel admin-console-panel">
            <div className="news-panel-head"><span><Activity size={15} /> Data Matrix</span><strong>Admin overview</strong></div>
            <div className="admin-console-grid compact">
              <article><span>Unique Visitors</span><strong>{Number(summary.unique_visitors || 0).toLocaleString("en-GB")}</strong><p>SportsEdge tracked visitors.</p></article>
              <article><span>Traffic Sessions</span><strong>{Number(summary.sessions || 0).toLocaleString("en-GB")}</strong><p>Website sessions in tracker.</p></article>
              <article><span>Events</span><strong>{Number(summary.events || 0).toLocaleString("en-GB")}</strong><p>Tracked interaction events.</p></article>
              <article><span>Avg Load</span><strong>{summary.avg_page_load_ms ? `${summary.avg_page_load_ms}ms` : "-"}</strong><p>Measured page load timing.</p></article>
            </div>
            <div className="admin-overview-matrix">
              <div>
                <span>Account Base</span>
                <strong>{users.length}</strong>
                <small>{errors.users || `${activeSessions.length} active terminal sessions`}</small>
              </div>
              <div>
                <span>Published Content</span>
                <strong>{publishedPosts.length}</strong>
                <small>{errors.blog || `${posts.length} total blog entries`}</small>
              </div>
              <div>
                <span>Top Page</span>
                <strong>{analytics?.topPages?.[0]?.path || "-"}</strong>
                <small>{analytics?.topPages?.[0] ? `${analytics.topPages[0].pageviews} pageviews` : errors.analytics || "Waiting for traffic data"}</small>
              </div>
            </div>
          </section>
        )}

        {panel === "users" && (
          <section className="news-panel admin-console-panel">
            <div className="news-panel-head"><span><ShieldCheck size={15} /> Users</span><strong>{users.length} accounts</strong></div>
            {errors.users && <div className="news-state error">{errors.users}</div>}
            <table className="admin-source-table admin-console-table">
              <thead><tr><th>User</th><th>Status</th><th>Membership</th><th>Roles</th><th>Last login</th><th>Created</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.email}</strong><span>{user.full_name || user.id}</span></td>
                    <td><span className={user.status === "active" ? "source-pill ok" : "source-pill danger"}>{user.status || "-"}</span></td>
                    <td><strong>{user.subscription?.plan_name || user.account_type || "-"}</strong><span>{user.subscription?.status || "-"}</span></td>
                    <td>{(user.roles || []).join(", ") || "-"}</td>
                    <td>{formatDate(user.last_login_at || null)}</td>
                    <td>{formatDate(user.created_at || null)}</td>
                  </tr>
                ))}
                {!users.length && !errors.users && <tr><td colSpan={6}>No users returned.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {panel === "sessions" && (
          <section className="news-panel admin-console-panel">
            <div className="news-panel-head">
              <span><Lock size={15} /> Active Sessions</span>
              <button className="refresh-button danger" type="button" onClick={revokeAllSessions} disabled={busy === "all-sessions" || activeSessions.length === 0}>Force out all</button>
            </div>
            {errors.sessions && <div className="news-state error">{errors.sessions}</div>}
            <table className="admin-source-table admin-console-table">
              <thead><tr><th>User</th><th>IP</th><th>Agent</th><th>Last seen</th><th>Expires</th><th>Action</th></tr></thead>
              <tbody>
                {activeSessions.slice(0, 500).map((session) => (
                  <tr key={session.id}>
                    <td><strong>{session.email}</strong><span>{session.active ? "active" : session.revoked_at ? "revoked" : "expired"}</span></td>
                    <td>{session.ip_address || "-"}</td>
                    <td><span>{session.user_agent || "-"}</span></td>
                    <td>{formatDate(session.last_seen_at || session.created_at || null)}</td>
                    <td>{formatDate(session.expires_at || null)}</td>
                    <td><button className="admin-action-button danger" type="button" disabled={!session.active || busy === session.id} onClick={() => revokeSession(session)}>Force out</button></td>
                  </tr>
                ))}
                {!activeSessions.length && !errors.sessions && <tr><td colSpan={6}>No active sessions returned.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {panel === "analytics" && (
          <section className="news-panel admin-console-panel">
            <div className="news-panel-head"><span><Target size={15} /> Site Analytics</span><strong>30 days / visitor detail</strong></div>
            {errors.analytics && <div className="news-state error">{errors.analytics}</div>}
            <div className="admin-console-grid compact">
              <article><span>Visitors</span><strong>{Number(summary.unique_visitors || 0).toLocaleString("en-GB")}</strong></article>
              <article><span>Sessions</span><strong>{Number(summary.sessions || 0).toLocaleString("en-GB")}</strong></article>
              <article><span>Events</span><strong>{Number(summary.events || 0).toLocaleString("en-GB")}</strong></article>
              <article><span>Load</span><strong>{summary.avg_page_load_ms ? `${summary.avg_page_load_ms}ms` : "-"}</strong></article>
            </div>
            <table className="admin-source-table admin-console-table admin-analytics-table">
              <thead><tr><th>Visitor</th><th>Last seen</th><th>Domain</th><th>IP</th><th>Country</th><th>Device</th><th>Browser</th><th>OS</th><th>Sessions</th><th>Pageviews</th></tr></thead>
              <tbody>
                {(analytics?.latestVisitors || []).slice(0, 80).map((visitor) => (
                  <tr key={`${visitor.visitor_uid}-${visitor.last_seen_at}`}>
                    <td><strong>{visitor.visitor_uid}</strong><span>{visitor.site_name || "SportsEdge"}</span></td>
                    <td>{formatDate(visitor.last_seen_at)}</td>
                    <td>{visitor.domain || "-"}</td>
                    <td>{visitor.last_ip || "-"}</td>
                    <td>{visitor.last_country_code || "-"}</td>
                    <td>{visitor.device_type || "-"}</td>
                    <td>{visitor.browser_name || "-"}</td>
                    <td>{visitor.os_name || "-"}</td>
                    <td>{Number(visitor.sessions || 0).toLocaleString("en-GB")}</td>
                    <td>{Number(visitor.pageviews || 0).toLocaleString("en-GB")}</td>
                  </tr>
                ))}
                {!(analytics?.latestVisitors || []).length && !errors.analytics && <tr><td colSpan={10}>No visitor rollup rows returned.</td></tr>}
              </tbody>
            </table>

            <div className="news-panel-head admin-analytics-subhead"><span>Raw Tracking Pageviews</span><strong>{latestPageviews.length} latest rows</strong></div>
            <table className="admin-source-table admin-console-table admin-analytics-table raw">
              <thead>
                <tr>
                  {pageviewColumns.map((column) => <th key={column}>{column.replace(/_/g, " ")}</th>)}
                </tr>
              </thead>
              <tbody>
                {latestPageviews.slice(0, 120).map((row, index) => (
                  <tr key={`${String(row.id || row.occurred_at || index)}-${index}`}>
                    {pageviewColumns.map((column) => <td key={`${index}-${column}`}>{analyticsCellValue(row, column)}</td>)}
                  </tr>
                ))}
                {!latestPageviews.length && !errors.analytics && <tr><td colSpan={Math.max(pageviewColumns.length, 1)}>No raw pageview rows returned.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {panel === "blog" && (
          <section className="news-panel admin-console-panel">
            <div className="news-panel-head"><span><Newspaper size={15} /> Blog</span><strong>{posts.length} posts</strong></div>
            {errors.blog && <div className="news-state error">{errors.blog}</div>}
            <form className="admin-blog-form" onSubmit={saveBlogPost}>
              <input value={blogDraft.title} onChange={(event) => setBlogDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Title" />
              <input value={blogDraft.slug} onChange={(event) => setBlogDraft((draft) => ({ ...draft, slug: event.target.value }))} placeholder="slug" />
              <select value={blogDraft.status} onChange={(event) => setBlogDraft((draft) => ({ ...draft, status: event.target.value as AdminBlogPost["status"] }))}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <input value={blogDraft.tags} onChange={(event) => setBlogDraft((draft) => ({ ...draft, tags: event.target.value }))} placeholder="tags, comma separated" />
              <textarea value={blogDraft.excerpt} onChange={(event) => setBlogDraft((draft) => ({ ...draft, excerpt: event.target.value }))} placeholder="Excerpt" />
              <textarea value={blogDraft.body} onChange={(event) => setBlogDraft((draft) => ({ ...draft, body: event.target.value }))} placeholder="Body" />
              <div>
                <button className="refresh-button" type="submit" disabled={busy === "blog"}>{blogDraft.id ? "Update post" : "Create post"}</button>
                {blogDraft.id && <button className="admin-action-button" type="button" onClick={() => setBlogDraft({ id: "", title: "", slug: "", excerpt: "", body: "", status: "draft", tags: "" })}>New post</button>}
              </div>
            </form>
            <table className="admin-source-table admin-console-table">
              <thead><tr><th>Post</th><th>Status</th><th>Tags</th><th>Author</th><th>Updated</th><th>Action</th></tr></thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td><strong>{post.title}</strong><span>/{post.slug}</span></td>
                    <td><span className={post.status === "published" ? "source-pill ok" : "source-pill muted"}>{post.status}</span></td>
                    <td>{(post.tags || []).join(", ") || "-"}</td>
                    <td>{post.author_email || "-"}</td>
                    <td>{formatDate(post.updated_at || null)}</td>
                    <td><button className="admin-action-button" type="button" onClick={() => editPost(post)}>Edit</button></td>
                  </tr>
                ))}
                {!posts.length && !errors.blog && <tr><td colSpan={6}>No blog posts yet.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {panel === "newsSources" && <AdminNewsSourcesPanel />}
      </section>
    </main>
  );
}

function AdminNewsSourcesPanel() {
  const [data, setData] = useState<AdminNewsSourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [feedType, setFeedType] = useState("all");

  async function loadSources() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/auth/admin/news-sources", {
        headers: authHeaders()
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || "Unable to load news sources");
      setData(payload);
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load news sources");
    } finally {
      setLoading(false);
    }
  }

  async function setSourceEnabled(source: AdminNewsSource, enabled: boolean) {
    setSavingKey(source.key);
    setError(null);
    try {
      const response = await fetch(`/auth/admin/news-sources/${encodeURIComponent(source.key)}`, {
        method: "PATCH",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ enabled })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || "Unable to update source");
      await loadSources();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update source");
    } finally {
      setSavingKey(null);
    }
  }

  async function deleteSource(source: AdminNewsSource) {
    if (!window.confirm(`Delete ${source.name} from the news endpoint catalogue? Existing fetched news stays in ClickHouse.`)) return;
    setSavingKey(source.key);
    setError(null);
    try {
      const response = await fetch(`/auth/admin/news-sources/${encodeURIComponent(source.key)}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || "Unable to delete source");
      await loadSources();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete source");
    } finally {
      setSavingKey(null);
    }
  }

  useEffect(() => {
    loadSources();
  }, []);

  const sources = data?.sources || [];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredSources = sources.filter((source) => {
    if (status === "enabled" && Number(source.enabled) !== 1) return false;
    if (status === "paused" && Number(source.enabled) === 1) return false;
    if (status === "failed" && !source.last_error) return false;
    if (status === "never" && source.ever_worked) return false;
    if (feedType !== "all" && source.feed_type !== feedType) return false;
    if (!normalizedQuery) return true;
    return [
      source.name,
      source.url,
      source.sport,
      source.country,
      source.competition,
      source.source_type,
      source.feed_type,
      source.language
    ].join(" ").toLowerCase().includes(normalizedQuery);
  });
  const feedTypes = [...new Set(sources.map((source) => source.feed_type).filter(Boolean))].sort();

  return (
    <>
        <header className="news-topbar">
          <div>
            <h1>News Endpoints</h1>
            <p>Operational source catalogue, health, fetch counts, and endpoint controls.</p>
          </div>
          <div className="news-kpis">
            <span><strong>{data?.summary.enabled ?? 0}</strong> enabled</span>
            <span><strong>{data?.summary.rss ?? 0}</strong> RSS</span>
            <span className={(data?.summary.failing || 0) > 0 ? "danger" : ""}><strong>{data?.summary.failing ?? 0}</strong> failing</span>
            <span className={(data?.summary.never_worked || 0) > 0 ? "danger" : ""}><strong>{data?.summary.never_worked ?? 0}</strong> never worked</span>
          </div>
          <button className="refresh-button" onClick={loadSources} type="button">
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        <section className="admin-source-filters" aria-label="News endpoint filters">
          <label className="news-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search source, sport, URL" />
          </label>
          <label className="filter-select">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All</option>
              <option value="enabled">Enabled</option>
              <option value="paused">Paused</option>
              <option value="failed">Failing</option>
              <option value="never">Never worked</option>
            </select>
          </label>
          <label className="filter-select">
            <span>Feed</span>
            <select value={feedType} onChange={(event) => setFeedType(event.target.value)}>
              <option value="all">All</option>
              {feedTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
        </section>

        {loading && <div className="news-state">Loading news endpoints...</div>}
        {error && !loading && <div className="news-state error">{error}</div>}

        {!loading && (
          <section className="admin-source-table-wrap news-panel" aria-label="News endpoint table">
            <div className="news-panel-head">
              <span><Database size={15} /> {filteredSources.length} endpoints</span>
              <strong>{sources.length} total</strong>
            </div>
            <table className="admin-source-table">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Feed</th>
                  <th>Worked</th>
                  <th>Status</th>
                  <th>Events</th>
                  <th>Latest</th>
                  <th>URL</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSources.map((source) => (
                  <tr key={source.key}>
                    <td>
                      <strong>{source.name}</strong>
                      <span>{[source.sport, source.country, source.competition].filter(Boolean).join(" / ") || source.kind}</span>
                      {source.last_error ? <small className="danger-cell">{source.last_error}</small> : null}
                    </td>
                    <td>
                      <span className={source.is_rss ? "source-pill rss" : "source-pill"}>{source.feed_type || source.source_type}</span>
                    </td>
                    <td>
                      <span className={source.ever_worked ? "source-pill ok" : "source-pill danger"}>{source.ever_worked ? "yes" : "no"}</span>
                    </td>
                    <td>
                      <span className={Number(source.enabled) === 1 ? "source-pill ok" : "source-pill muted"}>{Number(source.enabled) === 1 ? "enabled" : "paused"}</span>
                    </td>
                    <td>{asNumber(source.events_fetched).toLocaleString("en-GB")}</td>
                    <td>{formatDate(source.latest_event_at || source.last_success_at)}</td>
                    <td>
                      {source.url ? (
                        <a className="source-url" href={source.url} target="_blank" rel="noreferrer">
                          <span>{source.url}</span>
                          <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span className="source-url empty">No URL</span>
                      )}
                    </td>
                    <td>
                      <div className="source-actions">
                        <button
                          type="button"
                          disabled={savingKey === source.key}
                          onClick={() => setSourceEnabled(source, Number(source.enabled) !== 1)}
                          aria-label={Number(source.enabled) === 1 ? `Pause ${source.name}` : `Resume ${source.name}`}
                        >
                          {Number(source.enabled) === 1 ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                        </button>
                        <button
                          className="danger"
                          type="button"
                          disabled={savingKey === source.key}
                          onClick={() => deleteSource(source)}
                          aria-label={`Delete ${source.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSources.length === 0 && (
                  <tr>
                    <td colSpan={8}>No endpoints match the current filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}
    </>
  );
}

function AdminNewsSourcesPage() {
  return (
    <main className="admin-news-shell admin-console-shell">
      <aside className="news-rail admin-console-rail">
        <a href="#dashboard" aria-label="SportsEdge dashboard">
          <img className="news-logo mark-only" src={sportsEdgeMark} alt="SportsEdge Markets logo" />
        </a>
        <nav>
          <a href="#admin"><ShieldCheck size={16} /> Admin</a>
          <a className="active" href="#admin-news-sources"><Database size={16} /> News Sources</a>
          <a href="#dashboard"><Activity size={16} /> Terminal</a>
        </nav>
        <div className="rail-card">
          <span>Control</span>
          <strong>News Sources</strong>
          <small>pause / delete endpoints</small>
          <button className="admin-rail-logout" type="button" onClick={logoutToLogin}>
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>
      <section className="admin-news-main admin-console-main">
        <AdminNewsSourcesPanel />
      </section>
    </main>
  );
}

function DetailSection({ title, entries }: { title: string; entries: [string, unknown][] }) {
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      {entries.length > 0 ? (
        <div className="detail-kv">
          {entries.slice(0, 10).map(([key, value]) => (
            <div key={`${title}-${key}`}>
              <span>{key}</span>
              <strong>{shortValue(value)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p>No structured {title.toLowerCase()} stored for this item.</p>
      )}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function RefreshUpdateNotice() {
  const [available, setAvailable] = useState(false);
  const currentVersionRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkVersion() {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        const version = String(payload.version || "");
        if (!version) return;
        if (!currentVersionRef.current) {
          currentVersionRef.current = version;
          return;
        }
        if (!cancelled && currentVersionRef.current !== version) {
          setAvailable(true);
        }
      } catch {
        // Version checks should never disrupt the terminal.
      }
    }

    checkVersion();
    const timer = window.setInterval(checkVersion, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!available) return null;
  return (
    <div className="refresh-update-notice" role="status">
      <div>
        <strong>New SportsEdge version live</strong>
        <span>Refresh to load the latest terminal.</span>
      </div>
      <button type="button" onClick={() => window.location.reload()}>
        Refresh
      </button>
    </div>
  );
}

type AgTestRow = {
  id: string;
  startAt: string | null;
  kickoff: string;
  match: string;
  competition: string;
  coverage: Array<{ label: string; available: boolean }>;
  oddsCoverage: Array<{ label: string; available: boolean }>;
  outcomes: string[];
  betfair: string[];
  matchbook: string[];
  sx: string[];
  oddsApi: string[];
  bias: string;
  liquidity: string;
  fresh: string;
};

type OddsApiDiagnosticRow = {
  eventId: string;
  startTime: number | null;
  league: string;
  fixture: string;
  bookmaker: string;
  market: string;
  selection: string;
  odds: number | null;
  classification: string;
  sourceTs: string | null;
  hasBack: boolean;
  hasLay: boolean;
  hasSize: boolean;
  fieldKeys: string[];
};

type OddsApiDiagnosticResponse = {
  generatedAt: string;
  provider: string;
  sport: string;
  bookmakers: string[];
  eventCount: number;
  rowCount: number;
  counts: {
    byBookmaker: Record<string, number>;
    byClassification: Record<string, number>;
  };
  events: Array<{ eventId: string; league?: string; startTime?: number | null; fixture: string; targetBookmakers: string[] }>;
  rows: OddsApiDiagnosticRow[];
  errors: Array<{ eventId: string; fixture: string; message: string }>;
};

function AgStackCell({ values, className = "" }: { values?: string[]; className?: string }) {
  const displayValues = values?.length ? values : ["-"];
  return (
    <div className={`ag-stack-cell ${className}`}>
      <span>{displayValues.join("  |  ")}</span>
    </div>
  );
}

const ODDS_API_SOURCE_LABELS: Record<string, string> = {
  betfair: "OA-BF",
  matchbook: "OA-MB",
  smarkets: "SM",
  betdaq: "BD",
  bet365: "365"
};

function oddsApiFixtureKey(value: string) {
  return normalizeFixtureText(value)
    .replace(/\b(v|vs|versus)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isMoneylineOddsApiRow(row: OddsApiDiagnosticRow) {
  const market = String(row.market || "").toLowerCase();
  return market.includes("moneyline") || market.includes("match odds") || market.includes("1x2");
}

function decimalOddsLabel(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return "-";
  const odds = Number(value);
  return odds >= 10 ? odds.toFixed(1).replace(/\.0$/, "") : odds.toFixed(2).replace(/0$/, "").replace(/\.$/, "");
}

function shortSelectionLabel(value: string) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "selection";
  if (/^[a-f0-9]{24,}$/i.test(cleaned)) return "runner";
  return cleaned
    .replace(/\s+United\b/gi, " Utd")
    .replace(/\s+Hotspur\b/gi, " Spurs")
    .slice(0, 22);
}

function oddsApiSourceCoverage(rows: OddsApiDiagnosticRow[]) {
  const seen = new Set(rows.map((row) => String(row.bookmaker || "").toLowerCase()).filter(Boolean));
  return ["betfair", "matchbook", "smarkets", "betdaq", "bet365"].map((source) => ({
    label: ODDS_API_SOURCE_LABELS[source] || source.toUpperCase(),
    available: seen.has(source)
  }));
}

function formatOddsApiStack(rows: OddsApiDiagnosticRow[]) {
  if (!rows.length) return ["-"];
  const bySource = new Map<string, OddsApiDiagnosticRow[]>();
  rows.forEach((row) => {
    const source = String(row.bookmaker || "").toLowerCase();
    if (!source) return;
    if (!bySource.has(source)) bySource.set(source, []);
    bySource.get(source)?.push(row);
  });
  return [...bySource.entries()].map(([source, sourceRows]) => {
    const label = ODDS_API_SOURCE_LABELS[source] || source.toUpperCase();
    const prices = sourceRows
      .filter((row) => Number.isFinite(Number(row.odds)))
      .slice(0, 3)
      .map((row) => `${shortSelectionLabel(row.selection)} ${decimalOddsLabel(row.odds)}`);
    return `${label}: ${prices.length ? prices.join(" / ") : "odds"}`;
  }).slice(0, 5);
}

function sourceTimestampLabel(rows: OddsApiDiagnosticRow[]) {
  const latest = rows
    .map((row) => row.sourceTs ? new Date(row.sourceTs).getTime() : 0)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0];
  if (!latest) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/Madrid"
  }).format(new Date(latest));
}

function groupOddsApiRowsByEvent(rows: OddsApiDiagnosticRow[]) {
  const groups = new Map<string, OddsApiDiagnosticRow[]>();
  rows.forEach((row) => {
    const key = row.eventId || oddsApiFixtureKey(row.fixture);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(row);
  });
  return groups;
}

function fixtureOddsApiRows(fixtureName: string, oddsRows: OddsApiDiagnosticRow[]) {
  const key = oddsApiFixtureKey(fixtureName);
  if (!key) return [];
  return oddsRows.filter((row) => {
    const rowKey = oddsApiFixtureKey(row.fixture);
    return rowKey === key || rowKey.includes(key) || key.includes(rowKey);
  });
}

function buildAgTestRows(fixtures: FootballFixture[], priceRows: BackendPriceRow[], oddsRows: OddsApiDiagnosticRow[] = []) {
  const displayRows = collapseRowsByFixture(mergeDisplayPriceRows(priceRows));
  const moneylineOddsRows = oddsRows.filter(isMoneylineOddsApiRow);
  const matchedOddsEventIds = new Set<string>();
  const matchedBackendRowIds = new Set<string>();
  const baseRows = cleanFootballFixtures(fixtures)
    .map((fixture) => {
      const matched = findMarketRowForFootballFixture(fixture, displayRows);
      const backend = matched?.row;
      if (backend) matchedBackendRowIds.add(stableDisplayRowKey(backend) || backend.id);
      const outcomes = tradeableOutcomeRows(backend).slice(0, 3);
      const quote = sportsEdgeMarketQuote(backend);
      const oddsApiRows = fixtureOddsApiRows(footballFixtureName(fixture), moneylineOddsRows);
      oddsApiRows.forEach((row) => matchedOddsEventIds.add(row.eventId));
      const exchangeHasRoute = Boolean(backend && rowHasBettingExchange(backend));
      const oddsOnlyHasRoute = oddsApiRows.length > 0;
      return {
        id: fixture.id,
        startAt: fixture.kickoffAt,
        kickoff: formatFootballFixtureTime(fixture),
        match: footballFixtureName(fixture),
        competition: footballFixtureCompetition(fixture),
        coverage: exchangeCoverage(backend).map((exchange) => ({ label: exchange.label, available: exchange.isAvailable })),
        oddsCoverage: oddsApiSourceCoverage(oddsApiRows),
        outcomes: outcomes.length ? outcomes.map((outcome) => outcome.label) : ["Provider fixture"],
        betfair: outcomes.length ? outcomes.map((outcome) => formatOutcomeCell(outcome, "bf")) : ["-"],
        matchbook: outcomes.length ? outcomes.map((outcome) => formatOutcomeCell(outcome, "mb")) : ["-"],
        sx: outcomes.length ? outcomes.map((outcome) => formatOutcomeCell(outcome, "sx")) : ["-"],
        oddsApi: formatOddsApiStack(oddsApiRows),
        bias: rowHasMultiBettingExchange(backend) ? biasFromQuote(quote) : exchangeHasRoute ? "Single route" : oddsOnlyHasRoute ? "Odds-only" : "No route",
        liquidity: quote.liquidity || matched?.totalValue ? formatExchangeMoney(quote.liquidity || matched?.totalValue || 0, "GBP") : "-",
        fresh: quote.updatedAt || sourceTimestampLabel(oddsApiRows) || "watch"
      };
    });

  const backendOnlyRows = displayRows
    .filter((row) => !matchedBackendRowIds.has(stableDisplayRowKey(row) || row.id))
    .map((row) => {
      const outcomes = tradeableOutcomeRows(row).slice(0, 3);
      const quote = sportsEdgeMarketQuote(row);
      return {
        id: stableDisplayRowKey(row) || row.id,
        startAt: row.startAt,
        kickoff: displayStartTime(row),
        match: displayEventName(row.name),
        competition: row.competitionName || "Exchange football",
        coverage: exchangeCoverage(row).map((exchange) => ({ label: exchange.label, available: exchange.isAvailable })),
        oddsCoverage: oddsApiSourceCoverage([]),
        outcomes: outcomes.length ? outcomes.map((outcome) => outcome.label) : ["Exchange market"],
        betfair: outcomes.length ? outcomes.map((outcome) => formatOutcomeCell(outcome, "bf")) : ["-"],
        matchbook: outcomes.length ? outcomes.map((outcome) => formatOutcomeCell(outcome, "mb")) : ["-"],
        sx: outcomes.length ? outcomes.map((outcome) => formatOutcomeCell(outcome, "sx")) : ["-"],
        oddsApi: ["-"],
        bias: rowHasMultiBettingExchange(row) ? biasFromQuote(quote) : rowHasBettingExchange(row) ? "Single route" : "No route",
        liquidity: quote.liquidity || rowMatchedValue(row) ? formatExchangeMoney(quote.liquidity || rowMatchedValue(row), "GBP") : "-",
        fresh: quote.updatedAt || "watch"
      };
    });

  const oddsOnlyRows = [...groupOddsApiRowsByEvent(moneylineOddsRows).entries()]
    .filter(([eventId]) => !matchedOddsEventIds.has(eventId))
    .map(([eventId, eventRows]) => {
      const first = eventRows[0];
      const startAt = first?.startTime ? new Date(first.startTime * 1000).toISOString() : null;
      return {
        id: `oddsapi-${eventId}`,
        startAt,
        kickoff: first?.startTime ? oddsDiagnosticTime(first.startTime) : "-",
        match: first?.fixture || eventId,
        competition: first?.league || "Odds API football",
        coverage: exchangeCoverage(undefined).map((exchange) => ({ label: exchange.label, available: false })),
        oddsCoverage: oddsApiSourceCoverage(eventRows),
        outcomes: eventRows.slice(0, 3).map((row) => shortSelectionLabel(row.selection)),
        betfair: ["-"],
        matchbook: ["-"],
        sx: ["-"],
        oddsApi: formatOddsApiStack(eventRows),
        bias: "Odds-only",
        liquidity: "-",
        fresh: sourceTimestampLabel(eventRows) || "watch"
      };
    });

  return [...baseRows, ...backendOnlyRows, ...oddsOnlyRows]
    .filter((row) => row.coverage.some((exchange) => exchange.available) || row.oddsCoverage.some((source) => source.available));
}

function filterAgTestRows(rows: AgTestRow[], query: string) {
  const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
  if (!terms.length) return rows;
  return rows.filter((row) => {
    const haystack = normalizeFixtureText([
      row.kickoff,
      row.match,
      row.competition,
      row.coverage.filter((exchange) => exchange.available).map((exchange) => exchange.label).join(" "),
      row.oddsCoverage.filter((source) => source.available).map((source) => source.label).join(" "),
      row.outcomes.join(" "),
      row.betfair.join(" "),
      row.matchbook.join(" "),
      row.sx.join(" "),
      row.oddsApi.join(" "),
      row.bias,
      row.liquidity,
      row.fresh
    ].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

function agTestRowMatchesGroup(row: AgTestRow, group: string) {
  if (group === "all") return true;
  return rowMatchesMarketGroup({
    id: row.id,
    name: row.match,
    sportName: "football",
    competitionName: row.competition,
    marketName: "Match Odds",
    marketType: "MATCH_ODDS",
    startAt: row.startAt,
    matches: {}
  }, group);
}

function footballFilterBreadcrumb(bucket: string, group: string) {
  const bucketLabel = AGTEST_FOOTBALL_FILTER_LABELS.get(bucket);
  const groupLabel = AGTEST_FOOTBALL_FILTER_LABELS.get(group);
  return ["All", "Football", bucketLabel, group !== bucket ? groupLabel : ""]
    .filter(Boolean)
    .join(" / ");
}

function oddsDiagnosticTime(value: number | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
    hour12: false
  }).format(new Date(value * 1000));
}

function footballTeamAssetMatchesGroup(team: FootballTeamAsset, group: string) {
  if (group === "all" || group === "today" || group === "tomorrow") return true;
  const haystack = normalizeSelectionKey([
    team.fullName,
    team.shortName,
    team.country,
    team.currentLeague,
    ...(team.aliases || [])
  ].join(" "));
  const country = normalizeSelectionKey(team.country);
  if (group === "uk") return ["england", "scotland", "wales", "northern ireland"].includes(country);
  if (group === "english" || group === "england") return country === "england";
  if (group === "scottish") return country === "scotland" || haystack.includes("scottish");
  if (group === "wales") return country === "wales" || haystack.includes("cymru") || haystack.includes("welsh");
  if (group === "northern-ireland") return country === "northern ireland" || haystack.includes("nifl");
  if (group === "uefa") return ["uefa", "champions league", "europa league", "conference league", "nations league"].some((term) => haystack.includes(term));
  if (group === "international") return Boolean(team.national) || ["world cup", "euro", "copa", "afcon", "friendly", "national"].some((term) => haystack.includes(term));
  if (group === "world") return Boolean(team.national) || ["world", "fifa", "international"].some((term) => haystack.includes(term));
  const countryGroups: Record<string, string[]> = {
    germany: ["germany", "bundesliga"],
    spain: ["spain", "la liga", "segunda"],
    italy: ["italy", "serie a", "serie b"],
    france: ["france", "ligue 1", "ligue 2"],
    netherlands: ["netherlands", "eredivisie", "eerste divisie"],
    portugal: ["portugal", "primeira liga", "liga portugal"],
    turkey: ["turkey", "super lig", "super league"]
  };
  if (countryGroups[group]) return countryGroups[group].some((term) => haystack.includes(normalizeSelectionKey(term)));
  const terms = FOOTBALL_GROUP_TERMS[group];
  if (terms) return terms.some((term) => haystack.includes(normalizeSelectionKey(term)));
  return haystack.includes(normalizeSelectionKey(group));
}

function FootballProfilesPage() {
  const [teams, setTeams] = useState<FootballTeamAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filterBucket, setFilterBucket] = useState("all");
  const [marketGroup, setMarketGroup] = useState("all");

  useEffect(() => {
    let cancelled = false;
    async function loadTeams() {
      setLoading(true);
      try {
        const response = await fetch("/api/assets/football-teams?active=true&limit=25000", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.teams)) throw new Error(payload.detail || "team profiles failed");
        if (!cancelled) {
          setTeams(payload.teams as FootballTeamAsset[]);
          registerFootballTeamAssets(payload.teams as FootballTeamAsset[]);
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

  const secondaryFilters = AGTEST_FOOTBALL_SECONDARY_FILTERS[filterBucket] || [];
  const filteredTeams = useMemo(() => {
    const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
    return teams
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
  }, [teams, marketGroup, query]);

  return (
    <>
      <SportsEdgeTopbar active="profile-mockup" onSearchChange={setQuery} searchPlaceholder="Filter football teams, country, league..." />
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
            <span>{loading ? "loading" : "double-click opens profile"}</span>
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

function mergeSportDashboardEvents(rows: BackendPriceRow[], fallbackSport: string) {
  const merged = new Map<string, EntryEventRow>();
  rows.forEach((row) => {
    const entry = exchangeOddsRowToEntryEvent(row, fallbackSport);
    if (!entry.name || !entry.startAt || !entry.exchanges.length) return;
    const key = entryEventKey(entry);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, entry);
      return;
    }
    existing.liquidity += entry.liquidity;
    existing.exchanges = Array.from(new Set([...existing.exchanges, ...entry.exchanges]));
    if (eventStartSortValue(entry.latestSeenAt) > eventStartSortValue(existing.latestSeenAt)) existing.latestSeenAt = entry.latestSeenAt;
  });
  return Array.from(merged.values()).sort((a, b) => {
    const startDiff = eventStartSortValue(a.startAt) - eventStartSortValue(b.startAt);
    if (startDiff !== 0) return startDiff;
    return b.liquidity - a.liquidity;
  });
}

function SportDashboardFixtureTable({ title, rows, loading }: { title: string; rows: EntryEventRow[]; loading: boolean }) {
  return (
    <section className="sport-summary-panel sport-summary-fixtures">
      <header>
        <span>{title}</span>
        <strong>{rows.length}</strong>
      </header>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Fixture</th>
            <th>Competition</th>
            <th>Venues</th>
            <th>Liquidity</th>
            <th>Latest</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 12).map((event) => (
            <tr key={`${title}-${event.id}-${event.startAt}`}>
              <td className="mono positive">{madridEventTime(event.startAt)}</td>
              <td><strong>{event.name}</strong></td>
              <td>{event.competition || "-"}</td>
              <td><span className="sport-summary-venue">{event.exchanges.join(" / ")}</span></td>
              <td className="mono">{event.liquidity ? formatExchangeMoney(event.liquidity, "GBP") : "-"}</td>
              <td className="mono">{event.latestSeenAt ? madridEventTime(event.latestSeenAt) : "-"}</td>
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr><td className="empty" colSpan={6}>No fixtures returned for this day.</td></tr>
          )}
          {loading && rows.length === 0 && (
            <tr><td className="empty" colSpan={6}>Loading fixtures.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function SportSummaryDashboardPage({ sport }: { sport: string }) {
  const normalizedSport = sport === "horse-racing" ? "horseracing" : sport;
  const sportLabel = SPORT_LABELS.get(normalizedSport) || displayLabel(normalizedSport, "Sport");
  const [events, setEvents] = useState<EntryEventRow[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSportDashboard() {
      setLoading(true);
      try {
        const oddsParams = new URLSearchParams({
          sport: apiSportValue(normalizedSport),
          exchanges: ENTRY_DASHBOARD_EXCHANGES.map((exchange) => exchange.key).join(","),
          limit: "400"
        });
        const newsParams = new URLSearchParams({
          sport: apiSportValue(normalizedSport),
          limit: "30"
        });
        const [oddsResponse, newsResponse] = await Promise.all([
          fetch(`/api/exchange-odds?${oddsParams.toString()}`, { cache: "no-store" }),
          fetch(`/api/news?${newsParams.toString()}`, { cache: "no-store" })
        ]);
        const oddsPayload = await oddsResponse.json();
        const newsPayload = await newsResponse.json();
        if (!oddsResponse.ok || !Array.isArray(oddsPayload.rows)) throw new Error(oddsPayload.detail || "fixtures failed");
        if (!cancelled) {
          setEvents(mergeSportDashboardEvents(oddsPayload.rows as BackendPriceRow[], normalizedSport));
          setNews(Array.isArray(newsPayload.items) ? newsPayload.items as NewsItem[] : []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setEvents([]);
          setNews([]);
          setError(err instanceof Error ? err.message : "sport dashboard failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSportDashboard();
    const timer = window.setInterval(loadSportDashboard, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [normalizedSport]);

  const todayRows = events.filter((event) => isTodayInMadrid(event.startAt)).slice(0, 40);
  const tomorrowRows = events.filter((event) => isTomorrowInMadrid(event.startAt)).slice(0, 40);
  const topLiquidity = [...todayRows, ...tomorrowRows].sort((a, b) => b.liquidity - a.liquidity)[0];
  const venueCount = new Set(events.flatMap((event) => event.exchanges)).size;
  const latestTick = events
    .map((event) => event.latestSeenAt ? new Date(event.latestSeenAt).getTime() : 0)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0];

  return (
    <>
      <SportsEdgeTopbar active={normalizedSport} searchPlaceholder={`${sportLabel}: fixtures, news, liquidity...`} />
      <main className="sport-summary-page">
        <section className="sport-summary-hero">
          <div>
            <span>SportsEdge / {sportLabel}</span>
            <h1>{sportLabel} Dashboard</h1>
            <p>Today and tomorrow fixtures, exchange coverage, available liquidity, and sport-specific news.</p>
          </div>
          <div className="sport-summary-kpis">
            <article><span>Today</span><strong>{todayRows.length}</strong></article>
            <article><span>Tomorrow</span><strong>{tomorrowRows.length}</strong></article>
            <article><span>Venues</span><strong>{venueCount || "-"}</strong></article>
            <article><span>Top Liquidity</span><strong>{topLiquidity?.liquidity ? formatExchangeMoney(topLiquidity.liquidity, "GBP") : "-"}</strong></article>
            <article><span>Latest Tick</span><strong>{latestTick ? madridEventTime(new Date(latestTick).toISOString()) : "-"}</strong></article>
          </div>
        </section>

        {error && <div className="agtest-error">{error}</div>}

        <section className="sport-summary-layout">
          <div className="sport-summary-main">
            <SportDashboardFixtureTable title="Today" rows={todayRows} loading={loading} />
            <SportDashboardFixtureTable title="Tomorrow" rows={tomorrowRows} loading={loading} />
          </div>
          <aside className="sport-summary-news" aria-label={`${sportLabel} news`}>
            <header>
              <span>News</span>
              <strong>{news.length}</strong>
            </header>
            {news.slice(0, 14).map((item) => (
              <article key={item.id || `${item.title}-${item.published_at}`}>
                <div><span>{terminalNewsTimeLabel(item)}</span><strong>{terminalNewsTag(item)}</strong></div>
                <h3>{terminalNewsHeadline(item)}</h3>
                <p>{terminalNewsImpactText(item)}</p>
              </article>
            ))}
            {!loading && news.length === 0 && <p className="sport-summary-empty">No news returned for {sportLabel} yet.</p>}
            {loading && news.length === 0 && <p className="sport-summary-empty">Loading news.</p>}
          </aside>
        </section>
      </main>
    </>
  );
}

function OddsApiDiagnosticsPage() {
  const [data, setData] = useState<OddsApiDiagnosticResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookmakers, setBookmakers] = useState("betfair,matchbook,smarkets,betdaq,bet365");
  const [eventLimit, setEventLimit] = useState("6");
  const [query, setQuery] = useState("");

  async function loadDiagnostics() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sport: "soccer",
        bookmakers,
        eventLimit,
        scanPages: "2",
        pageLimit: "100",
        oddsLimit: "80"
      });
      const response = await fetch(`/api/odds-api/diagnostics?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.rows)) throw new Error(payload.detail || "odds diagnostics failed");
      setData(payload as OddsApiDiagnosticResponse);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "odds diagnostics failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const rows = useMemo(() => {
    const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
    const sourceRows = data?.rows || [];
    if (!terms.length) return sourceRows;
    return sourceRows.filter((row) => {
      const haystack = normalizeFixtureText([
        row.fixture,
        row.league,
        row.bookmaker,
        row.market,
        row.selection,
        row.classification,
        row.fieldKeys.join(" ")
      ].join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }, [data, query]);

  const classifications = data?.counts.byClassification || {};
  const bookmakerCounts = data?.counts.byBookmaker || {};

  return (
    <>
      <SportsEdgeTopbar active="football" onSearchChange={setQuery} searchPlaceholder="Filter Odds API rows, fields, bookmaker..." />
      <main className="oddsapi-page">
        <section className="oddsapi-head">
          <div>
            <span>Provider diagnostics</span>
            <h1>Odds API Exchange Pricing Probe</h1>
          </div>
          <div className="oddsapi-actions">
            <label><span>Bookmakers</span><input value={bookmakers} onChange={(event) => setBookmakers(event.target.value)} /></label>
            <label><span>Events</span><input value={eventLimit} onChange={(event) => setEventLimit(event.target.value)} /></label>
            <button type="button" onClick={loadDiagnostics} disabled={loading}>{loading ? "Checking" : "Refresh"}</button>
          </div>
        </section>

        <section className="oddsapi-summary">
          <article><span>Rows</span><strong>{rows.length}{query.trim() && data ? ` / ${data.rowCount}` : ""}</strong></article>
          <article><span>Events</span><strong>{data?.eventCount ?? "-"}</strong></article>
          <article><span>Exchange ladder</span><strong>{classifications.exchange_ladder || 0}</strong></article>
          <article><span>Exchange quote</span><strong>{classifications.exchange_quote || 0}</strong></article>
          <article><span>Bookmaker odds</span><strong>{classifications.bookmaker_odds || 0}</strong></article>
        </section>

        <section className="oddsapi-grid">
          <aside className="oddsapi-side">
            <div>
              <h2>Bookmakers</h2>
              {Object.entries(bookmakerCounts).map(([key, value]) => <p key={key}><span>{key}</span><strong>{value}</strong></p>)}
              {Object.keys(bookmakerCounts).length === 0 && <em>No provider rows yet.</em>}
            </div>
            <div>
              <h2>Events Found</h2>
              {(data?.events || []).map((event) => (
                <p key={event.eventId}><span>{event.fixture}</span><strong>{event.targetBookmakers?.join(" / ") || "-"}</strong></p>
              ))}
            </div>
          </aside>

          <section className="oddsapi-table-wrap">
            {error && <div className="oddsapi-state error">{error}</div>}
            {loading && !data && <div className="oddsapi-state">Checking provider fields.</div>}
            <table className="oddsapi-table">
              <thead>
                <tr>
                  <th>Time</th><th>Fixture</th><th>Bookmaker</th><th>Market</th><th>Odds</th><th>Back</th><th>Lay</th><th>Size</th><th>Classification</th><th>Source</th><th>Fields</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.eventId}-${row.bookmaker}-${row.market}-${row.selection}-${index}`}>
                    <td className="mono">{oddsDiagnosticTime(row.startTime)}</td>
                    <td><strong>{row.fixture || row.eventId}</strong><span>{row.league || "Soccer"}</span></td>
                    <td className="mono">{row.bookmaker}</td>
                    <td>{row.market}</td>
                    <td className="mono positive">{row.odds ?? "-"}</td>
                    <td className={row.hasBack ? "positive mono" : "mono"}>{row.hasBack ? "yes" : "-"}</td>
                    <td className={row.hasLay ? "sell mono" : "mono"}>{row.hasLay ? "yes" : "-"}</td>
                    <td className={row.hasSize ? "positive mono" : "mono"}>{row.hasSize ? "yes" : "-"}</td>
                    <td><span className={`oddsapi-class ${row.classification}`}>{row.classification}</span></td>
                    <td className="mono">{row.sourceTs ? formatDate(row.sourceTs) : "-"}</td>
                    <td className="oddsapi-fields">{row.fieldKeys.slice(0, 12).join(", ")}</td>
                  </tr>
                ))}
                {!loading && rows.length === 0 && <tr><td className="empty" colSpan={11}>No Odds API rows matched the current probe.</td></tr>}
              </tbody>
            </table>
            {data?.errors?.length ? <div className="oddsapi-errors">{data.errors.map((item) => <span key={`${item.eventId}-${item.message}`}>{item.fixture || item.eventId}: {item.message}</span>)}</div> : null}
          </section>
        </section>
      </main>
    </>
  );
}

type BetfairArbRow = {
  id: string;
  fixture: string;
  competition: string;
  market: string;
  startAt: string | null;
  observedAt: string | null;
  type: "back_book" | "lay_book" | "crossed_runner" | "watch";
  status: "EXECUTABLE_ARB" | "ANOMALY" | "WATCH";
  edgePct: number;
  roiPct: number;
  backBookPct: number | null;
  layBookPct: number | null;
  usableLiquidity: number;
  validRunners: number;
  expectedRunners: number | null;
  missingRunners: number | null;
  marketComplete: boolean;
  staleMs: number | null;
  executable: boolean;
  executableStake: number;
  maxProfit: number;
  maxLoss: number;
  reason: string;
  bestBack: string;
  bestLay: string;
  outcomes: string;
  liquidity: number;
};

const ARB_FRESH_MS = 2000;
const MIN_EXECUTABLE_STAKE = 10;

function runnerPriceText(runner: BackendRunner) {
  const back = runner.back ? `B ${runner.back.odds.toFixed(2)} ${formatExchangeMoney(runner.back.amount, "GBP")}` : "B -";
  const lay = runner.lay ? `L ${runner.lay.odds.toFixed(2)} ${formatExchangeMoney(runner.lay.amount, "GBP")}` : "L -";
  return `${runner.name}: ${back} / ${lay}`;
}

function marketBookPct(runners: BackendRunner[], side: "back" | "lay") {
  const prices = runners
    .map((runner) => runner[side]?.odds)
    .filter((odds): odds is number => Number.isFinite(Number(odds)) && Number(odds) > 1);
  if (prices.length !== runners.length || prices.length < 2) return null;
  return prices.reduce((sum, odds) => sum + 1 / odds, 0) * 100;
}

function safeArbMarket(match: BackendExchangeMatch, runners: BackendRunner[]) {
  const marketType = String(match.marketType || "").toUpperCase();
  const marketName = String(match.marketName || "").toLowerCase();
  if (marketType === "MATCH_ODDS" && runners.length === 3) return true;
  if ((marketType.startsWith("OVER_UNDER") || marketName.startsWith("over/under")) && runners.length === 2) return true;
  if ((marketType === "BOTH_TEAMS_TO_SCORE" || marketName.includes("both teams to score")) && runners.length === 2) return true;
  return false;
}

function expectedRunnerCount(match: BackendExchangeMatch) {
  const marketType = String(match.marketType || "").toUpperCase();
  const marketName = String(match.marketName || "").toLowerCase();
  if (marketType === "MATCH_ODDS") return 3;
  if (marketType.startsWith("OVER_UNDER") || marketName.startsWith("over/under")) return 2;
  if (marketType === "BOTH_TEAMS_TO_SCORE" || marketName.includes("both teams to score")) return 2;
  return null;
}

function runnerHasBothSides(runner: BackendRunner) {
  return Number(runner.back?.odds || 0) > 1
    && Number(runner.lay?.odds || 0) > 1
    && Number(runner.back?.amount || 0) > 0
    && Number(runner.lay?.amount || 0) > 0;
}

function staleMsFromObservedAt(value: string | null | undefined) {
  if (!value) return null;
  const normalized = String(value).includes("T") ? String(value) : `${String(value).replace(" ", "T")}Z`;
  const ms = Date.now() - new Date(normalized).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function arbFreshnessLabel(ms: number | null) {
  if (ms == null) return "-";
  if (ms < 1000) return `${Math.max(0, ms)}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

function usableBookLiquidity(runners: BackendRunner[], side: "back" | "lay") {
  const prices = runners.map((runner) => runner[side]).filter(Boolean) as BackendRunnerLevel[];
  if (prices.length !== runners.length || !prices.length) return 0;
  const weights = prices.map((price) => 1 / price.odds);
  const scale = Math.min(...prices.map((price, index) => price.amount / weights[index]));
  if (!Number.isFinite(scale) || scale <= 0) return 0;
  return weights.reduce((sum, weight) => sum + weight * scale, 0);
}

function backBookExecution(runners: BackendRunner[], bookPct: number | null) {
  if (bookPct == null || bookPct <= 0 || bookPct >= 100) return { executableStake: 0, maxProfit: 0, maxLoss: 0 };
  const prices = runners.map((runner) => runner.back).filter(Boolean) as BackendRunnerLevel[];
  if (prices.length !== runners.length) return { executableStake: 0, maxProfit: 0, maxLoss: 0 };
  const book = bookPct / 100;
  const weights = prices.map((price) => 1 / price.odds);
  const maxReturn = Math.min(...prices.map((price, index) => price.amount / weights[index]));
  if (!Number.isFinite(maxReturn) || maxReturn <= 0) return { executableStake: 0, maxProfit: 0, maxLoss: 0 };
  const executableStake = maxReturn * book;
  const maxProfit = maxReturn - executableStake;
  return { executableStake, maxProfit, maxLoss: 0 };
}

function layBookExecution(runners: BackendRunner[], bookPct: number | null) {
  if (bookPct == null || bookPct <= 100) return { executableStake: 0, maxProfit: 0, maxLoss: 0 };
  const prices = runners.map((runner) => runner.lay).filter(Boolean) as BackendRunnerLevel[];
  if (prices.length !== runners.length) return { executableStake: 0, maxProfit: 0, maxLoss: 0 };
  const book = bookPct / 100;
  const maxStake = Math.min(...prices.map((price) => price.amount * book * price.odds));
  if (!Number.isFinite(maxStake) || maxStake <= 0) return { executableStake: 0, maxProfit: 0, maxLoss: 0 };
  const maxProfit = maxStake * (1 - 1 / book);
  return { executableStake: maxStake, maxProfit, maxLoss: 0 };
}

function crossedRunnerExecution(runner: BackendRunner) {
  const backOdds = Number(runner.back?.odds || 0);
  const layOdds = Number(runner.lay?.odds || 0);
  const backAmount = Number(runner.back?.amount || 0);
  const layAmount = Number(runner.lay?.amount || 0);
  if (backOdds <= 1 || layOdds <= 1 || backOdds <= layOdds || backAmount <= 0 || layAmount <= 0) {
    return { executableStake: 0, maxProfit: 0, maxLoss: 0 };
  }
  const backStake = Math.min(backAmount, layAmount * layOdds / backOdds);
  const layStake = backStake * backOdds / layOdds;
  const maxProfit = layStake - backStake;
  return { executableStake: backStake + layStake, maxProfit, maxLoss: 0 };
}

function executionStatus(execution: { executableStake: number; maxProfit: number; maxLoss: number }, isFresh: boolean, marketComplete: boolean) {
  return isFresh
    && marketComplete
    && execution.executableStake >= MIN_EXECUTABLE_STAKE
    && execution.maxProfit > 0
    && execution.maxLoss <= 0;
}

function buildBetfairArbRows(rows: BackendPriceRow[]) {
  const output: BetfairArbRow[] = [];

  for (const row of rows) {
    const match = row.matches?.betfair;
    if (!match || !match.runners?.length) continue;
    const marketName = match.marketName || row.marketName || "Market";
    const runners = [...match.runners].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    if (runners.length < 2 || runners.length > 30) continue;
    const expectedRunners = expectedRunnerCount(match);
    const validRunners = runners.filter(runnerHasBothSides).length;
    const missingRunners = expectedRunners == null ? null : Math.max(0, expectedRunners - validRunners);
    const marketComplete = expectedRunners != null && runners.length === expectedRunners && validRunners === expectedRunners && missingRunners === 0;
    const staleMs = staleMsFromObservedAt(match.observedAt);
    const isFresh = staleMs != null && staleMs <= ARB_FRESH_MS;
    const isSafeMarket = safeArbMarket(match, runners);

    const backBookPct = isSafeMarket && marketComplete ? marketBookPct(runners, "back") : null;
    const layBookPct = isSafeMarket && marketComplete ? marketBookPct(runners, "lay") : null;
    let hasSignal = false;
    const outcomes = runners.map(runnerPriceText).join(" | ");
    const liquidity = runners.reduce((sum, runner) => (
      sum
      + Number(runner.back?.amount || 0)
      + Number(runner.lay?.amount || 0)
    ), 0);
    const base = {
      fixture: match.name || row.name,
      competition: match.competitionName || row.competitionName || "",
      market: marketName,
      startAt: match.startAt || row.startAt,
      observedAt: match.observedAt,
      backBookPct,
      layBookPct,
      validRunners,
      expectedRunners,
      missingRunners,
      marketComplete,
      staleMs,
      executable: false,
      executableStake: 0,
      maxProfit: 0,
      maxLoss: 0,
      reason: !isSafeMarket ? "unsupported market"
        : !marketComplete ? `incomplete ${validRunners}/${expectedRunners || runners.length}`
          : !isFresh ? `stale ${arbFreshnessLabel(staleMs)}`
            : "watch",
      bestBack: backBookPct == null ? "-" : `${backBookPct.toFixed(2)}%`,
      bestLay: layBookPct == null ? "-" : `${layBookPct.toFixed(2)}%`,
      outcomes,
      usableLiquidity: 0,
      liquidity
    };

    if (backBookPct != null && backBookPct < 99.95) {
      const id = `${match.marketId}:back`;
      const roiPct = (100 / backBookPct - 1) * 100;
      const execution = backBookExecution(runners, backBookPct);
      const executable = executionStatus(execution, isFresh, marketComplete);
      hasSignal = true;
      output.push({
        id,
        ...base,
        type: "back_book",
        status: executable ? "EXECUTABLE_ARB" : "ANOMALY",
        edgePct: 100 - backBookPct,
        roiPct,
        usableLiquidity: execution.executableStake || usableBookLiquidity(runners, "back"),
        executable,
        executableStake: execution.executableStake,
        maxProfit: execution.maxProfit,
        maxLoss: execution.maxLoss,
        reason: executable ? "complete + fresh + sized" : execution.executableStake < MIN_EXECUTABLE_STAKE ? "below min executable stake" : base.reason
      });
    }

    if (layBookPct != null && layBookPct > 100.05) {
      const id = `${match.marketId}:lay`;
      const roiPct = (1 - 100 / layBookPct) * 100;
      const execution = layBookExecution(runners, layBookPct);
      const executable = executionStatus(execution, isFresh, marketComplete);
      hasSignal = true;
      output.push({
        id,
        ...base,
        type: "lay_book",
        status: executable ? "EXECUTABLE_ARB" : "ANOMALY",
        edgePct: layBookPct - 100,
        roiPct,
        usableLiquidity: execution.executableStake || usableBookLiquidity(runners, "lay"),
        executable,
        executableStake: execution.executableStake,
        maxProfit: execution.maxProfit,
        maxLoss: execution.maxLoss,
        reason: executable ? "complete + fresh + sized" : execution.executableStake < MIN_EXECUTABLE_STAKE ? "below min executable stake" : base.reason
      });
    }

    for (const runner of runners) {
      const backOdds = Number(runner.back?.odds || 0);
      const layOdds = Number(runner.lay?.odds || 0);
      if (backOdds > 1 && layOdds > 1 && backOdds > layOdds) {
        const id = `${match.marketId}:${runner.id}:crossed`;
        const roiPct = ((backOdds / layOdds) - 1) * 100;
        const execution = crossedRunnerExecution(runner);
        const executable = isFresh
          && execution.executableStake >= MIN_EXECUTABLE_STAKE
          && execution.maxProfit > 0;
        hasSignal = true;
        output.push({
          id,
          ...base,
          type: "crossed_runner",
          status: executable ? "EXECUTABLE_ARB" : "ANOMALY",
          edgePct: roiPct,
          roiPct,
          usableLiquidity: execution.executableStake,
          executable,
          executableStake: execution.executableStake,
          maxProfit: execution.maxProfit,
          maxLoss: execution.maxLoss,
          reason: executable ? "crossed + fresh + sized" : execution.executableStake < MIN_EXECUTABLE_STAKE ? "below min executable stake" : base.reason,
          outcomes: runnerPriceText(runner)
        });
      }
    }

    const watchId = `${match.marketId}:watch`;
    if (!hasSignal && output.length < 120) {
      const backMiss = backBookPct == null ? Number.POSITIVE_INFINITY : Math.abs(100 - backBookPct);
      const layMiss = layBookPct == null ? Number.POSITIVE_INFINITY : Math.abs(100 - layBookPct);
      const edgePct = -Math.min(backMiss, layMiss);
      output.push({
        id: watchId,
        ...base,
        type: "watch",
        status: "WATCH",
        edgePct,
        roiPct: 0,
        usableLiquidity: 0,
        executableStake: 0,
        maxProfit: 0,
        maxLoss: 0,
        reason: base.reason
      });
    }
  }

  return output.sort((a, b) => {
    const statusRank = { EXECUTABLE_ARB: 0, ANOMALY: 1, WATCH: 2 };
    if (a.status !== b.status) return statusRank[a.status] - statusRank[b.status];
    return b.edgePct - a.edgePct || b.liquidity - a.liquidity;
  });
}

function betfairArbTypeLabel(type: BetfairArbRow["type"]) {
  if (type === "back_book") return "Back book";
  if (type === "lay_book") return "Lay book";
  if (type === "crossed_runner") return "Crossed runner";
  return "Watch";
}

function arbStatusClass(status: BetfairArbRow["status"]) {
  return status.toLowerCase().replace("_", "-");
}

function BetfairArbsPage() {
  const [rows, setRows] = useState<BetfairArbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  async function loadArbs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sport: "football",
        exchanges: "betfair",
        segment: "all",
        limit: "1000"
      });
      const response = await fetch(`/api/exchange-odds?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.rows)) throw new Error(payload.detail || "Betfair arb scan failed");
      setRows(buildBetfairArbRows(payload.rows as BackendPriceRow[]));
      setLastRefresh(payload.generatedAt || new Date().toISOString());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Betfair arb scan failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArbs();
    const timer = window.setInterval(loadArbs, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredRows = useMemo(() => {
    const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
    if (!terms.length) return rows;
    return rows.filter((row) => {
      const haystack = normalizeFixtureText([
        row.fixture,
        row.competition,
        row.market,
        row.type,
        row.outcomes
      ].join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }, [query, rows]);

  const executableRows = filteredRows.filter((row) => row.status === "EXECUTABLE_ARB");
  const anomalyRows = filteredRows.filter((row) => row.status === "ANOMALY");
  const watchedMarkets = rows.length;
  const freshest = lastRefresh ? new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Madrid",
    hour12: false
  }).format(new Date(lastRefresh)) : "-";

  return (
    <>
      <SportsEdgeTopbar active="arbs" onSearchChange={setQuery} searchPlaceholder="Filter arbs, fixture, market, runner..." />
      <main className="agtest-page arbs-page">
        <section className="agtest-subbar" aria-label="Betfair arb monitor context">
          <nav aria-label="Arbitrage sections">
            <button className="active" type="button">Betfair</button>
            <button type="button" onClick={() => { window.location.hash = "#liquidity"; }}>Liquidity</button>
            <button type="button" onClick={() => { window.location.hash = "#oddsapi"; }}>Odds API</button>
          </nav>
          <div>
            <span>{executableRows.length} executable</span>
            <span>{anomalyRows.length} anomalies</span>
            <span>{watchedMarkets} watched</span>
            <span>{loading ? "scanning" : `fresh ${freshest}`}</span>
          </div>
        </section>

        <section className="arbs-summary">
          <article><span>Executable</span><strong>{executableRows.length}</strong></article>
          <article><span>Anomalies</span><strong>{anomalyRows.length}</strong></article>
          <article><span>Best ROI</span><strong>{executableRows[0] ? `${executableRows[0].roiPct.toFixed(2)}%` : "-"}</strong></article>
          <article><span>Markets watched</span><strong>{watchedMarkets}</strong></article>
        </section>

        <section className="arbs-table-wrap">
          {error && <div className="agtest-error">{error}</div>}
          <table className="arbs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Fixture</th>
                <th>Market</th>
                <th>Signal</th>
                <th>Status</th>
                <th>Arb %</th>
                <th>ROI</th>
                <th>Back total</th>
                <th>Lay total</th>
                <th>expected_runners</th>
                <th>valid_runners</th>
                <th>missing_runners</th>
                <th>stale_ms</th>
                <th>executable_stake</th>
                <th>max_profit</th>
                <th>max_loss</th>
                <th>Both sides</th>
                <th>Fresh</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr className={row.status === "EXECUTABLE_ARB" ? "is-executable" : row.status === "ANOMALY" ? "is-anomaly" : ""} key={row.id}>
                  <td className="mono">{row.startAt ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid", hour12: false }).format(new Date(row.startAt)) : "-"}</td>
                  <td><strong>{row.fixture}</strong><span>{row.competition}</span></td>
                  <td>{row.market}</td>
                  <td><span className={`arb-type ${arbStatusClass(row.status)}`}>{betfairArbTypeLabel(row.type)}</span></td>
                  <td><strong>{row.status}</strong><span>{row.reason}</span></td>
                  <td className={row.status === "EXECUTABLE_ARB" ? "mono positive" : "mono"}>{row.edgePct > 0 ? `+${row.edgePct.toFixed(2)}%` : `${row.edgePct.toFixed(2)}%`}</td>
                  <td className={row.status === "EXECUTABLE_ARB" ? "mono positive" : "mono"}>{row.roiPct ? `${row.roiPct.toFixed(2)}%` : "-"}</td>
                  <td className="mono">{row.bestBack}</td>
                  <td className="mono">{row.bestLay}</td>
                  <td className="mono">{row.expectedRunners ?? "-"}</td>
                  <td className="mono">{row.validRunners}</td>
                  <td className="mono">{row.missingRunners ?? "-"}</td>
                  <td className="mono">{row.staleMs == null ? "-" : Math.max(0, Math.round(row.staleMs))}</td>
                  <td className="mono">{row.executableStake ? formatExchangeMoney(row.executableStake, "GBP") : "-"}</td>
                  <td className={row.maxProfit > 0 ? "mono positive" : "mono"}>{row.maxProfit ? formatExchangeMoney(row.maxProfit, "GBP") : "-"}</td>
                  <td className="mono">{row.maxLoss ? formatExchangeMoney(row.maxLoss, "GBP") : "£0"}</td>
                  <td className="arbs-outcomes">{row.outcomes}</td>
                  <td className="mono">{arbFreshnessLabel(row.staleMs)}</td>
                </tr>
              ))}
              {!loading && filteredRows.length === 0 && (
                <tr><td className="empty" colSpan={18}>No Betfair markets matched the current arb scan.</td></tr>
              )}
              {loading && filteredRows.length === 0 && (
                <tr><td className="empty" colSpan={18}>Scanning Betfair back and lay books.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}

type OddsOutcome = "home" | "draw" | "away";
type AgTest2EventRow = {
  id: string;
  startTime: number | null;
  kickoff: string;
  fixture: string;
  league: string;
  read: "aligned" | "split" | "sparse";
  sourceOdds: Record<string, Partial<Record<OddsOutcome, number>>>;
  consensus: Partial<Record<OddsOutcome, number>>;
  bias: string;
  note: string;
};

const AGTEST2_SOURCES = [
  { key: "matchbook", label: "Matchbook", short: "MB", kind: "exchange" },
  { key: "betfair", label: "Betfair", short: "BF", kind: "exchange" },
  { key: "smarkets", label: "Smarkets", short: "SM", kind: "exchange" },
  { key: "betdaq", label: "Betdaq", short: "BD", kind: "exchange" },
  { key: "unibet", label: "Unibet", short: "UNI", kind: "anchor" }
] as const;

function oddsOutcomeFromRow(row: OddsApiDiagnosticRow): OddsOutcome | null {
  const market = String(row.market || "").toLowerCase();
  const selection = normalizeFixtureText(row.selection || "");
  if (market.includes("/draw") || selection === "draw" || selection.includes(" the draw")) return "draw";
  if (market.includes("/home")) return "home";
  if (market.includes("/away")) return "away";
  return null;
}

function buildAgTest2Rows(rows: OddsApiDiagnosticRow[]): AgTest2EventRow[] {
  const moneylineRows = rows.filter((row) => isMoneylineOddsApiRow(row) && Number.isFinite(Number(row.odds)));
  const grouped = groupOddsApiRowsByEvent(moneylineRows);
  return [...grouped.entries()].map(([eventId, eventRows]) => {
    const first = eventRows[0];
    const sourceOdds: Record<string, Partial<Record<OddsOutcome, number>>> = {};
    eventRows.forEach((row) => {
      const source = String(row.bookmaker || "").toLowerCase();
      const outcome = oddsOutcomeFromRow(row);
      const odds = Number(row.odds);
      if (!AGTEST2_SOURCES.some((item) => item.key === source) || !outcome || !Number.isFinite(odds)) return;
      sourceOdds[source] = sourceOdds[source] || {};
      const current = sourceOdds[source][outcome];
      if (!current || odds > current) sourceOdds[source][outcome] = odds;
    });
    const consensus: Partial<Record<OddsOutcome, number>> = {};
    (["home", "draw", "away"] as OddsOutcome[]).forEach((outcome) => {
      const prices = AGTEST2_SOURCES
        .map((source) => sourceOdds[source.key]?.[outcome])
        .filter((value): value is number => Number.isFinite(Number(value)));
      if (prices.length) consensus[outcome] = prices.reduce((sum, value) => sum + value, 0) / prices.length;
    });
    const sourceCount = AGTEST2_SOURCES.filter((source) => Object.keys(sourceOdds[source.key] || {}).length > 0).length;
    const outcomeSpreads = (["home", "draw", "away"] as OddsOutcome[]).map((outcome) => {
      const prices = AGTEST2_SOURCES
        .map((source) => sourceOdds[source.key]?.[outcome])
        .filter((value): value is number => Number.isFinite(Number(value)));
      if (prices.length < 2) return 0;
      return (Math.max(...prices) - Math.min(...prices)) / Math.max(...prices);
    });
    const maxSpread = Math.max(...outcomeSpreads, 0);
    const read = sourceCount < 3 ? "sparse" : maxSpread > 0.08 ? "split" : "aligned";
    const shortestOutcome = (["home", "draw", "away"] as OddsOutcome[])
      .filter((outcome) => Number.isFinite(Number(consensus[outcome])))
      .sort((a, b) => Number(consensus[a]) - Number(consensus[b]))[0];
    const bias = shortestOutcome === "home" ? "Home consensus" : shortestOutcome === "away" ? "Away consensus" : shortestOutcome === "draw" ? "Draw pressure" : "No read";
    const note = read === "aligned"
      ? "Sources broadly aligned"
      : read === "split"
        ? "Book/exchange spread worth watching"
        : "Limited source count";
    return {
      id: eventId,
      startTime: first?.startTime || null,
      kickoff: first?.startTime ? oddsDiagnosticTime(first.startTime) : "-",
      fixture: first?.fixture || eventId,
      league: first?.league || "Football",
      read,
      sourceOdds,
      consensus,
      bias,
      note
    };
  }).filter((row) => AGTEST2_SOURCES.some((source) => Object.keys(row.sourceOdds[source.key] || {}).length > 0))
    .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
}

function oddsPillClass(value: number | undefined, row: AgTest2EventRow, outcome: OddsOutcome) {
  if (!Number.isFinite(Number(value))) return "miss";
  const prices = AGTEST2_SOURCES
    .map((source) => row.sourceOdds[source.key]?.[outcome])
    .filter((price): price is number => Number.isFinite(Number(price)));
  if (prices.length < 2) return "";
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  if (Math.abs(Number(value) - max) < 0.0001) return "best";
  if (Math.abs(Number(value) - min) < 0.0001) return "short";
  return "";
}

function agTest2OddsKey(eventId: string, source: string, outcome: OddsOutcome) {
  return `${eventId}:${source}:${outcome}`;
}

function flattenAgTest2Odds(rows: AgTest2EventRow[]) {
  const values = new Map<string, number>();
  rows.forEach((row) => {
    AGTEST2_SOURCES.forEach((source) => {
      (["home", "draw", "away"] as OddsOutcome[]).forEach((outcome) => {
        const value = row.sourceOdds[source.key]?.[outcome];
        if (Number.isFinite(Number(value))) values.set(agTest2OddsKey(row.id, source.key, outcome), Number(value));
      });
    });
  });
  return values;
}

function OddsPill({ label, value, tone, changed }: { label: string; value?: number; tone: string; changed?: boolean }) {
  const classes = ["agtest2-odd", tone, changed ? "changed" : ""].filter(Boolean).join(" ");
  return <span className={classes}><b>{label}</b>{Number.isFinite(Number(value)) ? decimalOddsLabel(value) : "-"}</span>;
}

function OddsSourceCell({ row, source, changedKeys }: { row: AgTest2EventRow; source: typeof AGTEST2_SOURCES[number]; changedKeys: Set<string> }) {
  const odds = row.sourceOdds[source.key] || {};
  return (
    <div className="agtest2-odds-set" title={source.label}>
      <OddsPill label="H" value={odds.home} tone={oddsPillClass(odds.home, row, "home")} changed={changedKeys.has(agTest2OddsKey(row.id, source.key, "home"))} />
      <OddsPill label="D" value={odds.draw} tone={oddsPillClass(odds.draw, row, "draw")} changed={changedKeys.has(agTest2OddsKey(row.id, source.key, "draw"))} />
      <OddsPill label="A" value={odds.away} tone={oddsPillClass(odds.away, row, "away")} changed={changedKeys.has(agTest2OddsKey(row.id, source.key, "away"))} />
    </div>
  );
}

function ConsensusCell({ row }: { row: AgTest2EventRow }) {
  return (
    <div className="agtest2-odds-set agtest2-consensus-set" title="Average consensus across visible source prices">
      <OddsPill label="H" value={row.consensus.home} tone={row.bias === "Home consensus" ? "consensus" : ""} />
      <OddsPill label="D" value={row.consensus.draw} tone={row.bias === "Draw pressure" ? "consensus" : ""} />
      <OddsPill label="A" value={row.consensus.away} tone={row.bias === "Away consensus" ? "consensus" : ""} />
    </div>
  );
}

function AgTest2Page() {
  const [data, setData] = useState<OddsApiDiagnosticResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const previousOddsRef = useRef<Map<string, number> | null>(null);
  const clearChangedTimerRef = useRef<number | null>(null);

  async function loadRows() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sport: "soccer",
        bookmakers: AGTEST2_SOURCES.map((source) => source.key).join(","),
        eventLimit: "40",
        scanPages: "5",
        pageLimit: "200",
        oddsLimit: "1000"
      });
      const response = await fetch(`/api/odds-api/diagnostics?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.rows)) throw new Error(payload.detail || "odds alignment failed");
      setData(payload as OddsApiDiagnosticResponse);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "odds alignment failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
    const timer = window.setInterval(loadRows, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const allRows = useMemo(() => buildAgTest2Rows(data?.rows || []), [data]);
  useEffect(() => {
    const currentOdds = flattenAgTest2Odds(allRows);
    const previousOdds = previousOddsRef.current;
    if (previousOdds) {
      const nextChanged = new Set<string>();
      currentOdds.forEach((value, key) => {
        const previous = previousOdds.get(key);
        if (previous !== undefined && Math.abs(previous - value) > 0.0001) nextChanged.add(key);
      });
      if (nextChanged.size) {
        setChangedKeys(nextChanged);
        if (clearChangedTimerRef.current) window.clearTimeout(clearChangedTimerRef.current);
        clearChangedTimerRef.current = window.setTimeout(() => setChangedKeys(new Set()), 2200);
      }
    }
    previousOddsRef.current = currentOdds;
  }, [allRows]);

  useEffect(() => () => {
    if (clearChangedTimerRef.current) window.clearTimeout(clearChangedTimerRef.current);
  }, []);

  const rows = useMemo(() => {
    const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
    if (!terms.length) return allRows;
    return allRows.filter((row) => {
      const haystack = normalizeFixtureText([row.fixture, row.league, row.read, row.bias, row.note].join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }, [allRows, query]);
  const aligned = allRows.filter((row) => row.read === "aligned").length;
  const split = allRows.filter((row) => row.read === "split").length;
  const sparse = allRows.filter((row) => row.read === "sparse").length;
  const bookmakerCounts = data?.counts.byBookmaker || {};

  return (
    <>
      <SportsEdgeTopbar active="bias-matrix" onSearchChange={setQuery} searchPlaceholder="Filter alignment rows, fixture, source, bias..." />
      <main className="agtest2-page">
        <section className="agtest-subbar" aria-label="Bias Matrix odds alignment context">
          <nav aria-label="Bias Matrix sections">
            <button className="active" type="button">Odds Alignment</button>
            <button type="button" onClick={() => { window.location.hash = "#liquidity"; }}>Liquidity</button>
            <button type="button" onClick={() => { window.location.hash = "#oddsapi"; }}>Diagnostics</button>
          </nav>
          <div>
            <span>{rows.length}{query.trim() ? ` / ${allRows.length}` : ""} fixtures</span>
            <span>MB / BF / SM / BD / UNI</span>
            <span>{loading ? "loading" : "odds-only bias"}</span>
          </div>
        </section>
        <section className="agtest2-summary">
          <article><span>Fixtures</span><strong>{allRows.length}</strong></article>
          <article><span>Aligned</span><strong>{aligned}</strong></article>
          <article><span>Split</span><strong>{split}</strong></article>
          <article><span>Sparse</span><strong>{sparse}</strong></article>
          <article><span>Anchor</span><strong>Unibet</strong></article>
          <article><span>B365</span><strong>0</strong></article>
        </section>
        {error && <div className="agtest-error">{error}</div>}
        <section className="agtest2-table-wrap">
          <table className="agtest2-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Fixture</th>
                <th>Read</th>
                {AGTEST2_SOURCES.map((source) => <th key={source.key}>{source.label}<small>{bookmakerCounts[source.key] || 0}</small></th>)}
                <th>Consensus</th>
                <th>Bias</th>
                <th>Human note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="mono agtest2-time">{row.kickoff}</td>
                  <td className="agtest2-fixture"><strong>{row.fixture}</strong><span>{row.league}</span></td>
                  <td><span className={`agtest2-status ${row.read}`}>{row.read}</span></td>
                  {AGTEST2_SOURCES.map((source) => <td key={`${row.id}-${source.key}`}><OddsSourceCell row={row} source={source} changedKeys={changedKeys} /></td>)}
                  <td className="agtest2-consensus"><ConsensusCell row={row} /></td>
                  <td className="mono agtest2-bias">{row.bias}</td>
                  <td className="agtest2-note">{row.note}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && <tr><td className="empty" colSpan={11}>No odds alignment rows matched the current filter.</td></tr>}
              {loading && rows.length === 0 && <tr><td className="empty" colSpan={11}>Loading odds alignment matrix.</td></tr>}
            </tbody>
          </table>
        </section>
        <footer className="agtest2-legend">
          <span><b>H</b> home</span>
          <span><b>D</b> draw</span>
          <span><b>A</b> away</span>
          <span>green = best price</span>
          <span>red = shortest</span>
          <span>grey = missing source</span>
        </footer>
      </main>
    </>
  );
}

function AgTestPage() {
  const [fixtures, setFixtures] = useState<FootballFixture[]>([]);
  const [backendRows, setBackendRows] = useState<BackendPriceRow[]>([]);
  const [oddsApiRows, setOddsApiRows] = useState<OddsApiDiagnosticRow[]>([]);
  const [oddsApiSummary, setOddsApiSummary] = useState<OddsApiDiagnosticResponse["counts"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBucket, setFilterBucket] = useState("all");
  const [marketGroup, setMarketGroup] = useState("all");
  const [socketStatus, setSocketStatus] = useState<"offline" | "connecting" | "live" | "waiting">("offline");
  const reconnectTimerRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingPriceEventsRef = useRef<Array<{ channel: string; payload: unknown }>>([]);
  const priceFlushTimerRef = useRef<number | null>(null);
  const allRows = useMemo(() => buildAgTestRows(fixtures, backendRows, oddsApiRows), [fixtures, backendRows, oddsApiRows]);
  const groupedRows = useMemo(() => allRows.filter((row) => agTestRowMatchesGroup(row, marketGroup)), [allRows, marketGroup]);
  const rows = useMemo(() => filterAgTestRows(groupedRows, searchQuery), [groupedRows, searchQuery]);
  const secondaryFilters = AGTEST_FOOTBALL_SECONDARY_FILTERS[filterBucket] || [];

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      setLoading(true);
      try {
        const oddsResponse = await fetch("/api/exchange-odds?sport=football&exchanges=betfair,matchbook,sx&segment=upcoming4&limit=500", { cache: "no-store" });
        const oddsPayload = await oddsResponse.json();
        if (!oddsResponse.ok || !Array.isArray(oddsPayload.rows)) throw new Error(oddsPayload.detail || "odds failed");

        if (!cancelled) {
          setBackendRows((currentRows) => mergeDisplayPriceRows([
            ...(oddsPayload.rows as BackendPriceRow[]),
            ...currentRows
          ]).slice(0, 700));
          setError("");
          setLoading(false);
        }

        const [fixtureResponse, oddsApiResponse] = await Promise.all([
          fetch("/api/football/fixtures?days=4&limit=2000&timezone=Europe/London", { cache: "no-store" }),
          fetch("/api/odds-api/diagnostics?sport=soccer&bookmakers=betfair,matchbook,smarkets,betdaq,bet365&eventLimit=20&scanPages=5&pageLimit=200&oddsLimit=1000", { cache: "no-store" })
        ]);
        const fixturePayload = await fixtureResponse.json().catch(() => ({}));
        const oddsApiPayload = await oddsApiResponse.json().catch(() => ({}));
        if (!cancelled) {
          if (fixtureResponse.ok && Array.isArray(fixturePayload.fixtures)) setFixtures(fixturePayload.fixtures as FootballFixture[]);
          if (oddsApiResponse.ok && Array.isArray(oddsApiPayload.rows)) {
            setOddsApiRows(oddsApiPayload.rows as OddsApiDiagnosticRow[]);
            setOddsApiSummary(oddsApiPayload.counts || null);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Liquidity board failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRows();
    const timer = window.setInterval(loadRows, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const token = window.localStorage.getItem("sportsedge.auth.token");
    let closedByEffect = false;

    function clearReconnect() {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function subscribe(socket: WebSocket) {
      BETTING_EXCHANGE_COLUMNS.forEach((exchange) => {
        socket.send(JSON.stringify({
          type: "subscribe",
          channel: exchangePriceChannel(exchange),
          filters: { sport: "football" }
        }));
      });
    }

    function flushPriceEvents() {
      const events = pendingPriceEventsRef.current.splice(0);
      priceFlushTimerRef.current = null;
      if (!events.length) return;
      setBackendRows((currentRows) => mergeDisplayPriceRows(events.reduce(
        (nextRows, item) => mergeLivePriceRows(nextRows, item.channel, item.payload, "football", true, 700),
        currentRows
      )).slice(0, 700));
    }

    function connect() {
      clearReconnect();
      if (!token) {
        setSocketStatus("waiting");
        return;
      }
      setSocketStatus("connecting");
      const socket = new WebSocket(sportsEdgeWsUrl(token));
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setSocketStatus("live");
        subscribe(socket);
      });

      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type !== "event" || !message.payload) return;
          if (!isPrimaryTradingMarket(message.payload, "football")) return;
          pendingPriceEventsRef.current.push({
            channel: String(message.channel || ""),
            payload: message.payload
          });
          if (!priceFlushTimerRef.current) {
            priceFlushTimerRef.current = window.setTimeout(flushPriceEvents, 50);
          }
        } catch {
          // Ignore malformed socket payloads.
        }
      });

      socket.addEventListener("close", () => {
        if (closedByEffect) return;
        setSocketStatus("offline");
        reconnectTimerRef.current = window.setTimeout(connect, 2500);
      });

      socket.addEventListener("error", () => setSocketStatus("offline"));
    }

    connect();

    return () => {
      closedByEffect = true;
      clearReconnect();
      if (priceFlushTimerRef.current) {
        window.clearTimeout(priceFlushTimerRef.current);
        priceFlushTimerRef.current = null;
      }
      pendingPriceEventsRef.current = [];
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  const columnDefs = useMemo<ColDef<AgTestRow>[]>(() => [
    { field: "kickoff", headerName: "Time", width: 128, pinned: "left" },
    {
      field: "match",
      headerName: "Fixture",
      minWidth: 390,
      flex: 1.6,
      pinned: "left",
      cellRenderer: ({ data }: { data?: AgTestRow }) => (
        <div className="ag-fixture-cell">
          <strong>{data?.match}</strong>
          <span>{data?.competition}</span>
        </div>
      )
    },
    {
      field: "coverage",
      headerName: "Coverage",
      width: 156,
      cellRenderer: ({ data }: { data?: AgTestRow }) => (
        <div className="exchange-coverage ag-coverage">
          {(data?.coverage || []).map((exchange) => (
            <span className={exchange.available ? "available" : ""} key={exchange.label}>{exchange.label}</span>
          ))}
        </div>
      )
    },
    {
      field: "oddsCoverage",
      headerName: "Odds API",
      width: 196,
      cellRenderer: ({ data }: { data?: AgTestRow }) => (
        <div className="exchange-coverage ag-coverage oddsapi-coverage">
          {(data?.oddsCoverage || []).map((source) => (
            <span className={source.available ? "available odds-source" : ""} key={source.label}>{source.label}</span>
          ))}
        </div>
      )
    },
    { field: "outcomes", headerName: "Outcomes", minWidth: 260, flex: 1.05, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.outcomes} /> },
    { field: "betfair", headerName: "Betfair", minWidth: 230, flex: 1, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.betfair} className="ag-price-stack" /> },
    { field: "matchbook", headerName: "Matchbook", minWidth: 250, flex: 1.1, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.matchbook} className="ag-price-stack" /> },
    { field: "sx", headerName: "SX", minWidth: 210, flex: 0.9, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.sx} className="ag-price-stack" /> },
    { field: "oddsApi", headerName: "Odds-only", minWidth: 330, flex: 1.25, cellRenderer: ({ data }: { data?: AgTestRow }) => <AgStackCell values={data?.oddsApi} className="ag-price-stack oddsapi-stack" /> },
    { field: "bias", headerName: "Bias", width: 150 },
    { field: "liquidity", headerName: "Liquidity", width: 140 },
    { field: "fresh", headerName: "Fresh", width: 118 }
  ], []);

  return (
    <>
      <SportsEdgeTopbar
        active="football"
        onSearchChange={setSearchQuery}
        searchPlaceholder="Filter table, open team/player, market..."
      />
      <main className="agtest-page">
        <section className="agtest-subbar" aria-label="Liquidity market context">
          <div className="agtest-filter-stack">
            <nav aria-label="Football region filters">
              {AGTEST_FOOTBALL_PRIMARY_FILTERS.map((filter) => (
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
              <button type="button" onClick={() => { window.location.hash = "#matrix"; }}>Bias Matrix</button>
            </nav>
            {secondaryFilters.length > 0 && (
              <nav className="agtest-filter-secondary" aria-label="Football league filters">
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
            <span>{footballFilterBreadcrumb(filterBucket, marketGroup)}</span>
            <span>{rows.length}{searchQuery.trim() || marketGroup !== "all" ? ` / ${allRows.length}` : ""} markets</span>
            <span>BF / MB / SX + Odds API</span>
            <span>{oddsApiRows.length} odds rows</span>
            <span>{socketStatus === "live" ? "wss live" : loading ? "loading" : socketStatus}</span>
          </div>
        </section>
        <section className="agtest-source-strip" aria-label="Liquidity source status">
          <span>Exchange ladder: BF / MB / SX</span>
          <span>Odds-only: BF {oddsApiSummary?.byBookmaker?.betfair || 0}</span>
          <span>MB {oddsApiSummary?.byBookmaker?.matchbook || 0}</span>
          <span>SM {oddsApiSummary?.byBookmaker?.smarkets || 0}</span>
          <span>BD {oddsApiSummary?.byBookmaker?.betdaq || 0}</span>
          <span>365 {oddsApiSummary?.byBookmaker?.bet365 || 0}</span>
        </section>
        <section className="agtest-grid-wrap ag-theme-quartz-dark">
          <AgGridReact
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading && rows.length === 0}
            rowHeight={36}
            headerHeight={34}
            animateRows
            suppressCellFocus
            defaultColDef={{ sortable: true, resizable: true, filter: false, suppressHeaderMenuButton: true }}
          />
          {!loading && rows.length === 0 && (
            <div className="agtest-empty-state">
              <strong>No fixtures for this filter</strong>
              <span>{footballFilterBreadcrumb(filterBucket, marketGroup)}</span>
            </div>
          )}
        </section>
        {error && <div className="agtest-error">{error}</div>}
      </main>
    </>
  );
}

export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  const previewDashboard = import.meta.env.DEV;
  const hasSession = Boolean(window.localStorage.getItem("sportsedge.auth.token"));

  useEffect(() => {
    const handleHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  function handleLogout() {
    window.localStorage.removeItem("sportsedge.auth.token");
    window.localStorage.removeItem("sportsedge.auth.user");
    window.location.hash = "#login";
    setHash("#login");
  }

  let screen;
  if (!hash) screen = <MarketingLandingPage />;
  else if (hash === "#signup") screen = <MarketingLandingPage section="signup" />;
  else if (hash === "#about") screen = <MarketingLandingPage section="about" />;
  else if (hash === "#blog") screen = <BlogPage />;
  else if (hash === "#terms") screen = <MarketingLandingPage section="terms" />;
  else if (hash === "#privacy") screen = <MarketingLandingPage section="privacy" />;
  else if (hash.startsWith("#player/")) screen = <PlayerProfilePage id={hash.replace("#player/", "")} />;
  else if (hash.startsWith("#team/")) screen = <TeamProfilePage slug={hash.replace("#team/", "") || "chelsea"} />;
  else if (hash === "#agtest-mockup" || hash === "#bloomberg-demo" || hash === "#bloomberg") screen = <AgtestBloombergMockupPage />;
  else if (hash === "#news" || hash === "#news-feed-mockup") screen = hasSession || previewDashboard ? <BloombergNewsFeedMockupPage /> : <LoginScreen />;
  else if (hash === "#dashboard" || hash === "#today-dashboard-mockup") screen = hasSession || previewDashboard ? <TodayDashboardMockupPage /> : <LoginScreen />;
  else if (hash === "#profile-mockup" || hash === "#profiles") screen = hasSession || previewDashboard ? <FootballProfilesPage /> : <LoginScreen />;
  else if (hash === "#product-map") screen = <SportsEdgeProductMockupPage />;
  else if (hash === "#football-demo") screen = <FootballIntelligenceDemoPage />;
  else if (hash === "#oddsapi") screen = hasSession || previewDashboard ? <OddsApiDiagnosticsPage /> : <LoginScreen />;
  else if (hash === "#arbs") screen = hasSession || previewDashboard ? <BetfairArbsPage /> : <LoginScreen />;
  else if (hash === "#bias-matrix" || hash === "#agtest2") screen = hasSession || previewDashboard ? <AgTest2Page /> : <LoginScreen />;
  else if (hash === "#liquidity" || hash === "#agtest") screen = hasSession || previewDashboard ? <AgTestPage /> : <LoginScreen />;
  else if (isTerminalSportHash(hash)) screen = hasSession || previewDashboard ? <SportSummaryDashboardPage sport={terminalSportFromHash(hash)} /> : <LoginScreen />;
  else if (previewDashboard && (hash === "#testboard" || hash === "#matrix" || hash === "#actual")) screen = <TestboardPage onLogout={handleLogout} />;
  else if (previewDashboard && hash === "#login") screen = <LoginScreen />;
  else if (previewDashboard && (hash === "#old" || hash.startsWith("#sport"))) screen = <DashboardPage onLogout={handleLogout} />;
  else if (previewDashboard && hash === "#social-news") screen = <StandaloneLiveNewsPage />;
  else if (hash === "#testboard") screen = hasSession ? <TestboardPage onLogout={handleLogout} /> : <LoginScreen />;
  else if (hash === "#matrix" || hash === "#actual") screen = hasSession ? <TestboardPage onLogout={handleLogout} /> : <LoginScreen />;
  else if (hash === "#old") screen = hasSession ? <DashboardPage onLogout={handleLogout} /> : <LoginScreen />;
  else if (hash === "#legacy-news") screen = hasSession ? <DashboardPage onLogout={handleLogout} /> : <LoginScreen />;
  else if (hash.startsWith("#sport")) screen = hasSession ? <DashboardPage onLogout={handleLogout} /> : <LoginScreen />;
  else if (hash === "#social-news") screen = hasSession ? <StandaloneLiveNewsPage /> : <LoginScreen />;
  else if (hash === "#login") screen = <LoginScreen />;
  else if (hash === "#simple-news") screen = <SimpleNewsPage />;
  else if (hash === "#news-console") screen = <NewsPage />;
  else if (hash === "#admin") screen = hasSession ? <AdminConsolePage /> : <LoginScreen />;
  else if (hash === "#admin-news-sources") screen = hasSession ? <AdminNewsSourcesPage /> : <LoginScreen />;
  else screen = previewDashboard || hasSession ? <TodayDashboardMockupPage /> : <LoginScreen />;

  return (
    <>
      <RouteErrorBoundary
        routeKey={hash || "#dashboard"}
        fallback={(message) => <TerminalRouteFallback message={message} onLogout={handleLogout} />}
      >
        {screen}
      </RouteErrorBoundary>
      <RefreshUpdateNotice />
    </>
  );
}
