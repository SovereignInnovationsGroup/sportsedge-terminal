import { useEffect, useMemo, useRef, useState } from "react";
import { TerminalTopbar as SportsEdgeTopbar } from "../../app/TerminalTopbar";
import { cleanText, displayLabel, formatDate, normalizeFixtureText, teamInitials } from "../../core/format";
import { apiSportValue, mergeNewsItems, newsContextText, newsImageUrl, newsOpenUrl, PRIORITY_SPORTS, sportMatchesNewsFilter, sportsEdgeWsUrl, uniqueNewsItems, type NewsItem } from "../../core/news";

export default function StandaloneNews() {
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
