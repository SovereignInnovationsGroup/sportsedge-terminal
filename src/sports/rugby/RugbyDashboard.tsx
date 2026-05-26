import { SportDashboard } from "../common/SportDashboard";

export default function RugbyDashboard() {
  return (
    <SportDashboard
      sport="rugby"
      label="Rugby"
      active="rugby"
      espnScopes={[]}
      dataStatus="Rugby is visible in the terminal while SportsEdge probes provider scope and normalized exchange routes. No invented fixtures or prices are shown."
    />
  );
}
