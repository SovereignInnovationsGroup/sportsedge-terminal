import { lazy, Suspense, type ReactNode, useEffect, useState } from "react";
import { hasTerminalSession } from "../core/session";
import { LoadingScreen } from "./LoadingScreen";
import "../styles/dashboard.css";

const Marketing = lazy(() => import("../screens/Marketing"));
const Blog = lazy(() => import("../screens/Blog"));
const Login = lazy(() => import("../screens/Login"));
const Dashboard = lazy(() => import("../screens/Dashboard"));
const SettingsScreen = lazy(() => import("../screens/Settings"));
const TerminalAbout = lazy(() => import("../screens/TerminalAbout"));
const News = lazy(() => import("../screens/news/News"));
const NewsConsole = lazy(() => import("../screens/news/NewsConsole"));
const SimpleNews = lazy(() => import("../screens/news/SimpleNews"));
const StandaloneNews = lazy(() => import("../screens/news/StandaloneNews"));
const AdminConsole = lazy(() => import("../screens/admin/AdminConsole"));
const AdminNewsSources = lazy(() => import("../screens/admin/AdminNewsSources"));
const OddsApiDiagnostics = lazy(() => import("../screens/diagnostics/OddsApiDiagnostics"));
const FootballDashboard = lazy(() => import("../sports/football/FootballDashboard"));
const TennisDashboard = lazy(() => import("../sports/tennis/TennisDashboard"));
const RacingDashboard = lazy(() => import("../sports/racing/RacingDashboard"));
const GolfDashboard = lazy(() => import("../sports/golf/GolfDashboard"));
const FootballLiquidity = lazy(() => import("../sports/football/Liquidity"));
const FootballBiasMatrix = lazy(() => import("../sports/football/BiasMatrix"));
const FootballArbs = lazy(() => import("../sports/football/Arbs"));
const FootballProfiles = lazy(() => import("../sports/football/Profiles"));
const TeamProfile = lazy(() => import("../sports/football/TeamProfile"));
const PlayerProfile = lazy(() => import("../sports/football/PlayerProfile"));

function requireSession(screen: ReactNode) {
  return hasTerminalSession() || import.meta.env.DEV ? screen : <Login />;
}

function screenForHash(hash: string) {
  if (!hash) return <Marketing />;
  if (hash === "#signup") return <Marketing section="signup" />;
  if (hash === "#about") return <Marketing section="about" />;
  if (hash === "#terms") return <Marketing section="terms" />;
  if (hash === "#privacy") return <Marketing section="privacy" />;
  if (hash === "#blog") return <Blog />;
  if (hash === "#login") return <Login />;
  if (hash === "#dashboard" || hash === "#today-dashboard-mockup") return requireSession(<Dashboard />);
  if (hash === "#settings") return requireSession(<SettingsScreen />);
  if (hash === "#terminal-about") return requireSession(<TerminalAbout />);
  if (hash === "#news" || hash === "#news-feed-mockup") return requireSession(<News />);
  if (hash === "#news-console") return requireSession(<NewsConsole />);
  if (hash === "#simple-news") return <SimpleNews />;
  if (hash === "#social-news") return requireSession(<StandaloneNews />);
  if (hash === "#admin") return requireSession(<AdminConsole />);
  if (hash === "#admin-news-sources") return requireSession(<AdminNewsSources />);
  if (hash === "#oddsapi") return requireSession(<OddsApiDiagnostics />);
  if (hash === "#football") return <FootballDashboard />;
  if (hash === "#tennis") return <TennisDashboard />;
  if (hash === "#horseracing" || hash === "#horse-racing") return <RacingDashboard />;
  if (hash === "#golf") return <GolfDashboard />;
  if (hash === "#liquidity" || hash === "#agtest") return requireSession(<FootballLiquidity />);
  if (hash === "#bias-matrix" || hash === "#agtest2") return requireSession(<FootballBiasMatrix />);
  if (hash === "#arbs") return requireSession(<FootballArbs />);
  if (hash === "#football-profiles" || hash === "#profile-mockup" || hash === "#profiles") return requireSession(<FootballProfiles />);
  if (hash.startsWith("#team/")) return requireSession(<TeamProfile slug={hash.replace("#team/", "") || "chelsea"} />);
  if (hash.startsWith("#player/")) return requireSession(<PlayerProfile id={hash.replace("#player/", "")} />);
  return requireSession(<Dashboard />);
}

export default function SportsEdgeApp() {
  const [hash, setHash] = useState(window.location.hash);
  const screen = screenForHash(hash);

  useEffect(() => {
    const handleHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  return (
    <Suspense fallback={<LoadingScreen />}>
      {screen}
    </Suspense>
  );
}
