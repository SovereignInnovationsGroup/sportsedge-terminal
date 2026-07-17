export const FOOTBALL_HAS_MONEY_STATE_KEY = "sportsedge.footballLiquidity.hasMoney.v1";
export const FOOTBALL_MIN_TOTAL_STATE_KEY = "sportsedge.footballLiquidity.minTotal.v1";
export const FOOTBALL_COUNTRY_STATE_KEY = "sportsedge.footballLiquidity.country.v1";
export const FOOTBALL_PREDICTIVE_ONLY_STATE_KEY = "sportsedge.footballLiquidity.predictiveOnly.v1";

export const FOOTBALL_LIQUIDITY_THRESHOLD_OPTIONS = [
  { value: 0, label: "ANY £" },
  { value: 1_000, label: "£1K+" },
  { value: 10_000, label: "£10K+" },
  { value: 50_000, label: "£50K+" },
  { value: 100_000, label: "£100K+" },
  { value: 1_000_000, label: "£1M+" }
];

const COUNTRY_FLAG_CODES: Record<string, string> = {
  Afghanistan: "af",
  Albania: "al",
  Algeria: "dz",
  Andorra: "ad",
  Angola: "ao",
  Argentina: "ar",
  Armenia: "am",
  Australia: "au",
  Austria: "at",
  Azerbaijan: "az",
  Bahrain: "bh",
  Bangladesh: "bd",
  Belarus: "by",
  Belgium: "be",
  Bhutan: "bt",
  Bolivia: "bo",
  "Bosnia and Herzegovina": "ba",
  Brazil: "br",
  Bulgaria: "bg",
  Cameroon: "cm",
  Canada: "ca",
  Chile: "cl",
  China: "cn",
  Colombia: "co",
  Croatia: "hr",
  Cyprus: "cy",
  "Czech Republic": "cz",
  Denmark: "dk",
  Ecuador: "ec",
  England: "gb-eng",
  Estonia: "ee",
  "Faroe Islands": "fo",
  Finland: "fi",
  France: "fr",
  Georgia: "ge",
  Germany: "de",
  Ghana: "gh",
  Gibraltar: "gi",
  Greece: "gr",
  Hungary: "hu",
  Iceland: "is",
  India: "in",
  Indonesia: "id",
  Ireland: "ie",
  Israel: "il",
  Italy: "it",
  Japan: "jp",
  Kazakhstan: "kz",
  Kosovo: "xk",
  Kyrgyzstan: "kg",
  Latvia: "lv",
  Liechtenstein: "li",
  Lithuania: "lt",
  Luxembourg: "lu",
  Malta: "mt",
  Mexico: "mx",
  Moldova: "md",
  Montenegro: "me",
  Morocco: "ma",
  Netherlands: "nl",
  "New Zealand": "nz",
  "North Macedonia": "mk",
  "Northern Ireland": "gb-nir",
  Norway: "no",
  Paraguay: "py",
  Peru: "pe",
  Poland: "pl",
  Portugal: "pt",
  Qatar: "qa",
  Romania: "ro",
  Scotland: "gb-sct",
  Serbia: "rs",
  "San Marino": "sm",
  Slovakia: "sk",
  Slovenia: "si",
  "South Korea": "kr",
  Spain: "es",
  Sweden: "se",
  Switzerland: "ch",
  Taiwan: "tw",
  Thailand: "th",
  Turkey: "tr",
  Ukraine: "ua",
  "United Arab Emirates": "ae",
  "United Kingdom": "gb",
  "United States": "us",
  Uruguay: "uy",
  Uzbekistan: "uz",
  Vietnam: "vn",
  Wales: "gb-wls",
  World: "un"
};

const COUNTRY_ALIASES: Record<string, string> = {
  "bosnia herzegovina": "Bosnia and Herzegovina",
  "bosnia and herzegovina": "Bosnia and Herzegovina",
  czechia: "Czech Republic",
  "czech republic": "Czech Republic",
  "czech-republic": "Czech Republic",
  england: "England",
  gb: "United Kingdom",
  "great britain": "United Kingdom",
  "korea republic": "South Korea",
  "korea south": "South Korea",
  "north macedonia": "North Macedonia",
  "northern ireland": "Northern Ireland",
  "republic of ireland": "Ireland",
  scotland: "Scotland",
  "south korea": "South Korea",
  "south-korea": "South Korea",
  uae: "United Arab Emirates",
  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  usa: "United States",
  "u s a": "United States",
  "united states": "United States",
  "united states of america": "United States",
  wales: "Wales"
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

function normalizeCountryKey(country: string | null | undefined) {
  return String(country || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[-_]+/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function titleCaseCountry(country: string) {
  return country
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function normalizeCountryName(country: string | null | undefined) {
  const raw = String(country || "").trim();
  if (!raw || raw.toLowerCase() === "all") return "";
  const key = normalizeCountryKey(raw);
  const canonical = COUNTRY_ALIASES[key] || Object.keys(COUNTRY_FLAG_CODES).find((name) => normalizeCountryKey(name) === key);
  return canonical || titleCaseCountry(raw);
}

export function countryMatches(rowCountry: string | null | undefined, selectedCountry: string | null | undefined) {
  const selected = normalizeCountryName(selectedCountry);
  if (!selected) return true;
  return normalizeCountryKey(normalizeCountryName(rowCountry)) === normalizeCountryKey(selected);
}

export function countryOptionValue(country: string | null | undefined) {
  return normalizeCountryName(country);
}

export function countryFlagCode(country: string | null | undefined) {
  const label = normalizeCountryName(country);
  const imageCode = COUNTRY_FLAG_CODES[label];
  return imageCode ? imageCode.toUpperCase().replace(/^GB-/, "") : fallbackCountryCode(label);
}

export function countryFlagUrl(country: string | null | undefined) {
  const imageCode = COUNTRY_FLAG_CODES[normalizeCountryName(country)];
  return imageCode ? `https://flagcdn.com/${imageCode}.svg` : "";
}

export function countryFilterLabel(country: string) {
  return normalizeCountryName(country) || country;
}
