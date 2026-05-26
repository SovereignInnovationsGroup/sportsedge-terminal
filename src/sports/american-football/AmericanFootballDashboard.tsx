import { SportDashboard } from "../common/SportDashboard";

export default function AmericanFootballDashboard() {
  return (
    <SportDashboard
      sport="american-football"
      label="NFL"
      active="american-football"
      espnScopes={["football:nfl", "football:college-football"]}
    />
  );
}
