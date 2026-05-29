import { SportDashboard } from "../common/SportDashboard";

export default function TennisDashboard({ active = "tennis" }: { active?: string }) {
  return (
    <SportDashboard
      sport="tennis"
      label="Tennis"
      active={active}
      espnScopes={["tennis:atp", "tennis:wta"]}
      scopeLabel="Tennis dashboard filters"
      locationFilters={[
        { label: "All", value: "all" },
        { label: "ATP", value: "atp", terms: ["atp"] },
        { label: "WTA", value: "wta", terms: ["wta"] },
        { label: "Grand Slams", value: "grand-slams", terms: ["grand slam", "australian open", "roland garros", "wimbledon", "us open"] },
        { label: "Challenger", value: "challenger", terms: ["challenger"] },
        { label: "Davis Cup", value: "davis-cup", terms: ["davis cup"] },
        { label: "Billie Jean King Cup", value: "bjk-cup", terms: ["billie jean king", "bjk cup"] }
      ]}
    />
  );
}
