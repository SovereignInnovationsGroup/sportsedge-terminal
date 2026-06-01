import { useEffect, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";

type EntityProfilePayload = {
  profile?: {
    id: string;
    provider: string;
    type: string;
    sport?: string;
    league?: string;
    title: string;
    subtitle?: string;
    imageUrl?: string | null;
    summary?: string | null;
    backHref?: string;
    fields?: [string, unknown][];
    links?: { text?: string; href?: string }[];
  };
};

function activeFromProfile(profile?: EntityProfilePayload["profile"]) {
  if (!profile?.sport) return "dashboard";
  if (profile.sport === "soccer") return "football";
  if (profile.sport === "football") return "american-football";
  if (profile.sport === "racing") return "motorsport";
  return profile.sport;
}

export default function EntityProfile({ provider, entityType, id }: { provider: string; entityType: string; id: string }) {
  const [payload, setPayload] = useState<EntityProfilePayload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadProfile() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/profiles/${encodeURIComponent(provider)}/${encodeURIComponent(entityType)}/${encodeURIComponent(id)}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const nextPayload = await response.json() as EntityProfilePayload & { detail?: string };
        if (!response.ok) throw new Error(nextPayload.detail || "profile failed");
        setPayload(nextPayload);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "profile failed");
        setPayload({});
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProfile();
    return () => controller.abort();
  }, [provider, entityType, id]);

  const profile = payload.profile;
  const active = activeFromProfile(profile);

  return (
    <>
      <TerminalTopbar active={active} searchPlaceholder="Search sport profiles..." />
      <main className="entity-profile-page">
        {error && <div className="agtest-error">{error}</div>}
        {!error && (
          <section className="entity-profile-hero">
            <button type="button" onClick={() => { window.location.hash = profile?.backHref || `#${active}`; }}>{"< Back"}</button>
            <div className="entity-profile-image">
              {profile?.imageUrl ? <img src={profile.imageUrl} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
              <span>{String(profile?.title || "?").slice(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <h1>{loading ? "Loading profile" : profile?.title || "Profile"}</h1>
              <p>{profile?.subtitle || "SportsEdge profile record"}</p>
            </div>
          </section>
        )}
        {profile?.summary ? <section className="entity-profile-summary">{profile.summary}</section> : null}
        <section className="sport-summary-panel entity-profile-fields">
          <header><span>Profile Data</span><strong>{profile?.fields?.length || 0}</strong></header>
          <table>
            <tbody>
              {(profile?.fields || []).map(([label, value]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{String(value)}</td>
                </tr>
              ))}
              {loading && <tr><td className="empty" colSpan={2}>Loading profile.</td></tr>}
              {!loading && !error && !profile?.fields?.length && <tr><td className="empty" colSpan={2}>No profile fields returned.</td></tr>}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
