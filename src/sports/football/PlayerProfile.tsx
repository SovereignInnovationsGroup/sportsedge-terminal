import { useEffect, useState } from "react";
import { FootballProfileShell } from "./ProfileShell";
import { teamInitials } from "./footballFormat";
import type { FootballPlayerProfile } from "./profileTypes";

export default function PlayerProfile({ id }: { id: string }) {
  const [profile, setProfile] = useState<FootballPlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/football/players/${encodeURIComponent(id)}/profile`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.detail || "Player profile unavailable");
        setProfile(payload.profile || null);
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") setError(fetchError.message || "Player profile unavailable");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [id]);

  const name = profile?.name || "Player";
  const stats = profile?.stats || [];
  const latestStat = stats[0];
  const teamName = profile?.team?.name || "Team";
  const teamHref = profile?.team?.name ? `#team/${encodeURIComponent(profile.team.name)}` : "#football";
  const profileStats = [
    ["Position", profile?.position || latestStat?.position || "Player"],
    ["Nationality", profile?.nationality || "Unknown"],
    ["Age", profile?.age || "-"],
    ["Height", profile?.height || "-"],
    ["Weight", profile?.weight || "-"],
    ["Injury", profile?.injured ? "Flagged" : "Clear"]
  ];
  const playerStatus = loading ? "Loading" : error ? "Needs attention" : profile ? "Enriched" : "Waiting";
  const playerSurfaceRows = [
    ["Player Identity", name, profile ? "Enriched" : "Waiting", profile ? "High" : "Pending", "PROFILE"],
    ["Current Team", teamName, profile?.team ? "Enriched" : "Waiting", profile?.team ? "High" : "Pending", "TEAM"],
    ["Season Stats", `${stats.length} rows`, stats.length ? "Enriched" : "Waiting", stats.length ? "Medium" : "Pending", "STATS"],
    ["Fitness", profile?.injured ? "Injury flag" : "Clear", profile ? "Enriched" : "Waiting", profile?.injured ? "High" : "Medium", profile?.injured ? "INJURY" : "CLEAR"],
    ["Prop Market Link", "SE fair / edge / liquidity", "Waiting", "Pending", "NO FAKE PRICE"]
  ];

  return (
    <FootballProfileShell
      breadcrumbs={[
        { label: "All", href: "#dashboard" },
        { label: "Football", href: "#football" },
        { label: teamName, href: teamHref },
        { label: name }
      ]}
      newsLabel={`${name.toUpperCase()} NEWS`}
      newsQuery={name}
      mode="player"
      contextLabel={`${teamName} / ${profile?.position || latestStat?.position || "Player"}`}
    >
      <div className="bb-profile-identity">
        <div className="bb-profile-badge player-photo">
          {profile?.photoUrl ? <img src={profile.photoUrl} alt={`${name} profile`} /> : <span>{teamInitials(name)}</span>}
        </div>
        <div>
          <span>PLAYER / FOOTBALL PROFILE</span>
          <h1>{name}</h1>
          <p>{[teamName, profile?.position || latestStat?.position, profile?.nationality].filter(Boolean).join(" / ") || "Player profile"}</p>
        </div>
        <div className="bb-profile-score">
          <span>Profile Status</span>
          <strong>{playerStatus}</strong>
          <em className={profile ? "bb-pos" : ""}>{profile ? "ready" : "waiting"}</em>
        </div>
      </div>

      <div className="bb-profile-kpis">
        {[
          ["Position", profile?.position || latestStat?.position || "Waiting", profile ? "enriched" : "waiting"],
          ["Team", teamName, profile?.team ? "enriched" : "waiting"],
          ["Stat Rows", `${stats.length}`, stats.length ? "enriched" : "waiting"],
          ["Apps", `${latestStat?.appearances ?? "-"}`, latestStat ? "latest row" : "waiting"],
          ["Market Data", "Waiting", "field reserved"]
        ].map(([label, value, delta]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <em className={String(delta).includes("enriched") ? "bb-pos" : ""}>{delta}</em>
          </div>
        ))}
      </div>

      {loading && <div className="bb-news-state">Loading player profile.</div>}
      {error && <div className="bb-news-state error">{error}</div>}

      <div className="bb-demo-strip"><span>SportsEdge Picture</span><strong>{name} profile and prop readiness</strong><em>Prop price fields stay blank until real data is linked.</em></div>
      <table className="bb-demo-table bb-profile-market-table">
        <thead><tr>{["Surface", "Object", "Status", "Conf", "Flag"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
        <tbody>
          {playerSurfaceRows.map((row) => (
            <tr key={`${row[0]}-${row[1]}`}>
              {row.map((cell, index) => <td className={index >= 3 ? "bb-mono" : index === 4 ? "bb-flag" : ""} key={`${cell}-${index}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bb-profile-grid">
        <section>
          <div className="bb-demo-strip"><span>Season Lens</span><strong>Cached player production rows</strong><em>{stats.length} rows.</em></div>
          <table className="bb-demo-table compact">
            <thead><tr>{["Season", "League", "Apps", "Mins", "Goals", "Assists", "Rating", "Cards"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.id}>
                  <td className="bb-mono">{row.season}</td>
                  <td>{row.leagueName || row.teamName || "-"}</td>
                  <td className="bb-mono">{row.appearances ?? "-"}</td>
                  <td className="bb-mono">{row.minutes ?? "-"}</td>
                  <td className="bb-mono">{row.goalsTotal ?? "-"}</td>
                  <td className="bb-mono">{row.assists ?? "-"}</td>
                  <td className="bb-mono">{row.rating ?? "-"}</td>
                  <td className="bb-mono">{row.cardsYellow ?? "-"} / {row.cardsRed ?? "-"}</td>
                </tr>
              ))}
              {!stats.length && <tr><td colSpan={8}>Stats enrichment is waiting for this player.</td></tr>}
            </tbody>
          </table>
        </section>
        <section>
          <div className="bb-demo-strip"><span>Diagnostics</span><strong>Player enrichment and prop readiness</strong><em>Raw context one layer down.</em></div>
          <div className="bb-profile-diagnostics">
            <div><span>Player Details</span><strong>{profileStats.map(([label, value]) => `${label}: ${value}`).join(" / ")}</strong></div>
            <div><span>Team Link</span><strong>{profile?.team ? `${profile.team.name}${profile.team.country ? ` / ${profile.team.country}` : ""}` : "Waiting for team link"}</strong></div>
            <div><span>Market Fields</span><strong>SE Fair, market price, edge, liquidity and confidence are reserved; values appear only when real prop data is linked.</strong></div>
          </div>
        </section>
      </div>
    </FootballProfileShell>
  );
}
