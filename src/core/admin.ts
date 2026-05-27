import { analyticsCellValue, asNumber, formatDate, objectEntries } from "./format";

export type AdminNewsSource = {
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

export type AdminNewsSourcesResponse = {
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

export type AdminUserRow = {
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

export type AdminSessionRow = {
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

export type AdminAnalyticsResponse = {
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

export type AdminBlogPost = {
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

export type AdminSportFeed = {
  name: string;
  kind: string;
  source: string;
  endpoint: string;
  status: string;
  configured: boolean;
  coverage: string;
  rows: number;
  latestAt: string | null;
};

export type AdminSportCountryRow = {
  country: string;
  teams?: number;
  teams_checked?: number;
  teams_with_squads?: number;
  players?: number;
  staff?: number;
  fixtures?: number;
  next_24h?: number;
  next_7d?: number;
  last_update?: string | null;
};

export type AdminSportRow = {
  key: string;
  name: string;
  status: string;
  profileProvider: string;
  fixtureProvider: string;
  exchanges: string[];
  oddsOnly: string[];
  notes: string;
  feeds: AdminSportFeed[];
  market: {
    totalMarkets?: number;
    upcomingMarkets?: number;
    marketsWithMoney?: number;
    latestObservedAt?: string | null;
    latestStartAt?: string | null;
    exchanges?: Record<string, {
      markets: number;
      marketsWithMoney: number;
      liquidity: number;
      latestObservedAt: string | null;
      latestStartAt: string | null;
    }>;
  };
  profile: {
    available: boolean;
    totals?: Record<string, number>;
    latest?: Record<string, string | null>;
    countries?: AdminSportCountryRow[];
  };
  fixturesByCountry?: AdminSportCountryRow[];
  news?: { sources: number; enabled: number; lastSuccessAt: string | null; eventsFetched: number } | null;
  globalNews?: { sources: number; enabled: number; lastSuccessAt: string | null; eventsFetched: number } | null;
};

export type AdminSportsResponse = {
  generatedAt: string;
  summary: {
    sports: number;
    liveSports: number;
    marketRows: number;
    profileTeams: number;
    profilePlayers: number;
    uncheckedFootballTeams: number;
  };
  sports: AdminSportRow[];
};

export type AdminTranscriptsResponse = {
  generatedAt: string;
  feeds: Array<{
    feed_id: string;
    feed_name?: string | null;
    segments: number;
    latest_created_at?: string | null;
  }>;
  segments: Array<{
    id: string;
    feed_id: string;
    feed_name?: string | null;
    source_url?: string | null;
    source_type?: string | null;
    transcript_text: string;
    timestamp_start?: number | null;
    timestamp_end?: number | null;
    received_at?: number | null;
    processing_time?: number | null;
    detected_language?: string | null;
    confidence?: number | null;
    speaker?: string | null;
    created_at?: string | null;
  }>;
};

function authHeaders(): Record<string, string> {
  const token = window.localStorage.getItem("sportsedge.auth.token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchAdminJson<T>(path: string, init: RequestInit = {}) {
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

export { analyticsCellValue, asNumber, formatDate, objectEntries };
