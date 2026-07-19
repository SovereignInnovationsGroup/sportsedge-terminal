import { Activity, Pause, Play, RefreshCw, Square, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { formatExchangeMoney, localEventTime } from "../../core/format";

type FlowGridLevel = {
  price: number;
  cents: number;
  size: number;
};

type FlowGridBook = {
  timestamp?: string | null;
  bids: FlowGridLevel[];
  asks: FlowGridLevel[];
};

type FlowGridLeg = {
  key: string;
  label: string;
  question: string;
  marketSlug: string;
  tokenId: string;
  bidCents: number;
  askCents: number;
  topBidSize?: number;
  topAskSize?: number;
  liquidityUsd: number;
  volumeUsd: number;
  book?: FlowGridBook | null;
};

type FlowGridEvent = {
  id: string;
  slug: string;
  exchange: string;
  sport: string;
  title: string;
  marketFamily?: string;
  eventUrl: string;
  startAt: string | null;
  endAt: string | null;
  active: boolean;
  closed: boolean;
  liquidityUsd: number;
  volumeUsd: number;
  outcomeCount: number;
  bidSumCents: number;
  askSumCents: number;
  basketSpreadCents: number;
  legs: FlowGridLeg[];
};

type FlowGridSettings = {
  stakeUsdPerLevel: number;
  levelSpacingCents: number;
  virtualLevelsPerOutcome: number;
  maxNewLevelsPerTick: number;
  maxEpochCostUsd: number;
  maxEventCostUsd: number;
  takeProfitUsd: number;
  reloadCooldownMs: number;
  maxQuoteAgeMs: number;
};

type FlowGridSession = {
  id: string;
  status: string;
  exchange: string;
  sport: string;
  event: FlowGridEvent;
  settings: FlowGridSettings;
  exposure: {
    theoreticalFullGridUsd: number;
    maxEventExposureUsd: number;
    maxEpochExposureUsd: number;
    maxNewFillUsdPerTick: number;
  };
  createdAt: string;
  updatedAt: string;
  executor?: { ok?: boolean; detail?: string; payload?: Record<string, unknown> } | null;
  pnlUsd?: number;
  openPnlUsd?: number;
  realizedPnlUsd?: number;
};

type FlowGridWallet = {
  at?: string;
  balance?: number;
  allowance?: number;
  openOrders?: number;
  signer?: string;
  funder?: string;
  error?: string;
};

const DEFAULT_SETTINGS: FlowGridSettings = {
  stakeUsdPerLevel: 5,
  levelSpacingCents: 1,
  virtualLevelsPerOutcome: 40,
  maxNewLevelsPerTick: 2,
  maxEpochCostUsd: 25,
  maxEventCostUsd: 75,
  takeProfitUsd: 0.25,
  reloadCooldownMs: 750,
  maxQuoteAgeMs: 500
};

const SPORTS = [
  { label: "All", value: "all" },
  { label: "Football", value: "football" },
  { label: "Tennis", value: "tennis" },
  { label: "Basketball", value: "basketball" },
  { label: "Baseball", value: "baseball" },
  { label: "Hockey", value: "hockey" },
  { label: "Cricket", value: "cricket" }
];

const DATE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "Next 7 Days", value: "next7" }
] as const;

type DateFilter = typeof DATE_FILTERS[number]["value"];

function money(value: number | undefined | null) {
  return formatExchangeMoney(Number(value || 0), "USD");
}

function signedMoney(value: number | undefined | null) {
  const amount = Number(value || 0);
  if (Math.abs(amount) < 0.000001) return "$0";
  const formatted = money(Math.abs(amount));
  return amount > 0 ? `+${formatted}` : `-${formatted}`;
}

function centsLabel(value: number | undefined | null) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "-";
  return `${Number.isInteger(amount) ? amount : amount.toFixed(1)}c`;
}

function compactLegLabel(leg: FlowGridLeg) {
  return `${leg.label} ${centsLabel(leg.bidCents)}/${centsLabel(leg.askCents)}`;
}

function marketFamilyLabel(event: FlowGridEvent) {
  return String(event.marketFamily || "").trim().toUpperCase();
}

function sportLabel(value: string | null | undefined) {
  return String(value || "unknown").replace(/-/g, " ").toUpperCase();
}

function eventDate(event: FlowGridEvent) {
  const raw = event.endAt || event.startAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function matchesDateFilter(event: FlowGridEvent, filter: DateFilter, now = new Date()) {
  if (filter === "all") return true;
  const date = eventDate(event);
  if (!date) return false;
  const today = dayKey(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = dayKey(tomorrowDate);
  const eventKey = dayKey(date);
  if (filter === "today") return eventKey === today;
  if (filter === "tomorrow") return eventKey === tomorrow;
  const sevenDays = new Date(now);
  sevenDays.setDate(sevenDays.getDate() + 7);
  return date.getTime() >= now.getTime() && date.getTime() <= sevenDays.getTime();
}

function eventRangeQuery(filter: DateFilter) {
  if (filter === "all") return "";
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(start);
  const to = new Date(start);
  if (filter === "tomorrow") {
    from.setDate(from.getDate() + 1);
    to.setDate(to.getDate() + 2);
  } else if (filter === "next7") {
    to.setDate(to.getDate() + 7);
  } else {
    to.setDate(to.getDate() + 1);
  }
  return `&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
}

function numericValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sessionPnl(session: FlowGridSession) {
  const source = session as FlowGridSession & {
    raw?: Record<string, unknown>;
    executor?: { payload?: Record<string, unknown> } | null;
  };
  return numericValue(source.pnlUsd)
    ?? numericValue(source.openPnlUsd)
    ?? numericValue(source.realizedPnlUsd)
    ?? numericValue(source.raw?.pnlUsd)
    ?? numericValue(source.executor?.payload?.pnlUsd)
    ?? 0;
}

function timeLabel(value: string | null | undefined) {
  if (!value) return "-";
  return localEventTime(value, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function sessionForEvent(sessions: FlowGridSession[], event: FlowGridEvent) {
  return sessions.find((session) => session.event?.slug === event.slug || session.event?.id === event.id) || null;
}

function previewExposure(event: FlowGridEvent, settings: FlowGridSettings) {
  const theoreticalFullGridUsd = event.outcomeCount * settings.virtualLevelsPerOutcome * settings.stakeUsdPerLevel;
  const maxEventExposureUsd = Math.min(settings.maxEventCostUsd, theoreticalFullGridUsd);
  const maxEpochExposureUsd = Math.min(settings.maxEpochCostUsd, maxEventExposureUsd);
  return {
    theoreticalFullGridUsd,
    maxEventExposureUsd,
    maxEpochExposureUsd,
    maxNewFillUsdPerTick: settings.stakeUsdPerLevel * settings.maxNewLevelsPerTick
  };
}

function gridLevels(leg: FlowGridLeg, settings: FlowGridSettings) {
  const baseline = Number(leg.askCents || 0);
  return Array.from({ length: settings.virtualLevelsPerOutcome }, (_, index) => (
    Math.min(99, baseline + settings.levelSpacingCents * (index + 1))
  ));
}

async function jsonFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || payload.error || "Flow Grid API failed");
  return payload as T;
}

async function loadEvents(sport: string, dateFilter: DateFilter) {
  const payload = await jsonFetch<{ events: FlowGridEvent[] }>(
    `/api/flow-grid/events?sport=${encodeURIComponent(sport)}&limit=50&books=1&date=${encodeURIComponent(dateFilter)}${eventRangeQuery(dateFilter)}`
  );
  return payload.events || [];
}

async function resolveEvent(input: string, sport: string) {
  const payload = await jsonFetch<{ event: FlowGridEvent }>(`/api/flow-grid/events/resolve?id=${encodeURIComponent(input)}&sport=${encodeURIComponent(sport)}&idType=slug`);
  return payload.event;
}

async function loadSessions() {
  return jsonFetch<{ executorConfigured: boolean; sessions: FlowGridSession[] }>("/api/flow-grid/sessions");
}

async function loadWallet() {
  return jsonFetch<{ executorConfigured: boolean; wallet: FlowGridWallet | null; executor?: { detail?: string } | null }>("/api/flow-grid/wallet");
}

async function startGrid(event: FlowGridEvent, settings: FlowGridSettings) {
  return jsonFetch<{ session: FlowGridSession }>("/api/flow-grid/grids/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventId: event.slug || event.id,
      idType: event.slug ? "slug" : "id",
      sport: event.sport,
      exchange: event.exchange,
      settings
    })
  });
}

async function gridAction(sessionId: string, action: "pause" | "stop" | "flatten") {
  return jsonFetch<{ session: FlowGridSession }>(`/api/flow-grid/grids/${encodeURIComponent(sessionId)}/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json" }
  });
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  return (
    <span className={[
      "flow-grid-pill",
      normalized.includes("armed") || normalized.includes("trading") || normalized.includes("arming") ? "live" : "",
      normalized.includes("control") || normalized.includes("request") ? "warn" : ""
    ].filter(Boolean).join(" ")}>
      {status || "idle"}
    </span>
  );
}

function EventDetail({
  event,
  settings,
  session,
  onClose
}: {
  event: FlowGridEvent;
  settings: FlowGridSettings;
  session: FlowGridSession | null;
  onClose: () => void;
}) {
  const exposure = previewExposure(event, settings);
  return (
    <div className="flow-grid-detail" role="dialog" aria-label={`${event.title} flow grid detail`}>
      <header>
        <div>
          <span>{event.exchange.toUpperCase()} / {event.sport.toUpperCase()}</span>
          <strong>{event.title}</strong>
          <small>{timeLabel(event.endAt || event.startAt)} / {marketFamilyLabel(event) || `${event.outcomeCount} legs`} / spread {centsLabel(event.basketSpreadCents)}</small>
        </div>
        <div className="flow-grid-detail-actions">
          {session && <StatusPill status={session.status} />}
          <a href={event.eventUrl} target="_blank" rel="noreferrer">Open market</a>
          <button type="button" className="flow-grid-icon-button" aria-label="Close grid detail" onClick={onClose}><X size={16} /></button>
        </div>
      </header>

      <section className="flow-grid-detail-kpis">
        <article><span>Full virtual</span><strong>{money(exposure.theoreticalFullGridUsd)}</strong></article>
        <article><span>Event cap</span><strong>{money(exposure.maxEventExposureUsd)}</strong></article>
        <article><span>Epoch cap</span><strong>{money(exposure.maxEpochExposureUsd)}</strong></article>
        <article><span>Per tick</span><strong>{money(exposure.maxNewFillUsdPerTick)}</strong></article>
        <article><span>Basket bid</span><strong>{centsLabel(event.bidSumCents)}</strong></article>
        <article><span>Basket ask</span><strong>{centsLabel(event.askSumCents)}</strong></article>
      </section>

      <section className="flow-grid-ladder-grid">
        {event.legs.map((leg) => {
          const levels = gridLevels(leg, settings);
          return (
            <article className="flow-grid-leg-ladder" key={leg.key}>
              <div className="flow-grid-leg-head">
                <span>{leg.label}</span>
                <strong>{centsLabel(leg.bidCents)} / {centsLabel(leg.askCents)}</strong>
              </div>
              <div className="flow-grid-book-strip">
                <span>Bid {Number(leg.topBidSize || 0).toLocaleString()}</span>
                <span>Ask {Number(leg.topAskSize || 0).toLocaleString()}</span>
                <span>{money(leg.liquidityUsd)}</span>
              </div>
              <div className="flow-grid-levels">
                {levels.slice(0, 40).map((level, index) => (
                  <span key={`${leg.key}:${level}:${index}`}>{centsLabel(level)}</span>
                ))}
              </div>
              <div className="flow-grid-book-depth">
                <div>
                  <strong>Bids</strong>
                  {(leg.book?.bids || []).slice(0, 10).map((level) => <span key={`b:${level.cents}:${level.size}`}>{centsLabel(level.cents)} / {Math.round(level.size).toLocaleString()}</span>)}
                </div>
                <div>
                  <strong>Asks</strong>
                  {(leg.book?.asks || []).slice(0, 10).map((level) => <span key={`a:${level.cents}:${level.size}`}>{centsLabel(level.cents)} / {Math.round(level.size).toLocaleString()}</span>)}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="flow-grid-orders-panel">
        <div className="flow-grid-section-head">
          <span>Orders / epochs</span>
          <strong>{session?.id || "No active session"}</strong>
        </div>
        <table>
          <thead>
            <tr><th>State</th><th>Created</th><th>Updated</th><th>Executor</th><th>Event Cap</th><th>Epoch Cap</th></tr>
          </thead>
          <tbody>
            {session ? (
              <tr>
                <td><StatusPill status={session.status} /></td>
                <td>{timeLabel(session.createdAt)}</td>
                <td>{timeLabel(session.updatedAt)}</td>
                <td>{session.executor?.ok ? "Ireland accepted" : session.executor?.detail || "pending"}</td>
                <td>{money(session.exposure?.maxEventExposureUsd)}</td>
                <td>{money(session.exposure?.maxEpochExposureUsd)}</td>
              </tr>
            ) : (
              <tr><td colSpan={6}>No session has been started for this event.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default function FlowGrid() {
  const [sport, setSport] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [events, setEvents] = useState<FlowGridEvent[]>([]);
  const [sessions, setSessions] = useState<FlowGridSession[]>([]);
  const [wallet, setWallet] = useState<FlowGridWallet | null>(null);
  const [walletError, setWalletError] = useState("");
  const [executorConfigured, setExecutorConfigured] = useState(false);
  const [settings, setSettings] = useState<FlowGridSettings>(DEFAULT_SETTINGS);
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set());
  const [selectedSlug, setSelectedSlug] = useState("");
  const [detailSlug, setDetailSlug] = useState("");
  const [manualEvent, setManualEvent] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const detailEvent = useMemo(() => (
    events.find((event) => event.slug === detailSlug || event.id === detailSlug)
    || sessions.find((session) => session.event?.slug === detailSlug || session.event?.id === detailSlug)?.event
    || null
  ), [events, sessions, detailSlug]);

  async function refreshEvents(nextSport = sport, nextDateFilter = dateFilter) {
    setBusy("refresh");
    try {
      const next = await loadEvents(nextSport, nextDateFilter);
      setEvents(next);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flow Grid events failed");
    } finally {
      setBusy("");
    }
  }

  async function refreshSessions() {
    try {
      const payload = await loadSessions();
      setSessions(payload.sessions || []);
      setExecutorConfigured(Boolean(payload.executorConfigured));
    } catch {
      setSessions([]);
    }
  }

  async function refreshWallet() {
    try {
      const payload = await loadWallet();
      setWallet(payload.wallet || null);
      setWalletError(payload.executor?.detail || "");
      if (payload.executorConfigured) setExecutorConfigured(true);
    } catch (err) {
      setWallet(null);
      setWalletError(err instanceof Error ? err.message : "Wallet unavailable");
    }
  }

  async function addManualEvent() {
    if (!manualEvent.trim()) return;
    setBusy("manual");
    try {
      const event = await resolveEvent(manualEvent.trim(), sport);
      setEvents((current) => [event, ...current.filter((item) => item.slug !== event.slug)]);
      setSelectedSlug(event.slug || event.id);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Event resolve failed");
    } finally {
      setBusy("");
    }
  }

  async function startEvent(event: FlowGridEvent) {
    setBusy(`start:${event.slug || event.id}`);
    try {
      const result = await startGrid(event, settings);
      setSessions((current) => [result.session, ...current.filter((item) => item.id !== result.session.id)]);
      setEnabled((current) => new Set(current).add(event.slug || event.id));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Start grid failed");
    } finally {
      setBusy("");
    }
  }

  async function sendAction(session: FlowGridSession, action: "pause" | "stop" | "flatten") {
    setBusy(`${action}:${session.id}`);
    try {
      const result = await gridAction(session.id, action);
      setSessions((current) => current.map((item) => item.id === result.session.id ? result.session : item));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Grid action failed");
    } finally {
      setBusy("");
    }
  }

  function toggleEvent(key: string) {
    setEnabled((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    refreshEvents("all", "all");
    refreshSessions();
    refreshWallet();
    const timer = window.setInterval(() => {
      refreshSessions();
      refreshWallet();
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleEvents = useMemo(
    () => events.filter((event) => matchesDateFilter(event, dateFilter)),
    [events, dateFilter]
  );

  const totals = visibleEvents.reduce((acc, event) => {
    const exposure = previewExposure(event, settings);
    acc.liquidity += Number(event.liquidityUsd || 0);
    if (enabled.has(event.slug || event.id)) {
      acc.enabledExposure += exposure.maxEventExposureUsd;
      acc.enabledCount += 1;
    }
    return acc;
  }, { liquidity: 0, enabledExposure: 0, enabledCount: 0 });

  return (
    <div className="terminal-shell">
      <TerminalTopbar active="flow-grid" searchPlaceholder="Flow Grid: event, sport, market..." />
      <main className="terminal-content flow-grid-screen">
        <section className="flow-grid-summary">
          <article><span>Executor</span><strong className={executorConfigured ? "positive" : "warning"}>{executorConfigured ? "Ireland linked" : "Control only"}</strong></article>
          <article><span>Wallet</span><strong className={wallet?.balance != null ? "positive" : "warning"}>{wallet?.balance != null ? money(wallet.balance) : "Unavailable"}</strong><small>{wallet?.openOrders != null ? `${wallet.openOrders} open orders` : walletError || "No wallet feed"}</small></article>
          <article><span>Events</span><strong>{visibleEvents.length}</strong><small>{events.length} loaded</small></article>
          <article><span>Enabled exposure</span><strong>{money(totals.enabledExposure)}</strong><small>{totals.enabledCount} enabled</small></article>
          <article><span>Visible liquidity</span><strong>{money(totals.liquidity)}</strong></article>
          <article><span>Open grids</span><strong>{sessions.length}</strong></article>
        </section>

        <section className="flow-grid-controls">
          <div className="flow-grid-filterbar">
            <nav aria-label="Flow grid date filter">
              {DATE_FILTERS.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={dateFilter === item.value ? "active" : ""}
                  onClick={() => { setDateFilter(item.value); refreshEvents(sport, item.value); }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <span>/</span>
            <nav aria-label="Flow grid sport filter">
              {SPORTS.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={sport === item.value ? "active" : ""}
                  onClick={() => { setSport(item.value); refreshEvents(item.value, dateFilter); }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flow-grid-control-group">
            <label>Event slug
              <input value={manualEvent} onChange={(event) => setManualEvent(event.target.value)} placeholder="event slug or market URL" />
            </label>
            <button type="button" onClick={addManualEvent} disabled={busy === "manual"}><Activity size={14} /> Add</button>
            <button type="button" onClick={() => refreshEvents(sport, dateFilter)} disabled={busy === "refresh"}><RefreshCw size={14} /> Refresh</button>
          </div>
          <div className="flow-grid-control-group numeric">
            <label>Stake <input type="number" min="1" value={settings.stakeUsdPerLevel} onChange={(event) => setSettings({ ...settings, stakeUsdPerLevel: Number(event.target.value) })} /></label>
            <label>Levels <input type="number" min="1" max="99" value={settings.virtualLevelsPerOutcome} onChange={(event) => setSettings({ ...settings, virtualLevelsPerOutcome: Number(event.target.value) })} /></label>
            <label>Spacing <input type="number" min="0.5" step="0.5" value={settings.levelSpacingCents} onChange={(event) => setSettings({ ...settings, levelSpacingCents: Number(event.target.value) })} /></label>
            <label>Epoch <input type="number" min="1" value={settings.maxEpochCostUsd} onChange={(event) => setSettings({ ...settings, maxEpochCostUsd: Number(event.target.value) })} /></label>
            <label>Event <input type="number" min="1" value={settings.maxEventCostUsd} onChange={(event) => setSettings({ ...settings, maxEventCostUsd: Number(event.target.value) })} /></label>
            <label>TP <input type="number" min="0.01" step="0.01" value={settings.takeProfitUsd} onChange={(event) => setSettings({ ...settings, takeProfitUsd: Number(event.target.value) })} /></label>
          </div>
        </section>

        {error && <section className="flow-grid-error">{error}</section>}

        <section className="flow-grid-table-panel sessions">
          <div className="flow-grid-section-head">
            <span>Open orders / grids</span>
            <strong>{sessions.length} tracked / P&L live when executor reports fills</strong>
          </div>
          <table>
            <thead>
              <tr><th>State</th><th>Sport</th><th>Event</th><th>Created</th><th>Event Cap</th><th>Epoch Cap</th><th>P&L</th><th>Executor</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const pnl = sessionPnl(session);
                return (
                  <tr key={session.id} onDoubleClick={() => setDetailSlug(session.event?.slug || session.event?.id || "")}>
                    <td><StatusPill status={session.status} /></td>
                    <td><span className="flow-grid-sport-cell">{sportLabel(session.event?.sport || session.sport)}</span></td>
                    <td><strong>{session.event?.title || session.id}</strong><small>{session.id}</small></td>
                    <td>{timeLabel(session.createdAt)}</td>
                    <td>{money(session.exposure?.maxEventExposureUsd)}</td>
                    <td>{money(session.exposure?.maxEpochExposureUsd)}</td>
                    <td className={pnl >= 0 ? "positive" : "negative"}>{signedMoney(pnl)}</td>
                    <td>{session.executor?.ok ? "Ireland accepted" : session.executor?.detail || "pending"}</td>
                    <td className="flow-grid-row-actions">
                      <button type="button" onClick={() => sendAction(session, "flatten")}><Square size={13} /> Flat</button>
                      <button type="button" onClick={() => sendAction(session, "stop")}><X size={13} /> Stop</button>
                    </td>
                  </tr>
                );
              })}
              {!sessions.length && <tr><td colSpan={9}>No open grid orders.</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="flow-grid-table-panel">
          <div className="flow-grid-section-head">
            <span>Supported events</span>
            <strong>{sport.toUpperCase()} / PREDICTIVE VENUES</strong>
          </div>
          <table>
            <colgroup>
              <col className="flow-grid-col-enable" />
              <col className="flow-grid-col-sport" />
              <col className="flow-grid-col-event" />
              <col className="flow-grid-col-time" />
              <col className="flow-grid-col-legs" />
              <col className="flow-grid-col-money" />
              <col className="flow-grid-col-book" />
              <col className="flow-grid-col-money" />
              <col className="flow-grid-col-money" />
              <col className="flow-grid-col-money" />
              <col className="flow-grid-col-status" />
              <col className="flow-grid-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>Enable</th><th>Sport</th><th>Event</th><th>Time</th><th>Legs</th><th>Liquidity</th><th>Basket</th><th>Full Grid</th><th>Event Cap</th><th>Epoch</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map((event) => {
                const key = event.slug || event.id;
                const checked = enabled.has(key);
                const exposure = previewExposure(event, settings);
                const session = sessionForEvent(sessions, event);
                return (
                  <tr
                    key={key}
                    className={selectedSlug === key ? "selected" : ""}
                    onClick={() => setSelectedSlug(key)}
                    onDoubleClick={() => { setSelectedSlug(key); setDetailSlug(key); }}
                  >
                    <td>
                      <button
                        type="button"
                        className={`flow-grid-enable-button ${checked ? "active" : ""}`}
                        onClick={(click) => { click.stopPropagation(); toggleEvent(key); }}
                      >
                        {checked ? `On ${money(exposure.maxEventExposureUsd)}` : "Enable"}
                      </button>
                    </td>
                    <td><span className="flow-grid-sport-cell">{sportLabel(event.sport)}</span></td>
                    <td><strong title={event.title}>{event.title}</strong>{marketFamilyLabel(event) && <span className="flow-grid-market-kind">{marketFamilyLabel(event)}</span>}</td>
                    <td>{timeLabel(event.endAt || event.startAt)}</td>
                    <td>
                      <div className="flow-grid-leg-strip" title={event.legs.map(compactLegLabel).join(" / ")}>
                        {event.legs.map((leg) => <span className="flow-grid-leg-chip" key={leg.key}>{compactLegLabel(leg)}</span>)}
                      </div>
                    </td>
                    <td>{money(event.liquidityUsd)}</td>
                    <td>Bid {centsLabel(event.bidSumCents)} / Ask {centsLabel(event.askSumCents)} ({centsLabel(event.basketSpreadCents)})</td>
                    <td>{money(exposure.theoreticalFullGridUsd)}</td>
                    <td>{money(exposure.maxEventExposureUsd)}</td>
                    <td>{money(exposure.maxEpochExposureUsd)}</td>
                    <td>{session ? <StatusPill status={session.status} /> : checked ? <span className="flow-grid-exposure-note">Cost {money(exposure.maxEventExposureUsd)} / epoch {money(exposure.maxEpochExposureUsd)}</span> : <StatusPill status="idle" />}</td>
                    <td className="flow-grid-row-actions">
                      <button type="button" disabled={!checked || busy === `start:${key}`} onClick={(click) => { click.stopPropagation(); startEvent(event); }}><Play size={13} /> Start</button>
                      {session && <button type="button" onClick={(click) => { click.stopPropagation(); sendAction(session, "pause"); }}><Pause size={13} /> Pause</button>}
                      {session && <button type="button" onClick={(click) => { click.stopPropagation(); sendAction(session, "flatten"); }}><Square size={13} /> Flat</button>}
                    </td>
                  </tr>
                );
              })}
              {!visibleEvents.length && <tr><td colSpan={12}>No supported events match this filter.</td></tr>}
            </tbody>
          </table>
        </section>
      </main>
      {detailEvent && (
        <EventDetail
          event={detailEvent}
          settings={settings}
          session={sessionForEvent(sessions, detailEvent)}
          onClose={() => setDetailSlug("")}
        />
      )}
    </div>
  );
}
