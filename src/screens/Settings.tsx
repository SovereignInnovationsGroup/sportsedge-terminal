import { TerminalTopbar } from "../app/TerminalTopbar";
import { APP_VERSION } from "../generated/version";

function readUser() {
  try {
    const raw = window.localStorage.getItem("sportsedge.auth.user");
    return raw ? JSON.parse(raw) as Record<string, any> : {};
  } catch {
    return {};
  }
}

export default function SettingsScreen() {
  const user = readUser();
  const account = user.login_id || user.email || "public";
  const membership = user.subscription?.plan_name || user.subscription?.level || user.subscription?.status || "guest";

  return (
    <>
      <TerminalTopbar active="settings" searchPlaceholder="Settings, account, display, data..." />
      <main className="terminal-info-page">
        <section className="terminal-info-hero">
          <span>SportsEdge / Settings</span>
          <h1>Settings</h1>
          <p>Account, terminal display, data freshness, and workspace preferences.</p>
        </section>
        <section className="terminal-info-grid">
          <article>
            <span>Account</span>
            <strong>{account}</strong>
            <p>{membership}</p>
          </article>
          <article>
            <span>Terminal Version</span>
            <strong>{APP_VERSION}</strong>
            <p>Shown in the gear menu and tracked with each build.</p>
          </article>
          <article>
            <span>Pricing Path</span>
            <strong>Redis + WSS</strong>
            <p>Exchange workers maintain internal SportsEdge market state for the UI.</p>
          </article>
          <article>
            <span>Display</span>
            <strong>Local Time</strong>
            <p>Events render using the client location/timezone.</p>
          </article>
        </section>
      </main>
    </>
  );
}
