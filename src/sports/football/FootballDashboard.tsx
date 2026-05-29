import { SportDashboard } from "../common/SportDashboard";

export default function FootballDashboard({ active = "football" }: { active?: string }) {
  return (
    <SportDashboard
      sport="football"
      label="Football"
      active={active}
      espnScopes={["soccer:eng.1", "soccer:eng.2", "soccer:uefa.champions"]}
      dataStatus="API-Football remains the deep football backbone. ESPN metadata is additive; exchange liquidity appears when normalized venue rows are available."
    />
  );
}
