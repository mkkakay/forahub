// Country code → primary IANA timezone + primary language code.
// "Primary" = the capital's timezone / the most-spoken official language.
// Multi-timezone countries (US, RU, AU, CA, BR, CN) default to the capital tz;
// users can override the timezone field after selecting a location.

const COUNTRY_TIMEZONE: Record<string, string> = {
  // Africa
  dz: "Africa/Algiers", ao: "Africa/Luanda", bj: "Africa/Porto-Novo", bw: "Africa/Gaborone",
  bf: "Africa/Ouagadougou", bi: "Africa/Bujumbura", cv: "Atlantic/Cape_Verde",
  cm: "Africa/Douala", cf: "Africa/Bangui", td: "Africa/Ndjamena", km: "Indian/Comoro",
  cg: "Africa/Brazzaville", cd: "Africa/Kinshasa", ci: "Africa/Abidjan",
  dj: "Africa/Djibouti", eg: "Africa/Cairo", gq: "Africa/Malabo", er: "Africa/Asmara",
  sz: "Africa/Mbabane", et: "Africa/Addis_Ababa", ga: "Africa/Libreville",
  gm: "Africa/Banjul", gh: "Africa/Accra", gn: "Africa/Conakry", gw: "Africa/Bissau",
  ke: "Africa/Nairobi", ls: "Africa/Maseru", lr: "Africa/Monrovia", ly: "Africa/Tripoli",
  mg: "Indian/Antananarivo", mw: "Africa/Blantyre", ml: "Africa/Bamako", mr: "Africa/Nouakchott",
  mu: "Indian/Mauritius", ma: "Africa/Casablanca", mz: "Africa/Maputo", na: "Africa/Windhoek",
  ne: "Africa/Niamey", ng: "Africa/Lagos", rw: "Africa/Kigali", st: "Africa/Sao_Tome",
  sn: "Africa/Dakar", sc: "Indian/Mahe", sl: "Africa/Freetown", so: "Africa/Mogadishu",
  za: "Africa/Johannesburg", ss: "Africa/Juba", sd: "Africa/Khartoum",
  tz: "Africa/Dar_es_Salaam", tg: "Africa/Lome", tn: "Africa/Tunis", ug: "Africa/Kampala",
  zm: "Africa/Lusaka", zw: "Africa/Harare",

  // Americas
  ar: "America/Argentina/Buenos_Aires", bo: "America/La_Paz", br: "America/Sao_Paulo",
  ca: "America/Toronto", cl: "America/Santiago", co: "America/Bogota", cr: "America/Costa_Rica",
  cu: "America/Havana", do: "America/Santo_Domingo", ec: "America/Guayaquil",
  sv: "America/El_Salvador", gt: "America/Guatemala", gy: "America/Guyana",
  ht: "America/Port-au-Prince", hn: "America/Tegucigalpa", jm: "America/Jamaica",
  mx: "America/Mexico_City", ni: "America/Managua", pa: "America/Panama",
  py: "America/Asuncion", pe: "America/Lima", pr: "America/Puerto_Rico",
  sr: "America/Paramaribo", tt: "America/Port_of_Spain", us: "America/New_York",
  uy: "America/Montevideo", ve: "America/Caracas",

  // Asia & Pacific
  af: "Asia/Kabul", au: "Australia/Sydney", bh: "Asia/Bahrain", bd: "Asia/Dhaka",
  bt: "Asia/Thimphu", bn: "Asia/Brunei", kh: "Asia/Phnom_Penh", cn: "Asia/Shanghai",
  cy: "Asia/Nicosia", fj: "Pacific/Fiji", ge: "Asia/Tbilisi", hk: "Asia/Hong_Kong",
  in: "Asia/Kolkata", id: "Asia/Jakarta", ir: "Asia/Tehran", iq: "Asia/Baghdad",
  il: "Asia/Jerusalem", jp: "Asia/Tokyo", jo: "Asia/Amman", kz: "Asia/Almaty",
  kr: "Asia/Seoul", kw: "Asia/Kuwait", kg: "Asia/Bishkek", la: "Asia/Vientiane",
  lb: "Asia/Beirut", my: "Asia/Kuala_Lumpur", mv: "Indian/Maldives", mn: "Asia/Ulaanbaatar",
  mm: "Asia/Yangon", np: "Asia/Kathmandu", nz: "Pacific/Auckland", om: "Asia/Muscat",
  pk: "Asia/Karachi", ph: "Asia/Manila", qa: "Asia/Qatar", sa: "Asia/Riyadh",
  sg: "Asia/Singapore", lk: "Asia/Colombo", sy: "Asia/Damascus", tw: "Asia/Taipei",
  tj: "Asia/Dushanbe", th: "Asia/Bangkok", tl: "Asia/Dili", tr: "Europe/Istanbul",
  tm: "Asia/Ashgabat", ae: "Asia/Dubai", uz: "Asia/Tashkent", vn: "Asia/Ho_Chi_Minh",
  ye: "Asia/Aden", ws: "Pacific/Apia", to: "Pacific/Tongatapu", vu: "Pacific/Efate",
  pg: "Pacific/Port_Moresby", sb: "Pacific/Guadalcanal", ki: "Pacific/Tarawa",

  // Europe
  al: "Europe/Tirane", ad: "Europe/Andorra", at: "Europe/Vienna", by: "Europe/Minsk",
  be: "Europe/Brussels", ba: "Europe/Sarajevo", bg: "Europe/Sofia", hr: "Europe/Zagreb",
  cz: "Europe/Prague", dk: "Europe/Copenhagen", ee: "Europe/Tallinn", fi: "Europe/Helsinki",
  fr: "Europe/Paris", de: "Europe/Berlin", gr: "Europe/Athens", hu: "Europe/Budapest",
  is: "Atlantic/Reykjavik", ie: "Europe/Dublin", it: "Europe/Rome", lv: "Europe/Riga",
  li: "Europe/Vaduz", lt: "Europe/Vilnius", lu: "Europe/Luxembourg", mt: "Europe/Malta",
  md: "Europe/Chisinau", mc: "Europe/Monaco", me: "Europe/Podgorica", nl: "Europe/Amsterdam",
  mk: "Europe/Skopje", no: "Europe/Oslo", pl: "Europe/Warsaw", pt: "Europe/Lisbon",
  ro: "Europe/Bucharest", ru: "Europe/Moscow", sm: "Europe/San_Marino", rs: "Europe/Belgrade",
  sk: "Europe/Bratislava", si: "Europe/Ljubljana", es: "Europe/Madrid", se: "Europe/Stockholm",
  ch: "Europe/Zurich", ua: "Europe/Kyiv", gb: "Europe/London", va: "Europe/Vatican",
};

export function timezoneForCountry(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  return COUNTRY_TIMEZONE[countryCode.toLowerCase()] ?? null;
}

// Primary language by country code. Bias for development-sector context:
// where English is the working language alongside the local one (e.g. Kenya,
// Singapore, India), we still return the local-dominant language. The user
// can always add or uncheck English.
const COUNTRY_LANGUAGE: Record<string, string> = {
  // French-speaking
  fr: "fr", be: "fr", ch: "fr", lu: "fr", mc: "fr", ht: "fr",
  dz: "fr", ma: "fr", tn: "fr", sn: "fr", ml: "fr", bf: "fr", ne: "fr", gn: "fr",
  ci: "fr", tg: "fr", bj: "fr", cm: "fr", ga: "fr", cd: "fr", cg: "fr", cf: "fr",
  td: "fr", mg: "fr", rw: "fr", bi: "fr", dj: "fr", km: "fr", mr: "fr", sc: "fr",

  // Spanish-speaking
  es: "es", mx: "es", ar: "es", co: "es", pe: "es", ve: "es", cl: "es", ec: "es",
  gt: "es", cu: "es", bo: "es", do: "es", hn: "es", py: "es", sv: "es", ni: "es",
  cr: "es", pa: "es", uy: "es", pr: "es", gq: "es",

  // Arabic-speaking
  eg: "ar", sa: "ar", iq: "ar", sy: "ar", ye: "ar", jo: "ar", lb: "ar", ps: "ar",
  ae: "ar", om: "ar", kw: "ar", qa: "ar", bh: "ar", ly: "ar", sd: "ar", so: "ar",

  // Portuguese-speaking
  br: "pt", pt: "pt", ao: "pt", mz: "pt", cv: "pt", gw: "pt", st: "pt", tl: "pt",

  // Mandarin
  cn: "zh", tw: "zh", hk: "zh", sg: "zh",
};

export function languageForCountry(countryCode: string | null | undefined): string {
  if (!countryCode) return "en";
  return COUNTRY_LANGUAGE[countryCode.toLowerCase()] ?? "en";
}
