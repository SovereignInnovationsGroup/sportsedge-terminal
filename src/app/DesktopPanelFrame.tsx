import { X } from "lucide-react";
import { sportsEdgeDesktop } from "../core/desktop";

const sportsEdgeMark = "/images/sportsedge-markets-mark.png";

function titleForHash(hash: string) {
  if (hash === "#dashboard") return "Dashboard";
  if (hash === "#news") return "News";
  if (hash === "#football") return "Football";
  if (hash === "#bias-matrix") return "Matrix";
  if (hash === "#signals") return "Signals";
  if (hash === "#settings") return "Settings";
  if (hash === "#admin") return "Admin";
  if (hash === "#football-profiles") return "Football Profiles";
  if (hash.startsWith("#team/")) return "Team Profile";
  if (hash.startsWith("#player/")) return "Player Profile";
  return hash.replace(/^#/, "").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Panel";
}

export function DesktopPanelFrame({ hash, children }: { hash: string; children: React.ReactNode }) {
  const desktop = sportsEdgeDesktop();

  return (
    <div className="desktop-panel-window">
      <header className="desktop-panel-titlebar" aria-label={`${titleForHash(hash)} panel window controls`}>
        <div className="desktop-panel-title">
          <img src={sportsEdgeMark} alt="" />
          <span>SportsEdge</span>
          <strong>{titleForHash(hash)}</strong>
        </div>
        <button type="button" aria-label="Close panel" onClick={() => void desktop?.closeWindow()}>
          <X size={15} />
        </button>
      </header>
      <div className="desktop-panel-content">
        {children}
      </div>
    </div>
  );
}
