import { localDateKey, normalizeFixtureText } from "../../core/format";

export type FootballGridFilter = { label: string; value: string };

export const FOOTBALL_DATE_SCOPE_FILTERS: FootballGridFilter[] = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "Next 7 Days", value: "next-7-days" }
];

export const FOOTBALL_LOCATION_SCOPE_FILTERS: FootballGridFilter[] = [
  { label: "All", value: "all" },
  { label: "UK", value: "uk" },
  { label: "Europe", value: "european" },
  { label: "UEFA", value: "uefa" },
  { label: "International", value: "international" },
  { label: "World", value: "world" }
];

export const AGTEST_FOOTBALL_PRIMARY_FILTERS: FootballGridFilter[] = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "UK", value: "uk" },
  { label: "Europe", value: "european" },
  { label: "UEFA", value: "uefa" },
  { label: "International", value: "international" },
  { label: "World", value: "world" }
];

export const AGTEST_FOOTBALL_SECONDARY_FILTERS: Record<string, FootballGridFilter[]> = {
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

const FILTER_LABELS = new Map(
  [
    ...AGTEST_FOOTBALL_PRIMARY_FILTERS,
    ...Object.values(AGTEST_FOOTBALL_SECONDARY_FILTERS).flat()
  ].map((filter) => [filter.value, filter.label])
);

const COUNTRY_GROUPS: Record<string, string[]> = {
  uk: ["england", "scotland", "wales", "northern ireland"],
  english: ["england"],
  "premier-league": ["england"],
  championship: ["england"],
  "league-one": ["england"],
  "league-two": ["england"],
  "fa-cup": ["england"],
  "efl-cup": ["england"],
  scottish: ["scotland"],
  wales: ["wales"],
  "northern-ireland": ["northern ireland"],
  european: ["germany", "spain", "italy", "france", "netherlands", "portugal", "turkey", "belgium", "austria", "switzerland", "denmark", "norway", "sweden", "poland", "czech republic", "croatia", "serbia", "greece", "cyprus", "bulgaria", "romania", "ukraine", "latvia", "lithuania", "estonia", "slovakia", "slovenia", "hungary"],
  germany: ["germany"],
  spain: ["spain"],
  italy: ["italy"],
  france: ["france"],
  netherlands: ["netherlands"],
  portugal: ["portugal"],
  turkey: ["turkey"]
};

const COUNTRY_ONLY_GROUPS = new Set(["uk", "english", "scottish", "wales", "northern-ireland", "european", "germany", "spain", "italy", "france", "netherlands", "portugal", "turkey"]);

const GROUP_TERMS: Record<string, string[]> = {
  uk: ["english", "england premier league", "england league", "england championship", "scotland", "scottish", "wales", "welsh", "northern ireland"],
  english: ["english", "england premier league", "england league", "england championship"],
  scottish: ["scotland", "scottish"],
  wales: ["wales", "welsh"],
  "northern-ireland": ["northern ireland"],
  european: ["europe", "germany", "spain", "italy", "france", "netherlands", "portugal", "turkey", "bundesliga", "la liga", "serie a", "ligue 1", "eredivisie"],
  uefa: ["uefa", "champions league", "europa league", "conference league", "nations league"],
  international: ["international", "world cup", "euro", "copa america", "afcon", "friendly", "friendlies"],
  world: ["world", "fifa", "club world cup"],
  "premier-league": ["premier league"],
  championship: ["championship", "efl championship"],
  "league-one": ["league one", "efl league one"],
  "league-two": ["league two", "efl league two"],
  "fa-cup": ["fa cup"],
  "efl-cup": ["efl cup", "carabao cup", "league cup"],
  bundesliga: ["bundesliga"],
  "2-bundesliga": ["2 bundesliga", "2. bundesliga", "bundesliga 2"],
  "la-liga": ["la liga"],
  "serie-a": ["serie a"],
  "ligue-1": ["ligue 1"],
  eredivisie: ["eredivisie"],
  "primeira-liga": ["primeira liga"],
  "champions-league": ["champions league"],
  "europa-league": ["europa league"],
  "conference-league": ["conference league"],
  "nations-league": ["nations league"],
  "world-cup": ["world cup"],
  euro: ["euro", "european championship"],
  "copa-america": ["copa america", "copa américa"],
  afcon: ["afcon", "africa cup"],
  friendlies: ["friendly", "friendlies"],
  "club-world-cup": ["club world cup", "fifa club world cup"]
};

export function footballDateGroupMatches(startAt: string | null, group: string) {
  if (group !== "today" && group !== "tomorrow" && group !== "next-7-days") return true;
  const today = localDateKey(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  if (group === "today") return localDateKey(startAt) === today;
  if (group === "tomorrow") return localDateKey(startAt) === localDateKey(tomorrowDate);
  const eventTime = new Date(startAt || "").getTime();
  if (!Number.isFinite(eventTime)) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);
  return eventTime >= start.getTime() && eventTime <= end.getTime();
}

export function footballTextMatchesGroup(text: string, country: string | null | undefined, group: string, startAt?: string | null) {
  if (group === "all") return true;
  if (!footballDateGroupMatches(startAt || null, group)) return false;
  if (group === "today" || group === "tomorrow" || group === "next-7-days") return true;
  const normalizedCountry = normalizeFixtureText(country || "");
  const countryGroup = COUNTRY_GROUPS[group];
  const haystack = normalizeFixtureText(`${text} ${country || ""}`);
  const terms = GROUP_TERMS[group] || [];
  if (countryGroup && normalizedCountry) {
    const countryMatches = countryGroup.includes(normalizedCountry);
    if (COUNTRY_ONLY_GROUPS.has(group)) return countryMatches;
    return countryMatches && (!terms.length || terms.some((term) => haystack.includes(normalizeFixtureText(term))));
  }
  return terms.length ? terms.some((term) => haystack.includes(normalizeFixtureText(term))) : true;
}

export function footballScopeMatches(
  text: string,
  country: string | null | undefined,
  startAt: string | null | undefined,
  dateScope: string,
  locationScope: string
) {
  return footballDateGroupMatches(startAt || null, dateScope)
    && footballTextMatchesGroup(text, country, locationScope, startAt || null);
}

export function footballScopeBreadcrumb(dateScope: string, locationScope: string) {
  const dateLabel = FOOTBALL_DATE_SCOPE_FILTERS.find((filter) => filter.value === dateScope)?.label || "All";
  const locationLabel = locationScope === "all"
    ? ""
    : FOOTBALL_LOCATION_SCOPE_FILTERS.find((filter) => filter.value === locationScope)?.label || locationScope;
  return ["SportsEdge", "Football", dateLabel, locationLabel].filter(Boolean).join(" / ");
}

export function footballFilterBreadcrumb(bucket: string, group: string) {
  const bucketLabel = FILTER_LABELS.get(bucket);
  const groupLabel = FILTER_LABELS.get(group);
  return ["All", "Football", bucketLabel, group !== bucket ? groupLabel : ""].filter(Boolean).join(" / ");
}
