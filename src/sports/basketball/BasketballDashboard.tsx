import { SportDashboard } from "../common/SportDashboard";

export default function BasketballDashboard() {
  return (
    <SportDashboard
      sport="basketball"
      label="Basketball"
      active="basketball"
      espnScopes={["basketball:nba", "basketball:wnba"]}
    />
  );
}
