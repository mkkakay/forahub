import type { ScraperSource } from './types';

export const SOURCES_PACIFIC_OCEANIA: ScraperSource[] = [

  // ── Pacific Regional Organizations ────────────────────────────────────────
  { id: 'pac-pifs-events', organization: 'Pacific Islands Forum', url: 'https://www.forumsec.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [13, 17], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-pif-leaders', organization: 'Pacific Forum Leaders', url: 'https://www.forumsec.org/pacific-leaders/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [13, 17], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-spc-events', organization: 'Pacific Community (SPC)', url: 'https://www.spc.int/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3, 13], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-sprep-events', organization: 'SPREP', url: 'https://www.sprep.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [13, 14], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-pifs-giz', organization: 'PRIF Pacific', url: 'https://www.pacificregionalinfrastructure.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [9], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-pacer-events', organization: 'PACER Plus', url: 'https://www.pacerplus.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8, 17], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-sopac-events', organization: 'Pacific Community Geoscience', url: 'https://gsd.spc.int/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [11, 13], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-ffa-events', organization: 'Pacific Islands Forum Fisheries Agency', url: 'https://www.ffa.int/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [14, 8], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-spto-events', organization: 'South Pacific Tourism Organisation', url: 'https://www.spto.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8], region: 'Pacific', language: 'en', requires_auth: false },

  // ── Pacific Climate ────────────────────────────────────────────────────────
  { id: 'pac-pccc-events', organization: 'Pacific Climate Change Centre', url: 'https://www.sprep.org/pacific-climate-change-centre', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [13], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-prism-events', organization: 'PRISM Pacific', url: 'https://prism.spc.int/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [13], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-cop-pacific', organization: 'Pacific COP Delegation', url: 'https://www.forumsec.org/climate/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [13], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-gcca-pacific', organization: 'GCCA+ Pacific', url: 'https://www.gcca.eu/regions/pacific', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [13], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-pcf-events', organization: 'Pacific Catastrophe Risk Fund', url: 'https://www.pcrafi.org/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [13, 11], region: 'Pacific', language: 'en', requires_auth: false },

  // ── Australia ──────────────────────────────────────────────────────────────
  { id: 'pac-dfat-events', organization: 'DFAT Australia', url: 'https://www.dfat.gov.au/news/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-ausaid-events', organization: 'AUSAID Development', url: 'https://www.dfat.gov.au/international-relations/themes/development', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17, 1], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-anu-events', organization: 'Australian National University', url: 'https://www.anu.edu.au/about/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [4, 17], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-devpolicycentre', organization: 'Development Policy Centre', url: 'https://devpolicy.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17, 1], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-lowy-events', organization: 'Lowy Institute', url: 'https://www.lowyinstitute.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [16, 17], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-aspi-events', organization: 'ASPI', url: 'https://www.aspi.org.au/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [16], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-aiia-events', organization: 'AIIA', url: 'https://www.internationalaffairs.org.au/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17, 16], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-unimelb-events', organization: 'University of Melbourne', url: 'https://events.unimelb.edu.au/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [4, 3], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-usyd-events', organization: 'University of Sydney', url: 'https://www.sydney.edu.au/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [4], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-uq-events', organization: 'University of Queensland', url: 'https://events.uq.edu.au/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [4, 3], region: 'Pacific', language: 'en', requires_auth: false },

  // ── New Zealand ────────────────────────────────────────────────────────────
  { id: 'pac-mfat-events', organization: 'MFAT New Zealand', url: 'https://www.mfat.govt.nz/en/media-and-resources/news-and-events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-nzaid-events', organization: 'New Zealand Aid', url: 'https://www.mfat.govt.nz/en/aid-and-development/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [17, 1], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-univ-auckland', organization: 'University of Auckland', url: 'https://www.auckland.ac.nz/en/events.html', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [4], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-vuw-events', organization: 'Victoria University Wellington', url: 'https://www.wgtn.ac.nz/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [4, 16], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-devnet-nz', organization: 'DevNet NZ', url: 'https://devnet.org.nz/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [17], region: 'Pacific', language: 'en', requires_auth: false },

  // ── Pacific Island Countries ───────────────────────────────────────────────
  { id: 'pac-fiji-govt', organization: 'Fiji Government', url: 'https://www.fiji.gov.fj/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [13], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-solomon-govt', organization: 'Solomon Islands Government', url: 'https://www.solomons.gov.sb/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [13, 16], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-vanuatu-govt', organization: 'Vanuatu Government', url: 'https://www.gov.vu/en/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [13], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-samoa-govt', organization: 'Samoa Government', url: 'https://www.samoagovt.ws/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [13], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-png-govt', organization: 'Papua New Guinea Government', url: 'https://www.pm.gov.pg/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [13, 15], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-tonga-govt', organization: 'Tonga Government', url: 'https://www.gov.to/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [13], region: 'Pacific', language: 'en', requires_auth: false },

  // ── Pacific Ocean and Marine ───────────────────────────────────────────────
  { id: 'pac-picsea-events', organization: 'Pacific Ocean Alliance', url: 'https://pacifococeanalliance.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [14], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-ioc-pacific', organization: 'IOC UNESCO Pacific', url: 'https://www.ioc-tsunami.org/index.php/pacific', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [14], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-pn-ocean', organization: 'Pacific Network on Ocean', url: 'https://www.pnaoceans.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [14], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-aims-events', organization: 'AIMS', url: 'https://www.aims.gov.au/research/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [14, 13], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-iucn-oceania', organization: 'IUCN Oceania', url: 'https://www.iucn.org/regions/oceania/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [14, 15], region: 'Pacific', language: 'en', requires_auth: false },

  // ── Pacific Health ─────────────────────────────────────────────────────────
  { id: 'pac-who-pacific', organization: 'WHO Western Pacific', url: 'https://www.who.int/westernpacific/news/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [3], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-phc-events', organization: 'Pacific Health Forum', url: 'https://www.spc.int/events?category=health', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [3], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-cue-health', organization: 'CPHHA', url: 'https://www.commonwealthhealth.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [3], region: 'Pacific', language: 'en', requires_auth: false },

  // ── Pacific Education and Youth ────────────────────────────────────────────
  { id: 'pac-usp-events', organization: 'University of the South Pacific', url: 'https://www.usp.ac.fj/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [4], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-upng-events', organization: 'University of Papua New Guinea', url: 'https://www.upng.ac.pg/index.php/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [4], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-youthpacific', organization: 'Pacific Youth Council', url: 'https://www.pacificyouth.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [4, 8], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-pacificyouthconf', organization: 'Pacific Youth Conference', url: 'https://www.forumsec.org/youth/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [4], region: 'Pacific', language: 'en', requires_auth: false },

  // ── Pacific Governance and Democracy ──────────────────────────────────────
  { id: 'pac-undp-pacific', organization: 'UNDP Pacific', url: 'https://www.undp.org/pacific/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [16, 1], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-pran-events', organization: 'Pacific Regional Action Network', url: 'https://www.pacifichumanrights.net/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [16], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-commonwealth-pacific', organization: 'Commonwealth Pacific', url: 'https://thecommonwealth.org/pacific/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [17, 16], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-ifes-pacific', organization: 'IFES Pacific Elections', url: 'https://www.ifes.org/regions/asia-pacific', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [16], region: 'Pacific', language: 'en', requires_auth: false },

  // ── Pacific Disasters and Resilience ──────────────────────────────────────
  { id: 'pac-pdmc-events', organization: 'Pacific Disaster Centre', url: 'https://www.pdc.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [11, 13], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-crew-events', organization: 'CREW Pacific', url: 'https://www.crew.ac.uk/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [11], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-drr-pacific', organization: 'Pacific DRR Platform', url: 'https://www.undrr.org/regions/asia-pacific-and-pacific', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [11, 13], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-ifrc-pacific', organization: 'IFRC Pacific', url: 'https://www.ifrc.org/where-we-work/asia-pacific', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [3, 11], region: 'Pacific', language: 'en', requires_auth: false },

  // ── Pacific Economy and Trade ──────────────────────────────────────────────
  { id: 'pac-adb-pacific', organization: 'ADB Pacific', url: 'https://www.adb.org/where-we-work/pacific', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-world-bank-pacific', organization: 'World Bank Pacific', url: 'https://www.worldbank.org/en/region/eap/pacificislands', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-apec-events', organization: 'APEC', url: 'https://www.apec.org/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [8, 17], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-pftac-events', organization: 'PFTAC', url: 'https://www.pftac.org/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8, 17], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-pacifictrade-events', organization: 'Pacific Trade and Invest', url: 'https://pacifictradeinvest.com/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [8, 17], region: 'Pacific', language: 'en', requires_auth: false },

  // ── Pacific Agriculture and Food ───────────────────────────────────────────
  { id: 'pac-fao-pacific', organization: 'FAO Pacific', url: 'https://www.fao.org/asiapacific/news/detail-news/en/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'weekly', primary_sdg_goals: [2], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-lrd-events', organization: 'Land Resources Division SPC', url: 'https://lrd.spc.int/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [2, 15], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-pacer-food', organization: 'Pacific Food Security', url: 'https://www.spc.int/lrd/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [2], region: 'Pacific', language: 'en', requires_auth: false },

  // ── Indigenous Pacific ─────────────────────────────────────────────────────
  { id: 'pac-indigenous-pacific', organization: 'Pacific Indigenous Network', url: 'https://www.forumsec.org/indigenous-peoples/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [10, 15], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-maori-events', organization: 'Te Puni Kōkiri', url: 'https://www.tpk.govt.nz/en/events/', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [10], region: 'Pacific', language: 'en', requires_auth: false },
  { id: 'pac-atsi-events', organization: 'AIATSIS', url: 'https://aiatsis.gov.au/events', source_type: 'website', scrape_method: 'html', scrape_frequency: 'monthly', primary_sdg_goals: [10], region: 'Pacific', language: 'en', requires_auth: false },
];
