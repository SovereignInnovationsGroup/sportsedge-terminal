import { SportDashboard } from "../common/SportDashboard";

export default function AmericanFootballDashboard({ active = "american-football" }: { active?: string }) {
  return (
    <SportDashboard
      sport="american-football"
      label="NFL"
      active={active}
      espnScopes={["football:nfl", "football:college-football"]}
      scopeLabel="NFL dashboard filters"
      locationFilters={[
        { label: "All", value: "all" },
        { label: "NFL", value: "nfl", terms: ["nfl"] },
        { label: "College", value: "college", terms: ["college", "ncaa"] },
        { label: "AFC", value: "afc", terms: ["afc"] },
        { label: "NFC", value: "nfc", terms: ["nfc"] },
        { label: "Playoffs", value: "playoffs", terms: ["playoff", "super bowl"] }
      ]}
    />
  );
}
