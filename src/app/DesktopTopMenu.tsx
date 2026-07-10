import { LayoutDashboard, LogOut, Newspaper, Search, Settings, ShieldCheck, SlidersHorizontal, Trophy } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { sportsEdgeDesktop, type DesktopPanel } from "../core/desktop";
import { type StoredAuthUser } from "../core/auth";

const sportsEdgeMarketsLogo = "/images/sportsedge-markets-logo.png";

function readUser() {
  try {
    const raw = window.localStorage.getItem("sportsedge.auth.user");
    return raw ? JSON.parse(raw) as StoredAuthUser : null;
  } catch {
    return null;
  }
}

export function DesktopTopMenu({ activeHash }: { activeHash: string }) {
  const desktop = sportsEdgeDesktop();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [panels, setPanels] = useState<DesktopPanel[]>([]);
  const [activeRoute, setActiveRoute] = useState(activeHash);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const user = useMemo(readUser, [activeHash]);
  const account = user?.login_id || user?.email || "SportsEdge";
  const plan = user?.subscription?.plan_name || user?.subscription?.level || user?.subscription?.status || "terminal";

  useEffect(() => {
    if (!desktop) return;
    desktop.listPanels().then(setPanels).catch(() => setPanels([]));
  }, [desktop]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) return;
      event.preventDefault();
      setSearchExpanded(true);
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  async function openRoute(route: string) {
    setActiveRoute(route);
    if (desktop) {
      await desktop.openPanel(route);
      return;
    }
    window.location.hash = route;
  }

  async function logout() {
    if (desktop) {
      await desktop.logout();
      return;
    }
    window.localStorage.removeItem("sportsedge.auth.token");
    window.localStorage.removeItem("sportsedge.auth.user");
    window.location.hash = "#login";
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchExpanded(true);
      searchInputRef.current?.focus();
      return;
    }
    void openRoute("#dashboard");
  }

  return (
    <header className="desktop-top-menu" aria-label="SportsEdge desktop menu">
      <button className="desktop-menu-brand" type="button" onClick={() => openRoute("#dashboard")}>
        <img src={sportsEdgeMarketsLogo} alt="SportsEdge Markets" />
      </button>

      <nav className="desktop-menu-nav" aria-label="Primary desktop panels">
        <button type="button" className={activeRoute === "#dashboard" ? "active" : ""} onClick={() => openRoute("#dashboard")}><LayoutDashboard size={15} />Dashboard</button>
        <button type="button" className={activeRoute === "#news" ? "active" : ""} onClick={() => openRoute("#news")}><Newspaper size={15} />News</button>
        <button type="button" className={activeRoute === "#football" ? "active" : ""} onClick={() => openRoute("#football")}><Trophy size={15} />Football</button>
        <button type="button" className={activeRoute === "#bias-matrix" ? "active" : ""} onClick={() => openRoute("#bias-matrix")}><SlidersHorizontal size={15} />Matrix</button>
      </nav>

      <div className="desktop-menu-panel-select">
        <select
          aria-label="Open panel"
          value=""
          onChange={(event) => {
            if (event.target.value) void openRoute(event.target.value);
          }}
        >
          <option value="">More panels...</option>
          {panels
            .filter((panel) => !["dashboard", "news", "football", "bias-matrix"].includes(panel.id))
            .map((panel) => <option key={panel.id} value={panel.route}>{panel.label}</option>)}
        </select>
      </div>

      <form className={`desktop-menu-search ${searchExpanded ? "expanded" : ""}`} onSubmit={submitSearch}>
        <Search size={15} />
        <input
          ref={searchInputRef}
          aria-label="Search SportsEdge"
          value={searchQuery}
          onFocus={() => setSearchExpanded(true)}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSearchQuery("");
              setSearchExpanded(false);
              searchInputRef.current?.blur();
            }
          }}
          placeholder={searchExpanded ? "Search sport, market, team, news..." : "Search"}
        />
        <kbd>⌘K</kbd>
      </form>

      <div className="desktop-menu-account">
        <ShieldCheck size={15} />
        <span>{account}</span>
        <em>{plan}</em>
      </div>

      <button className="desktop-menu-icon" type="button" aria-label="Settings" onClick={() => openRoute("#settings")}><Settings size={16} /></button>
      <button className="desktop-menu-icon" type="button" aria-label="Sign out" onClick={() => void logout()}><LogOut size={16} /></button>
    </header>
  );
}
