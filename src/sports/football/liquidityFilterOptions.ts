export const FOOTBALL_HAS_MONEY_STATE_KEY = "sportsedge.footballLiquidity.hasMoney.v1";
export const FOOTBALL_MIN_TOTAL_STATE_KEY = "sportsedge.footballLiquidity.minTotal.v1";
export const FOOTBALL_COUNTRY_STATE_KEY = "sportsedge.footballLiquidity.country.v1";

export const FOOTBALL_LIQUIDITY_THRESHOLD_OPTIONS = [
  { value: 0, label: "ANY £" },
  { value: 1_000, label: "£1K+" },
  { value: 10_000, label: "£10K+" },
  { value: 50_000, label: "£50K+" },
  { value: 100_000, label: "£100K+" },
  { value: 1_000_000, label: "£1M+" }
];

const COUNTRY_FLAGS: Record<string, string> = {
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Belgium: "🇧🇪",
  Brazil: "🇧🇷",
  Bulgaria: "🇧🇬",
  Canada: "🇨🇦",
  Chile: "🇨🇱",
  China: "🇨🇳",
  Colombia: "🇨🇴",
  Croatia: "🇭🇷",
  "Czech Republic": "🇨🇿",
  Denmark: "🇩🇰",
  England: "🏴",
  Finland: "🇫🇮",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Greece: "🇬🇷",
  Hungary: "🇭🇺",
  Iceland: "🇮🇸",
  Ireland: "🇮🇪",
  Italy: "🇮🇹",
  Japan: "🇯🇵",
  Mexico: "🇲🇽",
  Netherlands: "🇳🇱",
  "Northern Ireland": "🇬🇧",
  Norway: "🇳🇴",
  Poland: "🇵🇱",
  Portugal: "🇵🇹",
  Romania: "🇷🇴",
  Scotland: "🏴",
  Serbia: "🇷🇸",
  Slovakia: "🇸🇰",
  Slovenia: "🇸🇮",
  "South Korea": "🇰🇷",
  Spain: "🇪🇸",
  Sweden: "🇸🇪",
  Switzerland: "🇨🇭",
  Turkey: "🇹🇷",
  Ukraine: "🇺🇦",
  "United Kingdom": "🇬🇧",
  "United States": "🇺🇸",
  Vietnam: "🇻🇳",
  Wales: "🏴"
};

export function readBooleanPreference(key: string, fallback: boolean) {
  try {
    const value = window.localStorage.getItem(key);
    if (value === "true") return true;
    if (value === "false") return false;
  } catch {
    // Preference only.
  }
  return fallback;
}

export function readMinLiquidityPreference() {
  try {
    const value = Number(window.localStorage.getItem(FOOTBALL_MIN_TOTAL_STATE_KEY) || 0);
    return FOOTBALL_LIQUIDITY_THRESHOLD_OPTIONS.some((option) => option.value === value) ? value : 0;
  } catch {
    return 0;
  }
}

export function readStringPreference(key: string, fallback = "all") {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function savePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preference only.
  }
}

export function countryFlag(country: string | null | undefined) {
  return COUNTRY_FLAGS[String(country || "").trim()] || "";
}

export function countryFilterLabel(country: string) {
  return [countryFlag(country), country].filter(Boolean).join(" ");
}
