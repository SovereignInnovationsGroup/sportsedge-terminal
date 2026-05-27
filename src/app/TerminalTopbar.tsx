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
  { label: "News", value: "news", route: "#news" }
] as const;

const FOOTBALL_NAV = [
  { label: "< Back", value: "all-sports", route: "#dashboard", tone: "back" },
  { label: "Football", value: "football", route: "#football", tone: "sport" },
  { label: "Liquidity", value: "liquidity", route: "#liquidity" },
  { label: "Signals", value: "signal-ticker-v3", route: "#signal-ticker-v3" },
  { label: "Bias Matrix", value: "bias-matrix", route: "#bias-matrix" },
  { label: "Tables", value: "football-tables", route: "#football-tables" },
  { label: "Arbs", value: "arbs", route: "#arbs" },
  { label: "Profiles", value: "football-profiles", route: "#football-profiles" }
] as const;

const FOOTBALL_MODE = new Set(["football", "liquidity", "signal-demo", "signal-ticker-demo", "signal-ticker-v2", "signal-ticker-v3", "bias-matrix", "football-tables", "arbs", "football-profiles"]);

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
  const inFootballMode = active ? FOOTBALL_MODE.has(active) : false;
  const navItems = inFootballMode ? FOOTBALL_NAV : TOP_NAV;
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
    <header className="testboard-topbar global-terminal-topbar">
      <a className="testboard-brand" href="#dashboard" aria-label="SportsEdge dashboard">
        <img className="testboard-brand-logo" src={sportsEdgeMarketsLogo} alt="SportsEdge" />
      </a>
      <nav className={`testboard-nav${inFootballMode ? " football-mode" : ""}`} aria-label={inFootballMode ? "Football navigation" : "SportsEdge navigation"}>
        {navItems.map((item) => (
          <button
            className={[active === item.value ? "active" : "", "tone" in item && item.tone ? `nav-${item.tone}` : ""].filter(Boolean).join(" ")}
            key={item.value}
            type="button"
            onClick={() => { window.location.hash = item.route; }}
          >
            {item.label}
          </button>
        ))}
      </nav>
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
