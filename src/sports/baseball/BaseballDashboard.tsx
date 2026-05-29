import { SportDashboard } from "../common/SportDashboard";

export default function BaseballDashboard({ active = "baseball" }: { active?: string }) {
  return (
    <SportDashboard
      sport="baseball"
      label="Baseball"
      active={active}
      espnScopes={["baseball:mlb"]}
      scopeLabel="Baseball dashboard filters"
      locationFilters={[
        { label: "All", value: "all" },
        { label: "MLB", value: "mlb", terms: ["mlb", "major league"] },
        { label: "NPB", value: "npb", terms: ["npb", "nippon"] },
        { label: "KBO", value: "kbo", terms: ["kbo", "korea"] },
        { label: "NCAA", value: "ncaa", terms: ["ncaa", "college"] },
        { label: "International", value: "international", terms: ["international", "world"] }
      ]}
    />
  );
}
