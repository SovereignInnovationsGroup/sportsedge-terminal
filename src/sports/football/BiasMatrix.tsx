import { useEffect, useMemo, useState } from "react";
import { Activity, Gauge, ShieldCheck } from "lucide-react";
import { TerminalTopbar } from "../../app/TerminalTopbar";
import { normalizeFixtureText } from "../../core/format";

type Alignment = "High" | "Medium" | "Low" | "Conflict";
type Action = "Watch" | "Review" | "Wait" | "No action" | "Exec watch";

type SignalAlignmentRow = {
  id: string;
  kickoff: string;
  match: string;
  competition: string;
  marketBias: number;
  moneyFlow: "Strong home" | "Home" | "Balanced" | "Away" | "Strong away";
  newsBias: "Home" | "Away" | "Neutral" | "Conflict";
  modelBias: "Home" | "Away" | "Neutral";
  alignment: Alignment;
  confidence: number;
  action: Action;
};

const DEMO_ROWS: SignalAlignmentRow[] = [
  { id: "ars-che", kickoff: "20:00", match: "Arsenal v Chelsea", competition: "Premier League", marketBias: 7.4, moneyFlow: "Strong home", newsBias: "Neutral", modelBias: "Home", alignment: "High", confidence: 84, action: "Watch" },
  { id: "liv-tot", kickoff: "20:15", match: "Liverpool v Tottenham", competition: "Premier League", marketBias: 1.2, moneyFlow: "Balanced", newsBias: "Conflict", modelBias: "Neutral", alignment: "Low", confidence: 48, action: "No action" },
  { id: "mci-new", kickoff: "21:00", match: "Man City v Newcastle", competition: "Premier League", marketBias: 12.1, moneyFlow: "Strong home", newsBias: "Home", modelBias: "Home", alignment: "High", confidence: 91, action: "Exec watch" },
  { id: "psg-lyo", kickoff: "21:15", match: "PSG v Lyon", competition: "Ligue 1", marketBias: 4.9, moneyFlow: "Home", newsBias: "Home", modelBias: "Home", alignment: "Medium", confidence: 72, action: "Review" },
  { id: "bar-atm", kickoff: "21:30", match: "Barcelona v Atletico Madrid", competition: "La Liga", marketBias: -2.6, moneyFlow: "Away", newsBias: "Neutral", modelBias: "Away", alignment: "Medium", confidence: 66, action: "Review" },
  { id: "bay-dor", kickoff: "21:45", match: "Bayern Munich v Dortmund", competition: "Bundesliga", marketBias: 6.4, moneyFlow: "Home", newsBias: "Neutral", modelBias: "Home", alignment: "High", confidence: 80, action: "Watch" },
  { id: "int-mil", kickoff: "22:00", match: "Inter v Milan", competition: "Serie A", marketBias: 2.9, moneyFlow: "Balanced", newsBias: "Conflict", modelBias: "Away", alignment: "Conflict", confidence: 54, action: "Wait" },
  { id: "ben-por", kickoff: "22:15", match: "Benfica v Porto", competition: "Primeira Liga", marketBias: 7.2, moneyFlow: "Strong home", newsBias: "Home", modelBias: "Home", alignment: "High", confidence: 82, action: "Exec watch" },
  { id: "aja-psv", kickoff: "22:30", match: "Ajax v PSV", competition: "Eredivisie", marketBias: -3.6, moneyFlow: "Away", newsBias: "Neutral", modelBias: "Away", alignment: "Low", confidence: 55, action: "No action" },
  { id: "cel-ran", kickoff: "22:45", match: "Celtic v Rangers", competition: "Premiership", marketBias: 4.8, moneyFlow: "Home", newsBias: "Conflict", modelBias: "Home", alignment: "Medium", confidence: 68, action: "Review" },
  { id: "rom-laz", kickoff: "23:00", match: "Roma v Lazio", competition: "Serie A", marketBias: 3.4, moneyFlow: "Home", newsBias: "Home", modelBias: "Neutral", alignment: "Medium", confidence: 65, action: "Watch" },
  { id: "mar-mon", kickoff: "23:15", match: "Marseille v Monaco", competition: "Ligue 1", marketBias: 5.1, moneyFlow: "Home", newsBias: "Neutral", modelBias: "Home", alignment: "High", confidence: 73, action: "Review" }
];

function signed(value: number) {
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function actionTone(action: Action) {
  if (action === "Exec watch") return "exec";
  if (action === "Watch") return "watch";
  if (action === "Review") return "review";
  if (action === "Wait") return "wait";
  return "none";
}

export default function BiasMatrix() {
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1100);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(() => DEMO_ROWS.map((row, index) => {
    const wave = Math.sin((tick + index * 3) / 6);
    return {
      ...row,
      marketBias: clamp(row.marketBias + wave * 0.8, -14, 14),
      confidence: Math.round(clamp(row.confidence + wave * 3, 35, 96))
    };
  }), [tick]);

  const filteredRows = useMemo(() => {
    const terms = normalizeFixtureText(query).split(" ").filter(Boolean);
    if (!terms.length) return rows;
    return rows.filter((row) => {
      const haystack = normalizeFixtureText([
        row.match,
        row.competition,
        row.moneyFlow,
        row.newsBias,
        row.modelBias,
        row.alignment,
        row.action
      ].join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }, [query, rows]);

  const execWatchCount = rows.filter((row) => row.action === "Exec watch").length;
  const highAlignmentCount = rows.filter((row) => row.alignment === "High").length;
  const conflictCount = rows.filter((row) => row.alignment === "Conflict" || row.newsBias === "Conflict").length;
  const averageConfidence = Math.round(rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length);

  return (
    <>
      <TerminalTopbar
        active="bias-matrix"
        onSearchChange={setQuery}
        searchPlaceholder="Filter SportsEdge alignment, match, action, news bias..."
        demoMode
      />
      <main className="alignment-matrix-page">
        <section className="alignment-matrix-command">
          <div>
            <span className="matrix-eyebrow"><ShieldCheck size={14} /> SportsEdge alignment matrix</span>
            <h1>Bias without raw odds or venue columns.</h1>
            <p>Market movement, money flow, news and model reads are compressed into one client-safe decision surface.</p>
          </div>
          <div className="alignment-matrix-kpis">
            <article><span>Exec watch</span><strong>{execWatchCount}</strong></article>
            <article><span>High alignment</span><strong>{highAlignmentCount}</strong></article>
            <article><span>Conflicts</span><strong>{conflictCount}</strong></article>
            <article><span>Avg confidence</span><strong>{averageConfidence}%</strong></article>
          </div>
        </section>

        <section className="alignment-matrix-table-wrap">
          <header className="alignment-table-head">
            <div>
              <span>Client-safe matrix</span>
              <strong>{filteredRows.length} matches</strong>
            </div>
            <em><Activity size={14} /> live demo signals</em>
          </header>
          <table className="alignment-matrix-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Market Bias</th>
                <th>Money Flow</th>
                <th>News Bias</th>
                <th>Model Bias</th>
                <th>Alignment</th>
                <th>Confidence</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="alignment-match-cell">
                    <span>{row.kickoff}</span>
                    <strong>{row.match}</strong>
                    <em>{row.competition}</em>
                  </td>
                  <td><b className={row.marketBias >= 0 ? "alignment-bias positive" : "alignment-bias negative"}>{signed(row.marketBias)}</b></td>
                  <td><span className="alignment-pill flow">{row.moneyFlow}</span></td>
                  <td><span className={`alignment-pill ${row.newsBias.toLowerCase()}`}>{row.newsBias}</span></td>
                  <td><span className={`alignment-pill ${row.modelBias.toLowerCase()}`}>{row.modelBias}</span></td>
                  <td><span className={`alignment-status ${row.alignment.toLowerCase()}`}>{row.alignment}</span></td>
                  <td>
                    <div className="alignment-confidence">
                      <span style={{ width: `${row.confidence}%` }} />
                      <strong>{row.confidence}%</strong>
                    </div>
                  </td>
                  <td><button className={`alignment-action ${actionTone(row.action)}`} type="button">{row.action}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="alignment-matrix-note">
          <Gauge size={14} />
          <span>Demo values are derived SportsEdge-style signals. Raw provider prices, books and source names stay in internal diagnostics.</span>
        </footer>
      </main>
    </>
  );
}
