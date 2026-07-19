import { Info, LogOut, Search, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { APP_VERSION } from "../generated/version";

const sportsEdgeMarketsLogo = "/images/sportsedge-markets-logo.png";

const TOP_NAV = [
  { label: "Football", value: "football", route: "#football" },
  { label: "Tennis", value: "tennis", route: "#tennis" },
  { label: "Golf", value: "golf", route: "#golf" },
  { label: "Basketball", value: "basketball", route: "#basketball" },
  { label: "Baseball", value: "baseball", route: "#baseball" },
  { label: "NFL", value: "american-football", route: "#american-football" },
  { label: "Hockey", value: "hockey", route: "#hockey" },
  { label: "Motorsport", value: "motorsport", route: "#motorsport" },
  { label: "Rugby", value: "rugby", route: "#rugby" },
  { label: "Cricket", value: "cricket", route: "#cricket" },
  { label: "|", value: "global-divider", route: "", divider: true },
  { label: "Flow Grid", value: "flow-grid", route: "#flow-grid" },
  { label: "Arbs", value: "arbs", route: "#arbs" },
  { label: "XPoly", value: "xpoly", route: "#xpoly" },
  { label: "News", value: "news", route: "#news" }
] as const;

const FOOTBALL_NAV = [
  { label: "< Back", value: "all-sports", route: "#dashboard", tone: "back" },
  { label: "Football", value: "football", route: "#football", tone: "sport" },
  { label: "Liquidity", value: "liquidity", route: "#liquidity" },
  { label: "Bias Matrix", value: "bias-matrix", route: "#bias-matrix" },
  { label: "Tables", value: "football-tables", route: "#football-tables" },
  { label: "Results", value: "football-results", route: "#football-results" },
  { label: "Teams", value: "football-teams", route: "#football-teams" },
  { label: "Players", value: "football-players", route: "#football-players" },
  { label: "Injuries", value: "football-injuries", route: "#football-injuries" },
  { label: "News", value: "football-news", route: "#football-news" },
  { label: "AI Bot", value: "football-ai-bot", route: "#football-ai-bot" }
] as const;

const TENNIS_NAV = [
  { label: "< Back", value: "all-sports", route: "#dashboard", tone: "back" },
  { label: "Tennis", value: "tennis", route: "#tennis", tone: "sport" },
  { label: "Dashboard", value: "tennis-dashboard", route: "#tennis-dashboard" },
  { label: "Liquidity", value: "tennis-liquidity", route: "#tennis-liquidity" },
  { label: "Bias Matrix", value: "tennis-bias-matrix", route: "#tennis-bias-matrix" },
  { label: "Rankings", value: "tennis-rankings", route: "#tennis-rankings" },
  { label: "Results", value: "tennis-results", route: "#tennis-results" },
  { label: "Players", value: "tennis-players", route: "#tennis-players" },
  { label: "Tournaments", value: "tennis-tournaments", route: "#tennis-tournaments" },
  { label: "Injuries", value: "tennis-injuries", route: "#tennis-injuries" },
  { label: "News", value: "tennis-news", route: "#tennis-news" }
] as const;

const GOLF_NAV = [
  { label: "< Back", value: "all-sports", route: "#dashboard", tone: "back" },
  { label: "Golf", value: "golf", route: "#golf", tone: "sport" },
  { label: "Liquidity", value: "golf-liquidity", route: "#golf-liquidity" },
  { label: "Bias Matrix", value: "golf-bias-matrix", route: "#golf-bias-matrix" },
  { label: "Leaderboards", value: "golf-leaderboards", route: "#golf-leaderboards" },
  { label: "Results", value: "golf-results", route: "#golf-results" },
  { label: "Players", value: "golf-players", route: "#golf-players" },
  { label: "Tournaments", value: "golf-tournaments", route: "#golf-tournaments" },
  { label: "News", value: "golf-news", route: "#golf-news" }
] as const;

const BASKETBALL_NAV = [
  { label: "< Back", value: "all-sports", route: "#dashboard", tone: "back" },
  { label: "Basketball", value: "basketball", route: "#basketball", tone: "sport" },
  { label: "Liquidity", value: "basketball-liquidity", route: "#basketball-liquidity" },
  { label: "Bias Matrix", value: "basketball-bias-matrix", route: "#basketball-bias-matrix" },
  { label: "Standings", value: "basketball-standings", route: "#basketball-standings" },
  { label: "Results", value: "basketball-results", route: "#basketball-results" },
  { label: "Teams", value: "basketball-teams", route: "#basketball-teams" },
  { label: "Players", value: "basketball-players", route: "#basketball-players" },
  { label: "Injuries", value: "basketball-injuries", route: "#basketball-injuries" },
  { label: "News", value: "basketball-news", route: "#basketball-news" }
] as const;

const BASEBALL_NAV = [
  { label: "< Back", value: "all-sports", route: "#dashboard", tone: "back" },
  { label: "Baseball", value: "baseball", route: "#baseball", tone: "sport" },
  { label: "Liquidity", value: "baseball-liquidity", route: "#baseball-liquidity" },
  { label: "Bias Matrix", value: "baseball-bias-matrix", route: "#baseball-bias-matrix" },
  { label: "Standings", value: "baseball-standings", route: "#baseball-standings" },
  { label: "Results", value: "baseball-results", route: "#baseball-results" },
  { label: "Teams", value: "baseball-teams", route: "#baseball-teams" },
  { label: "Players", value: "baseball-players", route: "#baseball-players" },
  { label: "Injuries", value: "baseball-injuries", route: "#baseball-injuries" },
  { label: "News", value: "baseball-news", route: "#baseball-news" }
] as const;

const AMERICAN_FOOTBALL_NAV = [
  { label: "< Back", value: "all-sports", route: "#dashboard", tone: "back" },
  { label: "NFL", value: "american-football", route: "#american-football", tone: "sport" },
  { label: "Liquidity", value: "american-football-liquidity", route: "#american-football-liquidity" },
  { label: "Bias Matrix", value: "american-football-bias-matrix", route: "#american-football-bias-matrix" },
  { label: "Standings", value: "american-football-standings", route: "#american-football-standings" },
  { label: "Results", value: "american-football-results", route: "#american-football-results" },
  { label: "Teams", value: "american-football-teams", route: "#american-football-teams" },
  { label: "Players", value: "american-football-players", route: "#american-football-players" },
  { label: "Injuries", value: "american-football-injuries", route: "#american-football-injuries" },
  { label: "News", value: "american-football-news", route: "#american-football-news" }
] as const;

const HOCKEY_NAV = [
  { label: "< Back", value: "all-sports", route: "#dashboard", tone: "back" },
  { label: "Hockey", value: "hockey", route: "#hockey", tone: "sport" },
  { label: "Liquidity", value: "hockey-liquidity", route: "#hockey-liquidity" },
  { label: "Bias Matrix", value: "hockey-bias-matrix", route: "#hockey-bias-matrix" },
  { label: "Standings", value: "hockey-standings", route: "#hockey-standings" },
  { label: "Results", value: "hockey-results", route: "#hockey-results" },
  { label: "Teams", value: "hockey-teams", route: "#hockey-teams" },
  { label: "Players", value: "hockey-players", route: "#hockey-players" },
  { label: "Injuries", value: "hockey-injuries", route: "#hockey-injuries" },
  { label: "News", value: "hockey-news", route: "#hockey-news" }
] as const;

const MOTORSPORT_NAV = [
  { label: "< Back", value: "all-sports", route: "#dashboard", tone: "back" },
  { label: "Motorsport", value: "motorsport", route: "#motorsport", tone: "sport" },
  { label: "Markets", value: "motorsport-markets", route: "#motorsport-markets" },
  { label: "Bias Matrix", value: "motorsport-bias-matrix", route: "#motorsport-bias-matrix" },
  { label: "Calendar", value: "motorsport-calendar", route: "#motorsport-calendar" },
  { label: "Results", value: "motorsport-results", route: "#motorsport-results" },
  { label: "Drivers", value: "motorsport-drivers", route: "#motorsport-drivers" },
  { label: "Teams", value: "motorsport-teams", route: "#motorsport-teams" },
  { label: "News", value: "motorsport-news", route: "#motorsport-news" }
] as const;

const RUGBY_NAV = [
  { label: "< Back", value: "all-sports", route: "#dashboard", tone: "back" },
  { label: "Rugby", value: "rugby", route: "#rugby", tone: "sport" },
  { label: "Liquidity", value: "rugby-liquidity", route: "#rugby-liquidity" },
  { label: "Bias Matrix", value: "rugby-bias-matrix", route: "#rugby-bias-matrix" },
  { label: "Tables", value: "rugby-tables", route: "#rugby-tables" },
  { label: "Results", value: "rugby-results", route: "#rugby-results" },
  { label: "Teams", value: "rugby-teams", route: "#rugby-teams" },
  { label: "Players", value: "rugby-players", route: "#rugby-players" },
  { label: "Injuries", value: "rugby-injuries", route: "#rugby-injuries" },
  { label: "News", value: "rugby-news", route: "#rugby-news" }
] as const;

const CRICKET_NAV = [
  { label: "< Back", value: "all-sports", route: "#dashboard", tone: "back" },
  { label: "Cricket", value: "cricket", route: "#cricket", tone: "sport" },
  { label: "Liquidity", value: "cricket-liquidity", route: "#cricket-liquidity" },
  { label: "Bias Matrix", value: "cricket-bias-matrix", route: "#cricket-bias-matrix" },
  { label: "Tables", value: "cricket-tables", route: "#cricket-tables" },
  { label: "Results", value: "cricket-results", route: "#cricket-results" },
  { label: "Teams", value: "cricket-teams", route: "#cricket-teams" },
  { label: "Players", value: "cricket-players", route: "#cricket-players" },
  { label: "Series", value: "cricket-series", route: "#cricket-series" },
  { label: "News", value: "cricket-news", route: "#cricket-news" }
] as const;

const FOOTBALL_MODE = new Set(["football", "liquidity", "signal-demo", "signal-ticker-demo", "signal-ticker-v2", "signal-ticker-v3", "bias-matrix", "football-tables", "football-results", "football-teams", "football-players", "football-injuries", "football-news", "football-ai-bot", "football-profiles"]);
const TENNIS_MODE = new Set(["tennis", "tennis-dashboard", "tennis-liquidity", "tennis-bias-matrix", "tennis-rankings", "tennis-results", "tennis-players", "tennis-tournaments", "tennis-injuries", "tennis-news"]);
const GOLF_MODE = new Set(GOLF_NAV.map((item) => item.value));
const BASKETBALL_MODE = new Set(BASKETBALL_NAV.map((item) => item.value));
const BASEBALL_MODE = new Set(BASEBALL_NAV.map((item) => item.value));
const AMERICAN_FOOTBALL_MODE = new Set(AMERICAN_FOOTBALL_NAV.map((item) => item.value));
const HOCKEY_MODE = new Set(HOCKEY_NAV.map((item) => item.value));
const MOTORSPORT_MODE = new Set(MOTORSPORT_NAV.map((item) => item.value));
const RUGBY_MODE = new Set(RUGBY_NAV.map((item) => item.value));
const CRICKET_MODE = new Set(CRICKET_NAV.map((item) => item.value));

function sportNavForActive(active?: string) {
  if (!active) return null;
  if (FOOTBALL_MODE.has(active)) return { items: FOOTBALL_NAV, label: "Football navigation" };
  if (TENNIS_MODE.has(active)) return { items: TENNIS_NAV, label: "Tennis navigation" };
  if (GOLF_MODE.has(active)) return { items: GOLF_NAV, label: "Golf navigation" };
  if (BASKETBALL_MODE.has(active)) return { items: BASKETBALL_NAV, label: "Basketball navigation" };
  if (BASEBALL_MODE.has(active)) return { items: BASEBALL_NAV, label: "Baseball navigation" };
  if (AMERICAN_FOOTBALL_MODE.has(active)) return { items: AMERICAN_FOOTBALL_NAV, label: "NFL navigation" };
  if (HOCKEY_MODE.has(active)) return { items: HOCKEY_NAV, label: "Hockey navigation" };
  if (MOTORSPORT_MODE.has(active)) return { items: MOTORSPORT_NAV, label: "Motorsport navigation" };
  if (RUGBY_MODE.has(active)) return { items: RUGBY_NAV, label: "Rugby navigation" };
  if (CRICKET_MODE.has(active)) return { items: CRICKET_NAV, label: "Cricket navigation" };
  return null;
}

type StoredAuthUser = {
  email?: string;
  login_id?: string;
  subscription?: { plan_name?: string; level?: string; status?: string };
};

type GlobalSearchResult = {
  type: string;
  sport: string;
  title: string;
  subtitle?: string;
  href: string;
  provider?: string | null;
  imageUrl?: string | null;
  source?: string | null;
};

function readStoredAuthUser(): StoredAuthUser | null {
  try {
    const raw = window.localStorage.getItem("sportsedge.auth.user");
    return raw ? JSON.parse(raw) as StoredAuthUser : null;
  } catch {
    return null;
  }
}

function formatClock(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}

function logoutToLogin() {
  window.localStorage.removeItem("sportsedge.auth.token");
  window.localStorage.removeItem("sportsedge.auth.user");
  window.location.hash = "#login";
}

export function TerminalTopbar({
  active,
  searchPlaceholder = "Search sport, market, fixture, exchange...",
  onSearchChange,
  demoMode = false,
  tickerVisible,
  onTickerToggle,
  tickerLabel = "Ticker"
}: {
  active?: string;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  demoMode?: boolean;
  tickerVisible?: boolean;
  onTickerToggle?: () => void;
  tickerLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [clockNow, setClockNow] = useState(() => new Date());
  const [sessionUser] = useState(readStoredAuthUser);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const demoRef = useRef<HTMLDivElement | null>(null);
  const sportNav = sportNavForActive(active);
  const navItems = sportNav?.items || TOP_NAV;
  const navLabel = sportNav?.label || "SportsEdge navigation";
  const loginId = sessionUser?.login_id || sessionUser?.email || "public";
  const membershipLevel = sessionUser?.subscription?.plan_name || sessionUser?.subscription?.level || sessionUser?.subscription?.status || "guest";

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!settingsRef.current?.contains(event.target as Node)) setSettingsOpen(false);
      if (!demoRef.current?.contains(event.target as Node)) setDemoOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSettingsOpen(false);
      if (event.key === "Escape") setDemoOpen(false);
    }
    window.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=14`, { signal: controller.signal, cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("search failed")))
        .then((payload) => {
          const results = Array.isArray(payload.results) ? payload.results : [];
          setSearchResults(results);
          setSearchOpen(true);
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            setSearchResults([]);
            setSearchOpen(true);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchLoading(false);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function handleSlash(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>(".testboard-search input")?.focus();
      }
    }
    window.addEventListener("keydown", handleSlash);
    return () => window.removeEventListener("keydown", handleSlash);
  }, []);

  return (
    <header className={["testboard-topbar global-terminal-topbar", active === "flow-grid" ? "flow-grid-topbar" : ""].filter(Boolean).join(" ")}>
      <a className="testboard-brand" href="#dashboard" aria-label="SportsEdge dashboard">
        <img className="testboard-brand-logo" src={sportsEdgeMarketsLogo} alt="SportsEdge" />
      </a>
      <nav className={`testboard-nav${sportNav ? " football-mode" : ""}`} aria-label={navLabel}>
        {navItems.map((item) => (
          "divider" in item && item.divider ? (
            <span className="testboard-nav-divider" aria-hidden="true" key={item.value}>|</span>
          ) : (
            <button
              className={[active === item.value ? "active" : "", "tone" in item && item.tone ? `nav-${item.tone}` : ""].filter(Boolean).join(" ")}
              key={item.value}
              type="button"
              onClick={() => { window.location.hash = item.route; }}
            >
              {item.label}
            </button>
          )
        ))}
      </nav>
      <span className="testboard-right-divider" aria-hidden="true" />
      <label className="testboard-search">
        <Search size={15} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onSearchChange?.(event.target.value);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setSearchOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && searchResults[0]?.href) {
              event.preventDefault();
              window.location.hash = searchResults[0].href;
              setSearchOpen(false);
            }
            if (event.key === "Escape") setSearchOpen(false);
          }}
          placeholder={searchPlaceholder}
        />
        <kbd>/</kbd>
        {searchOpen && query.trim().length >= 2 && (
          <div className="testboard-search-results" role="listbox" onMouseDown={(event) => event.preventDefault()}>
            <div className="testboard-search-help">
              <span>Global search</span>
              <strong>FB: team/player • GF: golf • TN: tennis • NFL: player/team</strong>
            </div>
            {searchLoading && <div className="testboard-search-empty">Searching SportsEdge...</div>}
            {!searchLoading && searchResults.length === 0 && <div className="testboard-search-empty">No matching teams, players, news or sports entities.</div>}
            {!searchLoading && searchResults.map((result, index) => (
              <button
                key={`${result.type}-${result.href}-${index}`}
                type="button"
                role="option"
                className="testboard-search-result"
                onClick={() => {
                  window.location.hash = result.href;
                  setSearchOpen(false);
                }}
              >
                <span className="testboard-search-result-media">
                  {result.imageUrl ? <img src={result.imageUrl} alt="" /> : result.type.slice(0, 2).toUpperCase()}
                </span>
                <span className="testboard-search-result-copy">
                  <strong>{result.title}</strong>
                  <em>{result.subtitle || result.sport}</em>
                </span>
                <span className="testboard-search-result-type">{result.type}</span>
              </button>
            ))}
          </div>
        )}
      </label>
      {onTickerToggle && (
        <button
          className={`testboard-ticker-toggle${tickerVisible ? " active" : ""}`}
          type="button"
          aria-label={`${tickerVisible ? "Hide" : "Show"} ${tickerLabel}`}
          aria-pressed={Boolean(tickerVisible)}
          onClick={onTickerToggle}
        >
          {tickerVisible ? "Hide" : "Show"} ticker
        </button>
      )}
      {demoMode && (
        <div className="testboard-demo-disclosure" ref={demoRef}>
          <button
            className="testboard-demo-pill"
            type="button"
            aria-expanded={demoOpen}
            aria-haspopup="dialog"
            onClick={() => setDemoOpen((value) => !value)}
          >
            Hybrid Demo
          </button>
          {demoOpen && (
            <div className="testboard-demo-popover" role="dialog" aria-label="Hybrid demo data notice">
              <strong>Hybrid demo mode</strong>
              <p>Real fixtures and live exchange rows stay live. Where a fixture has no usable market depth yet, SportsEdge fills the gap with simulated odds and liquidity so the terminal can be demoed end to end.</p>
              <span>No demo value should be treated as executable.</span>
            </div>
          )}
        </div>
      )}
      <div className="testboard-local-clock" aria-label={`Local time ${formatClock(clockNow)}`}>
        <span>Local</span>
        <strong>{formatClock(clockNow)}</strong>
      </div>
      <div className="testboard-account-chip" aria-label={`Logged in as ${loginId}, ${membershipLevel}`}>
        <span>{loginId}</span>
        <strong>{membershipLevel}</strong>
      </div>
      <div className="testboard-settings" ref={settingsRef}>
        <button
          className="testboard-icon-button"
          type="button"
          aria-expanded={settingsOpen}
          aria-haspopup="menu"
          aria-label="Open settings menu"
          onClick={() => setSettingsOpen((value) => !value)}
        >
          <Settings size={16} />
        </button>
        {settingsOpen && (
          <div className="testboard-settings-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { setSettingsOpen(false); window.location.hash = "#settings"; }}>
              <Settings size={14} />
              <span>Settings</span>
            </button>
            <button type="button" role="menuitem" onClick={() => { setSettingsOpen(false); window.location.hash = "#terminal-about"; }}>
              <Info size={14} />
              <span>About</span>
            </button>
            <div className="testboard-settings-version" aria-label={`SportsEdge version ${APP_VERSION}`}>
              <span>Version</span>
              <strong>{APP_VERSION}</strong>
            </div>
          </div>
        )}
      </div>
      <button className="testboard-icon-button" type="button" aria-label="Logout" onClick={logoutToLogin}>
        <LogOut size={16} />
      </button>
    </header>
  );
}
