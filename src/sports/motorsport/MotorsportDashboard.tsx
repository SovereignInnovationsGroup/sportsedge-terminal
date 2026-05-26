import { SportDashboard } from "../common/SportDashboard";

export default function MotorsportDashboard() {
  return (
    <SportDashboard
      sport="motorsport"
      label="Motorsport"
      active="motorsport"
      espnScopes={["racing:f1", "racing:nascar-premier", "racing:irl"]}
    />
  );
}
