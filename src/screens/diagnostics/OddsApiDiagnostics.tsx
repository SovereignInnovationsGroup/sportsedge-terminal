import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { formatDate, normalizeFixtureText } from "../../core/format";
import { type OddsApiDiagnosticResponse } from "../../sports/football/oddsApi";

function oddsDiagnosticTime(value: number | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
    hour12: false
  }).format(new Date(value * 1000));
}

export default function OddsApiDiagnostics() {
  const [data, setData] = useState<OddsApiDiagnosticResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookmakers, setBookmakers] = useState("betfair,matchbook,smarkets,betdaq,bet365");
  const [eventLimit, setEventLimit] = useState("6");
  const [query, setQuery] = useState("");

  async function loadDiagnostics() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sport: "soccer",
        bookmakers,
        eventLimit,
        scanPages: "2",
        pageLimit: "100",
        oddsLimit: "80"
      });
      const response = await fetch(`/api/odds-api/diagnostics?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.rows)) throw new Error(payload.detail || "odds diagnostics failed");
      setData(payload as OddsApiDiagnosticResponse);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "odds diagnostics failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const rows = useMemo(() => {
    const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
    const sourceRows = data?.rows || [];
    if (!terms.length) return sourceRows;
    return sourceRows.filter((row) => {
      const haystack = normalizeFixtureText([
        row.fixture,
        row.league,
        row.bookmaker,
        row.market,
        row.selection,
        row.classification,
        row.fieldKeys.join(" ")
      ].join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }, [data, query]);

  const classifications = data?.counts.byClassification || {};
  const bookmakerCounts = data?.counts.byBookmaker || {};

  return (
    <>
      <TerminalTopbar active="football" onSearchChange={setQuery} searchPlaceholder="Filter Odds API rows, fields, bookmaker..." />
      <main className="oddsapi-page">
        <section className="oddsapi-head">
          <div>
            <span>Provider diagnostics</span>
            <h1>Odds API Exchange Pricing Probe</h1>
          </div>
          <div className="oddsapi-actions">
            <label><span>Bookmakers</span><input value={bookmakers} onChange={(event) => setBookmakers(event.target.value)} /></label>
            <label><span>Events</span><input value={eventLimit} onChange={(event) => setEventLimit(event.target.value)} /></label>
            <button type="button" onClick={loadDiagnostics} disabled={loading}>{loading ? "Checking" : "Refresh"}</button>
          </div>
        </section>

        <section className="oddsapi-summary">
          <article><span>Rows</span><strong>{rows.length}{query.trim() && data ? ` / ${data.rowCount}` : ""}</strong></article>
          <article><span>Events</span><strong>{data?.eventCount ?? "-"}</strong></article>
          <article><span>Exchange ladder</span><strong>{classifications.exchange_ladder || 0}</strong></article>
          <article><span>Exchange quote</span><strong>{classifications.exchange_quote || 0}</strong></article>
          <article><span>Bookmaker odds</span><strong>{classifications.bookmaker_odds || 0}</strong></article>
        </section>

        <section className="oddsapi-grid">
          <aside className="oddsapi-side">
            <div>
              <h2>Bookmakers</h2>
              {Object.entries(bookmakerCounts).map(([key, value]) => <p key={key}><span>{key}</span><strong>{value}</strong></p>)}
              {Object.keys(bookmakerCounts).length === 0 && <em>No provider rows yet.</em>}
            </div>
            <div>
              <h2>Events Found</h2>
              {(data?.events || []).map((event) => (
                <p key={event.eventId}><span>{event.fixture}</span><strong>{event.targetBookmakers?.join(" / ") || "-"}</strong></p>
              ))}
            </div>
          </aside>

          <section className="oddsapi-table-wrap">
            {error && <div className="oddsapi-state error">{error}</div>}
            {loading && !data && <div className="oddsapi-state">Checking provider fields.</div>}
            <table className="oddsapi-table">
              <thead>
                <tr>
                  <th>Time</th><th>Fixture</th><th>Bookmaker</th><th>Market</th><th>Odds</th><th>Back</th><th>Lay</th><th>Size</th><th>Classification</th><th>Source</th><th>Fields</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.eventId}-${row.bookmaker}-${row.market}-${row.selection}-${index}`}>
                    <td className="mono">{oddsDiagnosticTime(row.startTime)}</td>
                    <td><strong>{row.fixture || row.eventId}</strong><span>{row.league || "Soccer"}</span></td>
                    <td className="mono">{row.bookmaker}</td>
                    <td>{row.market}</td>
                    <td className="mono positive">{row.odds ?? "-"}</td>
                    <td className={row.hasBack ? "positive mono" : "mono"}>{row.hasBack ? "yes" : "-"}</td>
                    <td className={row.hasLay ? "sell mono" : "mono"}>{row.hasLay ? "yes" : "-"}</td>
                    <td className={row.hasSize ? "positive mono" : "mono"}>{row.hasSize ? "yes" : "-"}</td>
                    <td><span className={`oddsapi-class ${row.classification}`}>{row.classification}</span></td>
                    <td className="mono">{row.sourceTs ? formatDate(row.sourceTs) : "-"}</td>
                    <td className="oddsapi-fields">{row.fieldKeys.slice(0, 12).join(", ")}</td>
                  </tr>
                ))}
                {!loading && rows.length === 0 && <tr><td className="empty" colSpan={11}>No Odds API rows matched the current probe.</td></tr>}
              </tbody>
            </table>
            {data?.errors?.length ? <div className="oddsapi-errors">{data.errors.map((item) => <span key={`${item.eventId}-${item.message}`}>{item.fixture || item.eventId}: {item.message}</span>)}</div> : null}
          </section>
        </section>
      </main>
    </>
  );
}
