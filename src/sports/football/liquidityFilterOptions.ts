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

const COUNTRY_FLAG_CODES: Record<string, string> = {
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Belgium: "be",
  Brazil: "br",
  Bulgaria: "bg",
  Canada: "ca",
  Chile: "cl",
  China: "cn",
  Colombia: "co",
  Croatia: "hr",
  "Czech Republic": "cz",
  Denmark: "dk",
  England: "gb-eng",
  Finland: "fi",
  France: "fr",
  Germany: "de",
  Greece: "gr",
  Hungary: "hu",
  Iceland: "is",
  Ireland: "ie",
  Italy: "it",
  Japan: "jp",
  Mexico: "mx",
  Netherlands: "nl",
  "Northern Ireland": "gb-nir",
  Norway: "no",
  Poland: "pl",
  Portugal: "pt",
  Romania: "ro",
  Scotland: "gb-sct",
  Serbia: "rs",
  Slovakia: "sk",
  Slovenia: "si",
  "South Korea": "kr",
  Spain: "es",
  Sweden: "se",
  Switzerland: "ch",
  Turkey: "tr",
  Ukraine: "ua",
  "United Kingdom": "gb",
  "United States": "us",
  Vietnam: "vn",
  Wales: "gb-wls",
  World: "un"
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

function fallbackCountryCode(country: string) {
  return country
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("") || "--";
}

export function countryFlagCode(country: string | null | undefined) {
  const label = String(country || "").trim();
  const imageCode = COUNTRY_FLAG_CODES[label];
  return imageCode ? imageCode.toUpperCase().replace(/^GB-/, "") : fallbackCountryCode(label);
}

export function countryFlagUrl(country: string | null | undefined) {
  const imageCode = COUNTRY_FLAG_CODES[String(country || "").trim()];
  return imageCode ? `https://flagcdn.com/${imageCode}.svg` : "";
}

export function countryFilterLabel(country: string) {
  return country;
}
