import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { MobileBottomNav } from "../../app/MobileBottomNav";
import { localDateKey, localEventTime } from "../../core/format";

const DATE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "Next 7 Days", value: "next-7-days" }
];

type Fixture = {
  id?: string;
  providerFixtureId?: string;
  country?: string | null;
  leagueName?: string | null;
  kickoffAt?: string | null;
  statusShort?: string | null;
  statusLong?: string | null;
  goals?: { home?: number | null; away?: number | null };
  home?: { name?: string | null; logoUrl?: string | null };
  away?: { name?: string | null; logoUrl?: string | null };
};

function fixtureScore(fixture: Fixture) {
  const home = fixture.goals?.home;
  const away = fixture.goals?.away;
  if (home == null || away == null) return "-";
  return `${home}-${away}`;
}

export default function MobileFootball() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [scope, setScope] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const timezone = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London");
        const response = await fetch(`/api/football/fixtures?days=31&limit=5000&timezone=${timezone}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!cancelled) setFixtures(Array.isArray(payload.fixtures) ? payload.fixtures : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const timer = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const todayKey = localDateKey(new Date());
  const tomorrowKey = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return localDateKey(date);
  }, []);
  const filtered = fixtures.filter((fixture) => {
    const key = localDateKey(fixture.kickoffAt || null);
    if (scope === "today") return key === todayKey;
    if (scope === "tomorrow") return key === tomorrowKey;
    if (scope === "next-7-days") {
      const kickoffTime = new Date(fixture.kickoffAt || "").getTime();
      if (!Number.isFinite(kickoffTime)) return false;
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);
      return kickoffTime >= start.getTime() && kickoffTime <= end.getTime();
    }
    return true;
  });

  return (
    <>
      <TerminalTopbar active="football" searchPlaceholder="Football fixtures..." />
      <main className="mobile-terminal-page">
        <section className="mobile-hero">
          <span>API-Football</span>
          <h1>Football Fixtures</h1>
          <p>All soccer fixtures currently available from the API-Football cache.</p>
        </section>
        <section className="mobile-filter-pills" aria-label="Football fixture date filters">
          {DATE_FILTERS.map((item) => (
            <button className={scope === item.value ? "active" : ""} key={item.value} type="button" onClick={() => setScope(item.value)}>
              {item.label}
            </button>
          ))}
        </section>
        <section className="mobile-kpi-grid">
          <article><span>Fixtures</span><strong>{filtered.length}</strong></article>
          <article><span>Today</span><strong>{fixtures.filter((fixture) => localDateKey(fixture.kickoffAt || null) === todayKey).length}</strong></article>
          <article><span>Tomorrow</span><strong>{fixtures.filter((fixture) => localDateKey(fixture.kickoffAt || null) === tomorrowKey).length}</strong></article>
        </section>
        <section className="mobile-card-list">
          <header><span>Fixtures</span><strong>{filtered.length}</strong></header>
          {filtered.map((fixture) => (
            <article className="mobile-fixture-card" key={fixture.id || fixture.providerFixtureId}>
              <time>{localEventTime(fixture.kickoffAt || null)}</time>
              <div>
                <strong>{fixture.home?.name || "Home"} v {fixture.away?.name || "Away"}</strong>
                <span>{fixture.country || "World"} / {fixture.leagueName || "Fixture"}</span>
              </div>
              <em>{fixtureScore(fixture)}</em>
              <small>{fixture.statusShort || fixture.statusLong || "NS"}</small>
            </article>
          ))}
          {!loading && filtered.length === 0 && <p className="mobile-empty">No fixtures returned for this filter.</p>}
          {loading && filtered.length === 0 && <p className="mobile-empty">Loading fixtures.</p>}
        </section>
      </main>
      <MobileBottomNav active="football" />
    </>
  );
}
