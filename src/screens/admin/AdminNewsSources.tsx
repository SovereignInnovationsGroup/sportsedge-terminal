import { useEffect, useState } from "react";
import { Activity, Database, ExternalLink, LogOut, PauseCircle, PlayCircle, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { asNumber, formatDate, type AdminNewsSource, type AdminNewsSourcesResponse } from "../../core/admin";

const sportsEdgeMark = "/images/sportsedge-markets-mark.png";

function authHeaders(): Record<string, string> {
  const token = window.localStorage.getItem("sportsedge.auth.token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function logoutToLogin() {
  window.localStorage.removeItem("sportsedge.auth.token");
  window.localStorage.removeItem("sportsedge.auth.user");
  window.location.hash = "#login";
}

function AdminNewsSourcesPanelStandalone() {
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

export default function AdminNewsSources() {
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
        <AdminNewsSourcesPanelStandalone />
      </section>
    </main>
  );
}
