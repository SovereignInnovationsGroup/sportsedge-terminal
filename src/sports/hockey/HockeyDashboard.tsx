import { SportDashboard } from "../common/SportDashboard";

export default function HockeyDashboard() {
  return (
    <SportDashboard
      sport="hockey"
      label="Hockey"
      active="hockey"
      espnScopes={["hockey:nhl"]}
    />
  );
}
