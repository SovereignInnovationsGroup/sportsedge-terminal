import { Grid2X2, LayoutDashboard, LogOut, Newspaper, Search, Settings, ShieldCheck, SlidersHorizontal, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

function logout() {
  window.localStorage.removeItem("sportsedge.auth.token");
  window.localStorage.removeItem("sportsedge.auth.user");
  window.location.hash = "#login";
}

export function DesktopTopMenu({ activeHash }: { activeHash: string }) {
  const desktop = sportsEdgeDesktop();
  const [panels, setPanels] = useState<DesktopPanel[]>([]);
  const user = useMemo(readUser, [activeHash]);
  const account = user?.login_id || user?.email || "SportsEdge";
  const plan = user?.subscription?.plan_name || user?.subscription?.level || user?.subscription?.status || "terminal";

  useEffect(() => {
    if (!desktop) return;
    desktop.listPanels().then(setPanels).catch(() => setPanels([]));
  }, [desktop]);

  async function openRoute(route: string) {
    if (desktop) {
      await desktop.openPanel(route);
      return;
    }
    window.location.hash = route;
  }

  return (
    <header className="desktop-top-menu" aria-label="SportsEdge desktop menu">
      <button className="desktop-menu-brand" type="button" onClick={() => openRoute("#desktop")}>
        <img src={sportsEdgeMarketsLogo} alt="SportsEdge Markets" />
      </button>

      <nav className="desktop-menu-nav" aria-label="Primary desktop panels">
        <button type="button" className={activeHash === "#desktop" ? "active" : ""} onClick={() => openRoute("#desktop")}><Grid2X2 size={15} />Launcher</button>
        <button type="button" className={activeHash === "#dashboard" ? "active" : ""} onClick={() => openRoute("#dashboard")}><LayoutDashboard size={15} />Dashboard</button>
        <button type="button" className={activeHash === "#news" ? "active" : ""} onClick={() => openRoute("#news")}><Newspaper size={15} />News</button>
        <button type="button" className={activeHash === "#football" ? "active" : ""} onClick={() => openRoute("#football")}><Trophy size={15} />Football</button>
        <button type="button" className={activeHash === "#bias-matrix" ? "active" : ""} onClick={() => openRoute("#bias-matrix")}><SlidersHorizontal size={15} />Matrix</button>
      </nav>

      <div className="desktop-menu-panel-select">
        <select
          aria-label="Open panel"
          value=""
          onChange={(event) => {
            if (event.target.value) void openRoute(event.target.value);
          }}
        >
          <option value="">Open panel...</option>
          {panels.map((panel) => <option key={panel.id} value={panel.route}>{panel.label}</option>)}
        </select>
      </div>

      <button className="desktop-menu-search" type="button" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}>
        <Search size={15} />
        <span>Search</span>
        <kbd>⌘K</kbd>
      </button>

      <div className="desktop-menu-account">
        <ShieldCheck size={15} />
        <span>{account}</span>
        <em>{plan}</em>
      </div>

      <button className="desktop-menu-icon" type="button" aria-label="Settings" onClick={() => openRoute("#settings")}><Settings size={16} /></button>
      <button className="desktop-menu-icon" type="button" aria-label="Sign out" onClick={logout}><LogOut size={16} /></button>
    </header>
  );
}
