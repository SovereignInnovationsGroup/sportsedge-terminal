import { SportDashboard } from "../common/SportDashboard";

export default function TennisDashboard() {
  return <SportDashboard sport="tennis" label="Tennis" active="tennis" espnScopes={["tennis:atp", "tennis:wta"]} />;
}
