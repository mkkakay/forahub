export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface OrgConfig {
  slug: string;
  name: string;
  short: string;
  color: string;
  logo: string;
  description: string;
  matchPatterns: string[];
}

const bf = (domain: string) =>
  `https://cdn.brandfetch.io/${domain}/w/300/h/150/logo?c=NJ56JESB-y_Yq9XLTApT75PLDyFi9Qf7-pz31r4tAVRcF1jD_r6AES98YRgJyToYZCUmW98HtK9wj_41zhBQjQ`;

const RAW: Omit<OrgConfig, "slug">[] = [
  {
    name: "World Health Organization",
    short: "WHO",
    color: "#0093D5",
    logo: "/images/logos/who.svg",
    description: "Specialized UN agency leading global public health, coordinating health emergencies, and setting international health standards.",
    matchPatterns: ["WHO", "World Health Organization"],
  },
  {
    name: "Bill and Melinda Gates Foundation",
    short: "Gates Foundation",
    color: "#E8192C",
    logo: bf("gatesfoundation.org"),
    description: "One of the world's largest private philanthropies, funding global health, development, and education programs.",
    matchPatterns: ["Gates Foundation", "Bill & Melinda Gates", "Bill and Melinda Gates"],
  },
  {
    name: "World Bank Group",
    short: "World Bank",
    color: "#003299",
    logo: "/images/logos/worldbank.svg",
    description: "International financial institution providing loans and grants to developing economies to reduce poverty.",
    matchPatterns: ["World Bank"],
  },
  {
    name: "UNICEF",
    short: "UNICEF",
    color: "#00AEEF",
    logo: "/images/logos/unicef.svg",
    description: "UN agency working in over 190 countries to protect the rights and improve the wellbeing of every child.",
    matchPatterns: ["UNICEF"],
  },
  {
    name: "African Development Bank",
    short: "AfDB",
    color: "#006B3F",
    logo: bf("afdb.org"),
    description: "Regional multilateral development finance institution serving 54 African countries.",
    matchPatterns: ["African Development Bank", "AfDB"],
  },
  {
    name: "World Economic Forum",
    short: "WEF",
    color: "#1A1A1A",
    logo: bf("weforum.org"),
    description: "International organization for public-private cooperation, best known for its annual Davos meeting.",
    matchPatterns: ["World Economic Forum", "WEF"],
  },
  {
    name: "Gavi the Vaccine Alliance",
    short: "Gavi",
    color: "#0066CC",
    logo: bf("gavi.org"),
    description: "Global health partnership increasing access to immunisation in low-income countries.",
    matchPatterns: ["Gavi"],
  },
  {
    name: "The Global Fund",
    short: "Global Fund",
    color: "#EF3340",
    logo: "/images/logos/globalfund.svg",
    description: "Partnership designed to accelerate the end of AIDS, tuberculosis and malaria as epidemics.",
    matchPatterns: ["Global Fund"],
  },
  {
    name: "Medecins Sans Frontieres",
    short: "MSF",
    color: "#E30613",
    logo: "/images/logos/msf.svg",
    description: "International humanitarian medical NGO providing emergency aid in conflict zones and during epidemics.",
    matchPatterns: ["MSF", "Medecins Sans Frontieres", "Médecins Sans Frontières", "Doctors Without Borders"],
  },
  {
    name: "African Union",
    short: "AU",
    color: "#009A44",
    logo: "/images/logos/au.svg",
    description: "Continental union of 55 African states promoting unity, peace, and integrated development.",
    matchPatterns: ["African Union"],
  },
  {
    name: "UN Development Programme",
    short: "UNDP",
    color: "#009FDA",
    logo: "/images/logos/undp.svg",
    description: "UN's global development network working in 170 countries to eradicate poverty and reduce inequalities.",
    matchPatterns: ["UNDP", "UN Development Programme", "United Nations Development Programme"],
  },
  {
    name: "Wellcome Trust",
    short: "Wellcome",
    color: "#E7157B",
    logo: bf("wellcome.org"),
    description: "Independent biomedical research charity funding science to solve urgent health challenges.",
    matchPatterns: ["Wellcome"],
  },
  {
    name: "Save the Children",
    short: "Save the Children",
    color: "#E2001A",
    logo: "/images/logos/savechildren.svg",
    description: "International NGO promoting children's rights, education, and humanitarian response in nearly 120 countries.",
    matchPatterns: ["Save the Children"],
  },
  {
    name: "Chatham House",
    short: "Chatham House",
    color: "#003B6F",
    logo: bf("chathamhouse.org"),
    description: "Royal Institute of International Affairs — independent policy institute analyzing global issues.",
    matchPatterns: ["Chatham House"],
  },
  {
    name: "Asian Development Bank",
    short: "ADB",
    color: "#E3000F",
    logo: bf("adb.org"),
    description: "Regional development bank supporting sustainable, inclusive growth in Asia and the Pacific.",
    matchPatterns: ["Asian Development Bank", "ADB"],
  },
  {
    name: "Association of Southeast Asian Nations",
    short: "ASEAN",
    color: "#003087",
    logo: "/images/logos/asean.svg",
    description: "Regional intergovernmental organization of 10 Southeast Asian states promoting cooperation and integration.",
    matchPatterns: ["ASEAN"],
  },
  {
    name: "Oxfam International",
    short: "Oxfam",
    color: "#E70052",
    logo: "/images/logos/oxfam.svg",
    description: "Confederation of charitable organizations focused on the alleviation of global poverty.",
    matchPatterns: ["Oxfam"],
  },
  {
    name: "Brookings Institution",
    short: "Brookings",
    color: "#003974",
    logo: bf("brookings.edu"),
    description: "American research group conducting research and education in social sciences and public policy.",
    matchPatterns: ["Brookings"],
  },
  {
    name: "World Food Programme",
    short: "WFP",
    color: "#009FE3",
    logo: "/images/logos/wfp.svg",
    description: "World's largest humanitarian organization addressing hunger and promoting food security.",
    matchPatterns: ["WFP", "World Food Programme"],
  },
  {
    name: "UN Climate Change Secretariat",
    short: "UNFCCC",
    color: "#009A44",
    logo: "/images/logos/unfccc.svg",
    description: "UN body supporting the global climate response, including the Paris Agreement and the annual COP.",
    matchPatterns: ["UNFCCC", "UN Climate Change", "UN Framework Convention on Climate Change"],
  },
];

export const ORG_REGISTRY: Record<string, OrgConfig> = Object.fromEntries(
  RAW.map(o => {
    const slug = slugify(o.name);
    return [slug, { slug, ...o }] as const;
  })
);

export const ORG_LIST: OrgConfig[] = Object.values(ORG_REGISTRY);

export function getOrgBySlug(slug: string): OrgConfig | null {
  return ORG_REGISTRY[slug] ?? null;
}
