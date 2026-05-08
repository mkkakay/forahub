"use client";

import { useState } from "react";

const ORGS = [
  // UN agencies
  { domain: "who.int",                  name: "WHO" },
  { domain: "unicef.org",               name: "UNICEF" },
  { domain: "undp.org",                 name: "UNDP" },
  { domain: "unfpa.org",                name: "UNFPA" },
  { domain: "unwomen.org",              name: "UN Women" },
  { domain: "unesco.org",               name: "UNESCO" },
  { domain: "fao.org",                  name: "FAO" },
  { domain: "wfp.org",                  name: "WFP" },
  { domain: "iom.int",                  name: "IOM" },
  { domain: "unhcr.org",                name: "UNHCR" },
  { domain: "unaids.org",               name: "UNAIDS" },
  { domain: "unep.org",                 name: "UNEP" },
  { domain: "ilo.org",                  name: "ILO" },
  { domain: "unhabitat.org",            name: "UN-Habitat" },
  // Major foundations
  { domain: "gatesfoundation.org",      name: "Gates Foundation" },
  { domain: "wellcome.org",             name: "Wellcome" },
  { domain: "rockefellerfoundation.org",name: "Rockefeller Foundation" },
  { domain: "fordfoundation.org",       name: "Ford Foundation" },
  // Development banks
  { domain: "worldbank.org",            name: "World Bank" },
  { domain: "afdb.org",                 name: "African Dev Bank" },
  { domain: "iadb.org",                 name: "IDB" },
  { domain: "adb.org",                  name: "Asian Dev Bank" },
  { domain: "isdb.org",                 name: "IsDB" },
  // Global health
  { domain: "gavi.org",                 name: "Gavi" },
  { domain: "theglobalfund.org",        name: "The Global Fund" },
  { domain: "paho.org",                 name: "PAHO" },
  // Major INGOs
  { domain: "msf.org",                  name: "MSF" },
  { domain: "savethechildren.org",      name: "Save the Children" },
  { domain: "oxfam.org",               name: "Oxfam" },
  { domain: "care.org",                 name: "CARE" },
  { domain: "path.org",                 name: "PATH" },
  // South-South donors
  { domain: "jica.go.jp",              name: "JICA" },
  { domain: "koica.go.kr",             name: "KOICA" },
  { domain: "abc.gov.br",              name: "ABC Brazil" },
  // African regional
  { domain: "au.int",                   name: "African Union" },
  { domain: "ecowas.int",              name: "ECOWAS" },
  { domain: "sadc.int",                name: "SADC" },
  { domain: "eac.int",                 name: "EAC" },
  // Asian regional
  { domain: "asean.org",               name: "ASEAN" },
  { domain: "saarc-sec.org",           name: "SAARC" },
  // Research
  { domain: "brookings.edu",           name: "Brookings" },
  { domain: "chathamhouse.org",        name: "Chatham House" },
  { domain: "odi.org",                 name: "ODI" },
  // Global South universities
  { domain: "makerere.ac.ug",          name: "Makerere University" },
  { domain: "uonbi.ac.ke",             name: "University of Nairobi" },
  { domain: "uct.ac.za",               name: "UCT" },
  { domain: "aku.edu",                 name: "Aga Khan University" },
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
              key={`${org.domain}-${i}`}
              title={org.name}
              className="shrink-0 mx-4 flex items-center justify-center"
              style={{ height: 32, minWidth: 32 }}
            >
              {failed.has(org.domain) ? (
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                  {org.name}
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://logo.clearbit.com/${org.domain}`}
                  alt={org.name}
                  className="max-h-8 w-auto object-contain"
                  style={{ imageRendering: "crisp-edges" }}
                  onError={() =>
                    setFailed(prev => {
                      const next = new Set(prev);
                      next.add(org.domain);
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
