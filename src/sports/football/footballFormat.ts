export function cleanText(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function formatTimeAgo(value: string | null | undefined) {
  if (!value) return "-";
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "-";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function teamInitials(name: string) {
  return String(name || "SE")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "SE";
}

export function teamTicker(name: string) {
  const words = String(name || "")
    .replace(/football club|fc|afc|cf|sc/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) return words.map((word) => word[0]).join("").slice(0, 4).toUpperCase();
  return String(name || "TEAM").replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "TEAM";
}

