-- ForaHub Seed Data: 100 SDG Events, May 2027 – March 2029

BEGIN;

DELETE FROM public.events;

INSERT INTO public.events
  (title, description, start_date, end_date, location, organization, sdg_goals, event_type, format, registration_url, is_featured)
VALUES

-- ── MAY 2026 ────────────────────────────────────────────────────────────────

('79th World Health Assembly',
 'Annual decision-making assembly of WHO member states setting global health policy, approving budgets, and addressing emerging health threats.',
 '2027-05-18', '2027-05-26', 'Geneva, Switzerland', 'WHO',
 ARRAY[3,10], 'conference', 'hybrid', 'https://www.who.int/wha79', true),

('UN Forum on Forests 21st Session',
 'Twenty-first session of the UN Forum on Forests reviewing progress on the UN Strategic Plan for Forests 2017–2030.',
 '2027-05-04', '2027-05-08', 'New York, USA', 'UNFF',
 ARRAY[15,13], 'conference', 'hybrid', 'https://www.un.org/esa/forests', false),

('GPE Board of Directors Meeting — May 2026',
 'Meeting of the Global Partnership for Education Board making decisions on grants, strategy, and country allocations.',
 '2027-05-19', '2027-05-21', 'Brussels, Belgium', 'Global Partnership for Education',
 ARRAY[4,5], 'conference', 'hybrid', 'https://www.globalpartnership.org', false),

('World Bank Land Conference 2026',
 'Annual conference on land governance, tenure security, and agricultural development in developing countries.',
 '2027-05-06', '2027-05-08', 'Washington DC, USA', 'World Bank',
 ARRAY[2,15,1], 'conference', 'hybrid', 'https://www.worldbank.org/landconference', false),

('FAO Committee on Fisheries (COFI) 36th Session',
 'Biennial intergovernmental forum on fisheries and aquaculture policy, with a focus on ocean food systems and SDG 14.',
 '2027-05-11', '2027-05-15', 'Rome, Italy', 'FAO',
 ARRAY[14,2], 'conference', 'hybrid', 'https://www.fao.org/cofi', false),

('UNHCR Training: Climate-Induced Displacement Protection',
 'Professional training on refugee and displacement protection frameworks applied to climate-induced contexts.',
 '2027-05-20', '2027-05-22', 'Online', 'UNHCR',
 ARRAY[16,13,10], 'training', 'virtual', 'https://www.unhcr.org/training', false),

-- ── JUNE 2026 ───────────────────────────────────────────────────────────────

('Bonn Climate Change Conference (SB64)',
 'Sessions of the UNFCCC subsidiary bodies SBI and SBSTA conducting technical negotiations on implementation of the Paris Agreement.',
 '2027-06-15', '2027-06-25', 'Bonn, Germany', 'UNFCCC',
 ARRAY[13], 'conference', 'in_person', 'https://unfccc.int/sb64', false),

('International Labour Conference 114th Session',
 'Annual supreme decision-making body of the ILO setting international labour standards and global employment policies.',
 '2027-06-01', '2027-06-12', 'Geneva, Switzerland', 'ILO',
 ARRAY[8,1,10], 'conference', 'hybrid', 'https://www.ilo.org/ilc', false),

('Clean Energy Ministerial (CEM17)',
 'High-level global forum for government ministers advancing clean energy technology and policy for the 2030 targets.',
 '2027-06-08', '2027-06-09', 'Seoul, South Korea', 'IEA',
 ARRAY[7,13], 'conference', 'in_person', 'https://www.cleanenergyministerial.org', false),

('UN-Habitat Assembly 5th Session',
 'Fifth session of the UN-Habitat Assembly, the supreme governing body of the UN Human Settlements Programme.',
 '2027-06-01', '2027-06-05', 'Nairobi, Kenya', 'UN-Habitat',
 ARRAY[11,1], 'conference', 'hybrid', 'https://unhabitat.org/assembly', false),

('ECOSOC Humanitarian Affairs Segment 2026',
 'Annual segment reviewing coordination of humanitarian assistance and progress on Grand Bargain reform commitments.',
 '2027-06-17', '2027-06-19', 'Geneva, Switzerland', 'OCHA / ECOSOC',
 ARRAY[16,10], 'conference', 'hybrid', 'https://www.un.org/ecosoc/en/has', false),

('UNICEF Webinar: Child-Centred Climate Adaptation',
 'Webinar on integrating children''s rights and needs into national climate adaptation plans and updated NDCs.',
 '2027-06-11', null, 'Online', 'UNICEF',
 ARRAY[13,3,4], 'webinar', 'virtual', 'https://www.unicef.org/environment-and-climate-change', false),

-- ── JULY 2026 ───────────────────────────────────────────────────────────────

('UN High-Level Political Forum on Sustainable Development 2026',
 'The central UN platform for follow-up and review of the 2030 Agenda, with ministerial segment and Voluntary National Reviews.',
 '2027-07-06', '2027-07-17', 'New York, USA', 'UN DESA',
 ARRAY[17,10,1], 'conference', 'hybrid', 'https://hlpf.un.org', true),

('ECOSOC High-Level Segment 2026',
 'High-level segment of the UN Economic and Social Council reviewing SDG implementation progress and the 2030 Agenda.',
 '2027-07-06', '2027-07-09', 'New York, USA', 'ECOSOC',
 ARRAY[10,17,1], 'conference', 'hybrid', 'https://www.un.org/ecosoc', false),

('IOM Training: Data for Migration Policy',
 'Practitioner training on using migration data and evidence to design responsive migration and development policies.',
 '2027-07-06', '2027-07-10', 'Online', 'IOM / MiGOF',
 ARRAY[10,16,17], 'training', 'virtual', 'https://www.iom.int', false),

-- ── AUGUST 2026 ─────────────────────────────────────────────────────────────

('Stockholm World Water Week 2026',
 'Annual global meeting place for water and development challenges, convening scientists, policymakers, and the private sector.',
 '2027-08-23', '2027-08-27', 'Stockholm, Sweden', 'SIWI',
 ARRAY[6,14,13], 'conference', 'hybrid', 'https://www.worldwaterweek.org', false),

('WHO Regional Committee for Africa (RC76)',
 'Annual meeting of WHO''s 47 African member states to review regional health priorities and approve programme budgets.',
 '2027-08-24', '2027-08-28', 'Brazzaville, Republic of Congo', 'WHO AFRO',
 ARRAY[3], 'conference', 'hybrid', 'https://www.afro.who.int', false),

('UNDP Climate Finance Readiness Training Programme 2026',
 'Capacity-building programme helping developing country governments access, manage, and report on climate finance.',
 '2027-08-10', '2027-09-04', 'Online', 'UNDP',
 ARRAY[13,17,1], 'training', 'virtual', 'https://www.undp.org/climate-finance', false),

('International AIDS Conference 2026 (AIDS 2026)',
 'The world''s largest conference on HIV/AIDS science and policy, bringing together researchers, clinicians, and advocates.',
 '2027-08-03', '2027-08-07', 'Montreal, Canada', 'International AIDS Society',
 ARRAY[3,10], 'conference', 'hybrid', 'https://www.iasociety.org', true),

-- ── SEPTEMBER 2026 ──────────────────────────────────────────────────────────

('81st UN General Assembly High-Level Week',
 'Annual high-level general debate of the UN General Assembly, bringing together Heads of State from 193 member states.',
 '2027-09-21', '2027-09-26', 'New York, USA', 'UN Secretariat',
 ARRAY[16,17], 'conference', 'in_person', 'https://www.un.org/en/ga', true),

('International Conference on Social Protection 2026',
 'Conference on expanding social protection floors and adaptive social protection in fragile and developing countries.',
 '2027-09-14', '2027-09-16', 'Addis Ababa, Ethiopia', 'ILO / World Bank / UNICEF',
 ARRAY[1,10,3], 'conference', 'hybrid', null, false),

('GWOPA Water Operator Partnerships Training 2026',
 'Capacity-building training programme for water and sanitation utilities in developing countries.',
 '2027-09-14', '2027-09-25', 'Online', 'GWOPA / UN-Habitat',
 ARRAY[6,11], 'training', 'virtual', null, false),

('International Conference on Urban Resilience 2026',
 'Conference sharing city-level solutions for climate-resilient urban development across the Global South.',
 '2027-09-14', '2027-09-16', 'Singapore', 'UNDRR',
 ARRAY[11,13], 'conference', 'hybrid', null, false),

('Generation Equality Forum: Annual Progress Review 2026',
 'Annual review of commitments made under the Generation Equality Forum Action Coalitions, tracking implementation.',
 '2027-09-22', '2027-09-24', 'New York, USA', 'UN Women',
 ARRAY[5,10], 'conference', 'hybrid', 'https://forum.generationequality.org', false),

('UNESCO World Education Forum 2026',
 'Global forum stocktaking progress on SDG 4, discussing education financing, quality, equity, and inclusion.',
 '2027-09-28', '2027-09-30', 'Paris, France', 'UNESCO / GPE',
 ARRAY[4,5,10], 'conference', 'hybrid', 'https://www.unesco.org/en/education-forums', false),

-- ── OCTOBER 2026 ────────────────────────────────────────────────────────────

('World Food Forum 2026',
 'Annual flagship youth event on food systems transformation, co-hosted by FAO, IFAD, and WFP.',
 '2027-10-19', '2027-10-23', 'Rome, Italy', 'FAO / IFAD / WFP',
 ARRAY[2,12,13], 'conference', 'hybrid', 'https://www.worldfoodforum.org', true),

('Committee on World Food Security (CFS) 53rd Plenary',
 'Plenary session of the UN Committee on World Food Security, the most inclusive intergovernmental platform on food security.',
 '2027-10-12', '2027-10-16', 'Rome, Italy', 'CFS / FAO',
 ARRAY[2,1], 'conference', 'hybrid', 'https://www.fao.org/cfs', false),

('World Bank / IMF Annual Meetings 2026',
 'Annual meetings of the World Bank Group and IMF reviewing global economic developments and development finance.',
 '2027-10-12', '2027-10-17', 'Washington DC, USA', 'World Bank / IMF',
 ARRAY[17,8,10], 'conference', 'hybrid', 'https://www.worldbank.org/en/meetings/annual', false),

('ITU Digital World 2026',
 'ITU''s annual flagship event connecting ICT regulators, innovators, and investors from 150+ countries.',
 '2027-10-05', '2027-10-08', 'Bangkok, Thailand', 'ITU',
 ARRAY[9,17,1], 'conference', 'hybrid', 'https://digitalworld.itu.int', false),

('High-Level Event on Poverty Eradication 2026',
 'Annual UN high-level event reviewing progress on ending extreme poverty and inequality ahead of 2030.',
 '2027-10-16', null, 'New York, USA', 'UN DESA',
 ARRAY[1,10], 'side_event', 'hybrid', 'https://www.un.org/development/desa', false),

('Global Mental Health Summit 2026',
 'International summit scaling mental health services in low- and middle-income countries.',
 '2027-10-08', '2027-10-09', 'London, United Kingdom', 'UK Government / WHO',
 ARRAY[3,16], 'conference', 'hybrid', null, false),

('Gavi Investment Forum 2026',
 'High-level meeting to mobilise funding commitments for immunisation programmes in the world''s poorest countries.',
 '2027-10-27', '2027-10-28', 'Geneva, Switzerland', 'Gavi, the Vaccine Alliance',
 ARRAY[3,10], 'conference', 'hybrid', 'https://www.gavi.org', false),

('Smart Cities Expo World Congress 2026',
 'Global event showcasing smart city technology and urban innovation for sustainability and quality of life.',
 '2027-10-06', '2027-10-08', 'Barcelona, Spain', 'Fira de Barcelona',
 ARRAY[11,9], 'conference', 'in_person', 'https://www.smartcityexpo.com', false),

-- ── NOVEMBER 2026 ───────────────────────────────────────────────────────────

('COP31 UN Climate Conference',
 'The 31st session of the Conference of the Parties to the UNFCCC, advancing implementation of the Paris Agreement.',
 '2027-11-09', '2027-11-20', 'Istanbul, Turkey', 'UNFCCC',
 ARRAY[13,15,17], 'conference', 'in_person', 'https://unfccc.int/cop31', true),

('Internet Governance Forum 2026',
 'Annual UN multi-stakeholder forum on internet governance policy, examining AI governance and digital rights.',
 '2027-11-16', '2027-11-20', 'Berlin, Germany', 'UN DESA / IGF Secretariat',
 ARRAY[9,16,4], 'conference', 'hybrid', 'https://www.intgovforum.org', false),

('Paris Peace Forum 2026',
 'Annual gathering of global governance actors working on multilateral solutions to shared challenges.',
 '2027-11-10', '2027-11-12', 'Paris, France', 'Paris Peace Forum',
 ARRAY[16,17], 'conference', 'in_person', 'https://parispeaceforum.org', false),

('Global Forum on Business and Human Rights 2026',
 'Annual multi-stakeholder forum reviewing implementation of the UN Guiding Principles on Business and Human Rights.',
 '2027-11-02', '2027-11-04', 'Geneva, Switzerland', 'UN OHCHR',
 ARRAY[8,16], 'conference', 'hybrid', 'https://www.ohchr.org/en/events/global-forum-business-and-human-rights', false),

('Global Migration Forum 2026',
 'Annual intergovernmental forum on managing migration for development, safety, and dignity.',
 '2027-11-23', '2027-11-24', 'Geneva, Switzerland', 'GFMD',
 ARRAY[10,16], 'conference', 'hybrid', 'https://www.gfmd.org', false),

('OECD Development Assistance Committee High-Level Meeting 2026',
 'Annual high-level meeting of OECD DAC members reviewing ODA trends and aid effectiveness.',
 '2027-11-03', '2027-11-04', 'Paris, France', 'OECD DAC',
 ARRAY[1,17], 'conference', 'hybrid', 'https://www.oecd.org/dac', false),

('Global Nutrition Report Launch 2026',
 'Annual launch of the Global Nutrition Report, the world''s most comprehensive assessment of progress on nutrition.',
 '2027-11-18', null, 'Online', 'Global Nutrition Report / UNICEF / WHO',
 ARRAY[2,3,1], 'side_event', 'virtual', 'https://globalnutritionreport.org', false),

('UHC Partnership Annual Forum 2026',
 'Annual forum of the UHC2030 partnership reviewing progress on Universal Health Coverage commitments.',
 '2027-11-16', '2027-11-17', 'Brussels, Belgium', 'UHC2030',
 ARRAY[3,17], 'conference', 'hybrid', 'https://www.uhc2030.org', false),

-- ── DECEMBER 2026 ───────────────────────────────────────────────────────────

('UNCCD COP18 — Desertification Conference',
 'Eighteenth Conference of the Parties to the UN Convention to Combat Desertification, reviewing Land Degradation Neutrality targets.',
 '2027-12-07', '2027-12-18', 'Ulaanbaatar, Mongolia', 'UNCCD',
 ARRAY[15,2,13], 'conference', 'in_person', 'https://www.unccd.int/cop18', false),

('GPAI Annual Summit 2026',
 'Annual summit of the Global Partnership on AI advancing responsible and inclusive artificial intelligence for development.',
 '2027-12-07', '2027-12-09', 'Tokyo, Japan', 'GPAI',
 ARRAY[9,4,16], 'conference', 'in_person', 'https://gpai.ai', false),

-- ── JANUARY 2027 ────────────────────────────────────────────────────────────

('World Economic Forum Annual Meeting 2027',
 'Annual Davos gathering of global business, government, and civil society leaders on economic and social challenges.',
 '2028-01-18', '2028-01-22', 'Davos, Switzerland', 'World Economic Forum',
 ARRAY[8,17,9], 'conference', 'in_person', 'https://www.weforum.org', true),

('IRENA 17th Assembly',
 'Annual Assembly of the International Renewable Energy Agency reviewing global energy transition progress.',
 '2028-01-10', '2028-01-11', 'Abu Dhabi, UAE', 'IRENA',
 ARRAY[7,13,17], 'conference', 'hybrid', 'https://www.irena.org/assembly', false),

('World Water Congress & Exhibition 2027',
 'International Water Association''s biennial congress on water science, technology, and utility management.',
 '2028-01-11', '2028-01-15', 'Copenhagen, Denmark', 'International Water Association',
 ARRAY[6,9,11], 'conference', 'in_person', 'https://www.worldwatercongress.org', false),

-- ── FEBRUARY 2027 ───────────────────────────────────────────────────────────

('Asia-Pacific Forum on Sustainable Development 2027',
 'Regional preparatory meeting for the HLPF reviewing SDG implementation across Asia and the Pacific.',
 '2028-02-24', '2028-02-26', 'Bangkok, Thailand', 'UNESCAP',
 ARRAY[17,13,10], 'conference', 'hybrid', 'https://www.unescap.org/apfsd', false),

('Africa Regional Forum on Sustainable Development 2027',
 'Annual forum reviewing SDG progress in Africa and aligning African positions for the global HLPF.',
 '2028-02-16', '2028-02-20', 'Addis Ababa, Ethiopia', 'UNECA',
 ARRAY[17,8,13], 'conference', 'hybrid', 'https://www.uneca.org/rfsd', false),

('IFAD Governing Council 51st Session',
 'Annual meeting of IFAD member states reviewing operations and approving budgets for rural development.',
 '2028-02-16', '2028-02-18', 'Rome, Italy', 'IFAD',
 ARRAY[2,1,8], 'conference', 'hybrid', 'https://www.ifad.org', false),

('CBD COP17 — Conference of the Parties on Biodiversity',
 'Seventeenth Conference of the Parties to the Convention on Biological Diversity reviewing Kunming-Montreal Framework implementation.',
 '2028-02-22', '2028-03-06', 'Cali, Colombia', 'CBD Secretariat',
 ARRAY[15,14], 'conference', 'in_person', 'https://www.cbd.int/cop17', true),

-- ── MARCH 2027 ──────────────────────────────────────────────────────────────

('Commission on the Status of Women 71st Session (CSW71)',
 'The world''s foremost intergovernmental body on gender equality and women''s empowerment. Priority theme: Women and the digital economy.',
 '2028-03-08', '2028-03-19', 'New York, USA', 'UN Women / ECOSOC',
 ARRAY[5,10,17], 'conference', 'hybrid', 'https://www.unwomen.org/en/csw', true),

('Human Rights Council 62nd Session',
 'Regular session of the UN Human Rights Council reviewing country human rights situations and thematic issues.',
 '2028-03-01', '2028-03-26', 'Geneva, Switzerland', 'UN OHCHR',
 ARRAY[16,10], 'conference', 'hybrid', 'https://www.ohchr.org/en/hrbodies/hrc', false),

('NPT Review Conference 2027',
 'Review Conference for the Treaty on the Non-Proliferation of Nuclear Weapons, examining disarmament and non-proliferation progress.',
 '2028-03-15', '2028-04-09', 'New York, USA', 'UN Office for Disarmament Affairs',
 ARRAY[16], 'conference', 'in_person', 'https://www.un.org/en/conf/npt', false),

('South-South and Triangular Cooperation Forum 2027',
 'High-level forum sharing development solutions and innovations across countries of the Global South.',
 '2028-03-08', '2028-03-10', 'Nairobi, Kenya', 'UNOSSC',
 ARRAY[17,10], 'conference', 'hybrid', 'https://www.unsouthsouth.org', false),

-- ── APRIL 2027 ──────────────────────────────────────────────────────────────

('World Bank / IMF Spring Meetings 2027',
 'Annual spring meetings of the World Bank Group and IMF Development Committee and IMFC.',
 '2028-04-12', '2028-04-17', 'Washington DC, USA', 'World Bank / IMF',
 ARRAY[17,8,1], 'conference', 'hybrid', 'https://www.worldbank.org/en/meetings', false),

('Global Disability Summit 2027',
 'Biennial summit mobilising global action on disability inclusion in development and humanitarian contexts.',
 '2028-04-07', '2028-04-08', 'Sydney, Australia', 'Government of Australia / Kenya',
 ARRAY[10,16,4], 'conference', 'hybrid', 'https://www.globaldisabilitysummit.org', false),

('UN Permanent Forum on Indigenous Issues 26th Session',
 'Annual session of UNPFII, the central UN body on indigenous peoples'' rights and well-being.',
 '2028-04-19', '2028-04-30', 'New York, USA', 'UNPFII / UN DESA',
 ARRAY[10,16,15], 'conference', 'hybrid', 'https://www.un.org/development/desa/indigenouspeoples', false),

('Nutrition for Growth Summit 2027',
 'Major pledging conference mobilising evidence-based commitments on nutrition financing from governments and the private sector.',
 '2028-04-22', '2028-04-23', 'Paris, France', 'N4G Partnership / France',
 ARRAY[2,3], 'conference', 'hybrid', 'https://nutritionforgrowth.org', true),

-- ── MAY 2027 ────────────────────────────────────────────────────────────────

('80th World Health Assembly',
 'Annual decision-making assembly of WHO member states setting global health policy and addressing emerging health threats.',
 '2028-05-17', '2028-05-25', 'Geneva, Switzerland', 'WHO',
 ARRAY[3,10], 'conference', 'hybrid', 'https://www.who.int/wha80', true),

('African Development Bank Annual Meetings 2027',
 'Annual meetings of the AfDB Group Board of Governors reviewing operations and approving strategic priorities.',
 '2028-05-24', '2028-05-28', 'Accra, Ghana', 'African Development Bank',
 ARRAY[8,1,17], 'conference', 'in_person', 'https://www.afdb.org/en/annual-meetings', false),

('Women Deliver 2027 Global Conference',
 'The world''s largest conference on gender equality and the health, rights, and well-being of women and girls.',
 '2028-05-10', '2028-05-12', 'Bogotá, Colombia', 'Women Deliver',
 ARRAY[5,3,10], 'conference', 'in_person', 'https://womendeliver.org', true),

('Global Alliance for Climate-Smart Agriculture Annual Forum 2027',
 'Annual forum showcasing climate-smart agriculture innovations and financing mechanisms for smallholder farmers.',
 '2028-05-19', '2028-05-21', 'Nairobi, Kenya', 'GACSA / FAO',
 ARRAY[2,13,1], 'conference', 'hybrid', 'https://www.fao.org/gacsa', false),

('UNESCO International Conference on AI in Education 2027',
 'International conference examining opportunities, risks, and governance of artificial intelligence for learning.',
 '2028-05-06', '2028-05-07', 'Paris, France', 'UNESCO',
 ARRAY[4,9], 'conference', 'hybrid', 'https://www.unesco.org/en/artificial-intelligence/education', false),

-- ── JUNE 2027 ───────────────────────────────────────────────────────────────

('Bonn Climate Change Conference (SB66)',
 'Sessions of the UNFCCC subsidiary bodies SBI and SBSTA conducting technical negotiations ahead of COP32.',
 '2028-06-14', '2028-06-24', 'Bonn, Germany', 'UNFCCC',
 ARRAY[13], 'conference', 'in_person', 'https://unfccc.int/sb66', false),

('International Labour Conference 115th Session',
 'Annual supreme decision-making body of the ILO setting international labour standards and global employment policies.',
 '2028-06-07', '2028-06-18', 'Geneva, Switzerland', 'ILO',
 ARRAY[8,1,10], 'conference', 'hybrid', 'https://www.ilo.org/ilc', false),

('Clean Energy Ministerial (CEM18)',
 'High-level global forum for government ministers advancing clean energy technology and policy.',
 '2028-06-07', '2028-06-08', 'Nairobi, Kenya', 'IEA / African Union',
 ARRAY[7,13], 'conference', 'in_person', 'https://www.cleanenergyministerial.org', false),

('Grand Bargain Annual Meeting 2027',
 'Annual meeting of Grand Bargain signatories reviewing progress on humanitarian effectiveness commitments.',
 '2028-06-21', '2028-06-22', 'Geneva, Switzerland', 'IASC / Grand Bargain',
 ARRAY[16,1], 'conference', 'hybrid', null, false),

('FAO E-Learning: Agroecology for Sustainable Food Systems 2027',
 'Self-paced online training on agroecological principles and food systems transformation in developing countries.',
 '2028-06-01', '2028-08-31', 'Online', 'FAO',
 ARRAY[2,12,15], 'training', 'virtual', 'https://elearning.fao.org', false),

-- ── JULY 2027 ───────────────────────────────────────────────────────────────

('UN High-Level Political Forum on Sustainable Development 2027',
 'The central UN platform for follow-up and review of the 2030 Agenda. Critical penultimate review ahead of the 2030 deadline.',
 '2028-07-05', '2028-07-16', 'New York, USA', 'UN DESA',
 ARRAY[17,10,1], 'conference', 'hybrid', 'https://hlpf.un.org', true),

('ECOSOC High-Level Segment 2027',
 'High-level segment of the UN Economic and Social Council reviewing SDG implementation progress.',
 '2028-07-05', '2028-07-08', 'New York, USA', 'ECOSOC',
 ARRAY[10,17,1], 'conference', 'hybrid', 'https://www.un.org/ecosoc', false),

-- ── AUGUST 2027 ─────────────────────────────────────────────────────────────

('Stockholm World Water Week 2027',
 'Annual global meeting place for water and development challenges, with a focus on 2030 water targets.',
 '2028-08-22', '2028-08-26', 'Stockholm, Sweden', 'SIWI',
 ARRAY[6,14,13], 'conference', 'hybrid', 'https://www.worldwaterweek.org', false),

('Africa Climate Summit 2027',
 'Pan-African summit convening Heads of State and government to accelerate climate action and a just energy transition.',
 '2028-08-25', '2028-08-27', 'Abuja, Nigeria', 'African Union',
 ARRAY[13,7,8], 'conference', 'in_person', null, true),

('IPBES 13th Plenary Session',
 'Plenary session of the Intergovernmental Science-Policy Platform on Biodiversity and Ecosystem Services delivering key assessments.',
 '2028-08-16', '2028-08-21', 'Medellín, Colombia', 'IPBES',
 ARRAY[15,14], 'conference', 'in_person', 'https://www.ipbes.net', false),

-- ── SEPTEMBER 2027 ──────────────────────────────────────────────────────────

('82nd UN General Assembly High-Level Week',
 'Annual high-level general debate of the UN General Assembly, bringing together Heads of State from 193 member states.',
 '2028-09-20', '2028-09-25', 'New York, USA', 'UN Secretariat',
 ARRAY[16,17], 'conference', 'in_person', 'https://www.un.org/en/ga', true),

('UN Ocean Conference 2027',
 'UN Ocean Conference advancing implementation of SDG 14 and the high seas treaty.',
 '2028-09-13', '2028-09-17', 'Lisbon, Portugal', 'UN DOALOS',
 ARRAY[14,6,13], 'conference', 'in_person', 'https://unoceansconference.un.org', true),

('Global Alliance for Climate-Smart Agriculture Annual Forum 2027 (Side Event)',
 'Side event at UN General Assembly on financing climate-smart agriculture for food security and adaptation.',
 '2028-09-22', null, 'New York, USA', 'GACSA',
 ARRAY[2,13], 'side_event', 'hybrid', null, false),

('International Literacy Day Global Celebration 2027',
 'Annual UNESCO event highlighting the state of literacy worldwide and recognising progress toward SDG 4 targets.',
 '2028-09-08', null, 'Paris, France', 'UNESCO',
 ARRAY[4], 'conference', 'hybrid', 'https://www.unesco.org/en/days/literacy', false),

('Digital Development Forum Africa 2027',
 'Forum advancing digital transformation across Africa, covering fintech, e-governance, and last-mile connectivity.',
 '2028-09-22', '2028-09-24', 'Kigali, Rwanda', 'ITU / UNDP',
 ARRAY[9,1,8], 'conference', 'hybrid', null, false),

-- ── OCTOBER 2027 ────────────────────────────────────────────────────────────

('World Food Forum 2027',
 'Annual flagship youth event on food systems transformation, taking stock of progress toward 2030 food security targets.',
 '2028-10-18', '2028-10-22', 'Rome, Italy', 'FAO / IFAD / WFP',
 ARRAY[2,12,13], 'conference', 'hybrid', 'https://www.worldfoodforum.org', true),

('World Bank / IMF Annual Meetings 2027',
 'Annual meetings of the World Bank Group and IMF reviewing global economic developments and development finance.',
 '2028-10-11', '2028-10-16', 'Washington DC, USA', 'World Bank / IMF',
 ARRAY[17,8,10], 'conference', 'hybrid', 'https://www.worldbank.org/en/meetings/annual', false),

('ITU Digital World 2027',
 'ITU''s annual flagship event connecting ICT regulators, innovators, and investors from 150+ countries.',
 '2028-10-04', '2028-10-07', 'Geneva, Switzerland', 'ITU',
 ARRAY[9,17,1], 'conference', 'hybrid', 'https://digitalworld.itu.int', false),

('Global Forum on Migration and Development 2027',
 'Annual intergovernmental forum on managing migration for development, safety, and dignity.',
 '2028-10-27', '2028-10-28', 'Geneva, Switzerland', 'GFMD',
 ARRAY[10,16], 'conference', 'hybrid', 'https://www.gfmd.org', false),

('Gavi Investment Forum 2027',
 'High-level meeting to mobilise funding commitments for immunisation programmes in the world''s poorest countries.',
 '2028-10-26', '2028-10-27', 'Geneva, Switzerland', 'Gavi, the Vaccine Alliance',
 ARRAY[3,10], 'conference', 'hybrid', 'https://www.gavi.org', false),

('COP30 Pre-Summit Civil Society Mobilisation 2027',
 'Global civil society convening building coordinated advocacy and accountability demands ahead of COP32.',
 '2028-10-04', '2028-10-06', 'Oslo, Norway', 'Climate Action Network International',
 ARRAY[13,16,17], 'conference', 'in_person', null, false),

-- ── NOVEMBER 2027 ───────────────────────────────────────────────────────────

('COP32 UN Climate Conference',
 'The 32nd session of the Conference of the Parties to the UNFCCC — a decisive moment ahead of the 2030 deadline for climate ambition.',
 '2028-11-08', '2028-11-19', 'Brisbane, Australia', 'UNFCCC',
 ARRAY[13,15,17], 'conference', 'in_person', 'https://unfccc.int/cop32', true),

('G20 Leaders'' Summit 2027',
 'Annual G20 Summit focused on financing for development, the SDG push ahead of 2030, and trade and technology governance.',
 '2028-11-16', '2028-11-17', 'New Delhi, India', 'G20 / India',
 ARRAY[8,1,17], 'conference', 'in_person', 'https://www.g20.org', true),

('Internet Governance Forum 2027',
 'Annual UN multi-stakeholder forum on internet governance policy, focusing on AI, digital rights, and the 2030 Agenda.',
 '2028-11-15', '2028-11-19', 'São Paulo, Brazil', 'UN DESA / IGF Secretariat',
 ARRAY[9,16,4], 'conference', 'hybrid', 'https://www.intgovforum.org', false),

('World Urban Forum 14',
 'UN-Habitat''s principal biennial convening on urbanisation and the New Urban Agenda.',
 '2028-11-08', '2028-11-12', 'Medellín, Colombia', 'UN-Habitat',
 ARRAY[11,13], 'conference', 'hybrid', 'https://wuf.unhabitat.org', true),

('Paris Peace Forum 2027',
 'Annual gathering of global governance actors working on multilateral solutions ahead of the 2030 Agenda deadline.',
 '2028-11-09', '2028-11-11', 'Paris, France', 'Paris Peace Forum',
 ARRAY[16,17], 'conference', 'in_person', 'https://parispeaceforum.org', false),

('Global Nutrition Report Launch 2027',
 'Annual launch of the Global Nutrition Report — a key accountability moment two years ahead of the 2030 deadline.',
 '2028-11-17', null, 'Online', 'Global Nutrition Report / UNICEF / WHO',
 ARRAY[2,3,1], 'side_event', 'virtual', 'https://globalnutritionreport.org', false),

-- ── DECEMBER 2027 ───────────────────────────────────────────────────────────

('GPAI Annual Summit 2027',
 'Annual summit of the Global Partnership on AI advancing responsible artificial intelligence for sustainable development.',
 '2028-12-06', '2028-12-08', 'Brussels, Belgium', 'GPAI',
 ARRAY[9,4,16], 'conference', 'in_person', 'https://gpai.ai', false),

('World Conference on Social Determinants of Health 2027',
 'International conference examining how social and environmental factors shape health equity, stocktaking ahead of 2030.',
 '2028-12-01', '2028-12-03', 'Geneva, Switzerland', 'WHO',
 ARRAY[3,1,10], 'conference', 'hybrid', null, false),

-- ── JANUARY 2028 ────────────────────────────────────────────────────────────

('World Economic Forum Annual Meeting 2028',
 'Annual Davos gathering of global leaders reviewing progress toward the 2030 Agenda and charting post-2030 ambition.',
 '2029-01-17', '2029-01-21', 'Davos, Switzerland', 'World Economic Forum',
 ARRAY[8,17,9], 'conference', 'in_person', 'https://www.weforum.org', true),

('IRENA 18th Assembly',
 'Annual Assembly of the International Renewable Energy Agency with a focus on the 2030 renewable energy targets.',
 '2029-01-09', '2029-01-10', 'Abu Dhabi, UAE', 'IRENA',
 ARRAY[7,13,17], 'conference', 'hybrid', 'https://www.irena.org/assembly', false),

-- ── FEBRUARY 2028 ───────────────────────────────────────────────────────────

('Commission on the Status of Women 72nd Session (CSW72)',
 'The world''s foremost intergovernmental body on gender equality — a landmark session in the final year of the 2030 Agenda.',
 '2029-02-28', '2029-03-10', 'New York, USA', 'UN Women / ECOSOC',
 ARRAY[5,10,17], 'conference', 'hybrid', 'https://www.unwomen.org/en/csw', true),

('Asia-Pacific Forum on Sustainable Development 2028',
 'Regional preparatory meeting for the HLPF reviewing SDG implementation across Asia and the Pacific.',
 '2029-02-23', '2029-02-25', 'Bangkok, Thailand', 'UNESCAP',
 ARRAY[17,13,10], 'conference', 'hybrid', 'https://www.unescap.org/apfsd', false),

('Africa Regional Forum on Sustainable Development 2028',
 'Annual forum reviewing SDG progress in Africa and setting African positions for the global HLPF and 2030 stocktake.',
 '2029-02-14', '2029-02-18', 'Addis Ababa, Ethiopia', 'UNECA',
 ARRAY[17,8,13], 'conference', 'hybrid', 'https://www.uneca.org/rfsd', false),

('Education Cannot Wait High-Level Financing Conference 2028',
 'Pledging conference for the global fund dedicated to education in emergencies, ahead of the 2030 SDG 4 deadline.',
 '2029-02-10', '2029-02-11', 'Geneva, Switzerland', 'Education Cannot Wait',
 ARRAY[4,16], 'conference', 'hybrid', 'https://www.educationcannotwait.org', false),

-- ── MARCH 2028 ──────────────────────────────────────────────────────────────

('UN SDG Summit 2028 — Preparatory Committee',
 'Preparatory committee for the landmark 2030 Agenda review, setting the agenda for the final SDG stocktake.',
 '2029-03-03', '2029-03-07', 'New York, USA', 'UN DESA',
 ARRAY[17,10,1], 'conference', 'hybrid', 'https://www.un.org/sdgsummit', true),

('World Bank Land Conference 2028',
 'Annual conference on land governance and tenure security — a key input into the final 2030 Agenda accountability cycle.',
 '2029-03-04', '2029-03-06', 'Washington DC, USA', 'World Bank',
 ARRAY[2,15,1], 'conference', 'hybrid', 'https://www.worldbank.org/landconference', false),

('Human Rights Council 65th Session',
 'Regular session of the UN Human Rights Council reviewing country human rights situations ahead of the 2030 Agenda deadline.',
 '2029-03-04', '2029-03-29', 'Geneva, Switzerland', 'UN OHCHR',
 ARRAY[16,10], 'conference', 'hybrid', 'https://www.ohchr.org/en/hrbodies/hrc', false),

('Global Forum on Business and Human Rights 2028',
 'Annual multi-stakeholder forum reviewing implementation of the UN Guiding Principles — focused on 2030 Agenda delivery.',
 '2029-03-04', '2029-03-06', 'Geneva, Switzerland', 'UN OHCHR',
 ARRAY[8,16], 'conference', 'hybrid', 'https://www.ohchr.org/en/events/global-forum-business-and-human-rights', false),

('Sanitation and Water for All Partnership Meeting 2028',
 'Annual convening of the SWA partnership reviewing WASH sector financing ahead of the 2030 SDG 6 deadline.',
 '2029-03-11', '2029-03-13', 'Dakar, Senegal', 'SWA',
 ARRAY[6,3,11], 'conference', 'hybrid', 'https://sanitationandwaterforall.org', false);

COMMIT;
