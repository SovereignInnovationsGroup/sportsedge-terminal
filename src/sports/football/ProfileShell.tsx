import { type ReactNode, useEffect, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { cleanText, formatTimeAgo } from "./footballFormat";

type ProfileBreadcrumbItem = { label: string; href?: string };

type ProfileNewsItem = {
  id?: string;
  title?: string;
  sport?: string | null;
  source_name?: string | null;
  source_type?: string | null;
  published_at?: string | null;
  discovered_at?: string | null;
};

function storySourceTag(item: ProfileNewsItem) {
  const source = item.source_name || item.source_type || item.sport || "NEWS";
  const words = cleanText(source).split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map((word) => word[0]).join("").slice(0, 6).toUpperCase();
  return cleanText(source).replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "NEWS";
}

function ProfileTextNewsRail({ label, query = "" }: { label: string; query?: string }) {
  const [items, setItems] = useState<ProfileNewsItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "32", include_context: "1", sport: "football" });
    if (query.trim()) params.set("q", query.trim());
    fetch(`/api/news?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(payload.items)) throw new Error("News unavailable");
        setItems(payload.items);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setItems([]);
      });
    return () => controller.abort();
  }, [query]);

  return (
    <aside className="bb-demo-news bb-profile-news-rail" aria-label="Profile intelligence rail">
      <div className="bb-demo-news-head"><strong>Intelligence</strong><span>{label}</span></div>
      {items.map((item) => (
        <article key={`profile-news-${item.id || item.title}`}>
          <time>{formatTimeAgo(item.published_at || item.discovered_at)}</time>
          <b>{storySourceTag(item)}</b>
          <p>{cleanText(item.title)}</p>
        </article>
      ))}
      {items.length === 0 && (
        <div className="bb-news-state">No matched news yet.</div>
      )}
    </aside>
  );
}

export function FootballProfileShell({
  breadcrumbs,
  newsLabel,
  newsQuery,
  mode = "team",
  contextLabel,
  children
}: {
  breadcrumbs: ProfileBreadcrumbItem[];
  newsLabel: string;
  newsQuery: string;
  mode?: "team" | "player";
  contextLabel?: string;
  children: ReactNode;
}) {
  const functions = mode === "team"
    ? ["Overview", "Market Picture", "Squad", "Fixtures", "News", "Diagnostics", "Alerts", "Saved"]
    : ["Overview", "Props", "Stats", "Fitness", "Team Link", "News", "Diagnostics", "Alerts"];

  return (
    <main className="agtest-page bb-profile-page">
      <TerminalTopbar active="football" searchPlaceholder="TEAM: ARSENAL, PLAYER: SAKA, NEWS, PROPS, DIAGNOSTICS..." />
      <section className="agtest-subbar bb-demo-subbar profile-command-subbar" aria-label="Profile navigation">
        <nav aria-label="Profile breadcrumb">
          {breadcrumbs.map((item, index) => item.href ? (
            <button type="button" key={`${item.label}-${index}`} onClick={() => { window.location.hash = item.href || "#dashboard"; }}>{item.label}</button>
          ) : (
            <button className="active" type="button" key={`${item.label}-${index}`}>{item.label}</button>
          ))}
        </nav>
        <div>
          <span>{mode === "team" ? "Team profile" : "Player profile"}</span>
          <span>{contextLabel || newsLabel}</span>
          <span>SportsEdge picture</span>
        </div>
      </section>
      <div className="bb-profile-layout">
        <aside className="bb-news-filters">
          <strong>Profile Functions</strong>
          {functions.map((item, index) => (
            <button className={index === 0 ? "active" : ""} type="button" key={item}>{item}</button>
          ))}
          <div className="bb-news-filter-card">
            <span>Context</span>
            <b>{contextLabel || newsLabel}</b>
            <em>Live profile object: identity, stats, news and market readiness.</em>
          </div>
        </aside>
        <section className="bb-profile-main">
          {children}
        </section>
        <ProfileTextNewsRail label={newsLabel} query={newsQuery} />
      </div>
    </main>
  );
}
