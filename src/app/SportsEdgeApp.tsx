import { lazy, Suspense, type ReactNode, useEffect, useState } from "react";
import { hasTerminalSession } from "../core/session";
import { preloadTerminalHotScreens } from "../core/preload";
import FootballDashboard from "../sports/football/FootballDashboard";
import TennisDashboard from "../sports/tennis/TennisDashboard";
import RacingDashboard from "../sports/racing/RacingDashboard";
import GolfDashboard from "../sports/golf/GolfDashboard";
import BasketballDashboard from "../sports/basketball/BasketballDashboard";
import BaseballDashboard from "../sports/baseball/BaseballDashboard";
import AmericanFootballDashboard from "../sports/american-football/AmericanFootballDashboard";
import HockeyDashboard from "../sports/hockey/HockeyDashboard";
import MotorsportDashboard from "../sports/motorsport/MotorsportDashboard";
import RugbyDashboard from "../sports/rugby/RugbyDashboard";
import CricketDashboard from "../sports/cricket/CricketDashboard";
import { TerminalTopbar } from "./TerminalTopbar";
import { DesktopTopMenu } from "./DesktopTopMenu";
import { DesktopPanelFrame } from "./DesktopPanelFrame";
import { sportsEdgeDesktop } from "../core/desktop";
import { useIsMobile } from "../core/useIsMobile";
import "../styles/dashboard.css";

const Marketing = lazy(() => import("../screens/Marketing"));
const Blog = lazy(() => import("../screens/Blog"));
const Login = lazy(() => import("../screens/Login"));
const DesktopLauncher = lazy(() => import("../screens/DesktopLauncher"));
const Dashboard = lazy(() => import("../screens/Dashboard"));
const MobileDashboard = lazy(() => import("../screens/mobile/MobileDashboard"));
const MobileFootball = lazy(() => import("../screens/mobile/MobileFootball"));
const MobileNews = lazy(() => import("../screens/mobile/MobileNews"));
const SettingsScreen = lazy(() => import("../screens/Settings"));
const TerminalAbout = lazy(() => import("../screens/TerminalAbout"));
const News = lazy(() => import("../screens/news/News"));
const NewsConsole = lazy(() => import("../screens/news/NewsConsole"));
const SimpleNews = lazy(() => import("../screens/news/SimpleNews"));
const StandaloneNews = lazy(() => import("../screens/news/StandaloneNews"));
const AdminConsole = lazy(() => import("../screens/admin/AdminConsole"));
const AdminNewsSources = lazy(() => import("../screens/admin/AdminNewsSources"));
const OddsApiDiagnostics = lazy(() => import("../screens/diagnostics/OddsApiDiagnostics"));
const FlowGrid = lazy(() => import("../screens/trading/FlowGrid"));
const FootballLiquidity = lazy(() => import("../sports/football/Liquidity"));
const FootballLiquidityCompactDemo = lazy(() => import("../sports/football/LiquidityCompactDemo"));
const FootballSignalDemo = lazy(() => import("../sports/football/SignalDemo"));
const FootballSignalTickerDemo = lazy(() => import("../sports/football/SignalTickerDemo"));
const FootballSignalTickerV2Demo = lazy(() => import("../sports/football/SignalTickerV2Demo"));
const FootballSignalTickerV3Demo = lazy(() => import("../sports/football/SignalTickerV3Demo"));
const FootballBiasMatrix = lazy(() => import("../sports/football/BiasMatrix"));
const FootballArbs = lazy(() => import("../sports/football/Arbs"));
const FootballXPoly = lazy(() => import("../sports/football/XPoly"));
const FootballAIBot = lazy(() => import("../sports/football/AIBot"));
const FootballManualTrading = lazy(() => import("../sports/football/ManualTrading"));
const FootballProfiles = lazy(() => import("../sports/football/Profiles"));
const FootballLeagueTables = lazy(() => import("../sports/football/LeagueTables"));
const FootballResults = lazy(() => import("../sports/football/Results"));
const TeamProfile = lazy(() => import("../sports/football/TeamProfile"));
const PlayerProfile = lazy(() => import("../sports/football/PlayerProfile"));
const EntityProfile = lazy(() => import("../sports/common/EntityProfile"));

const SPORT_NEWS_ROUTES: Record<string, string> = {
  "#football-news": "football",
  "#tennis-news": "tennis",
  "#golf-news": "golf",
  "#basketball-news": "basketball",
  "#baseball-news": "baseball",
  "#american-football-news": "american-football",
  "#hockey-news": "hockey",
  "#motorsport-news": "motorsport",
  "#rugby-news": "rugby",
  "#cricket-news": "cricket"
};

function requireSession(screen: ReactNode) {
  return hasTerminalSession() || import.meta.env.DEV ? screen : <Login />;
}

function topbarActiveForHash(hash: string) {
  const route = hash.replace("#", "") || "dashboard";
  if (route === "agtest") return "liquidity";
  if (route === "agtest2") return "bias-matrix";
  if (route === "league-tables") return "football-tables";
  if (route === "results") return "football-results";
  if (route === "profiles" || route === "profile-mockup") return "football-teams";
  if (hash.startsWith("#team/") || hash.startsWith("#player/")) return "football-teams";
  return route;
}

function shouldShowTerminalFallback(hash: string) {
  if (!hash) return false;
  return ![
    "#signup",
    "#about",
    "#terms",
    "#privacy",
    "#blog",
    "#login"
  ].includes(hash);
}

function RouteFallback({ hash }: { hash: string }) {
  if (!shouldShowTerminalFallback(hash)) return null;
  return (
    <>
      <TerminalTopbar active={topbarActiveForHash(hash)} />
      <main className="terminal-route-fallback" aria-label="Loading screen body" />
    </>
  );
}

function screenForHash(hash: string, isMobile = false) {
  if (!hash) return <Marketing />;
  if (hash === "#desktop-menu") return <DesktopTopMenu activeHash={hash} />;
  if (hash === "#signup") return <Marketing section="signup" />;
  if (hash === "#about") return <Marketing section="about" />;
  if (hash === "#terms") return <Marketing section="terms" />;
  if (hash === "#privacy") return <Marketing section="privacy" />;
  if (hash === "#blog") return <Blog />;
  if (hash === "#login") return <Login />;
  if (hash === "#desktop") return <DesktopLauncher />;
  if (hash === "#dashboard" || hash === "#today-dashboard-mockup") return requireSession(isMobile ? <MobileDashboard /> : <Dashboard />);
  if (hash === "#settings") return requireSession(<SettingsScreen />);
  if (hash === "#terminal-about") return requireSession(<TerminalAbout />);
  if (hash === "#news" || hash === "#news-feed-mockup") return requireSession(isMobile ? <MobileNews initialSport="all" /> : <News />);
  if (SPORT_NEWS_ROUTES[hash]) {
    return requireSession(isMobile ? <MobileNews initialSport={SPORT_NEWS_ROUTES[hash]} /> : <News initialSport={SPORT_NEWS_ROUTES[hash]} active={hash.replace("#", "")} />);
  }
  if (hash === "#news-console") return requireSession(<NewsConsole />);
  if (hash === "#simple-news") return <SimpleNews />;
  if (hash === "#social-news") return requireSession(<StandaloneNews />);
  if (hash === "#admin") return requireSession(<AdminConsole />);
  if (hash === "#admin-news-sources") return requireSession(<AdminNewsSources />);
  if (hash === "#oddsapi") return requireSession(<OddsApiDiagnostics />);
  if (hash === "#flow-grid") return requireSession(<FlowGrid />);
  if (hash === "#football") return isMobile ? <MobileFootball /> : <FootballDashboard />;
  if (hash === "#tennis") return <TennisDashboard />;
  if (hash === "#tennis-dashboard") return requireSession(<TennisDashboard active="tennis-dashboard" />);
  if (hash.startsWith("#tennis-")) return requireSession(<TennisDashboard active={hash.replace("#", "")} />);
  if (hash === "#horseracing" || hash === "#horse-racing") return <RacingDashboard />;
  if (hash === "#golf") return <GolfDashboard />;
  if (hash.startsWith("#golf-")) return requireSession(<GolfDashboard active={hash.replace("#", "")} />);
  if (hash === "#basketball") return <BasketballDashboard />;
  if (hash.startsWith("#basketball-")) return requireSession(<BasketballDashboard active={hash.replace("#", "")} />);
  if (hash === "#baseball") return <BaseballDashboard />;
  if (hash.startsWith("#baseball-")) return requireSession(<BaseballDashboard active={hash.replace("#", "")} />);
  if (hash === "#american-football" || hash === "#nfl") return <AmericanFootballDashboard />;
  if (hash.startsWith("#american-football-")) return requireSession(<AmericanFootballDashboard active={hash.replace("#", "")} />);
  if (hash === "#hockey" || hash === "#nhl") return <HockeyDashboard />;
  if (hash.startsWith("#hockey-")) return requireSession(<HockeyDashboard active={hash.replace("#", "")} />);
  if (hash === "#motorsport" || hash === "#f1") return <MotorsportDashboard />;
  if (hash.startsWith("#motorsport-")) return requireSession(<MotorsportDashboard active={hash.replace("#", "")} />);
  if (hash === "#rugby") return <RugbyDashboard />;
  if (hash.startsWith("#rugby-")) return requireSession(<RugbyDashboard active={hash.replace("#", "")} />);
  if (hash === "#cricket") return <CricketDashboard />;
  if (hash.startsWith("#cricket-")) return requireSession(<CricketDashboard active={hash.replace("#", "")} />);
  if (hash === "#liquidity" || hash === "#agtest") return requireSession(<FootballLiquidity />);
  if (hash === "#liquidity-compact") return requireSession(<FootballLiquidityCompactDemo />);
  if (hash === "#signal-demo") return requireSession(<FootballSignalDemo />);
  if (hash === "#signals") return requireSession(<FootballSignalTickerV3Demo />);
  if (hash === "#signal-ticker-demo" || hash === "#signals-ticker") return requireSession(<FootballSignalTickerDemo />);
  if (hash === "#signal-ticker-v2") return requireSession(<FootballSignalTickerV2Demo />);
  if (hash === "#signal-ticker-v3") return requireSession(<FootballSignalTickerV3Demo />);
  if (hash === "#bias-matrix" || hash === "#agtest2") return requireSession(<FootballBiasMatrix />);
  if (hash === "#xpoly") return requireSession(<FootballXPoly />);
  if (hash === "#football-ai-bot") return requireSession(<FootballAIBot />);
  if (hash === "#manual-trading") return requireSession(<FootballManualTrading />);
  if (hash === "#arbs") return requireSession(<FootballArbs />);
  if (hash === "#football-tables" || hash === "#league-tables") return requireSession(<FootballLeagueTables />);
  if (hash === "#football-results" || hash === "#results") return requireSession(<FootballResults />);
  if (hash === "#football-teams" || hash === "#football-players" || hash === "#football-profiles" || hash === "#profile-mockup" || hash === "#profiles") {
    return requireSession(<FootballProfiles active={hash === "#football-players" ? "football-players" : "football-teams"} />);
  }
  if (hash === "#football-injuries") return requireSession(<FootballDashboard active={hash.replace("#", "")} />);
  if (hash.startsWith("#team/")) return requireSession(<TeamProfile slug={hash.replace("#team/", "") || "chelsea"} />);
  if (hash.startsWith("#player/")) return requireSession(<PlayerProfile id={hash.replace("#player/", "")} />);
  if (hash.startsWith("#profile/")) {
    const [, provider = "", entityType = "", id = ""] = hash.replace("#", "").split("/").map((part) => decodeURIComponent(part));
    return requireSession(<EntityProfile provider={provider} entityType={entityType} id={id} />);
  }
  return requireSession(<Dashboard />);
}

export default function SportsEdgeApp() {
  const [hash, setHash] = useState(window.location.hash);
  const isMobile = useIsMobile();
  const screen = screenForHash(hash, isMobile);
  const isDesktopPanel = Boolean(sportsEdgeDesktop()) && !["#desktop-menu", "#login"].includes(hash);

  useEffect(() => {
    const handleHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  useEffect(() => {
    if (hasTerminalSession() || import.meta.env.DEV) preloadTerminalHotScreens();
  }, []);

  return (
    <Suspense fallback={<RouteFallback hash={hash} />}>
      {isDesktopPanel ? (
        <DesktopPanelFrame hash={hash}>
          <div className="desktop-panel-shell">{screen}</div>
        </DesktopPanelFrame>
      ) : screen}
    </Suspense>
  );
}
