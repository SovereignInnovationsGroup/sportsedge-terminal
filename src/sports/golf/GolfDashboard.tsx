import { SportDashboard } from "../common/SportDashboard";

export default function GolfDashboard({ active = "golf" }: { active?: string }) {
  return (
    <SportDashboard
      sport="golf"
      label="Golf"
      active={active}
      espnScopes={["golf:pga", "golf:liv", "golf:lpga", "golf:eur"]}
      scopeLabel="Golf dashboard filters"
      locationFilters={[
        { label: "All", value: "all" },
        { label: "PGA", value: "pga", terms: ["pga"] },
        { label: "DP World Tour", value: "dp-world-tour", terms: ["dp world", "european tour"] },
        { label: "LIV", value: "liv", terms: ["liv"] },
        { label: "LPGA", value: "lpga", terms: ["lpga"] },
        { label: "Majors", value: "majors", terms: ["masters", "pga championship", "u.s. open", "us open", "open championship", "british open"] }
      ]}
    />
  );
}
