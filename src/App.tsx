import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
import "./styles/dashboard.css";

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
  { label: "Golf", value: "golf", route: "#golf" }
] as const;

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
const MATRIX_VENUES = [
  { key: "betfair", label: "Betfair", short: "BF", matchKeys: ["bf", "betfair"], supports: ["football", "tennis", "golf", "basketball"], weight: 1.15 },
  { key: "matchbook", label: "Matchbook", short: "MB", matchKeys: ["mb", "matchbook"], supports: ["football", "tennis", "golf", "basketball"], weight: 1.05 }
] as const;
type MatrixVenue = typeof MATRIX_VENUES[number];
const MATRIX_ACTIVE_SPORT = "football";
const MATRIX_EXCHANGE_KEYS = new Set(["bf", "mb"]);
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
  return TERMINAL_TOP_SPORTS.some((sport) => sport.value === normalized) ? normalized : "football";
}

function isTerminalSportHash(hash = window.location.hash) {
  const normalized = hash.replace(/^#/, "");
  return TERMINAL_TOP_SPORTS.some((sport) => sport.value === normalized);
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
  return `${symbol}${value.toLocaleString()}`;
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
  if (value.includes("premier league") || value.includes("uk racing") || value.includes("championship") || value.includes("wimbledon")) return "England";
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
  return `${competitionCountry(competition)} / ${competition}`;
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
  argentina: "AR",
  brazil: "BR",
  curacao: "CW",
  "curaçao": "CW",
  "dr congo": "CD",
  "democratic republic of congo": "CD",
  ecuador: "EC",
  england: "GB",
  france: "FR",
  germany: "DE",
  haiti: "HT",
  ireland: "IE",
  italy: "IT",
  paraguay: "PY",
  portugal: "PT",
  qatar: "QA",
  scotland: "GB",
  spain: "ES",
  switzerland: "CH",
  usa: "US",
  "united states": "US",
  "united states of america": "US",
  wales: "GB"
};

function directCountryFlag(country: string) {
  const normalized = normalizeSelectionKey(country);
  const code = COUNTRY_FLAG_CODES[normalized];
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
  slug: string;
  ticker: string;
  fullName: string;
  shortName: string;
  country: string;
  currentLeague: string;
  logoUrl?: string | null;
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

function registerFootballTeamAssets(teams: FootballTeamAsset[]) {
  teams.forEach((team) => {
    const aliases = [team.fullName, team.shortName, team.slug, team.ticker, ...(team.aliases || [])];
    aliases.forEach((alias) => {
      FOOTBALL_TEAM_BY_ALIAS.set(normalizeSelectionKey(alias), team);
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
  const key = normalizeSelectionKey(team);
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

function teamLogoUrl(team: string) {
  const key = normalizeSelectionKey(team);
  return footballTeamAsset(team)?.logoUrl || TEAM_LOGO_URLS[key] || "";
}

function TeamLogoStack({ name }: { name: string }) {
  const teams = fixtureTeams(name);
  if (teams.length === 0) {
    return <span className={`team-badge${teamFallbackIsFlag(name) ? " flag" : ""}`}>{teamFallbackBadge(name)}</span>;
  }
  return (
    <span className="team-logo-stack" aria-hidden="true">
      {teams.map((team) => {
        const logo = teamLogoUrl(team);
        return logo ? (
          <span className="team-logo-frame" key={team} title={team}>
            <img src={logo} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <span>{teamInitials(team)}</span>
          </span>
        ) : (
          <span className={`team-badge small${teamFallbackIsFlag(team) ? " flag" : ""}`} key={team}>{teamFallbackBadge(team)}</span>
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
          const logo = teamLogoUrl(team);
          return (
            <Fragment key={`${team}-${index}`}>
              {index > 0 && <span className="matrix-event-vs">-</span>}
              <span className="matrix-team-side">
                {logo ? (
                  <span className="team-logo-frame matrix-team-logo" title={team}>
                    <img src={logo} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
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
  { label: "Football markets", detail: "Open the football market board", route: "#football", keywords: ["football", "soccer", "markets"] },
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

function logoutToLogin() {
  window.localStorage.removeItem("sportsedge.auth.token");
  window.localStorage.removeItem("sportsedge.auth.user");
  window.location.hash = "#login";
}

function SportsEdgeTopbar({ active, onLogout = logoutToLogin }: { active?: string; onLogout?: () => void }) {
  const [query, setQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const options = useMemo(() => COMMAND_OPTIONS.filter((option) => commandMatches(option, query)).slice(0, 7), [query]);

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
    setCommandOpen(false);
    inputRef.current?.blur();
  }

  return (
    <header className="testboard-topbar global-terminal-topbar">
      <a className="testboard-brand" href="#dashboard" aria-label="SportsEdge dashboard">
        <img className="testboard-brand-logo" src={sportsEdgeMarketsLogo} alt="SportsEdge" />
      </a>
      <nav className="testboard-nav" aria-label="SportsEdge navigation">
        {TERMINAL_TOP_SPORTS.map((sport) => (
          <button
            className={active === sport.value ? "active" : ""}
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
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              runCommand(resolveCommand(query) || options[0] || null);
            }
            if (event.key === "Escape") {
              setCommandOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Search sport, market, fixture, exchange..."
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
            <button type="button" role="menuitem">Routing Rules</button>
            <button type="button" role="menuitem">Display Density</button>
          </div>
        )}
      </div>
      <button className="testboard-logout" type="button" onClick={onLogout} aria-label="Log out">
        <LogOut size={15} />
      </button>
    </header>
  );
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
  const englishCountryContext = /\b(england|english|efl)\b/.test(competitionText);
  const englishLeagueContext = /\b(championship|league one|league two|fa cup|efl cup|carabao cup)\b/.test(competitionText)
    || (/\bpremier league\b/.test(competitionText) && !/\b(singapore|malaysia|wales|northern ireland|israel|egypt|ghana|ukraine|russia|canadian|canada|jamaica|kenya|south africa)\b/.test(competitionText));
  const isEnglishFootball = englishCountryContext || englishLeagueContext;
  const start = row.startAt ? new Date(row.startAt) : null;
  const isToday = start && !Number.isNaN(start.getTime())
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(start) === new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())
    : false;
  const footballTerms = FOOTBALL_GROUP_TERMS[group];
  if (footballTerms) {
    if (["premier-league", "championship", "league-one", "league-two", "fa-cup", "efl-cup"].includes(group) && !isEnglishFootball) return false;
    return footballTerms.some((term) => ` ${haystack} `.includes(term));
  }
  if (group === "today") return Boolean(isToday);
  if (group === "live") return haystack.includes("live") || Boolean(isToday);
  if (group === "england") return isEnglishFootball;
  if (group === "english") return isEnglishFootball;
  if (group === "scottish") return ["scotland", "scottish", "scottish premiership", "scottish championship"].some((term) => haystack.includes(term));
  if (group === "uefa") return ["uefa", "champions league", "europa league", "conference league", "nations league"].some((term) => haystack.includes(term));
  if (group === "europe") return ["champions league", "europa", "euro", "spain", "la liga", "italy", "serie", "germany", "bundesliga", "france", "ligue"].some((term) => haystack.includes(term));
  if (group === "european") return ["europe", "european", "spain", "la liga", "italy", "serie", "germany", "bundesliga", "france", "ligue", "eredivisie", "primeira", "super lig"].some((term) => haystack.includes(term));
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

function mergeLivePriceRows(rows: BackendPriceRow[], channel: string, payload: unknown, selectedSport: string, primaryOnly = true) {
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

  return nextRows.slice(0, 80);
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

function objectEntries(value: Record<string, unknown> | null | undefined) {
  if (!value || Array.isArray(value)) return [];
  return Object.entries(value).filter(([, item]) => item !== null && item !== "" && item !== undefined);
}

function shortValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item))).slice(0, 3).join(", ") : "none";
  if (value && typeof value === "object") return JSON.stringify(value);
  return cleanText(String(value));
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
  return item.feed === "social" || item.source_type === "twitter" || item.feed_type === "twitter";
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

function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authUser, setAuthUser] = useState<{
    email: string;
    roles?: string[];
    subscription?: { level?: string; status?: string; plan_name?: string };
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
      window.location.hash = "#dashboard";
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
      window.location.hash = "#dashboard";
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
        const requests = PRIORITY_SPORTS.flatMap((sport) => (
          DIAGNOSTIC_EXCHANGES.map((exchange) => {
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
  const [commandOpen, setCommandOpen] = useState(false);
  const [marketGroup, setMarketGroup] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [, setTeamAssetVersion] = useState(0);
  const [fixtureExchangeUpdates, setFixtureExchangeUpdates] = useState<Record<string, FixtureExchangeSnapshot>>({});
  const [socketStatus, setSocketStatus] = useState<"offline" | "connecting" | "live" | "waiting">("offline");
  const [entryEvents, setEntryEvents] = useState<EntryEventRow[]>([]);
  const [entryEventsLoading, setEntryEventsLoading] = useState(false);
  const [entryEventsError, setEntryEventsError] = useState("");
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
  const commandOptions = useMemo(() => COMMAND_OPTIONS.filter((option) => commandMatches(option, marketSearch)).slice(0, 6), [marketSearch]);

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
        const response = await fetch("/api/assets/football-teams?active=true&limit=1000", { cache: "no-store" });
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
            segment: "today",
            exchanges: "betfair,matchbook",
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
        const params = new URLSearchParams({ sport: apiSportValue(selectedSport), limit: "40" });
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
  const hasBackendRows = priceRows.length > 0;
  const matrixRows = hasBackendRows ? priceRows.map((row, fixtureIndex) => {
    const time = displayStartTime(row);
    const totalValue = rowMatchedValue(row);
    const competition = row.competitionName || Object.values(row.matches || {}).find(Boolean)?.competitionName || selectedSportLabel;
    const market = row.marketName || row.marketType || Object.values(row.matches || {}).find(Boolean)?.marketName || "Exchange prices";
    return {
      fixture: [time, displayEventName(row.name), competition, market] as FixtureRow,
      fixtureIndex,
      totalValue,
      backend: row
    };
  }) : [];
  const activeExchangeCount = EXCHANGE_COLUMNS.filter((exchange) => exchange.supports.includes(selectedSport)).length;
  const totalMatched = matrixRows.reduce((sum, row) => sum + row.totalValue, 0);
  const liveUpdateCount = Object.values(fixtureExchangeUpdates).filter((item) => now.getTime() - item.updatedAt < 30000).length;
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
        </div>
        <div className="sport-news-list">
          {terminalNewsItems.slice(0, 40).map((item) => (
            <article className={`sport-news-card${item.isNew ? " is-new" : ""}`} key={`news-${item.id}`} title={newsContextText(item)}>
              <div className={`sport-news-thumb${newsImageUrl(item) ? "" : " empty"}`}>
                {newsImageUrl(item) ? <img src={newsImageUrl(item)} alt="" loading="lazy" /> : <span>{teamInitials(item.source_name || item.sport || "SE")}</span>}
              </div>
              <div>
                <strong>{cleanText(item.title)}</strong>
                <p>{newsContextText(item) || displayLabel(item.source_name, "Source update")}</p>
                {newsImpactLabel(item.impact_assessment) && (
                  <div className={`news-impact-strip ${impactClass(item.impact_assessment)}`}>
                    <span>{newsImpactLabel(item.impact_assessment)?.eventType}</span>
                    <b>{newsImpactLabel(item.impact_assessment)?.score}</b>
                    {newsImpactLabel(item.impact_assessment)?.direction && <em>{newsImpactLabel(item.impact_assessment)?.direction}</em>}
                  </div>
                )}
              </div>
              <footer>
                <span>{displayLabel(item.sport, "news")}</span>
                {newsOpenUrl(item) && <a href={newsOpenUrl(item)} target="_blank" rel="noreferrer">Open</a>}
                <time>{formatDate(item.published_at || item.discovered_at)}</time>
              </footer>
            </article>
          ))}
          {terminalNewsItems.length === 0 && (
            <div className="sport-news-empty">
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
    const sportCounts = PRIORITY_SPORTS.map((sport) => ({
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
              <p>All exchange-backed events happening today across SportsEdge priority sports.</p>
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
                <small>{sport.venues}/{EXCHANGE_COLUMNS.length} venues</small>
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
              <strong>{venueCount}/{EXCHANGE_COLUMNS.length}</strong>
              <p>{venueCount ? "Exchange-backed routes available." : "Waiting for exchange state."}</p>
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
                  <th>Venues</th>
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

  function renderBiasMatrix() {
    const latestLabel = matrixLatestMs
      ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Madrid", hour12: false }).format(new Date(matrixLatestMs))
      : "-";
    return (
      <>
        <section className="matrix-simple-status" aria-label="Matrix status">
          <strong>Football today</strong>
          <span>{biasMatrixRows.length} rows</span>
          <span>Betfair + Matchbook</span>
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
              className={!diagnosticExchange && !isMatrixPage && selectedSport === sport.value ? "active" : ""}
              type="button"
              key={sport.value}
              onClick={() => {
                setIsMatrixPage(false);
                setIsEntryDashboard(false);
                setDiagnosticExchange(null);
                setSelectedSport(sport.value);
                setMarketSearch("");
                setSelectedFixtureIndex(null);
                window.location.hash = `#${sport.value}`;
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
                runCommand(resolveCommand(marketSearch) || commandOptions[0] || null);
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
              <button type="button" role="menuitem">Routing Rules</button>
              <button type="button" role="menuitem">Display Density</button>
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
          const venueRows = EXCHANGE_COLUMNS.map((exchange) => {
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
            <col className="col-contract" />
            <col className="col-liquidity" />
            <col className="col-price" />
            <col className="col-size" />
            <col className="col-price" />
            <col className="col-size" />
            <col className="col-spread" />
            <col className="col-arb" />
            <col className="col-route" />
            <col className="col-confidence" />
            <col className="col-fresh" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Market</th>
              <th scope="col">Contract</th>
              <th scope="col">Liquidity</th>
              <th scope="col">Best Back</th>
              <th scope="col">Back Size</th>
              <th scope="col">Best Lay</th>
              <th scope="col">Lay Size</th>
              <th scope="col">Spread</th>
              <th scope="col">Arb</th>
              <th scope="col">Route</th>
              <th scope="col">Confidence</th>
              <th scope="col">Fresh</th>
            </tr>
          </thead>
          <tbody>
            {matrixRows.map(({ fixture, fixtureIndex, totalValue, backend }, rowIndex) => {
              const quote = sportsEdgeMarketQuote(backend);
              const rowKey = backend ? stableDisplayRowKey(backend) : `${fixture[0]}-${fixture[1]}-${fixture[3]}-${fixtureIndex}`;
              const previousBackend = rowIndex > 0 ? matrixRows[rowIndex - 1]?.backend : null;
              const repeatsFixture = Boolean(previousBackend && backend && displayFixtureKey(previousBackend) === displayFixtureKey(backend));
              return (
                <tr
                  className={`clickable-row${repeatsFixture ? " repeated-fixture-row" : ""}`}
                  key={rowKey}
                  onClick={() => setSelectedFixtureIndex(fixtureIndex)}
                >
                  <td className="mono positive">{repeatsFixture ? "" : fixture[0]}</td>
                  <td className="testboard-fixture">
                    {repeatsFixture ? (
                      <span className="fixture-repeat-marker">More markets</span>
                    ) : (
                      <>
                        <div className="fixture-title-line">
                          <TeamLogoStack name={fixture[1]} />
                          <strong>{fixture[1]}</strong>
                        </div>
                        <span><em>{countryFlag(competitionCountry(fixture[2]))}</em>{fixtureGroupLabel(fixture[2])}</span>
                      </>
                    )}
                  </td>
                  <td className="contract-cell">{fixture[3]}</td>
                  <td className="mono">{quote.liquidity || totalValue ? formatExchangeMoney(quote.liquidity || totalValue, "GBP") : "-"}</td>
                  <td className={quote.bestBack ? `price-cell buy ${quote.isFresh ? "live" : ""}` : "empty"}>{quote.bestBack ? quote.bestBack.toFixed(2) : "-"}</td>
                  <td className="mono muted-cell">{quote.bestBackSize ? formatExchangeMoney(quote.bestBackSize, "GBP") : "-"}</td>
                  <td className={quote.bestLay ? `price-cell sell ${quote.isFresh ? "live" : ""}` : "empty"}>{quote.bestLay ? quote.bestLay.toFixed(2) : "-"}</td>
                  <td className="mono muted-cell">{quote.bestLaySize ? formatExchangeMoney(quote.bestLaySize, "GBP") : "-"}</td>
                  <td className="mono">{quote.spread != null ? quote.spread.toFixed(2) : "-"}</td>
                  <td>
                    <span className={`arb-pill${quote.isArb ? " active live" : ""}`}>
                      {quote.isArb ? `+${quote.edgePct?.toFixed(2)}%` : "None"}
                    </span>
                  </td>
                  <td><span className="route-pill">{quote.route}</span></td>
                  <td className="mono positive">{quote.confidence ? `${quote.confidence}%` : "-"}</td>
                  <td className="mono">{quote.isFresh ? quote.updatedAt || "Live" : "watch"}</td>
                </tr>
              );
            })}
            {matrixRows.length === 0 && (
              <tr>
                <td className="empty" colSpan={13}>Waiting for SportsEdge market state.</td>
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
    name: string;
    age: number | null;
    nationality: string | null;
    height: string | null;
    weight: string | null;
    photoUrl: string | null;
    position: string | null;
    number: number | null;
  }>;
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

  const name = profile?.asset?.fullName || profile?.name || "Chelsea";
  const shortName = profile?.asset?.shortName || profile?.name || "Chelsea";
  const logoUrl = profile?.asset?.logoUrl || profile?.logoUrl || teamLogoUrl(name);
  const venue = profile?.venue;
  const profileStats = [
    ["Code", profile?.asset?.ticker || profile?.code || "CHE"],
    ["Country", profile?.country || "England"],
    ["League", profile?.asset?.currentLeague || "Premier League"],
    ["Founded", profile?.founded || 1905],
    ["Provider ID", profile?.providerTeamId || "49"],
    ["Synced", profile?.syncedAt ? formatTimeAgo(profile.syncedAt) : "seeded"]
  ];
  const marketContext = [
    ["Primary markets", "Match odds, totals, handicap"],
    ["Matrix role", "Football consensus + venue alignment"],
    ["News sensitivity", "Transfers, injuries, lineups, manager comments"],
    ["Profile source", "API-Football cache + SportsEdge team registry"]
  ];

  return (
    <main className="team-profile-page">
      <SportsEdgeTopbar active="football" />

      <section className="team-profile-hero">
        <div className="team-profile-title">
          <div className="team-profile-crest">
            {logoUrl ? <img src={logoUrl} alt={`${shortName} crest`} /> : <span>{teamTicker(name)}</span>}
          </div>
          <div>
            <span>SportsEdge football profile</span>
            <h1>{name}</h1>
            <p>
              Canonical team identity, venue details, provider profile data, aliases, and
              market context ready to link into the Matrix and fixture pages.
            </p>
          </div>
        </div>
        <div className="team-profile-status">
          <span>{loading ? "Loading" : error ? "Attention" : "Ready"}</span>
          <strong>{error ? "Profile issue" : "Chelsea profile cache"}</strong>
          <em>{error || "API-Football team endpoint proved with one request"}</em>
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
              {(profile?.asset?.aliases?.length ? profile.asset.aliases : ["Chelsea", "Chelsea FC", "CHE"]).map((alias) => (
                <b key={alias}>{alias}</b>
              ))}
            </div>
          </div>
        </article>

        <article className="team-profile-panel venue">
          <div className="team-profile-panel-head">
            <span>Home Venue</span>
            <strong>{venue?.name || "Stamford Bridge"}</strong>
          </div>
          <div className="team-profile-venue-visual" aria-label="Home venue summary">
            <div>
              <span>Home ground</span>
              <strong>{venue?.name || "Stamford Bridge"}</strong>
              <em>{venue?.city || "London"} / {venue?.capacity?.toLocaleString() || "41,841"} capacity</em>
            </div>
            <b>{profile?.asset?.ticker || profile?.code || "CHE"}</b>
          </div>
          <div className="team-profile-list">
            <span><b>City</b>{venue?.city || "London"}</span>
            <span><b>Address</b>{venue?.address || "Fulham Road"}</span>
            <span><b>Capacity</b>{venue?.capacity?.toLocaleString() || "41,841"}</span>
            <span><b>Surface</b>{venue?.surface || "grass"}</span>
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

        <article className="team-profile-panel squad">
          <div className="team-profile-panel-head">
            <span>Player Profiles</span>
            <strong>{profile?.squad?.length || 0} cached</strong>
          </div>
          {profile?.squad?.length ? (
            <div className="team-profile-squad-grid">
              {profile.squad.slice(0, 12).map((player) => (
                <div key={player.id}>
                  {player.photoUrl ? <img src={player.photoUrl} alt="" /> : <span>{teamInitials(player.name)}</span>}
                  <strong>{player.name}</strong>
                  <em>{player.position || "Player"} {player.number ? `#${player.number}` : ""}</em>
                </div>
              ))}
            </div>
          ) : (
            <p className="team-profile-empty">
              Squad/player sync is switched off for this proof so we only spend one of the 100 daily API-Football calls. Turn on `API_FOOTBALL_SYNC_SQUAD=true` when you want the player profile pull.
            </p>
          )}
        </article>
      </section>
    </main>
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

function AdminNewsSourcesPage() {
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
    <main className="admin-news-shell">
      <aside className="news-rail">
        <a href="https://sportsedge.markets/" aria-label="SportsEdge Markets home">
          <img className="news-logo" src={sportsEdgeMarketsLogo} alt="SportsEdge Markets logo" />
        </a>
        <nav>
          <a className="active" href="#admin-news-sources">
            <Database size={16} />
            News Sources
          </a>
          <a href="#news-console">
            <Newspaper size={16} />
            Console
          </a>
          <a href="#dashboard">
            <Activity size={16} />
            Terminal
          </a>
        </nav>
        <div className="rail-card">
          <span>Control</span>
          <strong>ClickHouse</strong>
          <small>pause / delete endpoints</small>
        </div>
      </aside>

      <section className="admin-news-main">
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
  if (hash.startsWith("#team/")) screen = <TeamProfilePage slug={hash.replace("#team/", "") || "chelsea"} />;
  else if (hash === "#product-map") screen = <SportsEdgeProductMockupPage />;
  else if (hash === "#football-demo") screen = <FootballIntelligenceDemoPage />;
  else if (previewDashboard && (hash === "#dashboard" || hash === "#testboard" || hash === "#matrix" || hash === "#actual" || isTerminalSportHash(hash) || !hash)) screen = <TestboardPage onLogout={handleLogout} />;
  else if (previewDashboard && hash === "#login") screen = <LoginScreen />;
  else if (previewDashboard && (hash === "#old" || hash === "#news" || hash.startsWith("#sport"))) screen = <DashboardPage onLogout={handleLogout} />;
  else if (previewDashboard && hash === "#social-news") screen = <DashboardPage onLogout={handleLogout} />;
  else if (hash === "#testboard") screen = hasSession ? <TestboardPage onLogout={handleLogout} /> : <LoginScreen />;
  else if (hash === "#dashboard") screen = hasSession ? <TestboardPage onLogout={handleLogout} /> : <LoginScreen />;
  else if (hash === "#matrix" || hash === "#actual" || isTerminalSportHash(hash)) screen = hasSession ? <TestboardPage onLogout={handleLogout} /> : <LoginScreen />;
  else if (hash === "#old") screen = hasSession ? <DashboardPage onLogout={handleLogout} /> : <LoginScreen />;
  else if (hash === "#news") screen = hasSession ? <DashboardPage onLogout={handleLogout} /> : <LoginScreen />;
  else if (hash.startsWith("#sport")) screen = hasSession ? <DashboardPage onLogout={handleLogout} /> : <LoginScreen />;
  else if (hash === "#social-news") screen = hasSession ? <DashboardPage onLogout={handleLogout} /> : <LoginScreen />;
  else if (hash === "#login") screen = <LoginScreen />;
  else if (hash === "#simple-news") screen = <SimpleNewsPage />;
  else if (hash === "#news-console") screen = <NewsPage />;
  else if (hash === "#admin-news-sources") screen = hasSession ? <AdminNewsSourcesPage /> : <LoginScreen />;
  else screen = previewDashboard ? <TestboardPage onLogout={handleLogout} /> : <LoginScreen />;

  return (
    <>
      {screen}
      <RefreshUpdateNotice />
    </>
  );
}
