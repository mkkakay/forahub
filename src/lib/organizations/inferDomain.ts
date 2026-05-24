import { ORG_LIST, slugify } from "@/lib/organizations";

// Wider supplementary map for orgs not in the featured registry.
// Keys are intentionally lowercased for case-insensitive matching.
const EXTRA_DOMAINS: Record<string, string> = {
  "who": "who.int",
  "world health organization": "who.int",
  "world health organisation": "who.int",
  "unicef": "unicef.org",
  "world bank": "worldbank.org",
  "world bank group": "worldbank.org",
  "un women": "unwomen.org",
  "wfp": "wfp.org",
  "world food programme": "wfp.org",
  "world food program": "wfp.org",
  "unaids": "unaids.org",
  "unep": "unep.org",
  "undp": "undp.org",
  "unesco": "unesco.org",
  "unhcr": "unhcr.org",
  "fao": "fao.org",
  "ilo": "ilo.org",
  "iom": "iom.int",
  "unfccc": "unfccc.int",
  "un desa": "un.org",
  "undesa": "un.org",
  "united nations": "un.org",
  "un": "un.org",
  "ohchr": "ohchr.org",
  "ifrc": "ifrc.org",
  "icrc": "icrc.org",
  "iisd": "iisd.org",
  "iddri": "iddri.org",
  "odi": "odi.org",
  "wri": "wri.org",
  "wwf": "wwf.org",
  "iucn": "iucn.org",
  "cbd": "cbd.int",
  "imf": "imf.org",
  "oecd": "oecd.org",
  "wto": "wto.org",
  "g20": "g20.org",
  "g7": "g7germany.de",
  "g77": "g77.org",
  "ecowas": "ecowas.int",
  "sadc": "sadc.int",
  "eac": "eac.int",
  "igad": "igad.int",
  "saarc": "saarc-sec.org",
  "caricom": "caricom.org",
  "african union": "au.int",
  "asean": "asean.org",
  "asean secretariat": "asean.org",
  "european union": "european-union.europa.eu",
  "eu": "european-union.europa.eu",
  "european commission": "ec.europa.eu",
  "gates foundation": "gatesfoundation.org",
  "bill & melinda gates foundation": "gatesfoundation.org",
  "bill and melinda gates foundation": "gatesfoundation.org",
  "wellcome trust": "wellcome.org",
  "wellcome": "wellcome.org",
  "rockefeller foundation": "rockefellerfoundation.org",
  "ford foundation": "fordfoundation.org",
  "open society foundations": "opensocietyfoundations.org",
  "mastercard foundation": "mastercardfdn.org",
  "global fund": "theglobalfund.org",
  "the global fund": "theglobalfund.org",
  "gavi": "gavi.org",
  "gavi, the vaccine alliance": "gavi.org",
  "pepfar": "state.gov",
  "africa cdc": "africacdc.org",
  "us cdc": "cdc.gov",
  "cdc": "cdc.gov",
  "fda": "fda.gov",
  "usaid": "usaid.gov",
  "fcdo": "gov.uk",
  "dfid": "gov.uk",
  "giz": "giz.de",
  "kfw": "kfw.de",
  "jica": "jica.go.jp",
  "koica": "koica.go.kr",
  "msf": "msf.org",
  "medecins sans frontieres": "msf.org",
  "médecins sans frontières": "msf.org",
  "doctors without borders": "msf.org",
  "oxfam": "oxfam.org",
  "oxfam international": "oxfam.org",
  "care": "care.org",
  "care international": "care.org",
  "save the children": "savethechildren.org",
  "world vision": "worldvision.org",
  "brac": "brac.net",
  "plan international": "plan-international.org",
  "wef": "weforum.org",
  "world economic forum": "weforum.org",
  "chatham house": "chathamhouse.org",
  "brookings": "brookings.edu",
  "brookings institution": "brookings.edu",
  "csis": "csis.org",
  "carnegie endowment": "carnegieendowment.org",
  "cgd": "cgdev.org",
  "center for global development": "cgdev.org",
  "rand": "rand.org",
  "afdb": "afdb.org",
  "african development bank": "afdb.org",
  "adb": "adb.org",
  "asian development bank": "adb.org",
  "iadb": "iadb.org",
  "isdb": "isdb.org",
  "islamic development bank": "isdb.org",
  "ebrd": "ebrd.com",
  "eib": "eib.org",
  "ifc": "ifc.org",
  "miga": "miga.org",
  "harvard": "harvard.edu",
  "johns hopkins": "jhu.edu",
  "stanford": "stanford.edu",
  "mit": "mit.edu",
  "oxford": "ox.ac.uk",
  "cambridge": "cam.ac.uk",
  "karolinska institutet": "ki.se",
  "lshtm": "lshtm.ac.uk",
  "nus": "nus.edu.sg",
  "university of tokyo": "u-tokyo.ac.jp",
  "uct": "uct.ac.za",
  "makerere": "mak.ac.ug",
  "university of ghana": "ug.edu.gh",
  "aga khan university": "aku.edu",
  "aub": "aub.edu.lb",
  "usp": "usp.br",
  "tec de monterrey": "tec.mx",
  "icddr b": "icddrb.org",
  "icddr,b": "icddrb.org",
  "jimma university": "ju.edu.et",
  "reliefweb": "reliefweb.int",
  "reliefweb (ocha)": "reliefweb.int",
  "ocha": "unocha.org",
  "un ocha": "unocha.org",
  "unodc": "unodc.org",
  "uniceF innocenti": "unicef-irc.org",
};

/**
 * Infer a likely domain for an organization name.
 * First checks the curated ORG_REGISTRY, then a wider supplementary map, then heuristics.
 * Returns null when no confident match — caller should NOT guess further.
 */
export function inferDomainFromOrg(orgName: string): string | null {
  if (!orgName) return null;
  const normalized = orgName.trim().toLowerCase();

  // 1. Featured ORG_REGISTRY — match against canonical name and patterns.
  const registrySlug = slugify(orgName);
  const registryHit = ORG_LIST.find(o => o.slug === registrySlug);
  if (registryHit?.domain) return registryHit.domain;

  const patternHit = ORG_LIST.find(o =>
    o.matchPatterns.some(p => normalized.includes(p.toLowerCase()))
  );
  if (patternHit?.domain) return patternHit.domain;

  // 2. Extra supplementary map.
  if (EXTRA_DOMAINS[normalized]) return EXTRA_DOMAINS[normalized];

  // 3. Substring scan over the supplementary map (longest key first).
  const keys = Object.keys(EXTRA_DOMAINS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (k.length < 4) continue;
    const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "i");
    if (re.test(normalized)) return EXTRA_DOMAINS[k];
  }

  // 4. Last-resort heuristic: short uppercase acronyms (3-6 chars) → try .org.
  const trimmed = orgName.trim();
  if (/^[A-Z]{3,6}$/.test(trimmed)) return `${trimmed.toLowerCase()}.org`;

  return null;
}
