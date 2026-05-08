"use client";

import { useState } from "react";

const ORGS: { name: string; logo: string }[] = [
  // UN agencies
  { name: "WHO",               logo: "https://ui-avatars.com/api/?name=WHO&background=0093D5&color=fff&size=128&bold=true" },
  { name: "UNICEF",            logo: "https://ui-avatars.com/api/?name=UNICEF&background=00AEEF&color=fff&size=128&bold=true" },
  { name: "UNDP",              logo: "https://ui-avatars.com/api/?name=UNDP&background=009FDA&color=fff&size=128&bold=true" },
  { name: "UNFPA",             logo: "https://ui-avatars.com/api/?name=UNFPA&background=009FDA&color=fff&size=128&bold=true" },
  { name: "UN Women",          logo: "https://ui-avatars.com/api/?name=UNW&background=4C9F38&color=fff&size=128&bold=true" },
  { name: "UNESCO",            logo: "https://ui-avatars.com/api/?name=UNESCO&background=0093D5&color=fff&size=128&bold=true" },
  { name: "FAO",               logo: "https://ui-avatars.com/api/?name=FAO&background=009A44&color=fff&size=128&bold=true" },
  { name: "WFP",               logo: "https://ui-avatars.com/api/?name=WFP&background=009FE3&color=fff&size=128&bold=true" },
  { name: "IOM",               logo: "https://ui-avatars.com/api/?name=IOM&background=003B6F&color=fff&size=128&bold=true" },
  { name: "UNHCR",             logo: "https://ui-avatars.com/api/?name=UNHCR&background=00B398&color=fff&size=128&bold=true" },
  { name: "UNAIDS",            logo: "https://ui-avatars.com/api/?name=UNAIDS&background=E2001A&color=fff&size=128&bold=true" },
  { name: "UNEP",              logo: "https://ui-avatars.com/api/?name=UNEP&background=009A44&color=fff&size=128&bold=true" },
  { name: "ILO",               logo: "https://ui-avatars.com/api/?name=ILO&background=003B6F&color=fff&size=128&bold=true" },
  { name: "UN-Habitat",        logo: "https://ui-avatars.com/api/?name=UNH&background=0093D5&color=fff&size=128&bold=true" },
  // Major foundations
  { name: "Gates Foundation",  logo: "https://ui-avatars.com/api/?name=Gates&background=E8192C&color=fff&size=128&bold=true" },
  { name: "Wellcome",          logo: "https://ui-avatars.com/api/?name=Wellcome&background=E7157B&color=fff&size=128&bold=true" },
  { name: "Rockefeller Fdn",   logo: "https://ui-avatars.com/api/?name=RF&background=003B6F&color=fff&size=128&bold=true" },
  { name: "Ford Foundation",   logo: "https://ui-avatars.com/api/?name=Ford&background=003B6F&color=fff&size=128&bold=true" },
  // Development banks
  { name: "World Bank",        logo: "https://cdn.simpleicons.org/worldbank" },
  { name: "African Dev Bank",  logo: "https://ui-avatars.com/api/?name=AfDB&background=006B3F&color=fff&size=128&bold=true" },
  { name: "IDB",               logo: "https://ui-avatars.com/api/?name=IDB&background=003B6F&color=fff&size=128&bold=true" },
  { name: "Asian Dev Bank",    logo: "https://ui-avatars.com/api/?name=ADB&background=003B6F&color=fff&size=128&bold=true" },
  { name: "IsDB",              logo: "https://ui-avatars.com/api/?name=IsDB&background=009A44&color=fff&size=128&bold=true" },
  // Global health
  { name: "Gavi",              logo: "https://ui-avatars.com/api/?name=Gavi&background=0066CC&color=fff&size=128&bold=true" },
  { name: "The Global Fund",   logo: "https://ui-avatars.com/api/?name=GF&background=EF3340&color=fff&size=128&bold=true" },
  { name: "PAHO",              logo: "https://ui-avatars.com/api/?name=PAHO&background=0093D5&color=fff&size=128&bold=true" },
  { name: "Africa CDC",        logo: "https://ui-avatars.com/api/?name=ACDC&background=006B3F&color=fff&size=128&bold=true" },
  // Major INGOs
  { name: "MSF",               logo: "https://ui-avatars.com/api/?name=MSF&background=E30613&color=fff&size=128&bold=true" },
  { name: "Save the Children", logo: "https://ui-avatars.com/api/?name=STC&background=E2001A&color=fff&size=128&bold=true" },
  { name: "Oxfam",             logo: "https://ui-avatars.com/api/?name=Oxfam&background=E70052&color=fff&size=128&bold=true" },
  { name: "CARE",              logo: "https://ui-avatars.com/api/?name=CARE&background=E2001A&color=fff&size=128&bold=true" },
  { name: "PATH",              logo: "https://ui-avatars.com/api/?name=PATH&background=003B6F&color=fff&size=128&bold=true" },
  // South-South donors
  { name: "JICA",              logo: "https://ui-avatars.com/api/?name=JICA&background=003B6F&color=fff&size=128&bold=true" },
  { name: "KOICA",             logo: "https://ui-avatars.com/api/?name=KOICA&background=003B6F&color=fff&size=128&bold=true" },
  { name: "ABC Brazil",        logo: "https://ui-avatars.com/api/?name=ABC&background=009A44&color=fff&size=128&bold=true" },
  // African regional
  { name: "African Union",     logo: "https://ui-avatars.com/api/?name=AU&background=009A44&color=fff&size=128&bold=true" },
  { name: "ECOWAS",            logo: "https://ui-avatars.com/api/?name=ECOWAS&background=009A44&color=fff&size=128&bold=true" },
  { name: "SADC",              logo: "https://ui-avatars.com/api/?name=SADC&background=009A44&color=fff&size=128&bold=true" },
  { name: "EAC",               logo: "https://ui-avatars.com/api/?name=EAC&background=009A44&color=fff&size=128&bold=true" },
  // Asian regional
  { name: "ASEAN",             logo: "https://ui-avatars.com/api/?name=ASEAN&background=003087&color=fff&size=128&bold=true" },
  { name: "SAARC",             logo: "https://ui-avatars.com/api/?name=SAARC&background=003B6F&color=fff&size=128&bold=true" },
  // Research & think tanks
  { name: "Brookings",         logo: "https://ui-avatars.com/api/?name=Brookings&background=003974&color=fff&size=128&bold=true" },
  { name: "Chatham House",     logo: "https://ui-avatars.com/api/?name=CH&background=003B6F&color=fff&size=128&bold=true" },
  { name: "ODI",               logo: "https://ui-avatars.com/api/?name=ODI&background=003B6F&color=fff&size=128&bold=true" },
  // Global South universities
  { name: "Makerere",          logo: "https://ui-avatars.com/api/?name=MAK&background=003B6F&color=fff&size=128&bold=true" },
  { name: "Univ. of Nairobi",  logo: "https://ui-avatars.com/api/?name=UoN&background=003B6F&color=fff&size=128&bold=true" },
  { name: "UCT",               logo: "https://ui-avatars.com/api/?name=UCT&background=003B6F&color=fff&size=128&bold=true" },
  { name: "Aga Khan Univ.",    logo: "https://ui-avatars.com/api/?name=AKU&background=003B6F&color=fff&size=128&bold=true" },
];

export default function TrustStrip() {
  const [failed, setFailed] = useState<Set<string>>(new Set());

  const doubled = [...ORGS, ...ORGS];

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
              {failed.has(org.name) ? (
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                  {org.name}
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={org.logo}
                  alt={org.name}
                  className="h-8 w-8 rounded-lg object-contain"
                  style={{ imageRendering: "crisp-edges" }}
                  onError={() =>
                    setFailed(prev => {
                      const next = new Set(prev);
                      next.add(org.name);
                      return next;
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
