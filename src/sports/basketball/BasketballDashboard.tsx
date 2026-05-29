import { SportDashboard } from "../common/SportDashboard";

export default function BasketballDashboard({ active = "basketball" }: { active?: string }) {
  return (
    <SportDashboard
      sport="basketball"
      label="Basketball"
      active={active}
      espnScopes={["basketball:nba", "basketball:wnba"]}
      scopeLabel="Basketball dashboard filters"
      locationFilters={[
        { label: "All", value: "all" },
        { label: "NBA", value: "nba", terms: ["nba"] },
        { label: "WNBA", value: "wnba", terms: ["wnba"] },
        { label: "NCAA", value: "ncaa", terms: ["ncaa", "college"] },
        { label: "Europe", value: "europe", terms: ["euroleague", "eurocup", "europe"] },
        { label: "International", value: "international", terms: ["international", "world", "olympic"] }
      ]}
    />
  );
}
