import { lazy, Suspense } from "react";
import { LoadingScreen } from "./LoadingScreen";
import "../styles/dashboard.css";

const SportsEdgeTerminal = lazy(() => import("../legacy/SportsEdgeTerminal"));

export default function SportsEdgeApp() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SportsEdgeTerminal />
    </Suspense>
  );
}
