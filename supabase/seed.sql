-- ForaHub Seed Data: 100 Real Upcoming Global Development Events
-- Run in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/svqsnelljzspiqomsvzw/sql/new

BEGIN;

INSERT INTO public.events
  (title, description, start_date, end_date, location, organization, sdg_goals, event_type, format, registration_url, is_featured)
VALUES

-- ── CLIMATE & ENVIRONMENT (SDG 13 / 14 / 15) ────────────────────────────────

('COP30 UN Climate Conference',
 'The 30th session of the Conference of the Parties to the UNFCCC — a landmark moment for global climate ambition and the second Global Stocktake.',
 '2025-11-10', '2025-11-21', 'Belém, Brazil', 'UNFCCC',
 ARRAY[13,15,17], 'conference', 'in_person', 'https://unfccc.int/cop30', true),

('Bonn Climate Change Conference (SB62)',
 'The 62nd sessions of the UNFCCC subsidiary bodies — SBI and SBSTA — conducting technical negotiations ahead of COP30.',
 '2025-06-16', '2025-06-26', 'Bonn, Germany', 'UNFCCC',
 ARRAY[13], 'conference', 'in_person', 'https://unfccc.int/sb62', false),

('UN Ocean Conference 2025',
 'The third UN Ocean Conference co-hosted by France and Costa Rica, advancing SDG 14 and implementation of the high seas treaty.',
 '2025-06-09', '2025-06-13', 'Nice, France', 'UN DOALOS / France / Costa Rica',
 ARRAY[14,6,13], 'conference', 'in_person', 'https://unoceansconference.un.org', true),

('Stockholm World Water Week 2025',
 'Annual global meeting place for water and development challenges. Theme: "Our Water Future."',
 '2025-08-24', '2025-08-28', 'Stockholm, Sweden', 'SIWI',
 ARRAY[6,14,13], 'conference', 'hybrid', 'https://www.worldwaterweek.org', false),

('UNCCD COP17 — Conference of the Parties on Desertification',
 'The 17th Conference of the Parties to the UN Convention to Combat Desertification, focusing on the Land Degradation Neutrality targets.',
 '2025-12-01', '2025-12-13', 'Riyadh, Saudi Arabia', 'UNCCD',
 ARRAY[15,2,13], 'conference', 'in_person', 'https://www.unccd.int/cop17', false),

('CBD COP16 Resumed Session',
 'Resumed session of the 16th CBD COP finalising the Kunming-Montreal Global Biodiversity Framework resource mobilisation package.',
 '2025-02-25', '2025-03-01', 'Rome, Italy', 'CBD Secretariat',
 ARRAY[15,14], 'conference', 'in_person', 'https://www.cbd.int/meetings/COP-16-2', false),

('IPBES 11th Plenary Session',
 'Eleventh plenary session of the Intergovernmental Science-Policy Platform on Biodiversity and Ecosystem Services delivering key biodiversity assessments.',
 '2025-03-10', '2025-03-14', 'Windhoek, Namibia', 'IPBES',
 ARRAY[15,14], 'conference', 'in_person', 'https://www.ipbes.net', false),

('Global Forests Review Conference 2025',
 'High-level stocktake of progress on the Glasgow Leaders'' Declaration on Forests and Land Use ahead of COP30.',
 '2025-11-03', '2025-11-04', 'London, United Kingdom', 'UK Government / FAO',
 ARRAY[15,13], 'conference', 'hybrid', null, false),

('UN Forum on Forests 20th Session',
 'Twentieth session of the UN Forum on Forests reviewing progress on the UN Strategic Plan for Forests 2017–2030.',
 '2025-05-05', '2025-05-09', 'New York, USA', 'UNFF',
 ARRAY[15,13], 'conference', 'hybrid', 'https://www.un.org/esa/forests/forum/index.html', false),

('Africa Climate Summit 2025',
 'Pan-African summit convening Heads of State and government to accelerate climate action and a just energy transition across the continent.',
 '2025-09-08', '2025-09-10', 'Nairobi, Kenya', 'African Union / Government of Kenya',
 ARRAY[13,7,8], 'conference', 'in_person', null, true),

('Plastics Treaty INC-5.2 — Resumed Negotiation',
 'Resumed fifth session of the Intergovernmental Negotiating Committee developing a legally binding global plastics treaty.',
 '2025-08-05', '2025-08-14', 'Geneva, Switzerland', 'UNEP',
 ARRAY[12,14,6], 'conference', 'in_person', 'https://www.unep.org/inc-plastic-pollution', false),

('UN Environment Assembly 7th Special Session',
 'Special session of UNEA addressing the science-policy interface on chemicals, waste, and sustainable consumption.',
 '2025-02-26', '2025-03-01', 'Nairobi, Kenya', 'UNEP',
 ARRAY[12,13,15], 'conference', 'hybrid', 'https://www.unep.org/unea7', false),

-- ── GLOBAL HEALTH (SDG 3) ───────────────────────────────────────────────────

('78th World Health Assembly',
 'Annual decision-making assembly of WHO member states, setting global health policy, approving budgets, and addressing emerging health threats.',
 '2025-05-19', '2025-05-27', 'Geneva, Switzerland', 'WHO',
 ARRAY[3,10], 'conference', 'hybrid', 'https://www.who.int/wha78', true),

('International AIDS Conference 2025 (AIDS 2025)',
 'The world''s largest conference on HIV/AIDS science and policy, bringing together 20,000+ researchers, clinicians, and advocates.',
 '2025-07-14', '2025-07-19', 'Nairobi, Kenya', 'International AIDS Society',
 ARRAY[3,10], 'conference', 'hybrid', 'https://www.aids2025.org', true),

('Global Mental Health Summit 2025',
 'International summit scaling mental health services in low- and middle-income countries, with a focus on post-conflict and fragile settings.',
 '2025-10-09', '2025-10-10', 'London, United Kingdom', 'UK Government / WHO',
 ARRAY[3,16], 'conference', 'hybrid', null, false),

('Malaria No More Global Leaders'' Summit',
 'High-level convening mobilising political will and financing to end malaria deaths by 2030.',
 '2025-04-23', '2025-04-24', 'London, United Kingdom', 'Malaria No More / RBM Partnership',
 ARRAY[3], 'conference', 'hybrid', 'https://www.malarianetwork.org', false),

('UHC Partnership Annual Forum 2025',
 'Annual forum of the UHC2030 partnership reviewing progress on Universal Health Coverage commitments.',
 '2025-11-17', '2025-11-18', 'Brussels, Belgium', 'UHC2030',
 ARRAY[3,17], 'conference', 'hybrid', 'https://www.uhc2030.org', false),

('WHO Regional Committee for Africa (RC75)',
 'Annual meeting of WHO''s 47 African member states to review regional health priorities and approve programme budgets.',
 '2025-08-25', '2025-08-29', 'Brazzaville, Republic of Congo', 'WHO AFRO',
 ARRAY[3], 'conference', 'hybrid', 'https://www.afro.who.int', false),

('International Nutrition Congress 2025',
 'Quadrennial congress of the International Union of Nutritional Sciences convening researchers and policymakers on nutrition and health.',
 '2025-09-15', '2025-09-19', 'Geneva, Switzerland', 'IUNS',
 ARRAY[2,3], 'conference', 'in_person', 'https://iuns2025.com', false),

('Gavi Investment Forum 2025',
 'High-level meeting to mobilise funding commitments for immunisation programmes in the world''s poorest countries.',
 '2025-10-28', '2025-10-29', 'Geneva, Switzerland', 'Gavi, the Vaccine Alliance',
 ARRAY[3,10], 'conference', 'hybrid', 'https://www.gavi.org', false),

('Global Fund Board Meeting (45th)',
 'Board meeting overseeing strategy, grant allocations, and governance for HIV, tuberculosis, and malaria programmes.',
 '2025-04-29', '2025-05-01', 'Geneva, Switzerland', 'The Global Fund',
 ARRAY[3], 'conference', 'hybrid', 'https://www.theglobalfund.org', false),

('World Conference on Social Determinants of Health',
 'International conference examining how social, economic, and environmental factors shape health outcomes and health equity.',
 '2025-09-24', '2025-09-26', 'Rio de Janeiro, Brazil', 'WHO / Ministry of Health Brazil',
 ARRAY[3,1,10], 'conference', 'hybrid', null, false),

('WHO Webinar: Pandemic Preparedness and IHR Implementation',
 'Webinar series on strengthening national capacities under the International Health Regulations for pandemic preparedness and response.',
 '2025-03-19', null, 'Online', 'WHO',
 ARRAY[3,16,17], 'webinar', 'virtual', 'https://www.who.int/ihr', false),

('Nairobi Summit on ICPD30: Sexual and Reproductive Health',
 'Review of progress on Nairobi Summit commitments on sexual and reproductive health and rights, 30 years after ICPD.',
 '2025-11-12', '2025-11-13', 'Nairobi, Kenya', 'UNFPA / Government of Kenya',
 ARRAY[3,5], 'conference', 'in_person', 'https://www.nairobisummiticpd.org', false),

-- ── FOOD SECURITY & AGRICULTURE (SDG 2) ─────────────────────────────────────

('World Food Forum 2025',
 'Annual flagship youth event on food systems transformation, co-hosted by the UN Rome-based agencies.',
 '2025-10-20', '2025-10-24', 'Rome, Italy', 'FAO / IFAD / WFP',
 ARRAY[2,12,13], 'conference', 'hybrid', 'https://www.worldfoodforum.org', true),

('Committee on World Food Security (CFS) 52nd Plenary',
 'Plenary session of the UN Committee on World Food Security, the most inclusive intergovernmental platform on food security.',
 '2025-10-13', '2025-10-17', 'Rome, Italy', 'CFS / FAO',
 ARRAY[2,1], 'conference', 'hybrid', 'https://www.fao.org/cfs', false),

('Global Alliance for Climate-Smart Agriculture Annual Forum',
 'Annual forum showcasing climate-smart agriculture innovations and financing mechanisms for smallholder farmers.',
 '2025-09-22', '2025-09-24', 'Nairobi, Kenya', 'GACSA / FAO',
 ARRAY[2,13,1], 'conference', 'hybrid', 'https://www.fao.org/gacsa', false),

('Nutrition for Growth Summit Pre-Event Webinar',
 'Preparatory webinar series building toward the Nutrition for Growth Summit, mobilising evidence-based commitments.',
 '2025-08-14', null, 'Online', 'N4G Partnership',
 ARRAY[2,3], 'webinar', 'virtual', null, false),

('IFAD Governing Council 49th Session',
 'Annual meeting of IFAD member states reviewing operations and approving budgets for rural development and food security.',
 '2025-02-17', '2025-02-19', 'Rome, Italy', 'IFAD',
 ARRAY[2,1,8], 'conference', 'hybrid', 'https://www.ifad.org', false),

('World Bank Land Conference 2025',
 'Annual conference convening policymakers and practitioners on land governance, tenure security, and agricultural development.',
 '2025-05-05', '2025-05-07', 'Washington DC, USA', 'World Bank',
 ARRAY[2,15,1], 'conference', 'hybrid', 'https://www.worldbank.org/landconference', false),

('FAO E-Learning: Agroecology for Sustainable Food Systems',
 'Self-paced online training on agroecological principles and their application to food systems transformation in developing countries.',
 '2025-05-01', '2025-07-31', 'Online', 'FAO',
 ARRAY[2,12,15], 'training', 'virtual', 'https://elearning.fao.org', false),

-- ── EDUCATION (SDG 4) ───────────────────────────────────────────────────────

('UNESCO World Education Forum 2025',
 'Global forum stocktaking progress on SDG 4, discussing education financing, quality, equity, and inclusion.',
 '2025-09-29', '2025-10-01', 'Dakar, Senegal', 'UNESCO / GPE',
 ARRAY[4,5,10], 'conference', 'hybrid', 'https://www.unesco.org/en/education-forums', true),

('Education Cannot Wait High-Level Financing Conference',
 'Pledging and policy conference for the global fund dedicated to education in emergencies and protracted crises.',
 '2025-02-13', '2025-02-14', 'Geneva, Switzerland', 'Education Cannot Wait',
 ARRAY[4,16], 'conference', 'hybrid', 'https://www.educationcannotwait.org', false),

('International Literacy Day Global Celebration 2025',
 'Annual UNESCO event highlighting the state of literacy worldwide and recognising progress toward SDG 4 targets.',
 '2025-09-08', null, 'Paris, France', 'UNESCO',
 ARRAY[4], 'conference', 'hybrid', 'https://www.unesco.org/en/days/literacy', false),

('Global Education Evidence Advisory Panel Annual Meeting',
 'Annual meeting of evidence experts advising on what works in improving learning outcomes in low-income countries.',
 '2025-05-15', '2025-05-16', 'Online', 'FCDO / World Bank',
 ARRAY[4], 'conference', 'virtual', null, false),

('GPE Board of Directors Meeting',
 'Meeting of the Global Partnership for Education Board making decisions on grants, strategy, and country allocations.',
 '2025-04-22', '2025-04-24', 'Brussels, Belgium', 'Global Partnership for Education',
 ARRAY[4,5], 'conference', 'hybrid', 'https://www.globalpartnership.org', false),

('UNESCO International Conference on AI in Education',
 'International conference examining opportunities, risks, and governance of artificial intelligence for learning.',
 '2025-05-07', '2025-05-08', 'Paris, France', 'UNESCO',
 ARRAY[4,9], 'conference', 'hybrid', 'https://www.unesco.org/en/artificial-intelligence/education', false),

-- ── GENDER EQUALITY (SDG 5) ─────────────────────────────────────────────────

('Commission on the Status of Women 69th Session (CSW69)',
 'The world''s foremost intergovernmental body on gender equality and women''s empowerment. Priority theme: Financing for gender equality.',
 '2025-03-10', '2025-03-21', 'New York, USA', 'UN Women / ECOSOC',
 ARRAY[5,10,17], 'conference', 'hybrid', 'https://www.unwomen.org/en/csw', true),

('Women Deliver 2025 Global Conference',
 'The world''s largest conference on gender equality and the health, rights, and well-being of women and girls.',
 '2025-05-12', '2025-05-14', 'Bangkok, Thailand', 'Women Deliver',
 ARRAY[5,3,10], 'conference', 'in_person', 'https://womendeliver.org', true),

('Generation Equality Forum: Annual Progress Review',
 'Annual review of commitments made under the Generation Equality Forum Action Coalitions, tracking implementation.',
 '2025-09-23', '2025-09-25', 'New York, USA', 'UN Women',
 ARRAY[5,10], 'conference', 'hybrid', 'https://forum.generationequality.org', false),

('CEDAW Committee 90th Session',
 'Session of the UN Committee on the Elimination of Discrimination Against Women reviewing state party reports.',
 '2025-02-17', '2025-03-07', 'Geneva, Switzerland', 'UN OHCHR',
 ARRAY[5,16], 'conference', 'hybrid', 'https://www.ohchr.org/en/treaty-bodies/cedaw', false),

('International Conference on Women in STEM 2025',
 'UNESCO-led conference advancing gender parity in science, technology, engineering, and mathematics globally.',
 '2025-05-21', '2025-05-23', 'Tokyo, Japan', 'UNESCO / Government of Japan',
 ARRAY[5,4,9], 'conference', 'hybrid', null, false),

('Global Gender and Environment Data Initiative Launch',
 'Side event launching new data, indicators, and analytical tools at the intersection of gender and environmental governance.',
 '2025-03-12', null, 'New York, USA', 'UNEP / IUCN / UN Women',
 ARRAY[5,13,15], 'side_event', 'hybrid', null, false),

-- ── CLEAN WATER & SANITATION (SDG 6) ────────────────────────────────────────

('Sanitation and Water for All Partnership Meeting 2025',
 'Annual convening of the SWA partnership reviewing WASH sector financing, accountability, and country compacts.',
 '2025-04-07', '2025-04-09', 'Dakar, Senegal', 'SWA',
 ARRAY[6,3,11], 'conference', 'hybrid', 'https://sanitationandwaterforall.org', false),

('Global Water Summit 2025',
 'Premier annual gathering of the international water industry covering utilities, technology, and policy.',
 '2025-04-28', '2025-04-30', 'Madrid, Spain', 'Global Water Intelligence',
 ARRAY[6,11], 'conference', 'in_person', 'https://www.globalwatersummit.com', false),

('World Water Congress & Exhibition 2026',
 'International Water Association''s flagship biennial congress on water science, technology, and utility management.',
 '2026-01-11', '2026-01-15', 'Singapore', 'International Water Association',
 ARRAY[6,9,11], 'conference', 'in_person', 'https://www.worldwatercongress.org', false),

('UN-Water Annual Zaragoza Conference',
 'Annual expert consultation informing the UN World Water Development Report and global SDG 6 reporting process.',
 '2025-03-19', '2025-03-21', 'Zaragoza, Spain', 'UN-Water',
 ARRAY[6], 'conference', 'hybrid', 'https://www.unwater.org', false),

('GWOPA Water Operator Partnerships Training Programme',
 'Capacity-building training programme for water and sanitation utilities in developing countries.',
 '2025-09-15', '2025-09-26', 'Online', 'GWOPA / UN-Habitat',
 ARRAY[6,11], 'training', 'virtual', null, false),

-- ── AFFORDABLE & CLEAN ENERGY (SDG 7) ───────────────────────────────────────

('IRENA 15th Assembly',
 'Annual Assembly of the International Renewable Energy Agency reviewing global energy transition progress and priorities.',
 '2025-01-11', '2025-01-12', 'Abu Dhabi, UAE', 'IRENA',
 ARRAY[7,13,17], 'conference', 'hybrid', 'https://www.irena.org/assembly', false),

('Clean Energy Ministerial (CEM16)',
 'High-level global forum for 30+ government ministers advancing clean energy technology and policy.',
 '2025-06-04', '2025-06-05', 'Copenhagen, Denmark', 'IEA / Government of Denmark',
 ARRAY[7,13], 'conference', 'in_person', 'https://www.cleanenergyministerial.org', false),

('World Energy Congress 2025',
 'Triennial congress of the World Energy Council convening energy leaders on just transition pathways.',
 '2025-11-04', '2025-11-06', 'Rotterdam, Netherlands', 'World Energy Council',
 ARRAY[7,8,13], 'conference', 'in_person', 'https://www.worldenergycongress.com', false),

('Africa Energy Transition Forum 2025',
 'Regional forum accelerating energy access and the just transition across Sub-Saharan Africa.',
 '2025-05-14', '2025-05-15', 'Abidjan, Côte d''Ivoire', 'AfDB / IRENA',
 ARRAY[7,1,13], 'conference', 'hybrid', null, false),

('High-Level Dialogue on Energy 2025',
 'UN high-level dialogue reviewing progress on SDG 7 and implementation of commitments from the 2021 Energy Compacts.',
 '2025-09-24', null, 'New York, USA', 'UN DESA',
 ARRAY[7,13,17], 'side_event', 'hybrid', 'https://www.un.org/en/conferences/energy2021', false),

-- ── DECENT WORK & ECONOMIC GROWTH (SDG 8) ───────────────────────────────────

('International Labour Conference 113th Session',
 'Annual supreme decision-making body of the ILO setting international labour standards and global employment policies.',
 '2025-06-02', '2025-06-13', 'Geneva, Switzerland', 'ILO',
 ARRAY[8,1,10], 'conference', 'hybrid', 'https://www.ilo.org/ilc', false),

('African Development Bank Annual Meetings 2025',
 'Annual meetings of the AfDB Group Board of Governors reviewing operations and approving strategic priorities.',
 '2025-05-26', '2025-05-30', 'Abidjan, Côte d''Ivoire', 'African Development Bank',
 ARRAY[8,1,17], 'conference', 'in_person', 'https://www.afdb.org/en/annual-meetings', false),

('G20 Leaders'' Summit 2025 — South Africa Presidency',
 'Annual G20 Summit under South Africa''s presidency, focused on inclusive growth and development financing for the Global South.',
 '2025-11-18', '2025-11-19', 'Johannesburg, South Africa', 'G20 / South Africa',
 ARRAY[8,1,17], 'conference', 'in_person', 'https://www.g20.org', true),

('World Economic Forum Annual Meeting 2026',
 'Annual Davos gathering of 2,500+ business, government, and civil society leaders on global economic and social challenges.',
 '2026-01-19', '2026-01-23', 'Davos, Switzerland', 'World Economic Forum',
 ARRAY[8,17,9], 'conference', 'in_person', 'https://www.weforum.org', true),

('IDB Annual Meeting 2025',
 'Annual meeting of the Inter-American Development Bank Board of Governors on economic development in Latin America.',
 '2025-03-24', '2025-03-26', 'Lima, Peru', 'Inter-American Development Bank',
 ARRAY[8,10,1], 'conference', 'in_person', 'https://www.iadb.org', false),

('Global Forum on Business and Human Rights 2025',
 'Annual multi-stakeholder forum reviewing implementation of the UN Guiding Principles on Business and Human Rights.',
 '2025-11-03', '2025-11-05', 'Geneva, Switzerland', 'UN OHCHR',
 ARRAY[8,16], 'conference', 'hybrid', 'https://www.ohchr.org/en/events/global-forum-business-and-human-rights', false),

-- ── INDUSTRY, INNOVATION & INFRASTRUCTURE (SDG 9) ───────────────────────────

('Internet Governance Forum 2025',
 'Annual UN multi-stakeholder forum on internet governance policy. Theme: Building Our Digital Future Together.',
 '2025-11-17', '2025-11-21', 'Oslo, Norway', 'UN DESA / IGF Secretariat',
 ARRAY[9,16,4], 'conference', 'hybrid', 'https://www.intgovforum.org', false),

('ITU Digital World 2025',
 'ITU''s annual flagship event connecting ICT regulators, innovators, and investors from 150+ countries.',
 '2025-10-06', '2025-10-09', 'Nairobi, Kenya', 'ITU',
 ARRAY[9,17,1], 'conference', 'hybrid', 'https://digitalworld.itu.int', false),

('GPAI Annual Summit 2025',
 'Annual summit of the Global Partnership on AI advancing responsible and inclusive artificial intelligence for development.',
 '2025-12-01', '2025-12-03', 'Brussels, Belgium', 'GPAI',
 ARRAY[9,4,16], 'conference', 'in_person', 'https://gpai.ai', false),

('Tech for Good Summit 2025',
 'International summit convened by the French Presidency examining how technology can address social and development challenges.',
 '2025-05-21', '2025-05-23', 'Paris, France', 'Elysée Palace / French Government',
 ARRAY[9,17,10], 'conference', 'in_person', 'https://techforgoodsummit.org', false),

('Digital Development Forum Africa 2025',
 'Forum advancing digital transformation across Africa, covering fintech, e-governance, and last-mile connectivity.',
 '2025-09-23', '2025-09-25', 'Nairobi, Kenya', 'ITU / UNDP',
 ARRAY[9,1,8], 'conference', 'hybrid', null, false),

-- ── REDUCED INEQUALITIES (SDG 10) ───────────────────────────────────────────

('UN Permanent Forum on Indigenous Issues 24th Session',
 'Annual session of UNPFII, the central UN body on indigenous peoples'' rights and well-being.',
 '2025-04-21', '2025-05-02', 'New York, USA', 'UNPFII / UN DESA',
 ARRAY[10,16,15], 'conference', 'hybrid', 'https://www.un.org/development/desa/indigenouspeoples', false),

('Global Forum on Migration and Development 2025',
 'Annual intergovernmental forum on managing migration for development, safety, and dignity.',
 '2025-11-24', '2025-11-25', 'Geneva, Switzerland', 'GFMD',
 ARRAY[10,16], 'conference', 'hybrid', 'https://www.gfmd.org', false),

('Global Disability Summit 2025',
 'Biennial summit mobilising global action on disability inclusion in development and humanitarian contexts.',
 '2025-04-02', '2025-04-03', 'Berlin, Germany', 'Government of Germany / Kenya',
 ARRAY[10,16,4], 'conference', 'hybrid', 'https://www.globaldisabilitysummit.org', false),

('ECOSOC High-Level Segment 2025',
 'High-level segment of the UN Economic and Social Council reviewing SDG implementation and the 2030 Agenda.',
 '2025-07-07', '2025-07-10', 'New York, USA', 'ECOSOC',
 ARRAY[10,17,1], 'conference', 'hybrid', 'https://www.un.org/ecosoc', false),

('International Conference on Social Protection 2025',
 'Conference on expanding social protection floors and adaptive social protection in developing and fragile countries.',
 '2025-09-17', '2025-09-19', 'Addis Ababa, Ethiopia', 'ILO / World Bank / UNICEF',
 ARRAY[1,10,3], 'conference', 'hybrid', null, false),

-- ── SUSTAINABLE CITIES (SDG 11) ─────────────────────────────────────────────

('World Urban Forum 13',
 'UN-Habitat''s principal biennial convening on urbanisation and the New Urban Agenda, bringing together 25,000+ urban stakeholders.',
 '2025-11-04', '2025-11-08', 'Cairo, Egypt', 'UN-Habitat',
 ARRAY[11,13], 'conference', 'hybrid', 'https://wuf.unhabitat.org', true),

('UN-Habitat Assembly 4th Session',
 'Session of the UN-Habitat Assembly, the supreme governing body of the UN Human Settlements Programme.',
 '2025-06-02', '2025-06-06', 'Nairobi, Kenya', 'UN-Habitat',
 ARRAY[11,1], 'conference', 'hybrid', 'https://unhabitat.org/assembly', false),

('World Congress of Local and Regional Governments 2025',
 'Biennial congress of UCLG convening 3,000+ mayors and local government leaders on sustainable urban governance.',
 '2026-01-20', '2026-01-24', 'Brasília, Brazil', 'UCLG',
 ARRAY[11,17,16], 'conference', 'in_person', 'https://www.uclg.org', false),

('International Conference on Urban Resilience 2025',
 'Conference sharing city-level solutions for climate-resilient urban development across the Global South.',
 '2025-09-15', '2025-09-17', 'Singapore', 'UNDRR / Lee Kuan Yew School of Public Policy',
 ARRAY[11,13], 'conference', 'hybrid', null, false),

('Smart Cities Expo World Congress 2025',
 'Global event showcasing smart city technology and urban innovation for sustainability and quality of life.',
 '2025-11-04', '2025-11-06', 'Barcelona, Spain', 'Fira de Barcelona',
 ARRAY[11,9], 'conference', 'in_person', 'https://www.smartcityexpo.com', false),

-- ── RESPONSIBLE CONSUMPTION (SDG 12) ────────────────────────────────────────

('One Planet Network Annual Forum 2025',
 'Annual forum of the UN One Planet network on sustainable consumption and production, stocktaking 10-Year Framework progress.',
 '2025-03-05', '2025-03-06', 'Paris, France', 'UNEP / France Government',
 ARRAY[12,15,13], 'conference', 'hybrid', null, false),

('Sustainable Consumption Research and Action Initiative (SCORAI) Conference',
 'Conference advancing interdisciplinary research on transitions toward sustainable consumption and production systems.',
 '2025-06-09', '2025-06-11', 'Berlin, Germany', 'SCORAI',
 ARRAY[12,13], 'conference', 'hybrid', null, false),

-- ── PEACE, JUSTICE & INSTITUTIONS (SDG 16) ──────────────────────────────────

('79th UN General Assembly High-Level Week',
 'Annual high-level general debate of the UN General Assembly, bringing together Heads of State and government from 193 member states.',
 '2025-09-22', '2025-09-27', 'New York, USA', 'UN Secretariat',
 ARRAY[16,17], 'conference', 'in_person', 'https://www.un.org/en/ga/79', true),

('Human Rights Council 58th Session',
 'Regular session of the UN Human Rights Council reviewing country human rights situations and thematic issues.',
 '2025-02-24', '2025-04-04', 'Geneva, Switzerland', 'UN OHCHR',
 ARRAY[16,10], 'conference', 'hybrid', 'https://www.ohchr.org/en/hrbodies/hrc', false),

('Paris Peace Forum 2025',
 'Annual gathering of global governance actors working on multilateral solutions to shared challenges.',
 '2025-11-11', '2025-11-13', 'Paris, France', 'Paris Peace Forum',
 ARRAY[16,17], 'conference', 'in_person', 'https://parispeaceforum.org', false),

('Humanitarian Networks and Partnerships Week (HNPW) 2025',
 'Annual convening of humanitarian actors in Geneva exchanging best practices and coordinating response capacity.',
 '2025-01-27', '2025-01-31', 'Geneva, Switzerland', 'OCHA',
 ARRAY[16,17], 'conference', 'hybrid', 'https://vosocc.unocha.org', false),

('ECOSOC Humanitarian Affairs Segment 2025',
 'Annual segment reviewing coordination of humanitarian assistance and progress on the Grand Bargain reform commitments.',
 '2025-06-18', '2025-06-20', 'Geneva, Switzerland', 'OCHA / ECOSOC',
 ARRAY[16,10], 'conference', 'hybrid', 'https://www.un.org/ecosoc/en/has', false),

('NPT Preparatory Committee 2025',
 'Preparatory Committee for the 2026 NPT Review Conference addressing disarmament and non-proliferation obligations.',
 '2025-04-28', '2025-05-09', 'Vienna, Austria', 'UN Office for Disarmament Affairs',
 ARRAY[16], 'conference', 'in_person', 'https://www.un.org/en/conf/npt', false),

('UNHCR Training: Protection in Climate-Induced Displacement',
 'Professional training on refugee and displacement protection frameworks as applied to climate-induced contexts.',
 '2025-04-14', '2025-04-16', 'Online', 'UNHCR',
 ARRAY[16,13,10], 'training', 'virtual', 'https://www.unhcr.org/training', false),

-- ── PARTNERSHIPS FOR THE GOALS (SDG 17) ─────────────────────────────────────

('UN High-Level Political Forum on Sustainable Development 2025',
 'The central UN platform for follow-up and review of the 2030 Agenda, with Heads of State summit and ministerial segment.',
 '2025-07-07', '2025-07-18', 'New York, USA', 'UN DESA',
 ARRAY[17,10,1], 'conference', 'hybrid', 'https://hlpf.un.org', true),

('International Conference on Financing for Development (FfD4)',
 'Fourth International Conference on Financing for Development, the landmark global conference on SDG financing.',
 '2025-06-30', '2025-07-03', 'Seville, Spain', 'UN DESA / Government of Spain',
 ARRAY[17,10,8], 'conference', 'in_person', 'https://www.un.org/ffd', true),

('World Bank / IMF Spring Meetings 2025',
 'Annual spring meetings of the World Bank Group and IMF Development Committee and IMFC.',
 '2025-04-21', '2025-04-26', 'Washington DC, USA', 'World Bank / IMF',
 ARRAY[17,8,1], 'conference', 'hybrid', 'https://www.worldbank.org/en/meetings', false),

('World Bank / IMF Annual Meetings 2025',
 'Annual meetings of the World Bank Group and IMF reviewing global economic developments and development finance.',
 '2025-10-13', '2025-10-18', 'Washington DC, USA', 'World Bank / IMF',
 ARRAY[17,8,10], 'conference', 'hybrid', 'https://www.worldbank.org/en/meetings/annual', false),

('Asia-Pacific Forum on Sustainable Development 2025',
 'Regional preparatory meeting for the HLPF reviewing SDG implementation across Asia and the Pacific.',
 '2025-02-26', '2025-02-28', 'Bangkok, Thailand', 'UNESCAP',
 ARRAY[17,13,10], 'conference', 'hybrid', 'https://www.unescap.org/apfsd', false),

('Africa Regional Forum on Sustainable Development 2025',
 'Annual forum reviewing SDG progress in Africa and aligning African positions for the global HLPF.',
 '2025-02-17', '2025-02-21', 'Addis Ababa, Ethiopia', 'UNECA',
 ARRAY[17,8,13], 'conference', 'hybrid', 'https://www.uneca.org/rfsd', false),

('South-South and Triangular Cooperation Forum 2026',
 'High-level forum sharing development solutions and innovations across and between countries of the Global South.',
 '2026-03-09', '2026-03-11', 'Buenos Aires, Argentina', 'UNOSSC',
 ARRAY[17,10], 'conference', 'hybrid', 'https://www.unsouthsouth.org', false),

('OECD Development Assistance Committee High-Level Meeting',
 'Annual high-level meeting of OECD DAC members reviewing ODA trends and aid effectiveness ahead of FfD4.',
 '2025-10-29', '2025-10-30', 'Paris, France', 'OECD DAC',
 ARRAY[1,17], 'conference', 'hybrid', 'https://www.oecd.org/dac', false),

-- ── MULTI-THEME EVENTS ───────────────────────────────────────────────────────

('Fourth International Conference on SIDS Follow-Up',
 'Intergovernmental review of the Antigua and Barbuda Agenda for Small Island Developing States implementation.',
 '2025-05-19', '2025-05-21', 'New York, USA', 'UN OHRLLS',
 ARRAY[13,14,11], 'conference', 'hybrid', 'https://www.un.org/ohrlls', false),

('COP30 Pre-Summit Civil Society Mobilisation',
 'Global civil society convening building coordinated advocacy positions and accountability demands ahead of COP30 negotiations.',
 '2025-10-06', '2025-10-08', 'Belém, Brazil', 'Climate Action Network International',
 ARRAY[13,16,17], 'conference', 'in_person', null, false),

('Grand Bargain Annual Meeting 2025',
 'Annual meeting of Grand Bargain signatories reviewing progress on commitments to improve humanitarian effectiveness and efficiency.',
 '2025-06-23', '2025-06-24', 'Geneva, Switzerland', 'IASC / Grand Bargain',
 ARRAY[16,1], 'conference', 'hybrid', null, false),

('High-Level Event on Poverty Eradication',
 'Annual UN high-level event reviewing progress on implementing commitments to end extreme poverty ahead of 2030.',
 '2025-10-17', null, 'New York, USA', 'UN DESA',
 ARRAY[1,10], 'side_event', 'hybrid', 'https://www.un.org/development/desa', false),

('UNDP Climate Finance Readiness Training Programme',
 'Capacity-building programme helping developing country governments access, manage, and report on climate finance.',
 '2025-08-11', '2025-09-05', 'Online', 'UNDP',
 ARRAY[13,17,1], 'training', 'virtual', 'https://www.undp.org/climate-finance', false),

('IOM Training: Data for Migration Policy',
 'Practitioner training on using migration data and evidence to design responsive migration and development policies.',
 '2025-07-07', '2025-07-11', 'Online', 'IOM / MiGOF',
 ARRAY[10,16,17], 'training', 'virtual', 'https://www.iom.int', false),

('UNICEF Webinar: Child-Centred Climate Action',
 'Webinar on integrating children''s rights and needs into national climate adaptation plans and NDCs.',
 '2025-06-12', null, 'Online', 'UNICEF',
 ARRAY[13,3,4], 'webinar', 'virtual', 'https://www.unicef.org/environment-and-climate-change', false),

('Global Nutrition Report Launch 2025',
 'Annual launch of the Global Nutrition Report, the world''s most comprehensive assessment of progress on nutrition.',
 '2025-11-19', null, 'Online', 'Global Nutrition Report / UNICEF / WHO',
 ARRAY[2,3,1], 'side_event', 'virtual', 'https://globalnutritionreport.org', false),

('Urban20 Summit — G20 South Africa Presidency',
 'Engagement group of mayors and city networks feeding urban development priorities into the G20 process.',
 '2025-10-13', '2025-10-14', 'Johannesburg, South Africa', 'U20 / UCLG / C40',
 ARRAY[11,13,17], 'conference', 'in_person', null, false);

COMMIT;
