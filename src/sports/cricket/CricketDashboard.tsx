import { SportDashboard } from "../common/SportDashboard";

export default function CricketDashboard({ active = "cricket" }: { active?: string }) {
  return (
    <SportDashboard
      sport="cricket"
      label="Cricket"
      active={active}
      espnScopes={[]}
      scopeLabel="Cricket dashboard filters"
      locationFilters={[
        { label: "All", value: "all" },
        { label: "Tests", value: "tests", terms: ["test", "tests"] },
        { label: "ODI", value: "odi", terms: ["odi", "one day"] },
        { label: "T20", value: "t20", terms: ["t20", "twenty20"] },
        { label: "IPL", value: "ipl", terms: ["ipl", "indian premier league"] },
        { label: "County", value: "county", terms: ["county"] },
        { label: "International", value: "international", terms: ["international", "world cup"] }
      ]}
      dataStatus="Cricket is visible in the terminal while SportsEdge probes provider scope and normalized exchange routes. No invented fixtures or prices are shown."
    />
  );
}
