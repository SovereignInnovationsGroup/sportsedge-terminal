import { useEffect, useState } from "react";
import { FootballProfileShell } from "./ProfileShell";
import { formatTimeAgo, teamTicker } from "./footballFormat";
import type { FootballTeamProfile } from "./profileTypes";

export default function TeamProfile({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<FootballTeamProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/football/teams/${encodeURIComponent(slug)}/profile`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.detail || "Team profile unavailable");
        setProfile(payload.profile || null);
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") setError(fetchError.message || "Team profile unavailable");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [slug]);

  const routeTeamName = decodeURIComponent(slug).replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const name = profile?.asset?.fullName || profile?.name || routeTeamName || "Team";
  const shortName = profile?.asset?.shortName || profile?.name || routeTeamName || "Team";
  const logoUrl = profile?.asset?.logoUrl || profile?.logoUrl;
  const venue = profile?.venue;
  const venueName = venue?.name || "Home venue";
  const teamCode = profile?.asset?.ticker || profile?.code || teamTicker(name);
  const squadRows = profile?.squad || [];
  const staffRows = profile?.staff || [];
  const statRowCount = squadRows.reduce((sum, player) => sum + (player.stats?.length || 0), 0);
  const profileStatus = loading ? "Loading" : error ? "Needs attention" : profile ? "Enriched" : "Waiting";
  const enrichedFreshness = profile?.syncedAt ? formatTimeAgo(profile.syncedAt) : profile ? "seeded" : "not enriched";
  const enrichedRows = [
    ["Team Identity", name, profile ? "Enriched" : "Waiting", profile?.provider || "api-football", enrichedFreshness, "High", "PROFILE"],
    ["Squad", `${squadRows.length} players`, squadRows.length ? "Enriched" : "Waiting", "api-football", enrichedFreshness, squadRows.length ? "High" : "Pending", "SQUAD"],
    ["Staff", `${staffRows.length} staff`, staffRows.length ? "Enriched" : "Waiting", "api-football", enrichedFreshness, staffRows.length ? "Medium" : "Pending", "STAFF"],
    ["Stats", `${statRowCount} rows`, statRowCount ? "Enriched" : "Waiting", "api-football", enrichedFreshness, statRowCount ? "Medium" : "Pending", "STATS"],
    ["Market Link", "SportsEdge fair", "Waiting", "matrix", "not linked", "Pending", "NO FAKE PRICE"]
  ];
  const venueAddress = [venue?.address, venue?.city].filter(Boolean).join(", ") || venue?.city || "Address unavailable";
  const venueCapacity = venue?.capacity ? `${venue.capacity.toLocaleString()} capacity` : "";
  const aliases = Array.from(new Set((profile?.asset?.aliases?.length ? profile.asset.aliases : [name, shortName, teamCode]).filter(Boolean)));

  return (
    <FootballProfileShell
      breadcrumbs={[
        { label: "All", href: "#dashboard" },
        { label: "Football", href: "#football" },
        { label: name }
      ]}
      newsLabel={`${name.toUpperCase()} NEWS`}
      newsQuery={name}
      mode="team"
      contextLabel={`${profile?.country || "Football"} / ${profile?.asset?.currentLeague || venueName}`}
    >
      <div className="bb-profile-identity">
        <div className="bb-profile-badge">
          {logoUrl ? <img src={logoUrl} alt={`${shortName} crest`} /> : <span>{teamTicker(name)}</span>}
        </div>
        <div>
          <span>{teamCode} / FOOTBALL TEAM</span>
          <h1>{name}</h1>
          <p>{[profile?.country, profile?.asset?.currentLeague, venueName].filter(Boolean).join(" / ") || "Football profile"}</p>
        </div>
        <div className="bb-profile-score">
          <span>Profile Status</span>
          <strong>{profileStatus}</strong>
          <em className={profile ? "bb-pos" : ""}>{enrichedFreshness}</em>
        </div>
      </div>

      <div className="bb-profile-kpis">
        {[
          ["Players", `${squadRows.length}`, squadRows.length ? "enriched" : "waiting"],
          ["Staff", `${staffRows.length}`, staffRows.length ? "enriched" : "waiting"],
          ["Stat Rows", `${statRowCount}`, statRowCount ? "enriched" : "waiting"],
          ["Venue", venue?.name ? "Enriched" : "Waiting", venue?.city || "pending"],
          ["Market Data", "Waiting", "field reserved"]
        ].map(([label, value, delta]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <em className={String(delta).includes("enriched") ? "bb-pos" : ""}>{delta}</em>
          </div>
        ))}
      </div>

      {loading && <div className="bb-news-state">Loading team profile.</div>}
      {error && <div className="bb-news-state error">{error}</div>}

      <div className="bb-demo-strip"><span>SportsEdge Picture</span><strong>{name} profile enrichment surface</strong><em>Price fields remain reserved until real market data is linked.</em></div>
      <table className="bb-demo-table bb-profile-market-table">
        <thead><tr>{["Surface", "Object", "Status", "Source", "Fresh", "Conf", "Flag"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
        <tbody>
          {enrichedRows.map((row) => (
            <tr key={`${row[0]}-${row[1]}`}>
              {row.map((cell, index) => <td className={index >= 4 ? "bb-mono" : index === 6 ? "bb-flag" : ""} key={`${cell}-${index}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bb-profile-grid">
        <section>
          <div className="bb-demo-strip"><span>Squad Lens</span><strong>Players ranked by cached profile coverage</strong><em>{squadRows.length} rows.</em></div>
          <table className="bb-demo-table compact">
            <thead><tr>{["Player", "Pos", "Age", "Apps", "Mins", "Rating", "G+A", "Status"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
            <tbody>
              {squadRows.slice(0, 16).map((player) => {
                const latest = player.stats?.[0];
                return (
                  <tr key={player.id}>
                    <td><a className="bb-profile-table-link" href={`#player/${encodeURIComponent(player.id)}`}>{player.name}</a></td>
                    <td>{player.position || "-"}</td>
                    <td className="bb-mono">{player.age ?? "-"}</td>
                    <td className="bb-mono">{latest?.appearances ?? "-"}</td>
                    <td className="bb-mono">{latest?.minutes ?? "-"}</td>
                    <td className="bb-mono">{latest?.rating ?? "-"}</td>
                    <td className="bb-mono">{(latest?.goalsTotal ?? 0) + (latest?.assists ?? 0) || "-"}</td>
                    <td className={player.injured ? "bb-neg" : "bb-pos"}>{player.injured ? "Injury flag" : latest ? "Enriched" : "Waiting"}</td>
                  </tr>
                );
              })}
              {!squadRows.length && <tr><td colSpan={8}>Squad enrichment is waiting for this team.</td></tr>}
            </tbody>
          </table>
        </section>
        <section>
          <div className="bb-demo-strip"><span>Diagnostics</span><strong>Enrichment and market readiness</strong><em>Raw data one layer down.</em></div>
          <div className="bb-profile-diagnostics">
            <div><span>Venue</span><strong>{[venueName, venueAddress, venueCapacity].filter(Boolean).join(" / ") || "Waiting for venue enrichment"}</strong></div>
            <div><span>Aliases</span><strong>{aliases.join(", ") || "Waiting"}</strong></div>
            <div><span>Market Fields</span><strong>SE Fair, market price, edge, liquidity and confidence are reserved; values appear only when real market data is linked.</strong></div>
            <div><span>Provider</span><strong>{profile?.provider || "api-football"} / {profile?.providerTeamId || "waiting"}</strong></div>
          </div>
        </section>
      </div>
    </FootballProfileShell>
  );
}
