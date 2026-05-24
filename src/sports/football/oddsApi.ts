export type OddsApiDiagnosticRow = {
  eventId: string;
  startTime: number | null;
  league: string;
  fixture: string;
  bookmaker: string;
  market: string;
  selection: string;
  odds: number | null;
  classification: string;
  sourceTs: string | null;
  hasBack: boolean;
  hasLay: boolean;
  hasSize: boolean;
  fieldKeys: string[];
};

export type OddsApiDiagnosticResponse = {
  generatedAt: string;
  provider: string;
  sport: string;
  bookmakers: string[];
  eventCount: number;
  rowCount: number;
  counts: {
    byBookmaker: Record<string, number>;
    byClassification: Record<string, number>;
  };
  events: Array<{ eventId: string; league?: string; startTime?: number | null; fixture: string; targetBookmakers: string[] }>;
  rows: OddsApiDiagnosticRow[];
  errors: Array<{ eventId: string; fixture: string; message: string }>;
};

export function isMoneylineOddsApiRow(row: OddsApiDiagnosticRow) {
  const market = String(row.market || "").toLowerCase();
  return market.includes("moneyline") || market.includes("match odds") || market.includes("1x2");
}

export function decimalOddsLabel(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return "-";
  const odds = Number(value);
  return odds >= 10 ? odds.toFixed(1).replace(/\.0$/, "") : odds.toFixed(2).replace(/0$/, "").replace(/\.$/, "");
}

export function groupOddsApiRowsByEvent(rows: OddsApiDiagnosticRow[]) {
  const groups = new Map<string, OddsApiDiagnosticRow[]>();
  rows.forEach((row) => {
    const key = row.eventId || row.fixture;
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(row);
  });
  return groups;
}

export function oddsDiagnosticTime(value: number | null | undefined) {
  if (!value) return "-";
  return localEventTime(new Date(value * 1000).toISOString(), { day: "2-digit", month: "short" });
}
import { localEventTime } from "../../core/format";
