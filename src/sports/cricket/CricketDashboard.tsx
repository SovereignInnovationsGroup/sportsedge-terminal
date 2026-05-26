import { SportDashboard } from "../common/SportDashboard";

export default function CricketDashboard() {
  return (
    <SportDashboard
      sport="cricket"
      label="Cricket"
      active="cricket"
      espnScopes={[]}
      dataStatus="Cricket is visible in the terminal while SportsEdge probes provider scope and normalized exchange routes. No invented fixtures or prices are shown."
    />
  );
}
