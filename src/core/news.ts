import { cleanText, displayLabel, normalizeFixtureText } from "./format";

export const PRIORITY_SPORTS = [
  { label: "Football", value: "football", newsAliases: ["football", "soccer"] },
  { label: "Tennis", value: "tennis", newsAliases: ["tennis"] },
  { label: "Baseball", value: "baseball", newsAliases: ["baseball"] },
  { label: "Basketball", value: "basketball", newsAliases: ["basketball"] },
  { label: "Golf", value: "golf", newsAliases: ["golf"] }
];

export type ImpactAssessment = {
  impact_score?: number | string | null;
  urgency?: string | null;
  event_type?: string | null;
  trading_note?: string | null;
  direction?: string | null;
};

export type NewsItem = {
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

export type NewsResponse = {
  items: NewsItem[];
  facets: {
    sports: string[];
    source_names: string[];
    source_types: string[];
    countries: string[];
    competitions: string[];
    statuses: string[];
  };
  sourceHealth: Array<{
    sport?: string | null;
    source_type?: string | null;
    total_sources?: string | number | null;
    enabled_sources?: string | number | null;
    working_sources?: string | number | null;
    failing_sources?: string | number | null;
    latest_success_at?: string | null;
  }>;
  latestFailures: Array<{
    sport?: string | null;
    name?: string | null;
    url?: string;
    last_error?: string | null;
    last_polled_at?: string | null;
  }>;
  latestPolls: Array<{
    name?: string | null;
    started_at?: string | null;
    poll_status?: string | null;
    items_seen?: string | number | null;
    items_inserted?: string | number | null;
  }>;
};

const NEWS_DISPLAY_TIME_ZONE = "Europe/Madrid";

export function apiSportValue(value: string) {
  if (value === "horseracing") return "horse_racing";
  return value;
}

export function sportsEdgeWsUrl(token: string) {
  return `wss://terminal.sportsedge.markets/ws?token=${encodeURIComponent(token)}`;
}

function normalizeSport(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (["horse-racing", "horseracing", "racing"].includes(normalized)) return "horseracing";
  if (normalized === "soccer") return "football";
  return normalized;
}

function newsSportFilterValue(value: string) {
  if (!value || value === "all") return PRIORITY_SPORTS.flatMap((sport) => sport.newsAliases);
  return PRIORITY_SPORTS.find((sport) => sport.value === value)?.newsAliases || [value];
}

export function sportMatchesNewsFilter(itemSport: string | null | undefined, selectedSport: string) {
  const aliases = newsSportFilterValue(selectedSport).map(normalizeSport);
  return aliases.includes(normalizeSport(itemSport));
}

export function newsImageUrl(item: NewsItem) {
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

export function newsOpenUrl(item: NewsItem) {
  return String(item.external_url || item.canonical_url || item.source_url || "").trim();
}

export function newsContextText(item: NewsItem) {
  return cleanText(item.analysis_text || item.summary || item.display_summary || item.title);
}

function isSocialNewsItem(item: NewsItem) {
  const sourceType = String(item.source_type || "").toLowerCase();
  const feedType = String(item.feed_type || "").toLowerCase();
  const feed = String(item.feed || "").toLowerCase();
  const urls = [item.external_url, item.canonical_url, item.source_url].join(" ").toLowerCase();
  const headline = String(item.title || "").toLowerCase();
  return feed === "social" || sourceType.includes("twitter") || sourceType.includes("social") || feedType.includes("twitter") || urls.includes("twitter.com/") || urls.includes("x.com/") || headline.includes("https://t.co/");
}

function newsFingerprint(item: NewsItem) {
  const url = newsCanonicalUrl(item);
  if (url) return `url:${url}`;
  const image = newsImageUrl(item).replace(/[?#].*$/, "").toLowerCase();
  const title = normalizeFixtureText(`${item.title || ""} ${item.display_summary || ""}`).slice(0, 160);
  return `${isSocialNewsItem(item) ? "social" : "news"}:${normalizeSport(item.sport)}:${String(item.source_name || "").toLowerCase()}:${image}:${title}`;
}

export function mergeNewsItems(primary: NewsItem[], secondary: NewsItem[]) {
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

export function uniqueNewsItems(items: NewsItem[]) {
  return mergeNewsItems(items, []);
}

function parseSportsEdgeUtcTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const raw = String(value).trim();
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const withZone = /(?:Z|[+-]\d\d:?\d\d)$/.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date;
}

function newsDisplayTimestamp(item: Pick<NewsItem, "published_at" | "discovered_at">) {
  const publishedAt = parseSportsEdgeUtcTimestamp(item.published_at);
  const discoveredAt = parseSportsEdgeUtcTimestamp(item.discovered_at);
  return { date: publishedAt || discoveredAt, source: publishedAt ? "published" : discoveredAt ? "discovered" : "missing" };
}

export function terminalNewsTimeLabel(item: Pick<NewsItem, "published_at" | "discovered_at">) {
  const { date, source } = newsDisplayTimestamp(item);
  if (!date) return "--";
  const rawDeltaSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const deltaSeconds = Math.max(0, rawDeltaSeconds);
  const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: NEWS_DISPLAY_TIME_ZONE }).format(date);
  if (source === "scheduled" || rawDeltaSeconds < -30) return `sch / ${clock}`;
  if (deltaSeconds < 60) return `${deltaSeconds}s / ${clock}`;
  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) return `${deltaMinutes}m / ${clock}`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h / ${clock}`;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: NEWS_DISPLAY_TIME_ZONE }).format(date);
}

export function terminalNewsTag(item: NewsItem) {
  const base = item.entity_name || item.competition || item.sport || item.source_name || "NEWS";
  const words = cleanText(base).split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map((word) => word[0]).join("").slice(0, 5).toUpperCase();
  return cleanText(base).replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase() || "NEWS";
}

export function terminalNewsHeadline(item: NewsItem) {
  return cleanText(item.impact_assessment?.trading_note || item.analysis_text || item.display_summary || item.summary || item.title);
}

export function impactClass(assessment: ImpactAssessment | null) {
  const score = Number(assessment?.impact_score || 0);
  if (score >= 70) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export { cleanText, displayLabel, normalizeFixtureText };
