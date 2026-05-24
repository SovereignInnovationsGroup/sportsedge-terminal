import { TerminalTopbar } from "../app/TerminalTopbar";
import { APP_VERSION } from "../generated/version";

export default function TerminalAbout() {
  return (
    <>
      <TerminalTopbar active="about" searchPlaceholder="About SportsEdge, feeds, terminal..." />
      <main className="terminal-info-page">
        <section className="terminal-info-hero">
          <span>SportsEdge / About</span>
          <h1>SportsEdge Terminal</h1>
          <p>A single market picture for sports trading: fixtures, exchange liquidity, odds alignment, news context, and profile intelligence.</p>
        </section>
        <section className="terminal-info-grid terminal-info-grid-wide">
          <article>
            <span>Market State</span>
            <strong>Internal Feed</strong>
            <p>External feeds are consumed server-side and normalised into SportsEdge snapshots before the UI sees them.</p>
          </article>
          <article>
            <span>Current Build</span>
            <strong>{APP_VERSION}</strong>
            <p>The version in this screen should match the gear menu and deployed build file.</p>
          </article>
          <article>
            <span>Core Screens</span>
            <strong>Dashboard / Liquidity / Bias / Arbs / Profiles</strong>
            <p>Each screen is designed to answer a different trading question without requiring raw-feed inspection.</p>
          </article>
        </section>
      </main>
    </>
  );
}
