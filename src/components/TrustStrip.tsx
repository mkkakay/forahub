"use client";

import OrgLogo from "@/components/OrgLogo";

const ORGS: { name: string; color: string }[] = [
  // UN agencies
  { name: "WHO",               color: "0093D5" },
  { name: "UNICEF",            color: "00AEEF" },
  { name: "UNDP",              color: "009FDA" },
  { name: "UNFPA",             color: "009FDA" },
  { name: "UN Women",          color: "4C9F38" },
  { name: "UNESCO",            color: "0093D5" },
  { name: "FAO",               color: "009A44" },
  { name: "WFP",               color: "009FE3" },
  { name: "IOM",               color: "003B6F" },
  { name: "UNHCR",             color: "00B398" },
  { name: "UNAIDS",            color: "E2001A" },
  { name: "UNEP",              color: "009A44" },
  { name: "ILO",               color: "003B6F" },
  { name: "UN-Habitat",        color: "0093D5" },
  // Major foundations
  { name: "Gates Foundation",  color: "E8192C" },
  { name: "Wellcome",          color: "E7157B" },
  { name: "Rockefeller Fdn",   color: "003B6F" },
  { name: "Ford Foundation",   color: "003B6F" },
  // Development banks
  { name: "World Bank",        color: "003087" },
  { name: "African Dev Bank",  color: "006B3F" },
  { name: "IDB",               color: "003B6F" },
  { name: "Asian Dev Bank",    color: "003B6F" },
  { name: "IsDB",              color: "009A44" },
  // Global health
  { name: "Gavi",              color: "0066CC" },
  { name: "The Global Fund",   color: "EF3340" },
  { name: "PAHO",              color: "0093D5" },
  { name: "Africa CDC",        color: "006B3F" },
  // Major INGOs
  { name: "MSF",               color: "E30613" },
  { name: "Save the Children", color: "E2001A" },
  { name: "Oxfam",             color: "E70052" },
  { name: "CARE",              color: "E2001A" },
  { name: "PATH",              color: "003B6F" },
  // South-South donors
  { name: "JICA",              color: "003B6F" },
  { name: "KOICA",             color: "003B6F" },
  { name: "ABC Brazil",        color: "009A44" },
  // African regional
  { name: "African Union",     color: "009A44" },
  { name: "ECOWAS",            color: "009A44" },
  { name: "SADC",              color: "009A44" },
  { name: "EAC",               color: "009A44" },
  // Asian regional
  { name: "ASEAN",             color: "003087" },
  { name: "SAARC",             color: "003B6F" },
  // Research & think tanks
  { name: "Brookings",         color: "003974" },
  { name: "Chatham House",     color: "003B6F" },
  { name: "ODI",               color: "003B6F" },
  // Global South universities
  { name: "Makerere",          color: "003B6F" },
  { name: "Univ. of Nairobi",  color: "003B6F" },
  { name: "UCT",               color: "003B6F" },
  { name: "Aga Khan Univ.",    color: "003B6F" },
];

const doubled = [...ORGS, ...ORGS];

export default function TrustStrip() {
  return (
    <div className="w-full bg-white py-6 px-4">
      <p className="text-xs text-gray-400 uppercase tracking-widest text-center mb-4">
        Tracking events from 1,000+ organizations worldwide
      </p>
      <div className="overflow-hidden">
        <div className="logos-track pause-on-hover flex items-center">
          {doubled.map((org, i) => (
            <div
              key={`${org.name}-${i}`}
              title={org.name}
              className="shrink-0 mx-4 flex items-center justify-center"
            >
              <OrgLogo name={org.name} color={org.color} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
