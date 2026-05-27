import { type FormEvent, useEffect, useState } from "react";
import { Activity, Database, ExternalLink, Headphones, Lock, LogOut, Newspaper, PauseCircle, PlayCircle, RefreshCw, Search, ShieldCheck, Target, Trash2 } from "lucide-react";
import {
  analyticsCellValue,
  asNumber,
  fetchAdminJson,
  formatDate,
  type AdminAnalyticsResponse,
  type AdminBlogPost,
  type AdminNewsSource,
  type AdminNewsSourcesResponse,
  type AdminSportsResponse,
  type AdminSportRow,
  type AdminSessionRow,
  type AdminTranscriptsResponse,
  type AdminUserRow
} from "../../core/admin";

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

export default function AdminConsole() {
  const [panel, setPanel] = useState<"overview" | "sports" | "users" | "sessions" | "analytics" | "blog" | "newsSources" | "transcripts">("overview");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [sessions, setSessions] = useState<AdminSessionRow[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [sports, setSports] = useState<AdminSportsResponse | null>(null);
  const [transcripts, setTranscripts] = useState<AdminTranscriptsResponse | null>(null);
  const [transcriptQuery, setTranscriptQuery] = useState({ feed_id: "all", q: "" });
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
    const [userResult, sessionResult, analyticsResult, blogResult, sportsResult, transcriptsResult] = await Promise.allSettled([
      fetchAdminJson<{ users: AdminUserRow[] }>("/auth/admin/users"),
      fetchAdminJson<{ sessions: AdminSessionRow[] }>("/auth/admin/sessions"),
      fetchAdminJson<AdminAnalyticsResponse>("/auth/admin/analytics?days=30"),
      fetchAdminJson<{ posts: AdminBlogPost[] }>("/auth/admin/blog-posts"),
      fetchAdminJson<AdminSportsResponse>("/auth/admin/sports"),
      fetchAdminJson<AdminTranscriptsResponse>("/auth/admin/transcripts?limit=100")
    ]);

    if (userResult.status === "fulfilled") setUsers(userResult.value.users || []);
    else nextErrors.users = userResult.reason instanceof Error ? userResult.reason.message : "Users endpoint failed";
    if (sessionResult.status === "fulfilled") setSessions(sessionResult.value.sessions || []);
    else nextErrors.sessions = sessionResult.reason instanceof Error ? sessionResult.reason.message : "Sessions endpoint failed";
    if (analyticsResult.status === "fulfilled") setAnalytics(analyticsResult.value);
    else nextErrors.analytics = analyticsResult.reason instanceof Error ? analyticsResult.reason.message : "Analytics endpoint failed";
    if (blogResult.status === "fulfilled") setPosts(blogResult.value.posts || []);
    else nextErrors.blog = blogResult.reason instanceof Error ? blogResult.reason.message : "Blog endpoint failed";

    if (sportsResult.status === "fulfilled") setSports(sportsResult.value);
    else nextErrors.sports = sportsResult.reason instanceof Error ? sportsResult.reason.message : "Sports endpoint failed";
    if (transcriptsResult.status === "fulfilled") setTranscripts(transcriptsResult.value);
    else nextErrors.transcripts = transcriptsResult.reason instanceof Error ? transcriptsResult.reason.message : "Transcripts endpoint failed";

    setErrors(nextErrors);
    setLoading(false);
  }

  useEffect(() => {
    loadAdmin();
  }, []);

  async function loadTranscripts(event?: FormEvent) {
    event?.preventDefault();
    setBusy("transcripts");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (transcriptQuery.feed_id && transcriptQuery.feed_id !== "all") params.set("feed_id", transcriptQuery.feed_id);
      if (transcriptQuery.q.trim()) params.set("q", transcriptQuery.q.trim());
      const payload = await fetchAdminJson<AdminTranscriptsResponse>(`/auth/admin/transcripts?${params.toString()}`);
      setTranscripts(payload);
      setErrors((current) => {
        const next = { ...current };
        delete next.transcripts;
        return next;
      });
    } catch (error) {
      setErrors((current) => ({ ...current, transcripts: error instanceof Error ? error.message : "Transcripts endpoint failed" }));
    } finally {
      setBusy("");
    }
  }

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
          <button className={panel === "sports" ? "active" : ""} type="button" onClick={() => setPanel("sports")}><Database size={16} /> Sports</button>
          <button className={panel === "transcripts" ? "active" : ""} type="button" onClick={() => setPanel("transcripts")}><Headphones size={16} /> Audio Transcripts</button>
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
          <small>users / sessions / analytics / transcripts</small>
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
            <p>User control, live sessions, SportsEdge site analytics, audio transcripts, and public blog publishing.</p>
          </div>
          <div className="news-kpis">
            <span><strong>{users.length}</strong> users</span>
            <span><strong>{activeSessions.length}</strong> active sessions</span>
            <span><strong>{Number(summary.pageviews || 0).toLocaleString("en-GB")}</strong> visits</span>
            <span><strong>{Number(transcripts?.feeds.reduce((total, feed) => total + Number(feed.segments || 0), 0) || 0).toLocaleString("en-GB")}</strong> transcripts</span>
            <span><strong>{publishedPosts.length}</strong> published</span>
            <span><strong>{sports?.summary.liveSports ?? "-"}</strong> sports live</span>
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
          <article><span>Sports Data</span><strong>{sports?.summary.sports ?? "-"}</strong><p>{errors.sports || `${Number(sports?.summary.marketRows || 0).toLocaleString("en-GB")} market rows configured.`}</p></article>
          <article><span>Audio</span><strong>{Number(transcripts?.feeds.reduce((total, feed) => total + Number(feed.segments || 0), 0) || 0).toLocaleString("en-GB")}</strong><p>{errors.transcripts || `Latest ${transcripts?.feeds[0]?.feed_id || "feed"}: ${formatDate(transcripts?.feeds[0]?.latest_created_at || null)}`}</p></article>
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

        {panel === "sports" && <AdminSportsPanel data={sports} error={errors.sports} />}

        {panel === "transcripts" && (
          <section className="news-panel admin-console-panel">
            <div className="news-panel-head">
              <span><Headphones size={15} /> Audio Transcripts</span>
              <strong>{transcripts ? `${formatNumber(transcripts.segments.length)} latest segments` : "loading"}</strong>
            </div>
            {errors.transcripts && <div className="news-state error">{errors.transcripts}</div>}
            <form className="admin-blog-form" onSubmit={loadTranscripts}>
              <select value={transcriptQuery.feed_id} onChange={(event) => setTranscriptQuery((current) => ({ ...current, feed_id: event.target.value }))}>
                <option value="all">All feeds</option>
                {(transcripts?.feeds || []).map((feed) => (
                  <option value={feed.feed_id} key={feed.feed_id}>{feed.feed_name || feed.feed_id}</option>
                ))}
              </select>
              <input value={transcriptQuery.q} onChange={(event) => setTranscriptQuery((current) => ({ ...current, q: event.target.value }))} placeholder="Search transcript text" />
              <button className="refresh-button" type="submit" disabled={busy === "transcripts"}>
                <Search size={16} />
                {busy === "transcripts" ? "Searching" : "Search"}
              </button>
            </form>
            <div className="admin-console-grid compact">
              {(transcripts?.feeds || []).slice(0, 4).map((feed) => (
                <article key={feed.feed_id}>
                  <span>{feed.feed_name || feed.feed_id}</span>
                  <strong>{formatNumber(feed.segments)}</strong>
                  <p>{[feed.sport, feed.category].filter(Boolean).join(" / ") || "Uncategorised"}</p>
                  <p>Latest: {formatDate(feed.latest_created_at || null)}</p>
                </article>
              ))}
              {!(transcripts?.feeds || []).length && !errors.transcripts && <article><span>Audio</span><strong>-</strong><p>No transcript feeds returned.</p></article>}
            </div>
            <table className="admin-source-table admin-console-table admin-analytics-table raw">
              <thead><tr><th>Time</th><th>Feed</th><th>Transcript</th><th>Source</th><th>Timing</th><th>Model</th></tr></thead>
              <tbody>
                {(transcripts?.segments || []).map((segment) => (
                  <tr key={segment.id}>
                    <td>{formatDate(segment.created_at || null)}</td>
                    <td><strong>{segment.feed_name || segment.feed_id}</strong><span>{segment.feed_id}</span><span>{[segment.sport, segment.category].filter(Boolean).join(" / ") || "Uncategorised"}</span></td>
                    <td><strong>{segment.transcript_text}</strong></td>
                    <td><span>{segment.source_type || "-"}</span></td>
                    <td>{Number(segment.timestamp_start || 0).toFixed(1)}s - {Number(segment.timestamp_end || 0).toFixed(1)}s</td>
                    <td>{segment.detected_language || "-"}{segment.confidence ? ` / ${Math.round(segment.confidence * 100)}%` : ""}</td>
                  </tr>
                ))}
                {!(transcripts?.segments || []).length && !errors.transcripts && <tr><td colSpan={6}>No transcript segments returned.</td></tr>}
              </tbody>
            </table>
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

function formatNumber(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toLocaleString("en-GB") : "-";
}

function formatMoney(value: unknown) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "-";
  return `£${Math.round(numeric).toLocaleString("en-GB")}`;
}

function feedStatusClass(status: string) {
  if (["live", "configured", "backfilling"].includes(status)) return "source-pill ok";
  if (["waiting", "holding"].includes(status)) return "source-pill muted";
  return "source-pill danger";
}

function latestFeedUpdate(sport: AdminSportRow) {
  const dates = [
    sport.market?.latestObservedAt,
    sport.profile?.latest?.teams,
    sport.profile?.latest?.players,
    sport.profile?.latest?.fixtures,
    sport.news?.lastSuccessAt,
    sport.globalNews?.lastSuccessAt
  ].filter(Boolean).map((value) => new Date(String(value)).getTime()).filter(Number.isFinite);
  if (!dates.length) return null;
  return new Date(Math.max(...dates)).toISOString();
}

function exchangeRows(sport: AdminSportRow) {
  return Object.entries(sport.market?.exchanges || {})
    .sort(([, left], [, right]) => Number(right.liquidity || 0) - Number(left.liquidity || 0));
}

function AdminSportsPanel({ data, error }: { data: AdminSportsResponse | null; error?: string }) {
  const [selectedSportKey, setSelectedSportKey] = useState("football");
  const selectedSport = data?.sports.find((sport) => sport.key === selectedSportKey) || data?.sports[0] || null;
  const footballCountries = selectedSport?.key === "football" ? (selectedSport.profile?.countries || []) : [];
  const fixtureCountries = selectedSport?.key === "football" ? (selectedSport.fixturesByCountry || []) : [];

  useEffect(() => {
    if (data?.sports.length && !data.sports.some((sport) => sport.key === selectedSportKey)) {
      setSelectedSportKey(data.sports[0].key);
    }
  }, [data, selectedSportKey]);

  return (
    <section className="news-panel admin-console-panel admin-sports-panel">
      <div className="news-panel-head">
        <span><Database size={15} /> Sports Data Control</span>
        <strong>{data ? `${formatNumber(data.summary.liveSports)} live / ${formatNumber(data.summary.sports)} configured` : "loading"}</strong>
      </div>
      {error && <div className="news-state error">{error}</div>}
      {!data && !error && <div className="news-state">Loading sport feed map.</div>}

      {data && (
        <>
          <div className="admin-console-grid compact admin-sports-kpis">
            <article><span>Market Rows</span><strong>{formatNumber(data.summary.marketRows)}</strong><p>Redis market-state rows by sport.</p></article>
            <article><span>Football Teams</span><strong>{formatNumber(data.summary.profileTeams)}</strong><p>Teams cached from API-Football.</p></article>
            <article><span>Football Players</span><strong>{formatNumber(data.summary.profilePlayers)}</strong><p>Player profiles in local DB.</p></article>
            <article><span>Unchecked Teams</span><strong>{formatNumber(data.summary.uncheckedFootballTeams)}</strong><p>Remaining profile backfill.</p></article>
          </div>

          <div className="admin-sport-selector" role="tablist" aria-label="Sport data selectors">
            {data.sports.map((sport) => (
              <button
                className={sport.key === selectedSport?.key ? "active" : ""}
                key={sport.key}
                type="button"
                onClick={() => setSelectedSportKey(sport.key)}
              >
                <strong>{sport.name}</strong>
                <span>{sport.status}</span>
              </button>
            ))}
          </div>

          {selectedSport && (
            <>
              <div className="admin-sport-overview">
                <article>
                  <span>Configured Picture</span>
                  <strong>{selectedSport.name}</strong>
                  <p>{selectedSport.notes}</p>
                </article>
                <article>
                  <span>Exchange Ladders</span>
                  <strong>{selectedSport.exchanges.join(" / ") || "None"}</strong>
                  <p>{formatNumber(selectedSport.market?.totalMarkets)} market rows, {formatNumber(selectedSport.market?.marketsWithMoney)} with visible money.</p>
                </article>
                <article>
                  <span>Profiles / Fixtures</span>
                  <strong>{selectedSport.profileProvider}</strong>
                  <p>{selectedSport.fixtureProvider}</p>
                </article>
                <article>
                  <span>Latest Update</span>
                  <strong>{formatDate(latestFeedUpdate(selectedSport))}</strong>
                  <p>Newest profile, fixture, market, or news feed update.</p>
                </article>
              </div>

              <div className="news-panel-head admin-analytics-subhead">
                <span>Consumed Feeds</span>
                <strong>{selectedSport.feeds.length} configured routes</strong>
              </div>
              <table className="admin-source-table admin-console-table admin-sports-table">
                <thead><tr><th>Feed</th><th>Status</th><th>Source</th><th>Coverage</th><th>Rows</th><th>Latest</th><th>Endpoint</th></tr></thead>
                <tbody>
                  {selectedSport.feeds.map((feed) => (
                    <tr key={`${selectedSport.key}-${feed.kind}-${feed.name}`}>
                      <td><strong>{feed.name}</strong><span>{feed.kind}</span></td>
                      <td><span className={feedStatusClass(feed.status)}>{feed.status}</span></td>
                      <td>{feed.source}</td>
                      <td>{feed.coverage || "-"}</td>
                      <td>{formatNumber(feed.rows)}</td>
                      <td>{formatDate(feed.latestAt)}</td>
                      <td><span>{feed.endpoint}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="news-panel-head admin-analytics-subhead">
                <span>Exchange State</span>
                <strong>{exchangeRows(selectedSport).length} venues</strong>
              </div>
              <table className="admin-source-table admin-console-table admin-sports-table">
                <thead><tr><th>Exchange</th><th>Markets</th><th>With Money</th><th>Visible Money</th><th>Latest Tick</th><th>Latest Event</th></tr></thead>
                <tbody>
                  {exchangeRows(selectedSport).map(([exchange, row]) => (
                    <tr key={`${selectedSport.key}-${exchange}`}>
                      <td><strong>{exchange.toUpperCase()}</strong></td>
                      <td>{formatNumber(row.markets)}</td>
                      <td>{formatNumber(row.marketsWithMoney)}</td>
                      <td>{formatMoney(row.liquidity)}</td>
                      <td>{formatDate(row.latestObservedAt)}</td>
                      <td>{formatDate(row.latestStartAt)}</td>
                    </tr>
                  ))}
                  {!exchangeRows(selectedSport).length && <tr><td colSpan={6}>No exchange market-state rows currently visible for this sport.</td></tr>}
                </tbody>
              </table>

              {selectedSport.key === "football" && (
                <>
                  <div className="news-panel-head admin-analytics-subhead">
                    <span>Football Country Profile Cache</span>
                    <strong>{footballCountries.length} countries</strong>
                  </div>
                  <table className="admin-source-table admin-console-table admin-sports-table">
                    <thead><tr><th>Country</th><th>Teams</th><th>Checked</th><th>Squads</th><th>Players</th><th>Staff</th><th>Last Profile Update</th></tr></thead>
                    <tbody>
                      {footballCountries.slice(0, 80).map((country) => (
                        <tr key={`profiles-${country.country}`}>
                          <td><strong>{country.country}</strong></td>
                          <td>{formatNumber(country.teams)}</td>
                          <td>{formatNumber(country.teams_checked)}</td>
                          <td>{formatNumber(country.teams_with_squads)}</td>
                          <td>{formatNumber(country.players)}</td>
                          <td>{formatNumber(country.staff)}</td>
                          <td>{formatDate(country.last_update || null)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="news-panel-head admin-analytics-subhead">
                    <span>Football Fixture Cache</span>
                    <strong>{fixtureCountries.length} countries</strong>
                  </div>
                  <table className="admin-source-table admin-console-table admin-sports-table">
                    <thead><tr><th>Country</th><th>Fixtures</th><th>Next 24h</th><th>Next 7d</th><th>Last Fixture Update</th></tr></thead>
                    <tbody>
                      {fixtureCountries.slice(0, 80).map((country) => (
                        <tr key={`fixtures-${country.country}`}>
                          <td><strong>{country.country}</strong></td>
                          <td>{formatNumber(country.fixtures)}</td>
                          <td>{formatNumber(country.next_24h)}</td>
                          <td>{formatNumber(country.next_7d)}</td>
                          <td>{formatDate(country.last_update || null)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
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
