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
    outcomes: [
      { key: "home", label: "PSG", baseFlow: 63, baseBias: 5.2, baseConfidence: 72, direction: "inflow" },
      { key: "draw", label: "Draw", baseFlow: 39, baseBias: -1.1, baseConfidence: 58, direction: "flat" },
      { key: "away", label: "Lyon", baseFlow: 49, baseBias: -3.6, baseConfidence: 67, direction: "outflow" }
    ]
  }
];

const TAPE_ITEMS = [
  "ARS/CHE: home-side money flow refreshed across 6 venues",
  "MCI/NEW: sharp pressure confirmed, confidence lifted",
  "LIV/TOT: market still split, no execution bias promoted",
  "PSG/LYO: injury news linked to home momentum",
  "ARS/CHE: liquidity band remains deep after flow spike"
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

export default function SignalDemo() {
  const [tick, setTick] = useState(0);
  const [selectedId, setSelectedId] = useState(SIGNAL_MARKETS[0].id);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 900);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(() => SIGNAL_MARKETS.map((market, marketIndex) => {
    const outcomes = market.outcomes.map((outcome, outcomeIndex) => {
      const movement = wave(marketIndex * 11 + outcomeIndex * 5, tick);
      const flow = clamp(outcome.baseFlow + movement * 9, 8, 96);
      const bias = clamp(outcome.baseBias + movement * 1.4, -15, 15);
      const confidence = clamp(outcome.baseConfidence + movement * 4, 35, 96);
      return { ...outcome, flow, bias, confidence };
    });
    const lead = [...outcomes].sort((a, b) => b.bias - a.bias)[0];
    return { ...market, outcomes, lead };
  }), [tick]);

  const selected = rows.find((row) => row.id === selectedId) || rows[0];
  const lead = selected.lead;
  const liveTape = [...TAPE_ITEMS.slice(tick % TAPE_ITEMS.length), ...TAPE_ITEMS.slice(0, tick % TAPE_ITEMS.length)];

  return (
    <>
      <TerminalTopbar
        active="signal-demo"
        searchPlaceholder="Demo: SportsEdge signals, money flow, bias, execution..."
        demoMode
      />
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
                    <mark>{market.alert}</mark>
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
                  <span>Live tape</span>
                  <strong>What makes it feel alive</strong>
                </div>
              </header>
              {liveTape.slice(0, 5).map((item, index) => (
                <div className={index === 0 ? "signal-tape-item hot" : "signal-tape-item"} key={`${item}-${index}`}>
                  <i />
                  <span>{item}</span>
                </div>
              ))}
            </section>
          </aside>
        </section>
      </main>
    </>
  );
}
