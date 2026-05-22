import { lazy, Suspense, useEffect, useState } from "react";
import { hasTerminalSession } from "../core/session";
import { LoadingScreen } from "./LoadingScreen";
import "../styles/dashboard.css";

const SportsEdgeTerminal = lazy(() => import("../legacy/SportsEdgeTerminal"));
const FootballDashboard = lazy(() => import("../sports/football/FootballDashboard"));
const TennisDashboard = lazy(() => import("../sports/tennis/TennisDashboard"));
const RacingDashboard = lazy(() => import("../sports/racing/RacingDashboard"));
const GolfDashboard = lazy(() => import("../sports/golf/GolfDashboard"));

function sportScreenForHash(hash: string) {
  if (!hasTerminalSession() && !import.meta.env.DEV) return null;
  if (hash === "#football") return <FootballDashboard />;
  if (hash === "#tennis") return <TennisDashboard />;
  if (hash === "#horseracing" || hash === "#horse-racing") return <RacingDashboard />;
  if (hash === "#golf") return <GolfDashboard />;
  return null;
}

export default function SportsEdgeApp() {
  const [hash, setHash] = useState(window.location.hash);
  const sportScreen = sportScreenForHash(hash);

  useEffect(() => {
    const handleHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  return (
    <Suspense fallback={<LoadingScreen />}>
      {sportScreen || <SportsEdgeTerminal />}
    </Suspense>
  );
}
