import { SportDashboard } from "../common/SportDashboard";

export default function GolfDashboard() {
  return <SportDashboard sport="golf" label="Golf" active="golf" espnScopes={["golf:pga", "golf:liv", "golf:lpga", "golf:eur"]} />;
}
