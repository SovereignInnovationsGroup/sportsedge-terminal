import { SportDashboard } from "../common/SportDashboard";

export default function RugbyDashboard({ active = "rugby" }: { active?: string }) {
  return (
    <SportDashboard
      sport="rugby"
      label="Rugby"
      active={active}
      espnScopes={[]}
      scopeLabel="Rugby dashboard filters"
      locationFilters={[
        { label: "All", value: "all" },
        { label: "Union", value: "union", terms: ["union"] },
        { label: "League", value: "league", terms: ["rugby league"] },
        { label: "Premiership", value: "premiership", terms: ["premiership"] },
        { label: "URC", value: "urc", terms: ["urc", "united rugby championship"] },
        { label: "Top 14", value: "top-14", terms: ["top 14"] },
        { label: "Super Rugby", value: "super-rugby", terms: ["super rugby"] },
        { label: "International", value: "international", terms: ["international", "six nations", "world cup"] }
      ]}
      dataStatus="Rugby is visible in the terminal while SportsEdge probes provider scope and normalized exchange routes. No invented fixtures or prices are shown."
    />
  );
}
