import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Bell, Gauge, LayoutGrid, Lock, Newspaper, Settings, ShieldCheck, UserRound } from "lucide-react";
import { defaultRouteForUser, type StoredAuthUser } from "../core/auth";
import { hasTerminalSession } from "../core/session";
import { sportsEdgeDesktop, type DesktopPanel } from "../core/desktop";

const panelIcons: Record<string, typeof Activity> = {
  dashboard: Gauge,
  news: Newspaper,
  football: Activity,
  "bias-matrix": BarChart3,
  signals: Bell,
  profiles: UserRound,
  settings: Settings,
  admin: ShieldCheck
};

function readUser() {
  try {
    const raw = window.localStorage.getItem("sportsedge.auth.user");
    return raw ? JSON.parse(raw) as StoredAuthUser : null;
  } catch {
    return null;
  }
}

export default function DesktopLauncher() {
  const desktop = sportsEdgeDesktop();
  const [panels, setPanels] = useState<DesktopPanel[]>([]);
  const [authRequired, setAuthRequired] = useState("");
  const [openError, setOpenError] = useState("");
  const user = useMemo(readUser, []);
  const signedIn = hasTerminalSession();
  const accountLabel = user?.login_id || user?.email || "Not signed in";
  const planLabel = user?.subscription?.plan_name || user?.subscription?.level || user?.subscription?.status || "Login required";

  useEffect(() => {
    if (!desktop) return;
    desktop.listPanels().then(setPanels).catch(() => setPanels([]));
    return desktop.onAuthRequired((route) => {
      setAuthRequired(route);
      window.location.hash = "#login";
    });
  }, [desktop]);

  async function openPanel(route: string) {
    setOpenError("");
    setAuthRequired("");
    if (!desktop) {
      window.location.hash = route;
      return;
    }
    const result = await desktop.openPanel(route);
    if (!result.ok) {
      setAuthRequired(route);
      setOpenError("Sign in to SportsEdge before opening live panels.");
    }
  }

  return (
    <main className="desktop-launcher">
      <section className="desktop-launcher-head" aria-label="SportsEdge desktop launcher">
        <div>
          <span className="desktop-launcher-kicker"><LayoutGrid size={16} /> SportsEdge Desktop</span>
          <h1>Panel Launcher</h1>
          <p>Open each part of the terminal in its own movable window.</p>
        </div>
        <div className={`desktop-account ${signedIn ? "signed-in" : "signed-out"}`}>
          {signedIn ? <ShieldCheck size={18} /> : <Lock size={18} />}
          <div>
            <strong>{accountLabel}</strong>
            <span>{planLabel}</span>
          </div>
        </div>
      </section>

      {!signedIn ? (
        <section className="desktop-auth-callout">
          <Lock size={18} />
          <div>
            <strong>Account login required</strong>
            <span>Verify the user once, then open and arrange panels across their screens.</span>
          </div>
          <a href="#login">Sign in</a>
        </section>
      ) : null}

      {openError ? <div className="desktop-launcher-alert">{openError}</div> : null}
      {authRequired ? <div className="desktop-launcher-alert">Requested panel is waiting for login: {authRequired}</div> : null}

      <section className="desktop-panel-grid" aria-label="Available SportsEdge panels">
        {panels.map((panel) => {
          const Icon = panelIcons[panel.id] || Activity;
          return (
            <button key={panel.id} className="desktop-panel-button" type="button" onClick={() => openPanel(panel.route)}>
              <span><Icon size={20} /></span>
              <strong>{panel.label}</strong>
              <em>{panel.width} x {panel.height}</em>
            </button>
          );
        })}
      </section>

      <footer className="desktop-launcher-foot">
        <button type="button" onClick={() => openPanel(defaultRouteForUser(user))}>Open My Default View</button>
        <button type="button" onClick={() => openPanel("#news")}>Open News Rail</button>
      </footer>
    </main>
  );
}
