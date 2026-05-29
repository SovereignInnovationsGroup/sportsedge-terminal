import { SportDashboard } from "../common/SportDashboard";

export default function HockeyDashboard({ active = "hockey" }: { active?: string }) {
  return (
    <SportDashboard
      sport="hockey"
      label="Hockey"
      active={active}
      espnScopes={["hockey:nhl"]}
      scopeLabel="Hockey dashboard filters"
      locationFilters={[
        { label: "All", value: "all" },
        { label: "NHL", value: "nhl", terms: ["nhl"] },
        { label: "AHL", value: "ahl", terms: ["ahl"] },
        { label: "Europe", value: "europe", terms: ["europe", "shl", "liiga", "del"] },
        { label: "International", value: "international", terms: ["international", "world", "olympic"] }
      ]}
    />
  );
}
