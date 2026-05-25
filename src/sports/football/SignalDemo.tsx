import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Lock, Radio, ShieldCheck, Zap } from "lucide-react";
import { TerminalTopbar } from "../../app/TerminalTopbar";

type OutcomeKey = "home" | "draw" | "away";

type SignalOutcome = {
  key: OutcomeKey;
  label: string;
  baseFlow: number;
  baseBias: number;
  baseConfidence: number;
  direction: "inflow" | "outflow" | "flat";
};

type SignalMarket = {
  id: string;
  kickoff: string;
  fixture: string;
  competition: string;
  liquidityBand: "Deep" | "Good" | "Thin";
  coverage: number;
  alert: string;
  badges: string[];
  outcomes: SignalOutcome[];
};

const SIGNAL_MARKETS: SignalMarket[] = [
  {
    id: "ars-che",
    kickoff: "20:00",
    fixture: "Arsenal v Chelsea",
    competition: "Premier League",
    liquidityBand: "Deep",
    coverage: 6,
    alert: "Home pressure",
    badges: ["fresh", "watch"],
    outcomes: [
      { key: "home", label: "Arsenal", baseFlow: 78, baseBias: 8.6, baseConfidence: 84, direction: "inflow" },
      { key: "draw", label: "Draw", baseFlow: 34, baseBias: -1.8, baseConfidence: 61, direction: "flat" },
      { key: "away", label: "Chelsea", baseFlow: 42, baseBias: -5.9, baseConfidence: 77, direction: "outflow" }
    ]
  },
  {
    id: "liv-tot",
    kickoff: "20:15",
    fixture: "Liverpool v Tottenham",
    competition: "Premier League",
    liquidityBand: "Good",
    coverage: 5,
    alert: "Split market",
    badges: ["conflict", "no action"],
    outcomes: [
      { key: "home", label: "Liverpool", baseFlow: 57, baseBias: 3.1, baseConfidence: 69, direction: "inflow" },
      { key: "draw", label: "Draw", baseFlow: 46, baseBias: 0.4, baseConfidence: 54, direction: "flat" },
      { key: "away", label: "Tottenham", baseFlow: 52, baseBias: -2.2, baseConfidence: 65, direction: "outflow" }
    ]
  },
  {
    id: "mci-new",
    kickoff: "21:00",
    fixture: "Man City v Newcastle",
    competition: "Premier League",
    liquidityBand: "Deep",
    coverage: 7,
    alert: "Sharp move",
    badges: ["fresh", "exec watch"],
    outcomes: [
      { key: "home", label: "Man City", baseFlow: 86, baseBias: 11.4, baseConfidence: 91, direction: "inflow" },
      { key: "draw", label: "Draw", baseFlow: 28, baseBias: -4.7, baseConfidence: 74, direction: "outflow" },
      { key: "away", label: "Newcastle", baseFlow: 31, baseBias: -8.2, baseConfidence: 88, direction: "outflow" }
    ]
  },
  {
    id: "psg-lyo",
    kickoff: "21:15",
    fixture: "PSG v Lyon",
    competition: "Ligue 1",
    liquidityBand: "Good",
    coverage: 4,
    alert: "News linked",
    badges: ["news", "review"],
    outcomes: [
      { key: "home", label: "PSG", baseFlow: 63, baseBias: 5.2, baseConfidence: 72, direction: "inflow" },
      { key: "draw", label: "Draw", baseFlow: 39, baseBias: -1.1, baseConfidence: 58, direction: "flat" },
      { key: "away", label: "Lyon", baseFlow: 49, baseBias: -3.6, baseConfidence: 67, direction: "outflow" }
    ]
  }
];

const TICKER_SIGNAL_MARKETS: SignalMarket[] = [
  ...SIGNAL_MARKETS,
  {
    id: "bar-atm",
    kickoff: "21:30",
    fixture: "Barcelona v Atletico Madrid",
    competition: "La Liga",
    liquidityBand: "Deep",
    coverage: 6,
    alert: "Away resistance",
    badges: ["conflict", "review"],
    outcomes: [
      { key: "home", label: "Barcelona", baseFlow: 54, baseBias: 1.7, baseConfidence: 63, direction: "flat" },
      { key: "draw", label: "Draw", baseFlow: 44, baseBias: 0.2, baseConfidence: 57, direction: "flat" },
      { key: "away", label: "Atletico", baseFlow: 61, baseBias: 3.8, baseConfidence: 71, direction: "inflow" }
    ]
  },
  {
    id: "bay-dor",
    kickoff: "21:45",
    fixture: "Bayern Munich v Dortmund",
    competition: "Bundesliga",
    liquidityBand: "Deep",
    coverage: 7,
    alert: "Goal pressure",
    badges: ["fresh", "watch"],
    outcomes: [
      { key: "home", label: "Bayern", baseFlow: 69, baseBias: 6.4, baseConfidence: 80, direction: "inflow" },
      { key: "draw", label: "Draw", baseFlow: 36, baseBias: -2.7, baseConfidence: 66, direction: "outflow" },
      { key: "away", label: "Dortmund", baseFlow: 48, baseBias: -1.4, baseConfidence: 61, direction: "flat" }
    ]
  },
  {
    id: "int-mil",
    kickoff: "22:00",
    fixture: "Inter v Milan",
    competition: "Serie A",
    liquidityBand: "Good",
    coverage: 5,
    alert: "News conflict",
    badges: ["news", "conflict"],
    outcomes: [
      { key: "home", label: "Inter", baseFlow: 51, baseBias: 1.2, baseConfidence: 58, direction: "flat" },
      { key: "draw", label: "Draw", baseFlow: 49, baseBias: 0.7, baseConfidence: 54, direction: "flat" },
      { key: "away", label: "Milan", baseFlow: 56, baseBias: 2.9, baseConfidence: 64, direction: "inflow" }
    ]
  },
  {
    id: "ben-por",
    kickoff: "22:15",
    fixture: "Benfica v Porto",
    competition: "Primeira Liga",
    liquidityBand: "Good",
    coverage: 4,
    alert: "Late steam",
    badges: ["fresh", "exec watch"],
    outcomes: [
      { key: "home", label: "Benfica", baseFlow: 73, baseBias: 7.2, baseConfidence: 82, direction: "inflow" },
      { key: "draw", label: "Draw", baseFlow: 33, baseBias: -2.3, baseConfidence: 63, direction: "outflow" },
      { key: "away", label: "Porto", baseFlow: 41, baseBias: -4.1, baseConfidence: 76, direction: "outflow" }
    ]
  },
  {
    id: "aja-psv",
    kickoff: "22:30",
    fixture: "Ajax v PSV",
    competition: "Eredivisie",
    liquidityBand: "Thin",
    coverage: 3,
    alert: "Thin book",
    badges: ["thin", "wait"],
    outcomes: [
      { key: "home", label: "Ajax", baseFlow: 45, baseBias: -0.8, baseConfidence: 44, direction: "flat" },
      { key: "draw", label: "Draw", baseFlow: 38, baseBias: -1.9, baseConfidence: 42, direction: "flat" },
      { key: "away", label: "PSV", baseFlow: 59, baseBias: 3.6, baseConfidence: 55, direction: "inflow" }
    ]
  },
  {
    id: "cel-ran",
    kickoff: "22:45",
    fixture: "Celtic v Rangers",
    competition: "Premiership",
    liquidityBand: "Good",
    coverage: 5,
    alert: "Derby volatility",
    badges: ["volatile", "review"],
    outcomes: [
      { key: "home", label: "Celtic", baseFlow: 64, baseBias: 4.8, baseConfidence: 68, direction: "inflow" },
      { key: "draw", label: "Draw", baseFlow: 43, baseBias: -0.9, baseConfidence: 51, direction: "flat" },
      { key: "away", label: "Rangers", baseFlow: 53, baseBias: -1.7, baseConfidence: 60, direction: "flat" }
    ]
  },
  {
    id: "rom-laz",
    kickoff: "23:00",
    fixture: "Roma v Lazio",
    competition: "Serie A",
    liquidityBand: "Good",
    coverage: 4,
    alert: "Lineup watch",
    badges: ["news", "watch"],
    outcomes: [
      { key: "home", label: "Roma", baseFlow: 58, baseBias: 3.4, baseConfidence: 65, direction: "inflow" },
      { key: "draw", label: "Draw", baseFlow: 47, baseBias: 0.1, baseConfidence: 49, direction: "flat" },
      { key: "away", label: "Lazio", baseFlow: 44, baseBias: -2.8, baseConfidence: 62, direction: "outflow" }
    ]
  },
  {
    id: "mar-mon",
    kickoff: "23:15",
    fixture: "Marseille v Monaco",
    competition: "Ligue 1",
    liquidityBand: "Good",
    coverage: 4,
    alert: "Away drift",
    badges: ["fresh", "review"],
    outcomes: [
      { key: "home", label: "Marseille", baseFlow: 66, baseBias: 5.1, baseConfidence: 73, direction: "inflow" },
      { key: "draw", label: "Draw", baseFlow: 40, baseBias: -1.6, baseConfidence: 54, direction: "flat" },
      { key: "away", label: "Monaco", baseFlow: 35, baseBias: -5.4, baseConfidence: 70, direction: "outflow" }
    ]
  }
];

const TAPE_ITEMS = [
  { marketId: "ars-che", code: "ARS/CHE", text: "Home pressure", action: "WATCH", score: "+7.8", confidence: "84", tone: "buy" },
  { marketId: "mci-new", code: "MCI/NEW", text: "Sharp move confirmed", action: "EXEC WATCH", score: "+12.1", confidence: "91", tone: "buy" },
  { marketId: "liv-tot", code: "LIV/TOT", text: "Market split", action: "NO ACTION", score: "+2.4", confidence: "48", tone: "hold" },
  { marketId: "psg-lyo", code: "PSG/LYO", text: "Injury news linked", action: "REVIEW", score: "+4.9", confidence: "72", tone: "buy" },
  { marketId: "ars-che", code: "ARS/CHE", text: "Liquidity still deep", action: "WATCH", score: "+8.1", confidence: "86", tone: "buy" },
  { marketId: "mci-new", code: "MCI/NEW", text: "Signal promoted", action: "EXEC WATCH", score: "+13.0", confidence: "93", tone: "buy" },
  { marketId: "liv-tot", code: "LIV/TOT", text: "News conflict", action: "WAIT", score: "-1.2", confidence: "52", tone: "sell" },
  { marketId: "psg-lyo", code: "PSG/LYO", text: "Freshness recovered", action: "REVIEW", score: "+5.3", confidence: "75", tone: "hold" },
  { marketId: "bar-atm", code: "BAR/ATM", text: "Away resistance", action: "REVIEW", score: "+3.8", confidence: "71", tone: "hold" },
  { marketId: "bay-dor", code: "BAY/DOR", text: "Goal pressure", action: "WATCH", score: "+6.4", confidence: "80", tone: "buy" },
  { marketId: "int-mil", code: "INT/MIL", text: "News conflict", action: "WAIT", score: "+2.9", confidence: "64", tone: "hold" },
  { marketId: "ben-por", code: "BEN/POR", text: "Late steam", action: "EXEC WATCH", score: "+7.2", confidence: "82", tone: "buy" },
  { marketId: "aja-psv", code: "AJA/PSV", text: "Thin liquidity", action: "NO ACTION", score: "+3.6", confidence: "55", tone: "sell" },
  { marketId: "cel-ran", code: "CEL/RAN", text: "Derby volatility", action: "REVIEW", score: "+4.8", confidence: "68", tone: "hold" },
  { marketId: "rom-laz", code: "ROM/LAZ", text: "Lineup watch", action: "WATCH", score: "+3.4", confidence: "65", tone: "hold" },
  { marketId: "mar-mon", code: "MAR/MON", text: "Away drift", action: "REVIEW", score: "+5.1", confidence: "73", tone: "buy" }
];

function wave(seed: number, tick: number, width = 7) {
  return Math.sin((tick + seed) / width);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function signed(value: number) {
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function flowLabel(value: number) {
  if (value >= 76) return "Strong inflow";
  if (value >= 58) return "Inflow";
  if (value >= 42) return "Balanced";
  return "Outflow";
}

function SignalDemoExperience({ tickerMode = false }: { tickerMode?: boolean }) {
  const [tick, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState(SIGNAL_MARKETS[0].id);
  const marketSlate = tickerMode ? TICKER_SIGNAL_MARKETS : SIGNAL_MARKETS;

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 900);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(() => marketSlate.map((market, marketIndex) => {
    const outcomes = market.outcomes.map((outcome, outcomeIndex) => {
      const movement = wave(marketIndex * 11 + outcomeIndex * 5, tick);
      const flow = clamp(outcome.baseFlow + movement * 9, 8, 96);
      const bias = clamp(outcome.baseBias + movement * 1.4, -15, 15);
      const confidence = clamp(outcome.baseConfidence + movement * 4, 35, 96);
      return { ...outcome, flow, bias, confidence };
    });
    const lead = [...outcomes].sort((a, b) => b.bias - a.bias)[0];
    return { ...market, outcomes, lead };
  }), [marketSlate, tick]);

  const selected = rows.find((row) => row.id === selectedId) || rows[0];
  const lead = selected.lead;
  const liveTape = [...TAPE_ITEMS.slice(tick % TAPE_ITEMS.length), ...TAPE_ITEMS.slice(0, tick % TAPE_ITEMS.length)];
  const selectedTape = liveTape.filter((item) => item.marketId === selected.id);
  const tickerTape = [...liveTape, ...liveTape, ...liveTape];

  return (
    <>
      <TerminalTopbar
        active={tickerMode ? "signal-ticker-demo" : "signal-demo"}
        searchPlaceholder="Demo: SportsEdge signals, money flow, bias, execution..."
        demoMode
      />
      {tickerMode && (
        <section className="signal-live-strip" aria-label="Global signal ticker">
          <div className="signal-ticker-track">
            {tickerTape.map((item, index) => (
              <button
                className={`signal-ticker-cell ${item.tone}${index === 0 ? " hot" : ""}`}
                key={`${item.code}-${item.text}-${index}`}
                type="button"
                onClick={() => setSelectedId(item.marketId)}
              >
                <strong>{item.code}</strong>
                <b>{item.score}</b>
                <span>{item.action}</span>
                <em>{item.confidence}%</em>
                <i>{item.text}</i>
              </button>
            ))}
          </div>
        </section>
      )}
      <main className="signal-demo-page">
        <section className="signal-demo-hero">
          <div>
            <span className="signal-demo-eyebrow"><Radio size={14} /> SportsEdge Signal Demo</span>
            <h1>Market movement without republishing venue prices.</h1>
            <p>
              Raw provider quotes stay inside the engine. The terminal shows derived flow, bias,
              confidence, freshness and execution intent.
            </p>
          </div>
          <div className="signal-demo-stack" aria-label="Live signal status">
            <div><span>Live Inputs</span><strong>{selected.coverage} venues</strong></div>
            <div><span>Freshness</span><strong>{Math.max(1, 5 - (tick % 5))}s</strong></div>
            <div><span>Signal State</span><strong>{selected.alert}</strong></div>
          </div>
        </section>

        <section className="signal-demo-layout">
          <div className="signal-demo-main">
            <section className="signal-demo-panel">
              <header className="signal-panel-head">
                <div>
                  <span>Client-safe board</span>
                  <strong>Money flow and bias</strong>
                </div>
                <em><Activity size={14} /> moving demo data</em>
              </header>
              <div className="signal-market-table">
                {rows.map((market) => (
                  <button
                    className={market.id === selected.id ? "signal-market-row active" : "signal-market-row"}
                    key={market.id}
                    type="button"
                    onClick={() => setSelectedId(market.id)}
                  >
                    <span>{market.kickoff}</span>
                    <strong>{market.fixture}<small>{market.competition}</small></strong>
                    <b>{market.lead.label}</b>
                    <i>{signed(market.lead.bias)}</i>
                    <em>{Math.round(market.lead.confidence)}%</em>
                    <span>{market.liquidityBand}</span>
                    <div className="signal-market-badges">
                      {market.badges.map((badge) => <mark key={badge}>{badge}</mark>)}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="signal-demo-panel">
              <header className="signal-panel-head">
                <div>
                  <span>{selected.fixture}</span>
                  <strong>Outcome intelligence</strong>
                </div>
                <em><Zap size={14} /> {selected.coverage} source coverage</em>
              </header>
              <div className="signal-outcome-grid">
                {selected.outcomes.map((outcome) => (
                  <article className={`signal-outcome-card ${outcome.direction}`} key={outcome.key}>
                    <header>
                      <strong>{outcome.label}</strong>
                      <span>{flowLabel(outcome.flow)}</span>
                    </header>
                    <div className="signal-flow-meter">
                      <span style={{ width: `${outcome.flow}%` }} />
                    </div>
                    <footer>
                      <div><span>Bias</span><strong>{signed(outcome.bias)}</strong></div>
                      <div><span>Confidence</span><strong>{Math.round(outcome.confidence)}%</strong></div>
                      <div><span>Momentum</span><strong>{outcome.direction}</strong></div>
                    </footer>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="signal-demo-side">
            <section className="signal-demo-panel signal-policy-panel">
              <header className="signal-panel-head">
                <div>
                  <span>Rights wall</span>
                  <strong>Bloomberg-style controls</strong>
                </div>
                <ShieldCheck size={16} />
              </header>
              {[
                ["Raw venue feed", "Internal Redis only", "locked"],
                ["Client terminal", "Derived SportsEdge signal", "safe"],
                ["Provider names", "Hidden unless licensed", "locked"],
                ["Execution", "User-confirmed ticket", "safe"]
              ].map(([label, value, tone]) => (
                <div className={`signal-policy-row ${tone}`} key={label}>
                  <Lock size={14} />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </section>

            <section className="signal-demo-panel signal-ticket">
              <header className="signal-panel-head">
                <div>
                  <span>Controlled execution</span>
                  <strong>Trade intent ticket</strong>
                </div>
                {lead.bias >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              </header>
              <div className="signal-ticket-body">
                <span>{selected.fixture}</span>
                <strong>{lead.label}</strong>
                <div><span>Signal</span><b>{signed(lead.bias)}</b></div>
                <div><span>Confidence</span><b>{Math.round(lead.confidence)}%</b></div>
                <div><span>Liquidity</span><b>{selected.liquidityBand}</b></div>
                <button type="button">Open execution ticket</button>
                <p>Exact executable terms only appear after user intent and account permission.</p>
              </div>
            </section>

            <section className="signal-demo-panel signal-tape">
              <header className="signal-panel-head">
                <div>
                  <span>{tickerMode ? selected.fixture : "Live tape"}</span>
                  <strong>{tickerMode ? "Selected transcript" : "What makes it feel alive"}</strong>
                </div>
              </header>
              {(tickerMode ? selectedTape : liveTape).slice(0, 5).map((item, index) => (
                <div className={index === 0 ? "signal-tape-item hot" : "signal-tape-item"} key={`${item.code}-${item.text}-${index}`}>
                  <i />
                  <span>{item.code}: {item.action} / {item.text}</span>
                </div>
              ))}
            </section>
          </aside>
        </section>
      </main>
    </>
  );
}

export function SignalTickerDemo() {
  return <SignalDemoExperience tickerMode />;
}

export default function SignalDemo() {
  return <SignalDemoExperience />;
}
