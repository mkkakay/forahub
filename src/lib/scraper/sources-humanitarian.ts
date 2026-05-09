import type { ScraperSource } from './types';

export const SOURCES_HUMANITARIAN: ScraperSource[] = [

  // ── OCHA and UN Coordination ────────────────────────────────────────────────
  { id: 'hum-ocha-events', organization: 'OCHA', url: 'https://www.unocha.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [1, 3], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-ocha-africa', organization: 'OCHA Africa', url: 'https://www.unocha.org/africa', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [1], region: 'Africa', language: 'en', requires_auth: false },
  { id: 'hum-ocha-asia', organization: 'OCHA Asia-Pacific', url: 'https://www.unocha.org/asia-pacific', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1], region: 'Asia-Pacific', language: 'en', requires_auth: false },
  { id: 'hum-ocha-mena', organization: 'OCHA MENA', url: 'https://www.unocha.org/middle-east-north-africa', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [1], region: 'Middle-East', language: 'en', requires_auth: false },
  { id: 'hum-ocha-reliefweb', organization: 'ReliefWeb Events', url: 'https://reliefweb.int/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [1, 3], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-iasc-events', organization: 'IASC', url: 'https://interagencystandingcommittee.org/about/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1], region: 'Global', language: 'en', requires_auth: false },

  // ── UNHCR ───────────────────────────────────────────────────────────────────
  { id: 'hum-unhcr-events', organization: 'UNHCR', url: 'https://www.unhcr.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [1, 10], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-unhcr-africa', organization: 'UNHCR Africa', url: 'https://www.unhcr.org/africa', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1], region: 'Africa', language: 'en', requires_auth: false },
  { id: 'hum-unhcr-asia', organization: 'UNHCR Asia', url: 'https://www.unhcr.org/asia', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1], region: 'Asia-Pacific', language: 'en', requires_auth: false },
  { id: 'hum-unhcr-mena', organization: 'UNHCR MENA', url: 'https://www.unhcr.org/middle-east-north-africa', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [1], region: 'Middle-East', language: 'en', requires_auth: false },
  { id: 'hum-unhcr-americas', organization: 'UNHCR Americas', url: 'https://www.unhcr.org/americas', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1], region: 'Americas', language: 'en', requires_auth: false },
  { id: 'hum-globalcompact-refugees', organization: 'Global Compact on Refugees', url: 'https://www.unhcr.org/global-compact-on-refugees.html', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [1, 10], region: 'Global', language: 'en', requires_auth: false },

  // ── ICRC ────────────────────────────────────────────────────────────────────
  { id: 'hum-icrc-events', organization: 'ICRC', url: 'https://www.icrc.org/en/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [16, 3], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-icrc-africa', organization: 'ICRC Africa', url: 'https://www.icrc.org/en/where-we-work/africa', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [16], region: 'Africa', language: 'en', requires_auth: false },
  { id: 'hum-icrc-asia', organization: 'ICRC Asia-Pacific', url: 'https://www.icrc.org/en/where-we-work/asia-pacific', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [16], region: 'Asia-Pacific', language: 'en', requires_auth: false },
  { id: 'hum-ifrc-events', organization: 'IFRC', url: 'https://www.ifrc.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3, 1], region: 'Global', language: 'en', requires_auth: false },

  // ── MSF ─────────────────────────────────────────────────────────────────────
  { id: 'hum-msf-events', organization: 'MSF', url: 'https://www.msf.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3, 16], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-msf-access', organization: 'MSF Access Campaign', url: 'https://msfaccess.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3], region: 'Global', language: 'en', requires_auth: false },

  // ── NGO Cluster / INGOs ────────────────────────────────────────────────────
  { id: 'hum-save-children-events', organization: 'Save the Children', url: 'https://www.savethechildren.net/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1, 3], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-oxfam-events', organization: 'Oxfam', url: 'https://www.oxfam.org/en/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1, 10], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-care-events', organization: 'CARE', url: 'https://www.care.org/news-and-stories/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1, 5], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-mercy-corps', organization: 'Mercy Corps', url: 'https://www.mercycorps.org/blog/news', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1, 3], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-nrc-events', organization: 'Norwegian Refugee Council', url: 'https://www.nrc.no/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1, 4], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-irc-events', organization: 'International Rescue Committee', url: 'https://www.rescue.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-worldvision-events', organization: 'World Vision', url: 'https://www.wvi.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1, 3], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-caritas-events', organization: 'Caritas Internationalis', url: 'https://www.caritas.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-islamic-relief', organization: 'Islamic Relief', url: 'https://www.islamic-relief.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-church-world', organization: 'Church World Service', url: 'https://cwsglobal.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-brac-events', organization: 'BRAC', url: 'https://www.brac.net/news-and-events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1, 4], region: 'Asia-South', language: 'en', requires_auth: false },
  { id: 'hum-acf-events', organization: 'Action Against Hunger', url: 'https://www.actionagainsthunger.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [2, 1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-intersos-events', organization: 'INTERSOS', url: 'https://www.intersos.org/en/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [1, 3], region: 'Global', language: 'en', requires_auth: false },

  // ── Disaster Risk Reduction ────────────────────────────────────────────────
  { id: 'hum-undrr-events', organization: 'UNDRR', url: 'https://www.undrr.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [11, 13], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-wcdrr-events', organization: 'WCDRR', url: 'https://www.undrr.org/news/wcdrr', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [11], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-gpdrr-events', organization: 'GPDRR', url: 'https://www.undrr.org/gpdrr', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [11], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-sendai-events', organization: 'Sendai Framework', url: 'https://www.undrr.org/implementing-sendai-framework/what-sendai-framework', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [11, 13], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-predrr-events', organization: 'PreventionWeb', url: 'https://www.preventionweb.net/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [11, 13], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-cdac-events', organization: 'CDAC Network', url: 'https://www.cdacnetwork.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [11], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-gfdrr-events', organization: 'GFDRR', url: 'https://www.gfdrr.org/en/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [11, 13], region: 'Global', language: 'en', requires_auth: false },

  // ── Humanitarian Funding ────────────────────────────────────────────────────
  { id: 'hum-cerf-events', organization: 'CERF', url: 'https://cerf.un.org/news-and-resources/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-chf-events', organization: 'Common Humanitarian Funds', url: 'https://www.unocha.org/united-nations-humanitarian-fund', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-dgo-events', organization: 'Development and Humanitarian Alliance', url: 'https://devinit.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [1], region: 'Global', language: 'en', requires_auth: false },

  // ── Humanitarian Policy ────────────────────────────────────────────────────
  { id: 'hum-alnap-events', organization: 'ALNAP', url: 'https://www.alnap.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-hpg-events', organization: 'Humanitarian Policy Group', url: 'https://odi.org/en/about/our-work/hpg/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-gha-events', organization: 'Global Humanitarian Assistance', url: 'https://devinit.org/topics/humanitarian-assistance/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-sphere-events', organization: 'Sphere Standards', url: 'https://spherestandards.org/news/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-start-network', organization: 'Start Network', url: 'https://startnetwork.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-elrha-events', organization: 'Elrha', url: 'https://www.elrha.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3, 1], region: 'Global', language: 'en', requires_auth: false },

  // ── Health Emergencies ─────────────────────────────────────────────────────
  { id: 'hum-who-emergencies', organization: 'WHO Health Emergencies', url: 'https://www.who.int/teams/health-emergency-preparedness-and-response/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [3], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-goarn-events', organization: 'GOARN', url: 'https://extranet.who.int/goarn/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-hse-forum', organization: 'Humanitarian Health Forum', url: 'https://www.healthcluster.who.int/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-paho-emergency', organization: 'PAHO Emergency', url: 'https://www.paho.org/en/topics/emergencies-disasters', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3], region: 'Americas-Latin', language: 'en', requires_auth: false },

  // ── Water and Sanitation in Emergencies ────────────────────────────────────
  { id: 'hum-wash-cluster', organization: 'WASH Cluster', url: 'https://www.washcluster.net/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [6], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-unicef-wash', organization: 'UNICEF WASH', url: 'https://www.unicef.org/wash', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [6, 3], region: 'Global', language: 'en', requires_auth: false },

  // ── Accountability and Protection ──────────────────────────────────────────
  { id: 'hum-icva-events', organization: 'ICVA', url: 'https://www.icvanetwork.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [16, 1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-protection-cluster', organization: 'Global Protection Cluster', url: 'https://www.globalprotectioncluster.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [16], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-sgbv-aor', organization: 'GBV AoR', url: 'https://gbvaor.net/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [5, 16], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-cpwg-events', organization: 'Child Protection Working Group', url: 'https://www.cpwg.net/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [16, 1], region: 'Global', language: 'en', requires_auth: false },

  // ── Displacement and Migration ─────────────────────────────────────────────
  { id: 'hum-iom-events', organization: 'IOM', url: 'https://www.iom.int/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [10, 1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-mixed-migration', organization: 'Mixed Migration Centre', url: 'https://mixedmigration.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [10], region: 'Global', language: 'en', requires_auth: false },
  { id: 'hum-idmc-events', organization: 'IDMC', url: 'https://www.internal-displacement.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1, 11], region: 'Global', language: 'en', requires_auth: false },
];
