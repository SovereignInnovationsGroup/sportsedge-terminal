import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CalendarClock, Database, ExternalLink, Newspaper, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { asNumber, cleanText, displayLabel, formatDate, objectEntries } from "../../core/format";
import {
  newsContextText,
  newsOpenUrl,
  type NewsItem,
  type NewsResponse
} from "../../core/news";

const sportsEdgeMarketsLogo = "/images/sportsedge-markets-logo.png";

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

function DetailSection({ title, entries }: { title: string; entries: [string, unknown][] }) {
  if (!entries.length) return null;
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      {entries.map(([key, value]) => (
        <div key={key}>
          <span>{displayLabel(key, key)}</span>
          <strong>{typeof value === "object" ? JSON.stringify(value) : String(value)}</strong>
        </div>
      ))}
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
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export default function NewsConsole() {
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
                    <small>{failure.last_error || "Unknown failure"} - {formatDate(failure.last_polled_at || null)}</small>
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
                    <small>{poll.items_seen} seen / {poll.items_inserted} new / {formatDate(poll.started_at || null)}</small>
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
