import { memo, useMemo } from "react";
import { eventHasPassed, localEventTime } from "../../core/format";
import { CountryFlag } from "../football/CountryFlag";
import {
  DASHBOARD_EXCHANGES,
  DEFAULT_DATE_SCOPE_FILTERS,
  NewsItem,
  SportEventRow,
  SportEntityRow,
  SportLocationFilter,
  StandingRow
} from "./sportDashboardTypes";
import {
  fixtureClockLabel,
  fixtureScoreLabel,
  fixtureStatusLabel,
  formatExchangeMoney,
  isLiveSportEvent,
  newsHeadline,
  newsImpact,
  newsTag,
  newsTime
} from "./sportDashboardUtils";

function fullFixtureTime(value: string | null | undefined) {
  return localEventTime(value, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "2-digit"
  });
}

function formatPopulatedMoney(value: number | null | undefined, currency = "GBP") {
  const numeric = Number(value || 0);
  if (numeric <= 0 || !Number.isFinite(numeric)) return currency === "USD" ? "$0" : "£0";
  return formatExchangeMoney(numeric, currency);
}

export function ExchangeCoverageCell({ event }: { event: SportEventRow }) {
  return (
    <div className="exchange-coverage sport-summary-coverage">
      {DASHBOARD_EXCHANGES.map((exchange) => (
        <span
          className={Number(event.liquidityByExchange[exchange.key] || 0) > 0 ? "available" : ""}
          key={exchange.key}
        >
          {"short" in exchange ? exchange.short : exchange.label.slice(0, 2)}
        </span>
      ))}
    </div>
  );
}

const MoneyCell = memo(function MoneyCell({
  value,
  currency = "GBP",
  total = false
}: {
  value: number | null | undefined;
  currency?: string;
  total?: boolean;
}) {
  const numeric = Number(value || 0);

  return (
    <td className={`mono liquidity-money ${total ? "total" : ""}`}>
      {formatPopulatedMoney(numeric, currency)}
    </td>
  );
});

const FixtureTableRow = memo(function FixtureTableRow({
  event,
  rowClass,
  rowKey
}: {
  event: SportEventRow;
  rowClass: string;
  rowKey: string;
}) {
  return (
    <tr className={rowClass} data-row-key={rowKey}>
      <td className="mono positive">{fullFixtureTime(event.startAt)}</td>
      <td className="mono">
        <span className={isLiveSportEvent(event) ? "fixture-status is-live" : "fixture-status"}>
          {fixtureStatusLabel(event)}
        </span>
      </td>
      <td className={isLiveSportEvent(event) ? "mono fixture-clock is-live" : "mono fixture-clock"}>{fixtureClockLabel(event)}</td>
      <td className={isLiveSportEvent(event) ? "mono fixture-score is-live" : "mono fixture-score"}>{fixtureScoreLabel(event)}</td>
      <td><strong>{event.name || "Fixture pending"}</strong></td>
      <td>{event.competition || "Football"}</td>
      <td>
        <span className="fixture-country">
          <CountryFlag country={event.country} />
          <span className="fixture-country-label">{event.country || "-"}</span>
        </span>
      </td>
      <td><ExchangeCoverageCell event={event} /></td>
      <MoneyCell value={event.liquidityByExchange.betfair} />
      <MoneyCell value={event.liquidityByExchange.matchbook} />
      <MoneyCell value={event.liquidityByExchange.kalshi} currency="USD" />
      <MoneyCell value={event.liquidityByExchange.polymarket} currency="USD" />
      <MoneyCell value={event.liquidityByExchange.monaco} currency="USD" />
      <MoneyCell value={event.liquidityByExchange.sx} />
      <MoneyCell value={event.liquidity} total />
    </tr>
  );
}, (previous, next) => (
  previous.rowClass === next.rowClass
  && previous.rowKey === next.rowKey
  && previous.event.name === next.event.name
  && previous.event.competition === next.event.competition
  && previous.event.country === next.event.country
  && previous.event.startAt === next.event.startAt
  && previous.event.statusShort === next.event.statusShort
  && previous.event.statusLong === next.event.statusLong
  && previous.event.elapsed === next.event.elapsed
  && previous.event.clock === next.event.clock
  && previous.event.scoreHome === next.event.scoreHome
  && previous.event.scoreAway === next.event.scoreAway
  && previous.event.liquidity === next.event.liquidity
  && DASHBOARD_EXCHANGES.every((exchange) => (
    Number(previous.event.liquidityByExchange[exchange.key] || 0) === Number(next.event.liquidityByExchange[exchange.key] || 0)
  ))
));

export function FixtureTable({ title, rows, loading }: { title: string; rows: SportEventRow[]; loading: boolean }) {
  function eventRowClass(event: SportEventRow) {
    if (isLiveSportEvent(event)) return "is-live-event";
    if (!eventHasPassed(event.startAt)) return "";
    return event.liquidity > 0 ? "is-started-event" : "is-past-event";
  }

  return (
    <section className="sport-summary-panel sport-summary-fixtures">
      <header>
        <span>{title}</span>
        <strong>{rows.length}</strong>
      </header>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>State</th>
            <th>Clock</th>
            <th>Score</th>
            <th>Fixture</th>
            <th>Competition</th>
            <th>Country</th>
            <th>Coverage</th>
            <th>BF £ Now</th>
            <th>MB £ Now</th>
            <th>KS $ Now</th>
            <th>PY $ Now</th>
            <th>BX $ Now</th>
            <th>SX £ Now</th>
            <th>Total £ Now</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((event) => {
            const rowKey = event.id;
            return <FixtureTableRow event={event} key={rowKey} rowClass={eventRowClass(event)} rowKey={rowKey} />;
          })}
          {!loading && rows.length === 0 && <tr><td className="empty" colSpan={15}>No fixtures match the current filter.</td></tr>}
          {loading && rows.length === 0 && <tr><td className="empty" colSpan={15}>Loading fixtures.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

function standingsNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return Number(value).toLocaleString("en-GB");
}

export function StandingsPanel({
  label,
  rows,
  loading
}: {
  label: string;
  rows: StandingRow[];
  loading: boolean;
}) {
  const groupedRows = useMemo(() => {
    const groups = new Map<string, StandingRow[]>();
    rows.forEach((row) => {
      const key = row.leagueName || row.league || "Standings";
      const group = groups.get(key) || [];
      if (group.length < 12) group.push(row);
      groups.set(key, group);
    });
    return Array.from(groups.entries()).slice(0, 4);
  }, [rows]);

  return (
    <section className="sport-summary-panel sport-standings-panel">
      <header>
        <span>Tables / Standings</span>
        <strong>{rows.length}</strong>
      </header>
      {groupedRows.map(([leagueName, leagueRows]) => (
        <div className="sport-standings-league" key={leagueName}>
          <div className="sport-standings-league-title">
            <strong>{leagueName}</strong>
            <span>{leagueRows[0]?.season || ""}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>P</th>
                <th>W</th>
                <th>D/T</th>
                <th>L</th>
                <th>+/-</th>
                <th>Pts</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {leagueRows.map((row, index) => (
                <tr key={row.id || `${leagueName}-${row.team}-${index}`}>
                  <td className="mono">{row.rank || index + 1}</td>
                  <td><strong>{row.team}</strong>{row.teamAbbreviation ? <small>{row.teamAbbreviation}</small> : null}</td>
                  <td className="mono">{standingsNumber(row.played)}</td>
                  <td className="mono positive">{standingsNumber(row.wins)}</td>
                  <td className="mono">{standingsNumber(row.draws ?? row.ties)}</td>
                  <td className="mono">{standingsNumber(row.losses)}</td>
                  <td className="mono">{standingsNumber(row.pointDifferential)}</td>
                  <td className="mono total">{standingsNumber(row.points)}</td>
                  <td className="mono">{row.record || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {!loading && groupedRows.length === 0 && (
        <div className="sport-standings-empty">
          <strong>No standings rows returned.</strong>
          <span>{label} standings are not populated yet.</span>
        </div>
      )}
      {loading && groupedRows.length === 0 && (
        <div className="sport-standings-empty">
          <strong>Loading standings.</strong>
          <span>Checking standings cache.</span>
        </div>
      )}
    </section>
  );
}

export function SportStandingByBoard({
  label,
  espnScopes: _espnScopes,
  dataStatus
}: {
  label: string;
  espnScopes: string[];
  dataStatus: string;
}) {
  const demoRows = [
    ["Exchange Rows", "Standing by", "No live venue rows yet"],
    ["Routing", "Ready", "BF / MB / KS / PY / BX / SX slots"],
    ["News", "Live", "Rail remains real when sport news exists"]
  ];
  const demoTape = [
    `${label.toUpperCase()} data spine ready`,
    "No live exchange rows for this sport",
    "ESPN metadata additive",
    "No executable prices shown",
    "Waiting for exchange liquidity"
  ];

  return (
    <section className="sport-demo-holding" aria-label={`${label} data standing by screen`}>
      <div className="sport-demo-holding-head">
        <strong>Data standing by</strong>
        <p>{dataStatus}</p>
      </div>
      <div className="sport-demo-tape" aria-label="Demo holding ticker">
        <div>{demoTape.concat(demoTape).map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
      </div>
      <div className="sport-demo-grid">
        {demoRows.map(([labelText, value, note]) => (
          <article key={labelText}>
            <span>{labelText}</span>
            <strong>{value}</strong>
            <em>{note}</em>
          </article>
        ))}
      </div>
      <table className="sport-demo-table">
        <thead><tr>{["Screen", "State", "Liquidity", "Fresh", "Action"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
        <tbody>
          {[
            [`${label} Dashboard`, "Ready", "-", "watch", "Await normalized events"],
            ["Liquidity", "Slots armed", "-", "watch", "Open when exchange rows arrive"],
            ["Bias Matrix", "Pending", "-", "watch", "Odds-only feed can populate later"],
            ["News", "Live capable", "Real news rail", "watch", "Monitor sport context"]
          ].map((row) => (
            <tr key={row[0]}>{row.map((cell, index) => <td className={index === 1 || index === 3 ? "mono positive" : ""} key={`${row[0]}-${cell}`}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function entityInitials(name: string) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

export function SportEntitiesPanel({
  label,
  type,
  rows,
  loading,
  error
}: {
  label: string;
  type: string;
  rows: SportEntityRow[];
  loading: boolean;
  error?: string;
}) {
  const title = type === "player" ? "Players" : "Teams";
  return (
    <section className="sport-summary-panel sport-entities-panel">
      <header>
        <span>{title}</span>
        <strong>{rows.length}</strong>
      </header>
      {error && <div className="agtest-error">{error}</div>}
      <table>
        <thead>
          <tr>
            <th>{type === "player" ? "Player" : "Team"}</th>
            <th>League</th>
            <th>Country</th>
            <th>{type === "player" ? "Position" : "Code"}</th>
            {type === "player" && <th>Age</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.provider}-${row.type}-${row.id}`}
              tabIndex={0}
              onDoubleClick={() => {
                if (row.href) window.location.hash = row.href;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && row.href) window.location.hash = row.href;
              }}
            >
              <td>
                <div className="sport-entity-name">
                  <span className="sport-entity-logo">
                    {row.imageUrl ? <img src={row.imageUrl} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
                    <em>{entityInitials(row.name)}</em>
                  </span>
                  <strong>{row.name}</strong>
                  {row.subtitle ? <small>{row.subtitle}</small> : null}
                </div>
              </td>
              <td>{row.league || "-"}</td>
              <td>{row.country || "-"}</td>
              <td>{type === "player" ? row.position || "-" : row.abbreviation || "-"}</td>
              {type === "player" && <td className="mono">{row.age ?? "-"}</td>}
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr><td className="empty" colSpan={type === "player" ? 5 : 4}>{label} {title.toLowerCase()} rows are not populated yet.</td></tr>
          )}
          {loading && rows.length === 0 && (
            <tr><td className="empty" colSpan={type === "player" ? 5 : 4}>Loading {label.toLowerCase()} {title.toLowerCase()}.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

export function SportScopeFilter({
  sportLabel,
  dateScope,
  locationScope,
  locationFilters,
  onDateScopeChange,
  onLocationScopeChange,
  meta,
  ariaLabel
}: {
  sportLabel: string;
  dateScope: string;
  locationScope: string;
  locationFilters: SportLocationFilter[];
  onDateScopeChange: (value: string) => void;
  onLocationScopeChange: (value: string) => void;
  meta?: string[];
  ariaLabel: string;
}) {
  const dateLabel = DEFAULT_DATE_SCOPE_FILTERS.find((filter) => filter.value === dateScope)?.label || "All";
  const locationLabel = locationFilters.find((filter) => filter.value === locationScope)?.label || "All";
  return (
    <section className="agtest-subbar football-scope-filterbar" aria-label={ariaLabel}>
      <div className="agtest-filter-stack">
        <nav aria-label={ariaLabel}>
          {DEFAULT_DATE_SCOPE_FILTERS.map((filter) => (
            <button className={dateScope === filter.value ? "active" : ""} key={filter.value} type="button" onClick={() => onDateScopeChange(filter.value)}>
              {filter.label}
            </button>
          ))}
          <span className="agtest-filter-crumb">/</span>
          {locationFilters.map((filter) => (
            <button className={locationScope === filter.value ? "active" : ""} key={filter.value} type="button" onClick={() => onLocationScopeChange(filter.value)}>
              {filter.label}
            </button>
          ))}
        </nav>
      </div>
      <div>
        <span>{["SportsEdge", sportLabel, dateLabel, locationScope !== "all" ? locationLabel : ""].filter(Boolean).join(" / ")}</span>
        {(meta || []).map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>
  );
}

export function SportNewsRail({ label, news, loading }: { label: string; news: NewsItem[]; loading: boolean }) {
  return (
    <aside className="sport-summary-news" aria-label={`${label} news`}>
      <header>
        <span>News</span>
        <strong>{news.length}</strong>
      </header>
      {news.slice(0, 14).map((item) => (
        <article key={item.id || `${item.title}-${item.published_at}`}>
          <div><span>{newsTime(item)}</span><strong>{newsTag(item)}</strong></div>
          <h3>{newsHeadline(item)}</h3>
          <p>{newsImpact(item)}</p>
        </article>
      ))}
      {!loading && news.length === 0 && <p className="sport-summary-empty">No news returned for {label} yet.</p>}
      {loading && news.length === 0 && <p className="sport-summary-empty">Loading news.</p>}
    </aside>
  );
}
