import { SportDashboard } from "../common/SportDashboard";

export default function MotorsportDashboard({ active = "motorsport" }: { active?: string }) {
  return (
    <SportDashboard
      sport="motorsport"
      label="Motorsport"
      active={active}
      espnScopes={["racing:f1", "racing:nascar-premier", "racing:irl"]}
      scopeLabel="Motorsport dashboard filters"
      locationFilters={[
        { label: "All", value: "all" },
        { label: "F1", value: "f1", terms: ["formula 1", "formula one", "f1"] },
        { label: "NASCAR", value: "nascar", terms: ["nascar"] },
        { label: "IndyCar", value: "indycar", terms: ["indycar", "indy car"] },
        { label: "MotoGP", value: "motogp", terms: ["motogp", "moto gp"] }
      ]}
    />
  );
}
