import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { eventHasPassed, formatExchangeMoney, localEventTime, normalizeFixtureText } from "../../core/format";
import { fetchMarketSnapshotRows, mergeDisplayPriceRows, type BackendExchangeMatch, type BackendPriceRow, type BackendRunner } from "./marketData";

type HedgeSport = "football" | "baseball" | "basketball";

type CoverVenue = "polymarket" | "kalshi";

type CoverEvent = {
  venue: CoverVenue;
  id: string;
  name: string;
  competition?: string;
  startAt: string | null;
  status?: string;
  liquidity: number;
};

type CoverPrice = {
  venue: CoverVenue;
  eventId: string;
  eventName: string;
  competition?: string;
  startAt: string | null;
  marketName: string;
  runnerName: string;
  side: string;
  ladderLevel: number;
  odds: number;
  amount: number;
  observedAt?: string | null;
};

type HedgeQuote = {
  rowId: string;
  sport: HedgeSport;
  event: string;
  competition: string;
  startAt: string | null;
  market: string;
  outcome: string;
  referenceVenue: string;
  referenceOdds: number | null;
  referenceLiquidity: number;
  polyOdds: number;
  polyLiquidity: number;
  coverVenue: CoverVenue;
  seOdds: number;
  maxStake: number;
  lockedProfit: number;
  profitIfClientWins: number;
  profitIfClientLoses: number;
  marginPct: number;
  status: "COVERABLE" | "INDICATIVE" | "NO QUOTE";
  statusReason: string;
  fresh: string;
};

const HEDGE_SPORTS: Array<{ key: HedgeSport; label: string }> = [
  { key: "football", label: "Football" },
  { key: "baseball", label: "Baseball" },
  { key: "basketball", label: "Basketball" }
];

const REFERENCE_EXCHANGES = [
  { key: "matchbook", label: "MB" },
  { key: "monaco", label: "BDX" },
  { key: "betfair", label: "BF" },
  { key: "sx", label: "SX" },
  { key: "smarkets", label: "SM" },
  { key: "betdaq", label: "BD" }
] as const;

const TARGET_MARGIN = 0.01;
const SNAPSHOT_LIMIT = 500;
const COVER_EVENT_LIMIT = 30;
const COVER_VENUES: Array<{ key: CoverVenue; label: string }> = [
  { key: "polymarket", label: "POLY" },
  { key: "kalshi", label: "KALSHI" }
];
const MIN_POLY_COVER = 25;
const MIN_LOCKED_PROFIT = 0.01;
const MIN_QUOTE_ODDS = 1.02;
const MAX_QUOTE_ODDS = 50;

function matchLiquidity(match?: BackendExchangeMatch) {
  return (match?.runners || []).reduce((sum, runner) => (
    sum
    + Number(runner.back?.amount || 0)
    + Number(runner.lay?.amount || 0)
    + Number(runner.backLevels?.reduce((levelSum, level) => levelSum + Number(level.amount || 0), 0) || 0)
    + Number(runner.layLevels?.reduce((levelSum, level) => levelSum + Number(level.amount || 0), 0) || 0)
  ), 0);
}

function runnerCoverOdds(runner: BackendRunner) {
  const backOdds = Number(runner.back?.odds || 0);
  if (backOdds > 1) return backOdds;
  return Number(runner.backLevels?.find((level) => Number(level.odds || 0) > 1)?.odds || 0);
}

function bestReference(row: BackendPriceRow) {
  let best: { venue: string; odds: number; liquidity: number } | null = null;
  for (const exchange of REFERENCE_EXCHANGES) {
    const match = row.matches?.[exchange.key];
    if (!match) continue;
    const liquidity = matchLiquidity(match);
    const odds = Math.max(0, ...(match.runners || []).map((runner) => runnerCoverOdds(runner)));
    if (liquidity <= 0 && odds <= 1) continue;
    if (!best || liquidity > best.liquidity) best = { venue: exchange.label, odds: odds > 1 ? odds : 0, liquidity };
  }
  return best;
}

function cleanEventName(name: string) {
  return String(name || "")
    .replace(/\s+-\s+(?:More Markets|Exact Score|Player Props|Halftime Result|Total Corners).*$/i, "")
    .trim();
}

function canonicalEventName(name: string) {
  return cleanEventName(name).replace(/\bfc\b/gi, "").replace(/\s+/g, " ").trim();
}

function outcomeLabel(market: string, runner: string) {
  const cleanMarket = String(market || "Moneyline").replace(/\s+on\s+\d{4}-\d{2}-\d{2}\\??$/i, "").trim();
  if (/^yes$/i.test(runner)) return cleanMarket || "Yes";
  if (/^no$/i.test(runner)) return `No: ${cleanMarket || "Market"}`;
  return runner || cleanMarket || "Outcome";
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || `fetch failed: ${url}`);
  return payload as T;
}

async function fetchSportRows(sport: HedgeSport) {
  const exchanges = "matchbook,monaco,betfair,sx,smarkets,betdaq";
  return fetchMarketSnapshotRows(
    `/api/markets/snapshot?sport=${sport}&exchanges=${exchanges}&segment=upcoming4&limit=${SNAPSHOT_LIMIT}`,
    `/api/exchange-odds?sport=${sport}&exchanges=${exchanges}&segment=upcoming4&limit=${SNAPSHOT_LIMIT}`
  );
}

async function fetchCoverEvents(venue: CoverVenue, sport: HedgeSport) {
  const payload = await fetchJson<{ rows?: Array<Omit<CoverEvent, "venue">> }>(`/api/exchange-sport-events?exchange=${venue}&sport=${sport}&limit=${COVER_EVENT_LIMIT}`);
  return (payload.rows || [])
    .map((event) => ({ ...event, venue }))
    .filter((event) => event.startAt && !eventHasPassed(event.startAt))
    .filter((event) => Number(event.liquidity || 0) > 0)
    .sort((a, b) => Number(b.liquidity || 0) - Number(a.liquidity || 0))
    .slice(0, 12);
}

async function fetchCoverPrices(venue: CoverVenue, eventId: string) {
  const payload = await fetchJson<{ rows?: Array<Omit<CoverPrice, "venue">> }>(`/api/exchange-event-prices?exchange=${venue}&eventId=${encodeURIComponent(eventId)}&limit=120`);
  return (payload.rows || []).map((price) => ({ ...price, venue }));
}

function eventTokenScore(a: string, b: string) {
  const left = new Set(normalizeFixtureText(a).split(" ").filter(Boolean));
  const right = new Set(normalizeFixtureText(b).split(" ").filter(Boolean));
  if (!left.size || !right.size) return 0;
  let hits = 0;
  left.forEach((token) => {
    if (right.has(token)) hits += 1;
  });
  return hits / Math.max(1, Math.min(left.size, right.size));
}

function findReference(polyEventName: string, rows: BackendPriceRow[]) {
  const cleanPoly = canonicalEventName(polyEventName);
  let best: { score: number; reference: ReturnType<typeof bestReference> } | null = null;
  mergeDisplayPriceRows(rows).forEach((row) => {
    const score = eventTokenScore(cleanPoly, canonicalEventName(row.name));
    if (score < 0.5) return;
    const reference = bestReference(row);
    if (!reference) return;
    if (!best || score > best.score || reference.liquidity > (best.reference?.liquidity || 0)) best = { score, reference };
  });
  return best?.reference || null;
}

function coverEventKey(event: CoverEvent) {
  return `${event.venue}:${event.id}`;
}

function quoteRowsFromCover(sport: HedgeSport, events: CoverEvent[], pricesByEvent: Record<string, CoverPrice[]>, referenceRows: BackendPriceRow[]): HedgeQuote[] {
  return events.flatMap((event) => {
    const reference = findReference(event.name, referenceRows);
    return (pricesByEvent[coverEventKey(event)] || [])
      .filter((price) => price.side === "back" && Number(price.ladderLevel || 0) === 1 && Number(price.odds || 0) > 1 && Number(price.amount || 0) > 0)
      .filter((price) => !/exact score|player props|corner|halftime/i.test(price.marketName || ""))
      .slice(0, 3)
      .map((price) => {
        const polyOdds = Number(price.odds);
        const polyLiquidity = Number(price.amount);
        const seOdds = Math.max(1.01, polyOdds * (1 - TARGET_MARGIN));
        const maxStake = polyLiquidity * (polyOdds / seOdds);
        const hedgeStake = (maxStake * seOdds) / polyOdds;
        const lockedProfit = maxStake - hedgeStake;
        const profitIfClientWins = lockedProfit;
        const profitIfClientLoses = lockedProfit;
        let status: HedgeQuote["status"] = "COVERABLE";
        let statusReason = "No-loss cover";
        if (polyOdds < MIN_QUOTE_ODDS || polyOdds > MAX_QUOTE_ODDS) {
          status = "NO QUOTE";
          statusReason = "odds outside guardrail";
        } else if (polyLiquidity < MIN_POLY_COVER) {
          status = "INDICATIVE";
          statusReason = "below min cover";
        } else if (seOdds >= polyOdds || profitIfClientWins <= MIN_LOCKED_PROFIT || profitIfClientLoses <= MIN_LOCKED_PROFIT) {
          status = "NO QUOTE";
          statusReason = "not no-loss";
        } else if (!reference) {
          status = "INDICATIVE";
          statusReason = "cover only";
        }
        return {
          rowId: `${sport}:${event.id}:${price.marketName}:${price.runnerName}`,
          sport,
          event: cleanEventName(event.name),
          competition: event.competition || price.competition || event.venue,
          startAt: event.startAt || price.startAt || null,
          market: price.marketName || "Market",
          outcome: outcomeLabel(price.marketName, price.runnerName),
          referenceVenue: reference?.venue || "-",
          referenceOdds: reference?.odds || null,
          referenceLiquidity: reference?.liquidity || 0,
          polyOdds,
          polyLiquidity,
          coverVenue: event.venue,
          seOdds,
          maxStake,
          lockedProfit,
          profitIfClientWins,
          profitIfClientLoses,
          marginPct: (1 - (seOdds / polyOdds)) * 100,
          status,
          statusReason,
          fresh: price.observedAt ? localEventTime(price.observedAt, { second: "2-digit" }) : "watch"
        };
      });
  }).sort((a, b) => b.polyLiquidity - a.polyLiquidity).slice(0, 120);
}

export default function XPoly() {
  const [selectedSport, setSelectedSport] = useState<"all" | HedgeSport>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [referenceRowsBySport, setReferenceRowsBySport] = useState<Record<HedgeSport, BackendPriceRow[]>>({ football: [], baseball: [], basketball: [] });
  const [coverEventsBySport, setCoverEventsBySport] = useState<Record<HedgeSport, CoverEvent[]>>({ football: [], baseball: [], basketball: [] });
  const [coverPricesByEvent, setCoverPricesByEvent] = useState<Record<string, CoverPrice[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRows() {
    try {
      setLoading(true);
      const referenceEntries = await Promise.all(HEDGE_SPORTS.map(async (sport) => [sport.key, await fetchSportRows(sport.key)] as const));
      const coverEntries = await Promise.all(HEDGE_SPORTS.map(async (sport) => [
        sport.key,
        (await Promise.all(COVER_VENUES.map((venue) => fetchCoverEvents(venue.key, sport.key)))).flat()
      ] as const));
      const coverEvents = Object.fromEntries(coverEntries) as Record<HedgeSport, CoverEvent[]>;
      const priceEntries = await Promise.all(Object.values(coverEvents).flat().slice(0, 36).map(async (event) => [coverEventKey(event), await fetchCoverPrices(event.venue, event.id)] as const));
      setReferenceRowsBySport(Object.fromEntries(referenceEntries) as Record<HedgeSport, BackendPriceRow[]>);
      setCoverEventsBySport(coverEvents);
      setCoverPricesByEvent(Object.fromEntries(priceEntries));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "xpoly snapshot failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
    const timer = window.setInterval(loadRows, 12_000);
    return () => window.clearInterval(timer);
  }, []);

  const allRows = useMemo(() => HEDGE_SPORTS.flatMap((sport) => (
    quoteRowsFromCover(sport.key, coverEventsBySport[sport.key], coverPricesByEvent, referenceRowsBySport[sport.key])
  )), [coverEventsBySport, coverPricesByEvent, referenceRowsBySport]);

  const visibleRows = useMemo(() => {
    const terms = normalizeFixtureText(searchQuery).split(" ").filter(Boolean);
    return allRows.filter((row) => {
      if (selectedSport !== "all" && row.sport !== selectedSport) return false;
      if (row.startAt && eventHasPassed(row.startAt)) return false;
      if (Number(row.polyLiquidity || 0) <= 0 && Number(row.referenceLiquidity || 0) <= 0) return false;
      if (!terms.length) return true;
      const haystack = normalizeFixtureText([row.sport, row.event, row.competition, row.market, row.outcome, row.referenceVenue, row.fresh].join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }, [allRows, searchQuery, selectedSport]);

  const summary = useMemo(() => {
    const coverableRows = visibleRows.filter((row) => row.status === "COVERABLE");
    const polyCover = coverableRows.reduce((sum, row) => sum + row.polyLiquidity, 0);
    const maxStake = coverableRows.reduce((sum, row) => sum + row.maxStake, 0);
    const locked = coverableRows.reduce((sum, row) => sum + row.lockedProfit, 0);
    const sports = new Set(coverableRows.map((row) => row.sport)).size;
    return { polyCover, maxStake, locked, sports, coverable: coverableRows.length };
  }, [visibleRows]);

  return (
    <>
      <TerminalTopbar active="xpoly" searchPlaceholder="XPoly: covered synthetic odds..." onSearchChange={setSearchQuery} />
      <main className="agtest-page xpoly-page">
        <section className="agtest-subbar">
          <nav aria-label="XPoly sport filters">
            <button className={selectedSport === "all" ? "active" : ""} onClick={() => setSelectedSport("all")}>All Cover</button>
            {HEDGE_SPORTS.map((sport) => (
              <button key={sport.key} className={selectedSport === sport.key ? "active" : ""} onClick={() => setSelectedSport(sport.key)}>
                {sport.label}
              </button>
            ))}
          </nav>
          <div><span>{summary.coverable}/{visibleRows.length} coverable</span><span>{loading ? "refreshing" : "live snapshot"}</span></div>
        </section>

        <section className="xpoly-summary">
          <article><span>Sports With Cover Money</span><strong>{summary.sports || "-"}</strong><em>Poly/Kalshi cover liquidity</em></article>
          <article><span>Cover Available</span><strong>{formatExchangeMoney(summary.polyCover, "USD")}</strong><em>Poly + Kalshi hedge size</em></article>
          <article><span>SE Max Stake</span><strong>{formatExchangeMoney(summary.maxStake, "USD")}</strong><em>1% covered quote model</em></article>
          <article><span>Locked Spread</span><strong>{formatExchangeMoney(summary.locked, "USD")}</strong><em>Before fees and slippage</em></article>
        </section>

        <section className="xpoly-note">
          <strong>Covered mode</strong>
          <span>Client sees SportsEdge odds. SportsEdge confirms only after Polymarket or Kalshi cover is available. Rows without cover money are hidden.</span>
        </section>

        {error ? <div className="xpoly-empty">{error}</div> : null}
        {!error && !loading && !visibleRows.length ? <div className="xpoly-empty">No Poly/Kalshi-covered rows for this filter.</div> : null}

        <div className="xpoly-table-wrap">
          <table className="xpoly-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Sport</th>
                <th>Event</th>
                <th>Outcome</th>
                <th>Ref</th>
                <th>Cover</th>
                <th>SE Offer</th>
                <th>Max Stake</th>
                <th>Client Wins</th>
                <th>Client Loses</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.rowId} className={row.status === "COVERABLE" ? "" : "xpoly-row-muted"}>
                  <td className="mono">{localEventTime(row.startAt, { day: "2-digit", month: "short" })}</td>
                  <td><span className="xpoly-pill">{row.sport}</span></td>
                  <td><strong>{row.event}</strong><span>{row.competition}</span></td>
                  <td><strong>{row.outcome}</strong><span>{row.market}</span></td>
                  <td className="mono"><strong>{row.referenceVenue} {row.referenceOdds ? row.referenceOdds.toFixed(2) : "-"}</strong><span>{row.referenceLiquidity ? formatExchangeMoney(row.referenceLiquidity, "GBP") : "reference only"}</span></td>
                  <td className="mono xpoly-cover"><strong>{row.coverVenue.toUpperCase()} {row.polyOdds.toFixed(2)}</strong><span>{formatExchangeMoney(row.polyLiquidity, "USD")}</span></td>
                  <td className="mono xpoly-offer"><strong>{row.seOdds.toFixed(2)}</strong><span>{row.marginPct.toFixed(2)}% spread</span></td>
                  <td className="mono">{formatExchangeMoney(row.maxStake, "USD")}</td>
                  <td className="mono xpoly-profit">{formatExchangeMoney(row.profitIfClientWins, "USD")}</td>
                  <td className="mono xpoly-profit">{formatExchangeMoney(row.profitIfClientLoses, "USD")}</td>
                  <td>
                    <span className={`xpoly-status ${row.status === "NO QUOTE" ? "blocked" : row.status === "INDICATIVE" ? "watch" : ""}`}>{row.status}</span>
                    <small>{row.statusReason} / {row.fresh}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
