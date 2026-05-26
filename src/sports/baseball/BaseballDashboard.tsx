import { SportDashboard } from "../common/SportDashboard";

export default function BaseballDashboard() {
  return (
    <SportDashboard
      sport="baseball"
      label="Baseball"
      active="baseball"
      espnScopes={["baseball:mlb"]}
    />
  );
}
