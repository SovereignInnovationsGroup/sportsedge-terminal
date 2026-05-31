import { warmJsonSnapshot } from "./snapshotCache";
import { prefetchFootballLiquiditySnapshot } from "../sports/football/marketData";
import { prefetchFootballTeamAssets } from "../sports/football/teamAssets";

let preloaded = false;

function preloadWhenIdle(task: () => void, timeout = 900) {
  const requestIdle = window.requestIdleCallback || ((callback: IdleRequestCallback) => window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline), timeout));
  requestIdle(task, { timeout });
}

export function preloadTerminalHotScreens() {
  if (preloaded) return;
  preloaded = true;

  preloadWhenIdle(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
    const eventsParams = new URLSearchParams({ timezone, limit: "1200" });
    warmJsonSnapshot("dashboard.events", `/api/sports/events?${eventsParams.toString()}`, { timeoutMs: 4_500, maxAgeMs: 60_000 });
    warmJsonSnapshot("dashboard.news", "/api/news?limit=60", { timeoutMs: 4_000, maxAgeMs: 30_000 });
  }, 300);

  preloadWhenIdle(() => {
    prefetchFootballLiquiditySnapshot();
    prefetchFootballTeamAssets();
  }, 700);

  preloadWhenIdle(() => {
    import("../sports/football/Liquidity");
    import("../sports/football/BiasMatrix");
    import("../sports/football/Profiles");
  }, 1200);
}
