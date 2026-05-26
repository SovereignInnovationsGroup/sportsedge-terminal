import { SportDashboard } from "../common/SportDashboard";

export default function FootballDashboard() {
  return (
    <SportDashboard
      sport="football"
      label="Football"
      active="football"
      espnScopes={["soccer:eng.1", "soccer:eng.2", "soccer:uefa.champions"]}
      dataStatus="API-Football remains the deep football backbone. ESPN metadata is additive; exchange liquidity appears when normalized venue rows are available."
    />
  );
}
