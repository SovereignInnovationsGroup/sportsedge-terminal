import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Apple,
  ArrowRight,
  CalendarClock,
  Database,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  Mail,
  Newspaper,
  RefreshCw,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";
import "./styles/dashboard.css";
import loginSportsImage from "./public/images/login-sports-montage.png";
import sportsEdgeMarketsLogo from "./public/images/sportsedge-markets-logo.png";

type NewsItem = {
  id: string;
  sport: string | null;
  country: string | null;
  competition: string | null;
  entity_name: string | null;
  entity_type: string | null;
  source_name: string;
  source_type: string;
  source_url: string;
  canonical_url: string | null;
  title: string;
  display_summary: string | null;
  status: string;
  published_at: string | null;
  discovered_at: string;
  facts: Record<string, unknown> | null;
  entities: unknown[] | Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  impact_assessment: ImpactAssessment | null;
};

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

function asNumber(value: string | number | null | undefined) {
  return Number(value || 0);
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

function impactClass(assessment: ImpactAssessment | null) {
  if (!assessment) return "";
  if (assessment.urgency === "immediate" || assessment.impact_score >= 75) return "high";
  if (assessment.urgency === "high" || assessment.impact_score >= 50) return "medium";
  return "low";
}

function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="login-shell">
      <section
        className="login-visual"
        aria-label="SportsEdge sports trading visual"
        style={{ backgroundImage: `url(${loginSportsImage})` }}
      >
        <img className="login-visual-image" src={loginSportsImage} alt="Multiple sports in a live trading market environment" />
        <div className="visual-overlay" />
        <div className="visual-brand">
          <img className="brand-logo" src={sportsEdgeMarketsLogo} alt="SportsEdge Markets logo" />
        </div>
        <div className="visual-market-card">
          <div>
            <span>Live edge</span>
            <strong>+4.2%</strong>
          </div>
          <div>
            <span>Matched</span>
            <strong>GBP 1.92m</strong>
          </div>
          <div>
            <span>Latency</span>
            <strong>18ms</strong>
          </div>
        </div>
      </section>

      <section className="login-panel" aria-label="Login form">
        <div className="login-card">
          <div className="login-card-head">
            <div className="mini-mark">
              <ShieldCheck size={19} />
            </div>
            <div>
              <h1>Sign in to SportsEdge Markets</h1>
              <p>Access live markets, orders, signals, and risk.</p>
            </div>
          </div>

          <div className="social-row">
            <button className="social-button" type="button">
              <Apple size={18} />
              Apple
            </button>
            <button className="social-button" type="button">
              <span className="google-mark">G</span>
              Google
            </button>
          </div>

          <div className="divider">
            <span>or use email</span>
          </div>

          <form className="login-form">
            <label className="auth-field">
              <span>Email address</span>
              <div>
                <Mail size={17} />
                <input type="email" placeholder="trader@sportsedge.exchange" autoComplete="email" />
              </div>
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div>
                <Lock size={17} />
                <input type={showPassword ? "text" : "password"} placeholder="Enter password" autoComplete="current-password" />
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

            <button className="login-submit" type="submit">
              <Zap size={17} />
              Sign In
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
        <img className="news-logo" src={sportsEdgeMarketsLogo} alt="SportsEdge Markets logo" />
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
          <small>Postgres read-only</small>
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
                    <p>{cleanText(item.display_summary) || "No display summary available."}</p>
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
                    <a className="source-link" href={item.canonical_url || item.source_url} target="_blank" rel="noreferrer" aria-label={`Open source for ${item.title}`}>
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
        <img className="simple-news-logo" src={sportsEdgeMarketsLogo} alt="SportsEdge Markets logo" />
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
                <a href={item.canonical_url || item.source_url} target="_blank" rel="noreferrer">
                  {cleanText(item.title)}
                </a>
                <p>{cleanText(item.display_summary) || "No display summary available."}</p>
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

export default function App() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  if (hash === "#login") return <LoginScreen />;
  if (hash === "#simple-news") return <SimpleNewsPage />;
  return <NewsPage />;
}
