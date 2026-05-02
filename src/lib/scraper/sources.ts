import type { ScraperSource } from './types';

/**
 * Canonical list of event sources for ForaHub.
 *
 * Scrape method priority: rss > ical > html > pdf
 * Phase 2 stubs (twitter, linkedin, newsletter, youtube) are included for
 * architecture completeness but return empty content gracefully.
 */
export const SOURCES: ScraperSource[] = [

  // ── GLOBAL HEALTH ──────────────────────────────────────────────────────────

  {
    id: 'who-events',
    organization: 'World Health Organization',
    url: 'https://www.who.int/news-room/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3],
    region: 'Global',
    language: 'en',
    requires_auth: false,
    css_selectors: {
      container: '.sf-list-vertical__item',
      title: '.sf-list-vertical__item h3',
      date: '.sf-list-vertical__item .date',
      description: '.sf-list-vertical__item p',
    },
  },

  {
    id: 'gates-foundation-events',
    organization: 'Gates Foundation',
    url: 'https://www.gatesfoundation.org/ideas/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3, 1, 2],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'wellcome-events',
    organization: 'Wellcome Trust',
    url: 'https://wellcome.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'world-health-summit',
    organization: 'World Health Summit',
    url: 'https://www.worldhealthsummit.org',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3, 17],
    region: 'Europe',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'cugh-events',
    organization: 'Consortium of Universities for Global Health (CUGH)',
    url: 'https://cugh.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3, 4],
    region: 'Americas',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'afhea-events',
    organization: 'African Health Economics and Policy Association (AfHEA)',
    url: 'https://www.afhea.org/en/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3, 10],
    region: 'Africa',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'geneva-health-forum',
    organization: 'Geneva Health Forum',
    url: 'https://www.genevahealthforum.org',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3, 17],
    region: 'Europe',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'pmac-events',
    organization: 'Prince Mahidol Award Conference',
    url: 'https://www.princemahidolawardconference.com',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3],
    region: 'Asia-Pacific',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'lancet-events',
    organization: 'The Lancet',
    url: 'https://www.thelancet.com/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'health-systems-global-events',
    organization: 'Health Systems Global',
    url: 'https://www.healthsystemsglobal.org/events/',
    source_type: 'rss',
    scrape_method: 'rss',
    rss_url: 'https://www.healthsystemsglobal.org/feed/',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3, 16],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'ihea-events',
    organization: 'International Health Economics Association (iHEA)',
    url: 'https://healtheconomics.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3, 10],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'astmh-annual-meeting',
    organization: 'American Society of Tropical Medicine & Hygiene (ASTMH)',
    url: 'https://www.astmh.org/Annual-Meeting',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3],
    region: 'Americas',
    language: 'en',
    requires_auth: false,
  },

  // ── UN SYSTEM ─────────────────────────────────────────────────────────────

  {
    id: 'unicef-events',
    organization: 'UNICEF',
    url: 'https://www.unicef.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3, 4, 1, 2],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'unaids-events',
    organization: 'UNAIDS',
    url: 'https://www.unaids.org/en/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'unwomen-events',
    organization: 'UN Women',
    url: 'https://www.unwomen.org/en/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [5, 10, 16],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'unfpa-events',
    organization: 'UNFPA',
    url: 'https://www.unfpa.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3, 5],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'undp-events',
    organization: 'UNDP',
    url: 'https://www.undp.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [1, 10, 16, 17],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'unesco-events',
    organization: 'UNESCO',
    url: 'https://en.unesco.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [4, 11, 13],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'fao-events',
    organization: 'Food and Agriculture Organization (FAO)',
    url: 'https://www.fao.org/events/en/',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [2, 15, 12],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'wfp-events',
    organization: 'World Food Programme (WFP)',
    url: 'https://www.wfp.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [2, 17],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'iom-events',
    organization: 'International Organization for Migration (IOM)',
    url: 'https://www.iom.int/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [10, 16],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'unhcr-events',
    organization: 'UNHCR',
    url: 'https://www.unhcr.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [10, 16],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  // ── GLOBAL FUND ECOSYSTEM ─────────────────────────────────────────────────

  {
    id: 'global-fund-events',
    organization: 'The Global Fund',
    url: 'https://www.theglobalfund.org/en/events/',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3, 17],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'gavi-events',
    organization: 'Gavi, the Vaccine Alliance',
    url: 'https://www.gavi.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  // ── THINK TANKS & POLICY ──────────────────────────────────────────────────

  {
    id: 'chatham-house-events',
    organization: 'Chatham House',
    url: 'https://www.chathamhouse.org/events',
    source_type: 'rss',
    scrape_method: 'rss',
    rss_url: 'https://www.chathamhouse.org/rss/events',
    scrape_frequency: 'daily',
    primary_sdg_goals: [16, 17, 3],
    region: 'Europe',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'wilton-park-events',
    organization: 'Wilton Park',
    url: 'https://www.wiltonpark.org.uk/events/',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [16, 17],
    region: 'Europe',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'brookings-events',
    organization: 'Brookings Institution',
    url: 'https://www.brookings.edu/events/',
    source_type: 'rss',
    scrape_method: 'rss',
    rss_url: 'https://www.brookings.edu/feed/events/',
    scrape_frequency: 'daily',
    primary_sdg_goals: [1, 10, 16, 17],
    region: 'Americas',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'odi-events',
    organization: 'Overseas Development Institute (ODI)',
    url: 'https://odi.org/en/events/',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [1, 10, 17],
    region: 'Europe',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'ihme-events',
    organization: 'Institute for Health Metrics and Evaluation (IHME)',
    url: 'https://www.healthdata.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3],
    region: 'Americas',
    language: 'en',
    requires_auth: false,
  },

  // ── SECURITY, HUMANITARIAN, DIPLOMACY ────────────────────────────────────

  {
    id: 'fcdo-events',
    organization: 'UK Foreign, Commonwealth & Development Office (FCDO)',
    url: 'https://www.gov.uk/government/organisations/foreign-commonwealth-development-office/about/news',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [17, 16],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'msf-events',
    organization: 'Médecins Sans Frontières (MSF)',
    url: 'https://www.msf.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3, 16],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'icrc-events',
    organization: 'International Committee of the Red Cross (ICRC)',
    url: 'https://www.icrc.org/en/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [16, 3],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'sphere-events',
    organization: 'Sphere',
    url: 'https://spherestandards.org/events/',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [16, 1],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'interaction-events',
    organization: 'InterAction',
    url: 'https://www.interaction.org/events/',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [17, 1, 16],
    region: 'Americas',
    language: 'en',
    requires_auth: false,
  },

  // ── REGIONAL HEALTH BODIES ────────────────────────────────────────────────

  {
    id: 'africa-cdc-events',
    organization: 'Africa CDC',
    url: 'https://africacdc.org/events/',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3],
    region: 'Africa',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'paho-events',
    organization: 'Pan American Health Organization (PAHO)',
    url: 'https://www.paho.org/en/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3],
    region: 'Americas',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'who-afro-events',
    organization: 'WHO Regional Office for Africa (AFRO)',
    url: 'https://www.afro.who.int/news/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3],
    region: 'Africa',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'who-emro-events',
    organization: 'WHO Regional Office for Eastern Mediterranean (EMRO)',
    url: 'https://www.emro.who.int/events.html',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3],
    region: 'Middle-East',
    language: 'en',
    requires_auth: false,
  },

  // ── DEVELOPMENT FINANCE & AID ─────────────────────────────────────────────

  {
    id: 'world-bank-health-events',
    organization: 'World Bank — Health, Nutrition & Population',
    url: 'https://www.worldbank.org/en/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3, 1, 10],
    region: 'Global',
    language: 'en',
    requires_auth: false,
    css_selectors: {
      container: '.item-event',
      title: '.item-event h3',
      date: '.item-event .field-date',
    },
  },

  {
    id: 'usaid-global-health-events',
    organization: 'USAID Global Health',
    url: 'https://www.usaid.gov/global-health',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3, 1, 2],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'dfat-australia-events',
    organization: 'DFAT Australia',
    url: 'https://www.dfat.gov.au/aid/topics/investment-priorities/health',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3, 17],
    region: 'Asia-Pacific',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'giz-events',
    organization: 'Deutsche Gesellschaft für Internationale Zusammenarbeit (GIZ)',
    url: 'https://www.giz.de/en/html/events.html',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [17, 1, 3],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  // ── FOUNDATIONS & CIVIL SOCIETY ───────────────────────────────────────────

  {
    id: 'rockefeller-events',
    organization: 'Rockefeller Foundation',
    url: 'https://www.rockefellerfoundation.org/events/',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3, 11, 13],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'osf-events',
    organization: 'Open Society Foundations',
    url: 'https://www.opensocietyfoundations.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [16, 10],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'aga-khan-events',
    organization: 'Aga Khan Foundation',
    url: 'https://www.akdn.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [1, 3, 4, 11],
    region: 'South-Asia',
    language: 'en',
    requires_auth: false,
  },

  // ── IMPLEMENTING PARTNERS ─────────────────────────────────────────────────

  {
    id: 'path-events',
    organization: 'PATH',
    url: 'https://www.path.org/articles/?issue=events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'fhi360-events',
    organization: 'FHI 360',
    url: 'https://www.fhi360.org/news-events/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3, 4, 5],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'r4d-events',
    organization: 'Results for Development (R4D)',
    url: 'https://r4d.org/events/',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3, 4, 1],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'global-health-council-events',
    organization: 'Global Health Council',
    url: 'https://globalhealth.org/events/',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3, 17],
    region: 'Americas',
    language: 'en',
    requires_auth: false,
  },

  // ── ADDITIONAL GLOBAL HEALTH & DEVELOPMENT SOURCES ───────────────────────

  {
    id: 'oecd-dev-events',
    organization: 'OECD Development Centre',
    url: 'https://www.oecd.org/dev/events/',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [1, 10, 17],
    region: 'Europe',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'wef-events',
    organization: 'World Economic Forum',
    url: 'https://www.weforum.org/events/',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [17, 8, 13],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'commonwealth-events',
    organization: 'Commonwealth Secretariat',
    url: 'https://thecommonwealth.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [16, 17, 1],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'eclac-events',
    organization: 'ECLAC (UN Economic Commission for Latin America)',
    url: 'https://www.cepal.org/en/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [1, 10, 8],
    region: 'Americas',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'unescap-events',
    organization: 'UN ESCAP (Asia and the Pacific)',
    url: 'https://www.unescap.org/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [1, 10, 17],
    region: 'Asia-Pacific',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'who-euro-events',
    organization: 'WHO Regional Office for Europe (EURO)',
    url: 'https://www.euro.who.int/en/media-centre/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3],
    region: 'Europe',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'who-searo-events',
    organization: 'WHO Regional Office for South-East Asia (SEARO)',
    url: 'https://www.who.int/southeastasia/news/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3],
    region: 'South-Asia',
    language: 'en',
    requires_auth: false,
  },

  {
    id: 'bmj-events',
    organization: 'The BMJ',
    url: 'https://www.bmj.com/events',
    source_type: 'website',
    scrape_method: 'html',
    scrape_frequency: 'weekly',
    primary_sdg_goals: [3],
    region: 'Global',
    language: 'en',
    requires_auth: false,
  },

  // ── PHASE 2 STUBS ─────────────────────────────────────────────────────────
  // Phase 2 requires API keys and additional setup.
  // These return empty content gracefully with a log message.

  {
    id: 'who-twitter',
    organization: 'World Health Organization',
    url: 'https://twitter.com/WHO',
    source_type: 'twitter',
    scrape_method: 'twitter',
    scrape_frequency: 'hourly',
    primary_sdg_goals: [3],
    region: 'Global',
    language: 'en',
    requires_auth: true,
    phase2: true,
  },

  {
    id: 'un-linkedin',
    organization: 'United Nations',
    url: 'https://www.linkedin.com/company/united-nations',
    source_type: 'linkedin',
    scrape_method: 'linkedin',
    scrape_frequency: 'daily',
    primary_sdg_goals: [17],
    region: 'Global',
    language: 'en',
    requires_auth: true,
    phase2: true,
  },

  {
    id: 'cidrap-newsletter',
    organization: 'CIDRAP (Center for Infectious Disease Research and Policy)',
    url: 'https://www.cidrap.umn.edu/newsletters',
    source_type: 'newsletter',
    scrape_method: 'newsletter',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3],
    region: 'Americas',
    language: 'en',
    requires_auth: true,
    phase2: true,
  },

  {
    id: 'who-youtube',
    organization: 'World Health Organization',
    url: 'https://www.youtube.com/@WHO',
    source_type: 'youtube',
    scrape_method: 'youtube',
    scrape_frequency: 'daily',
    primary_sdg_goals: [3],
    region: 'Global',
    language: 'en',
    requires_auth: false,
    phase2: true,
  },
];

/** Return only active non-phase2 sources, optionally filtered by frequency. */
export function getActiveSources(frequency?: 'hourly' | 'daily' | 'weekly'): ScraperSource[] {
  return SOURCES.filter(s => {
    if (s.phase2) return false;
    if (frequency && s.scrape_frequency !== frequency) return false;
    return true;
  });
}

/** Return a source by id. */
export function getSourceById(id: string): ScraperSource | undefined {
  return SOURCES.find(s => s.id === id);
}
