import { useEffect, useMemo, useRef, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { cleanText, displayLabel, normalizeFixtureText } from "../../core/format";
import {
  apiSportValue,
  mergeNewsItems,
  newsOpenUrl,
  sportMatchesNewsFilter,
  sportsEdgeWsUrl,
  terminalNewsHeadline,
  terminalNewsTag,
  uniqueNewsItems,
  type NewsItem
} from "../../core/news";

type FeedMode = "all" | "sites" | "twitter";
type SocketStatus = "offline" | "connecting" | "live" | "waiting";

type TwitterNewsRow = {
  tweet_id: string;
  sport: string | null;
  account_handle: string | null;
  author_name: string | null;
  text: string | null;
  analysis_text: string | null;
  news_type: string | null;
  impact_score: number | string | null;
  urgency: string | null;
  direction: string | null;
  reason: string | null;
  affected_entity: string | null;
  url: string | null;
  published_at: string | null;
  discovered_at: string;
};

type NewsStory = {
  id: string;
  kind: "media" | "social";
  item?: NewsItem;
  twitter?: TwitterNewsRow;
  time: string;
  exactTime: string;
  sortTime: number;
  tag: string;
  urgency: string;
  source: string;
  headline: string;
  rawType: string;
  rawScore: number;
  impact: string;
  body: string;
};

const NEWS_DISPLAY_TIME_ZONE = "Europe/Madrid";

const NEWS_FEED_SPORT_FILTERS = [
  ["all", "All"],
  ["football", "Football"],
  ["tennis", "Tennis"],
  ["basketball", "Basketball"],
  ["baseball", "Baseball"],
  ["golf", "Golf"]
] as const;

function normalizeSport(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (normalized === "soccer") return "football";
  if (["horse-racing", "horseracing", "racing"].includes(normalized)) return "horseracing";
  return normalized;
}

function parseSportsEdgeUtcTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const raw = String(value).trim();
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const withZone = /(?:Z|[+-]\d\d:?\d\d)$/.test(normalized) ? normalized : `${normalized}Z`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date;
}

function storyTimestamp(item: Pick<NewsItem | TwitterNewsRow, "published_at" | "discovered_at">) {
  const publishedAt = parseSportsEdgeUtcTimestamp(item.published_at);
  const discoveredAt = parseSportsEdgeUtcTimestamp(item.discovered_at);
  return publishedAt || discoveredAt;
}

function compactTimeLabel(value: Date | null) {
  if (!value) return "--";
  const rawDeltaSeconds = Math.floor((Date.now() - value.getTime()) / 1000);
  const deltaSeconds = Math.max(0, rawDeltaSeconds);
  const clock = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: NEWS_DISPLAY_TIME_ZONE
  }).format(value);
  if (rawDeltaSeconds < -30) return `sch / ${clock}`;
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
  }).format(value);
}

function exactTimeLabel(item: Pick<NewsItem | TwitterNewsRow, "published_at" | "discovered_at">) {
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
    publishedAt ? `published ${formatter.format(publishedAt)} ES` : "",
    discoveredAt ? `discovered ${formatter.format(discoveredAt)} ES` : ""
  ].filter(Boolean).join(" / ");
}

function urgencyFromScore(scoreValue: number | string | null | undefined, urgencyValue?: string | null) {
  const score = Number(scoreValue || 0);
  const urgency = String(urgencyValue || "").toLowerCase();
  if (urgency === "immediate" || score >= 75) return "1";
  if (urgency === "high" || score >= 50) return "2";
  if (score >= 25 || urgency === "medium") return "3";
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
  const text = cleanSocialText(row.text || row.analysis_text);
  const type = displayLabel(row.news_type, "update").toLowerCase();
  if (reason && !/^no clear market-moving phrase/i.test(reason)) {
    return `${displayLabel(row.account_handle || row.author_name, "Twitter/X")} ${type}: ${reason}`;
  }
  return text;
}

function mediaStory(item: NewsItem): NewsStory {
  const date = storyTimestamp(item);
  const impact = item.impact_assessment;
  return {
    id: item.id || normalizeFixtureText(`${item.title}-${item.discovered_at}`),
    kind: "media",
    item,
    time: compactTimeLabel(date),
    exactTime: exactTimeLabel(item),
    sortTime: date?.getTime() || 0,
    tag: terminalNewsTag(item),
    urgency: urgencyFromScore(impact?.impact_score, impact?.urgency),
    source: displayLabel(item.source_name || item.source_type, "SE NEWS").toUpperCase().slice(0, 18),
    headline: cleanText(item.title),
    rawType: [item.source_type, item.entity_type, impact?.event_type].filter(Boolean).join(" "),
    rawScore: Number(impact?.impact_score || 0),
    impact: [impact?.event_type, impact?.impact_score ? `${impact.impact_score}` : "", impact?.direction].filter(Boolean).join(" / ") || displayLabel(item.competition || item.entity_name || item.sport, "Monitor"),
    body: terminalNewsHeadline(item)
  };
}

function socialStory(row: TwitterNewsRow): NewsStory {
  const date = storyTimestamp(row);
  const score = Number(row.impact_score || 0);
  return {
    id: `twitter:${row.tweet_id}`,
    kind: "social",
    twitter: row,
    time: compactTimeLabel(date),
    exactTime: exactTimeLabel(row),
    sortTime: date?.getTime() || 0,
    tag: (row.account_handle || row.sport || "X").replace(/^@/, "").slice(0, 8).toUpperCase(),
    urgency: urgencyFromScore(score, row.urgency),
    source: "SOCIAL",
    headline: cleanSocialText(row.text || row.analysis_text),
    rawType: row.news_type || "",
    rawScore: score,
    impact: [row.news_type, row.impact_score ? `${row.impact_score}` : "", row.direction].filter(Boolean).join(" / ") || "Monitor",
    body: twitterSummary(row)
  };
}

export default function News() {
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [twitterRows, setTwitterRows] = useState<TwitterNewsRow[]>([]);
  const [feedMode, setFeedMode] = useState<FeedMode>("all");
  const [intelligenceView, setIntelligenceView] = useState("top");
  const [sport, setSport] = useState("football");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("offline");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const sportRef = useRef(sport);

  useEffect(() => {
    sportRef.current = sport;
  }, [sport]);

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
        if (!response.ok || !Array.isArray(payload.items)) throw new Error(payload.message || payload.detail || "News feed unavailable");
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
      .map(socialStory);
    const mediaStories = uniqueNewsItems(items)
      .filter((item) => sport === "all" || sportMatchesNewsFilter(item.sport, sport))
      .map(mediaStory);
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
  const selectedOriginalUrl = selected?.twitter?.url || (selected?.item ? newsOpenUrl(selected.item) : "");

  return (
    <>
      <TerminalTopbar active="news" onSearchChange={setQuery} searchPlaceholder="NEWS, ARS, EPL, PLAYER: SAKA, MATCH: ARS-TOT..." />
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
            <span>{socketStatus === "live" ? "wss live" : socketStatus}</span>
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
              <button className={story.id === selected?.id ? "selected" : ""} type="button" key={story.id} onClick={() => setSelectedId(story.id)}>
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
                        {selectedOriginalUrl ? (
                          <a className="bb-news-source-link" href={selectedOriginalUrl} target="_blank" rel="noreferrer">
                            {selected.twitter ? `@${selected.twitter.account_handle || selected.twitter.author_name || "source"}` : selected.item?.source_name || selected.source}
                          </a>
                        ) : selected.source}
                      </td>
                    </tr>
                    <tr><th>Published</th><td>{selected.exactTime}</td></tr>
                    <tr><th>Linked markets</th><td>{selected.twitter?.affected_entity || displayLabel(selected.item?.competition, "Market watch")}</td></tr>
                    <tr><th>Entities</th><td>{selected.twitter ? [selected.twitter.account_handle, selected.twitter.sport, selected.twitter.news_type].filter(Boolean).join(", ") : [selected.item?.entity_name, selected.item?.competition, selected.item?.sport].filter(Boolean).join(", ") || selected.tag}</td></tr>
                    <tr><th>Action</th><td>{selected.twitter?.reason || "Keep headline visible in rail and update confidence, not raw venue columns."}</td></tr>
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
