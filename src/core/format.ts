export function cleanText(value: string | null | undefined) {
  if (!value) return "";
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value
    .replace(/\s*\[(?:\.{3}|…|&#8230;)\]\s*/g, " ")
    .replace(/\s*The post .+ first appeared on .+\.?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function displayLabel(value: string | null | undefined, fallback = "Unclassified") {
  return cleanText(value) || fallback;
}

export function normalizeFixtureText(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(vs?|versus|at)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDate(value: string | null) {
  if (!value) return "Undated";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatExchangeMoney(value: number, currency = "GBP") {
  const symbol = currency === "GBP" ? "£" : "$";
  if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1_000) return `${symbol}${Math.round(value / 1_000)}k`;
  return `${symbol}${Math.round(value).toLocaleString("en-GB")}`;
}

export function asNumber(value: string | number | null | undefined) {
  return Number(value || 0);
}

export function objectEntries(value: Record<string, unknown> | null | undefined) {
  if (!value || Array.isArray(value)) return [];
  return Object.entries(value).filter(([, item]) => item !== null && item !== "" && item !== undefined);
}

function shortValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item))).slice(0, 3).join(", ") : "none";
  if (value && typeof value === "object") return JSON.stringify(value);
  return cleanText(String(value));
}

export function analyticsCellValue(row: Record<string, unknown>, key: string) {
  const value = row[key];
  if (value === null || value === undefined || value === "") return "-";
  if (/(_at|date|time)$/i.test(key) && typeof value === "string") return formatDate(value);
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("en-GB") : "-";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return shortValue(value);
}

export function teamInitials(name: string) {
  return String(name || "SE")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "SE";
}
