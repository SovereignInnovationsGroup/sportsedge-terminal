type CountryHint = {
  country: string;
  terms: string[];
};

const COUNTRY_CODE_NAMES: Record<string, string> = {
  AD: "Andorra",
  AL: "Albania",
  AM: "Armenia",
  AR: "Argentina",
  AT: "Austria",
  AU: "Australia",
  BA: "Bosnia and Herzegovina",
  BE: "Belgium",
  BG: "Bulgaria",
  BO: "Bolivia",
  BR: "Brazil",
  BT: "Bhutan",
  BY: "Belarus",
  CA: "Canada",
  CH: "Switzerland",
  CL: "Chile",
  CN: "China",
  CO: "Colombia",
  CZ: "Czech Republic",
  DE: "Germany",
  DK: "Denmark",
  EC: "Ecuador",
  EE: "Estonia",
  EN: "England",
  ES: "Spain",
  FI: "Finland",
  FO: "Faroe Islands",
  FR: "France",
  GB: "United Kingdom",
  GE: "Georgia",
  GR: "Greece",
  HR: "Croatia",
  HU: "Hungary",
  IE: "Ireland",
  IS: "Iceland",
  IT: "Italy",
  JP: "Japan",
  KG: "Kyrgyzstan",
  KR: "South Korea",
  KZ: "Kazakhstan",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  MD: "Moldova",
  ME: "Montenegro",
  MK: "North Macedonia",
  MX: "Mexico",
  NL: "Netherlands",
  NO: "Norway",
  PL: "Poland",
  PE: "Peru",
  PT: "Portugal",
  PY: "Paraguay",
  RO: "Romania",
  RS: "Serbia",
  RU: "Russia",
  SE: "Sweden",
  SI: "Slovenia",
  SK: "Slovakia",
  SM: "San Marino",
  TR: "Turkey",
  UA: "Ukraine",
  UK: "United Kingdom",
  US: "United States",
  USA: "United States",
  VN: "Vietnam",
  WA: "Wales",
  WORLD: "World",
  XK: "Kosovo"
};

const COUNTRY_HINTS: CountryHint[] = [
  { country: "Kazakhstan", terms: ["kazakhstan", "kazakh", "fc astana", "astana fk", "ordabasy", "kairat", "qairat", "elimai", "irtysh pavlodar", "irtysh pavlaodar"] },
  { country: "Paraguay", terms: ["paraguay", "paraguayan", "alto parana", "resistencia sc", "cristobal colon", "sportivo limpeno", "general caballero"] },
  { country: "Peru", terms: ["peru", "peruvian", "moquegua", "comerciantes unidos", "cienciano", "fbc melgar", "alianza lima", "universitario", "sporting cristal", "cusco fc", "sport boys", "cajamarca"] },
  { country: "Ecuador", terms: ["ecuador", "ecuadorian", "ecuador serie a", "liga pro", "aucas", "independiente del valle"] },
  { country: "Iceland", terms: ["iceland", "icelandic", "besta deild", "1 deild", "kopavog", "kopavogur", "reykjavik", "grindavik", "stjarnan", "thor ka", "valur", "breidablik", "hafnarfjordur", "vikingur reykjavik", "hk kopavogur", "ibv", "vestri"] },
  { country: "Georgia", terms: ["georgia", "georgian", "sk iberia", "iberia 1999", "torpedo kutaisi", "dinamo tbilisi", "dila gori"] },
  { country: "Germany", terms: ["germany", "german", "bundesliga", "braunschweig", "havelse", "darmstadt", "homburg"] },
  { country: "Finland", terms: ["finland", "finnish", "kakkonen", "ykkosliiga", "kups", "ilves", "tampere", "gbk", "narpes", "jippo", "mikkelin"] },
  { country: "Estonia", terms: ["estonia", "estonian", "fc flora", "flora tallinn", "paide", "levadia", "nomme kalju", "fci tallinn"] },
  { country: "Latvia", terms: ["latvia", "latvian", "fk riga", "riga", "rigas futbola", "rfs", "liepaja"] },
  { country: "Lithuania", terms: ["lithuania", "lithuanian", "zalgiris", "vilnius"] },
  { country: "Luxembourg", terms: ["luxembourg", "luxembourgish", "atert bissen", "mondorf"] },
  { country: "Montenegro", terms: ["montenegro", "montenegrin", "sutjeska", "decic", "mornar", "ofk petrovac"] },
  { country: "Albania", terms: ["albania", "albanian", "egnatia", "elbasani", "vllaznia"] },
  { country: "Kosovo", terms: ["kosovo", "kosovan", "drita", "ballkani", "malisheva"] },
  { country: "Hungary", terms: ["hungary", "hungarian", "gyori", "gyor", "eto fc", "ferencvaros", "puskas akademia"] },
  { country: "Bulgaria", terms: ["bulgaria", "bulgarian", "levski sofia", "cska sofia"] },
  { country: "Wales", terms: ["welsh", "wales", "the new saints", "penybont", "connah"] },
  { country: "Andorra", terms: ["andorra", "andorran", "inter club escaldes", "escaldes", "santa coloma"] },
  { country: "San Marino", terms: ["san marino", "la fiorita", "tre fiori", "ss virtus"] },
  { country: "Northern Ireland", terms: ["northern ireland", "larne", "linfield", "glentoran"] },
  { country: "Ireland", terms: ["ireland", "irish", "shamrock rovers", "derry city", "st patricks", "cork city", "sligo rovers", "bohemians dublin"] },
  { country: "Austria", terms: ["austria", "austrian", "lask linz", "austria lustenau", "bregenz"] },
  { country: "Romania", terms: ["romania", "romanian", "universitatea craiova", "universitatea cluj"] },
  { country: "Belarus", terms: ["belarus", "belarusian", "bate borisov", "vitebsk", "viciebsk", "dinamo minsk"] },
  { country: "Armenia", terms: ["armenia", "armenian", "ararat armenia", "pyunik", "alashkert"] },
  { country: "Moldova", terms: ["moldova", "moldovan", "petrocub", "milsami", "orhei"] },
  { country: "Slovenia", terms: ["slovenia", "slovenian", "aluminij"] },
  { country: "Norway", terms: ["norway", "norwegian", "eliteserien", "bodo glimt", "fredrikstad", "hamarkameratene", "tromso", "valerenga", "aalesund"] },
  { country: "Faroe Islands", terms: ["faroe", "ki klaksvik", "klaksvik", "klaksvikar", "vikingur gota", "nsi runavik"] },
  { country: "Vietnam", terms: ["vietnam", "vietnamese"] },
  { country: "China", terms: ["china", "chinese", "super league"] },
  { country: "Australia", terms: ["australia", "australian", "a league", "npl"] },
  { country: "England", terms: ["english", "england", "english premier league", "premier league england", "efl championship", "league one", "league two", "fa cup", "efl cup", "bamber bridge", "preston", "woking", "portsmouth", "chippenham", "swindon", "halifax", "chesterfield", "rochdale"] },
  { country: "Scotland", terms: ["scottish", "scotland"] },
  { country: "Spain", terms: ["spain", "spanish", "la liga"] },
  { country: "Italy", terms: ["italy", "italian", "italian serie a", "italian serie b"] },
  { country: "France", terms: ["france", "french", "ligue 1", "ligue 2", "sm caen", "caen", "paris 13 atletico", "paris 13 atl"] },
  { country: "Netherlands", terms: ["netherlands", "dutch", "eredivisie"] },
  { country: "Portugal", terms: ["portugal", "portuguese", "primeira liga", "sporting cp"] },
  { country: "Turkey", terms: ["turkey", "turkish", "besiktas", "fenerbahce"] },
  { country: "Brazil", terms: ["brazil", "brazilian", "brasileiro"] },
  { country: "Argentina", terms: ["argentina", "argentinian", "argentine"] },
  { country: "Chile", terms: ["chile", "chilean"] },
  { country: "Colombia", terms: ["colombia", "colombian"] },
  { country: "Mexico", terms: ["mexico", "mexican", "liga mx"] },
  { country: "United States", terms: ["united states", "usa", "usl", "mls", "orlando pride", "gotham", "washington spirit"] },
  { country: "Japan", terms: ["japan", "japanese", "j league", "hiroshima"] },
  { country: "South Korea", terms: ["south korea", "korea", "k league"] },
  { country: "Poland", terms: ["poland", "polish", "ekstraklasa", "korona kielce", "stal rzeszow"] },
  { country: "Belgium", terms: ["belgium", "belgian", "jupiler"] },
  { country: "Switzerland", terms: ["switzerland", "swiss"] },
  { country: "Denmark", terms: ["denmark", "danish", "randers"] },
  { country: "Sweden", terms: ["sweden", "swedish"] },
  { country: "Greece", terms: ["greece", "greek"] },
  { country: "Croatia", terms: ["croatia", "croatian", "slaven belupo"] },
  { country: "Serbia", terms: ["serbia", "serbian", "vojvodina"] },
  { country: "Czech Republic", terms: ["czech", "slovan liberec"] },
  { country: "Slovakia", terms: ["slovakia", "slovak", "spartak trnava", "dukla banska"] },
  { country: "Ukraine", terms: ["ukraine", "ukrainian", "dynamo kyiv", "dynamo kiev"] }
];

function normalizeCountryText(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[øØ]/g, "o")
    .replace(/[æÆ]/g, "ae")
    .replace(/[åÅ]/g, "a")
    .replace(/&/g, " and ")
    .replace(/\bvs?\.?\b|\bversus\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchCountryHint(value: string | null | undefined) {
  const text = normalizeCountryText(value);
  if (!text) return "";
  for (const hint of COUNTRY_HINTS) {
    if (hint.terms.some((term) => text.includes(normalizeCountryText(term)))) return hint.country;
  }
  return "";
}

function homeSide(value: string | null | undefined) {
  const text = String(value || "").trim();
  if (!text) return "";
  const atMatch = text.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) return atMatch[2] || "";
  return text.split(/\s+(?:v|vs\.?|versus)\s+/i)[0] || text;
}

export function countryNameFromCode(value: string | null | undefined) {
  const code = String(value || "").trim().toUpperCase();
  return code ? COUNTRY_CODE_NAMES[code] || code : "";
}

export function isGenericFootballCountry(value: string | null | undefined) {
  const normalized = normalizeCountryText(value);
  return !normalized || normalized === "unknown" || normalized === "na" || normalized === "world" || normalized === "un" || normalized === "uefa" || normalized === "europe";
}

export function inferFootballCountry({
  competition,
  fixture,
  extra
}: {
  competition?: string | null;
  fixture?: string | null;
  extra?: string | null;
}) {
  return matchCountryHint(competition)
    || matchCountryHint(homeSide(fixture))
    || matchCountryHint(fixture)
    || matchCountryHint(extra)
    || "";
}
