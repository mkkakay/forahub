import type { ScraperSource } from './types';

export const SOURCES_ECONOMIC_FINANCE: ScraperSource[] = [

  // ── World Bank Group ────────────────────────────────────────────────────────
  { id: 'fin-worldbank-events', organization: 'World Bank', url: 'https://www.worldbank.org/en/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-ifc-events', organization: 'IFC', url: 'https://www.ifc.org/en/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-miga-events', organization: 'MIGA', url: 'https://www.miga.org/news-and-events/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-worldbank-am', organization: 'World Bank Annual Meetings', url: 'https://meetings.imf.org/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [17], region: 'Global', language: 'en', requires_auth: false },

  // ── IMF ─────────────────────────────────────────────────────────────────────
  { id: 'fin-imf-events', organization: 'IMF', url: 'https://www.imf.org/en/News/Seminars', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-imf-conferences', organization: 'IMF Conferences', url: 'https://www.imf.org/en/news/search#!facets=PR&sort=date-desc', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8], region: 'Global', language: 'en', requires_auth: false },

  // ── Regional Development Banks ─────────────────────────────────────────────
  { id: 'fin-afdb-events', organization: 'African Development Bank', url: 'https://www.afdb.org/en/news-and-events/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Africa', language: 'en', requires_auth: false },
  { id: 'fin-adb-events', organization: 'Asian Development Bank', url: 'https://www.adb.org/news/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Asia-Pacific', language: 'en', requires_auth: false },
  { id: 'fin-iadb-events', organization: 'Inter-American Development Bank', url: 'https://www.iadb.org/en/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Americas-Latin', language: 'en', requires_auth: false },
  { id: 'fin-ebrd-events', organization: 'EBRD', url: 'https://www.ebrd.com/cs/Satellite?c=Content&cid=1395310720296&pagename=EBRD%2FContent%2FContentLayout', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Europe-East', language: 'en', requires_auth: false },
  { id: 'fin-eib-events', organization: 'European Investment Bank', url: 'https://www.eib.org/en/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Europe', language: 'en', requires_auth: false },
  { id: 'fin-isdb-events', organization: 'Islamic Development Bank', url: 'https://www.isdb.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-aiib-events', organization: 'AIIB', url: 'https://www.aiib.org/en/news-events/events/index.html', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Asia-Pacific', language: 'en', requires_auth: false },
  { id: 'fin-ndb-events', organization: 'New Development Bank', url: 'https://www.ndb.int/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-caf-events', organization: 'CAF Development Bank', url: 'https://www.caf.com/en/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Americas-Latin', language: 'es', requires_auth: false },
  { id: 'fin-fonplata-events', organization: 'FONPLATA', url: 'https://www.fonplata.org/en/news/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8, 17], region: 'Americas-Latin', language: 'es', requires_auth: false },

  // ── WTO and Trade ───────────────────────────────────────────────────────────
  { id: 'fin-wto-events', organization: 'WTO', url: 'https://www.wto.org/english/news_e/news_e.htm?type=event', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-unctad-events', organization: 'UNCTAD', url: 'https://unctad.org/meetings', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-icc-trade', organization: 'ICC Trade Finance', url: 'https://iccwbo.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-ita-events', organization: 'ITC Geneva', url: 'https://www.intracen.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },

  // ── OECD ────────────────────────────────────────────────────────────────────
  { id: 'fin-oecd-events', organization: 'OECD', url: 'https://www.oecd.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-oecd-dev', organization: 'OECD Development', url: 'https://www.oecd.org/development/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-oecd-tax', organization: 'OECD Tax', url: 'https://www.oecd.org/tax/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-oecd-forum', organization: 'OECD Forum', url: 'https://www.oecd.org/forum/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },

  // ── WEF and Davos ──────────────────────────────────────────────────────────
  { id: 'fin-wef-events', organization: 'World Economic Forum', url: 'https://www.weforum.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-wef-davos', organization: 'WEF Davos', url: 'https://www.weforum.org/events/world-economic-forum-annual-meeting-2025/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8], region: 'Europe', language: 'en', requires_auth: false },
  { id: 'fin-wef-summits', organization: 'WEF Regional Summits', url: 'https://www.weforum.org/agenda/2025/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8], region: 'Global', language: 'en', requires_auth: false },

  // ── Development Finance ────────────────────────────────────────────────────
  { id: 'fin-ffd-forum', organization: 'UN Financing for Development', url: 'https://www.un.org/esa/ffd/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-oecd-dac', organization: 'OECD DAC', url: 'https://www.oecd.org/dac/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-gpedc-events', organization: 'Global Partnership for Effective Development Cooperation', url: 'https://www.effectivecooperation.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-aiddata-events', organization: 'AidData', url: 'https://www.aiddata.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-devinit-events', organization: 'Development Initiatives', url: 'https://devinit.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17], region: 'Global', language: 'en', requires_auth: false },

  // ── Green Finance ──────────────────────────────────────────────────────────
  { id: 'fin-gcf-events', organization: 'Green Climate Fund', url: 'https://www.greenclimate.fund/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [13, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-af-events', organization: 'Adaptation Fund', url: 'https://www.adaptation-fund.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [13, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-cif-events', organization: 'Climate Investment Funds', url: 'https://www.climateinvestmentfunds.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [13, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-gef-events', organization: 'GEF', url: 'https://www.thegef.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [13, 15], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-unepfi-events', organization: 'UNEP Finance Initiative', url: 'https://www.unepfi.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [13, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-gsff-events', organization: 'Global Sustainable Finance Forum', url: 'https://www.gsff.net/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [13, 17], region: 'Global', language: 'en', requires_auth: false },

  // ── Labour and Decent Work ─────────────────────────────────────────────────
  { id: 'fin-ilo-events', organization: 'ILO', url: 'https://www.ilo.org/global/meetings-and-events/lang--en/index.htm', source_type: 'website', scrape_method: 'html', scrape_frequency: 'daily', primary_sdg_goals: [8, 10], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-ilo-ilc', organization: 'ILO International Labour Conference', url: 'https://www.ilo.org/ilc/ILCSessions/lang--en/index.htm', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-ilo-africa', organization: 'ILO Africa', url: 'https://www.ilo.org/africa/lang--en/index.htm', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8], region: 'Africa', language: 'en', requires_auth: false },

  // ── Private Sector and Investment ──────────────────────────────────────────
  { id: 'fin-ifc-investconf', organization: 'IFC Investment Conference', url: 'https://www.ifc.org/en/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-unctad-world-invest', organization: 'UNCTAD World Investment Forum', url: 'https://unctad.org/meetings/en/SessionalDocuments/wif2024_en.pdf', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-africa-investconf', organization: 'Africa Investment Forum', url: 'https://africainvestmentforum.com/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8, 17], region: 'Africa', language: 'en', requires_auth: false },
  { id: 'fin-arab-invest', organization: 'Arab Investment Forum', url: 'https://arabinvestmentforum.com/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8, 17], region: 'Middle-East', language: 'en', requires_auth: false },
  { id: 'fin-latam-invest', organization: 'LatAm Investment Conference', url: 'https://www.iadb.org/en/news/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8, 17], region: 'Americas-Latin', language: 'es', requires_auth: false },
  { id: 'fin-asia-invest', organization: 'Asia Investment Summit', url: 'https://www.adb.org/news/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8, 17], region: 'Asia-Pacific', language: 'en', requires_auth: false },

  // ── Poverty and Inequality ─────────────────────────────────────────────────
  { id: 'fin-ophi-events', organization: 'OPHI', url: 'https://ophi.org.uk/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [1, 10], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-undesa-forum', organization: 'UNDESA Development Forum', url: 'https://www.un.org/development/desa/en/key-issues/development-cooperation.html', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [1, 17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-cgdev-economics', organization: 'CGD Economics', url: 'https://www.cgdev.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-wid-events', organization: 'World Inequality Database', url: 'https://wid.world/news-article/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [10], region: 'Global', language: 'en', requires_auth: false },

  // ── Financial Inclusion ────────────────────────────────────────────────────
  { id: 'fin-gpfi-events', organization: 'G20 GPFI', url: 'https://www.gpfi.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8, 1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-afii-events', organization: 'Alliance for Financial Inclusion', url: 'https://www.afi-global.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-cgap-events', organization: 'CGAP', url: 'https://www.cgap.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-fibr-events', organization: 'FIBR', url: 'https://fibr.io/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8, 1], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-mfw4a-events', organization: 'MFW4A', url: 'https://www.mfw4a.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8, 1], region: 'Africa', language: 'en', requires_auth: false },

  // ── Tax and Domestic Revenue ────────────────────────────────────────────────
  { id: 'fin-ataf-events', organization: 'African Tax Administration Forum', url: 'https://www.ataftax.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17], region: 'Africa', language: 'en', requires_auth: false },
  { id: 'fin-ciat-events', organization: 'CIAT Tax Administration', url: 'https://www.ciat.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [17], region: 'Americas-Latin', language: 'es', requires_auth: false },
  { id: 'fin-taxjustice-events', organization: 'Tax Justice Network', url: 'https://taxjustice.net/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17], region: 'Global', language: 'en', requires_auth: false },
  { id: 'fin-ictd-events', organization: 'ICTD', url: 'https://www.ictd.ac/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17], region: 'Global', language: 'en', requires_auth: false },
];
