import { LogOut, Search, Settings } from "lucide-react";
import { useEffect, useState } from "react";

const sportsEdgeMarketsLogo = "/images/sportsedge-markets-logo.png";

const TOP_NAV = [
  { label: "Football", value: "football", route: "#football" },
  { label: "Horse Racing", value: "horseracing", route: "#horseracing" },
  { label: "Tennis", value: "tennis", route: "#tennis" },
  { label: "Golf", value: "golf", route: "#golf" },
  { label: "News", value: "news", route: "#news" }
] as const;

const FOOTBALL_NAV = [
  { label: "< Back", value: "all-sports", route: "#dashboard", tone: "back" },
  { label: "Football", value: "football", route: "#football", tone: "sport" },
  { label: "Liquidity", value: "liquidity", route: "#liquidity" },
  { label: "Bias Matrix", value: "bias-matrix", route: "#bias-matrix" },
  { label: "Arbs", value: "arbs", route: "#arbs" },
  { label: "Profiles", value: "football-profiles", route: "#football-profiles" }
] as const;

const FOOTBALL_MODE = new Set(["football", "liquidity", "bias-matrix", "arbs", "football-profiles"]);

type StoredAuthUser = {
  email?: string;
  login_id?: string;
  subscription?: { plan_name?: string; level?: string; status?: string };
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
    timeZone: "Europe/Madrid"
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
  onSearchChange
}: {
  active?: string;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [clockNow, setClockNow] = useState(() => new Date());
  const [sessionUser] = useState(readStoredAuthUser);
  const inFootballMode = active ? FOOTBALL_MODE.has(active) : false;
  const navItems = inFootballMode ? FOOTBALL_NAV : TOP_NAV;
  const loginId = sessionUser?.login_id || sessionUser?.email || "public";
  const membershipLevel = sessionUser?.subscription?.plan_name || sessionUser?.subscription?.level || sessionUser?.subscription?.status || "guest";

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
          placeholder={searchPlaceholder}
        />
        <kbd>/</kbd>
      </label>
      <div className="testboard-local-clock" aria-label={`Local time ${formatClock(clockNow)}`}>
        <span>Local</span>
        <strong>{formatClock(clockNow)}</strong>
      </div>
      <div className="testboard-account-chip" aria-label={`Logged in as ${loginId}, ${membershipLevel}`}>
        <span>{loginId}</span>
        <strong>{membershipLevel}</strong>
      </div>
      <button className="testboard-icon-button" type="button" aria-label="Settings">
        <Settings size={16} />
      </button>
      <button className="testboard-icon-button" type="button" aria-label="Logout" onClick={logoutToLogin}>
        <LogOut size={16} />
      </button>
    </header>
  );
}
