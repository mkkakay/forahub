"use client";

import { useState } from "react";

const ORGS = [
  // UN and Multilateral
  { domain: "who.int",           name: "World Health Organization" },
  { domain: "unicef.org",        name: "UNICEF" },
  { domain: "undp.org",          name: "UNDP" },
  { domain: "unfpa.org",         name: "UNFPA" },
  { domain: "unwomen.org",       name: "UN Women" },
  { domain: "unesco.org",        name: "UNESCO" },
  { domain: "fao.org",           name: "FAO" },
  { domain: "wfp.org",           name: "WFP" },
  { domain: "iom.int",           name: "IOM" },
  { domain: "unhcr.org",         name: "UNHCR" },
  { domain: "unaids.org",        name: "UNAIDS" },
  { domain: "unep.org",          name: "UNEP" },
  { domain: "ilo.org",           name: "ILO" },
  { domain: "unhabitat.org",     name: "UN-Habitat" },
  { domain: "unocha.org",        name: "OCHA" },
  // Foundations
  { domain: "gatesfoundation.org",      name: "Gates Foundation" },
  { domain: "wellcome.org",             name: "Wellcome Trust" },
  { domain: "rockefellerfoundation.org",name: "Rockefeller Foundation" },
  { domain: "fordfoundation.org",       name: "Ford Foundation" },
  { domain: "hewlett.org",              name: "Hewlett Foundation" },
  { domain: "openphilanthropy.org",     name: "Open Philanthropy" },
  // Development Banks
  { domain: "worldbank.org",  name: "World Bank" },
  { domain: "afdb.org",       name: "African Development Bank" },
  { domain: "iadb.org",       name: "IDB" },
  { domain: "adb.org",        name: "Asian Development Bank" },
  { domain: "isdb.org",       name: "Islamic Development Bank" },
  { domain: "ebrd.com",       name: "EBRD" },
  // Global Health
  { domain: "gavi.org",        name: "Gavi" },
  { domain: "theglobalfund.org",name: "The Global Fund" },
  { domain: "paho.org",        name: "PAHO" },
  { domain: "africacdc.org",   name: "Africa CDC" },
  { domain: "searo.who.int",   name: "WHO SEARO" },
  // Major INGOs
  { domain: "msf.org",               name: "Médecins Sans Frontières" },
  { domain: "savethechildren.org",   name: "Save the Children" },
  { domain: "oxfam.org",             name: "Oxfam" },
  { domain: "care.org",              name: "CARE" },
  { domain: "worldvision.org",       name: "World Vision" },
  { domain: "path.org",              name: "PATH" },
  { domain: "fhi360.org",            name: "FHI 360" },
  // Gulf and Middle East donors
  { domain: "qffd.gov.qa",    name: "Qatar Fund for Development" },
  { domain: "adfd.ae",         name: "Abu Dhabi Fund for Development" },
  { domain: "kfund.gov.kw",    name: "Kuwait Fund" },
  { domain: "sfd.gov.sa",      name: "Saudi Fund for Development" },
  // South-South and emerging donors
  { domain: "jica.go.jp",     name: "JICA" },
  { domain: "koica.go.kr",    name: "KOICA" },
  { domain: "tika.gov.tr",    name: "TIKA" },
  { domain: "abc.gov.br",     name: "ABC Brazil" },
  { domain: "itec.gov.in",    name: "ITEC India" },
  // African regional bodies
  { domain: "au.int",         name: "African Union" },
  { domain: "ecowas.int",     name: "ECOWAS" },
  { domain: "sadc.int",       name: "SADC" },
  { domain: "eac.int",        name: "EAC" },
  { domain: "igad.int",       name: "IGAD" },
  { domain: "censad.org",     name: "CEN-SAD" },
  { domain: "comesa.int",     name: "COMESA" },
  // Asian regional
  { domain: "asean.org",      name: "ASEAN" },
  { domain: "saarc-sec.org",  name: "SAARC" },
  { domain: "apec.org",       name: "APEC" },
  // Latin American regional
  { domain: "cepal.org",      name: "ECLAC" },
  { domain: "parlasur.org",   name: "Parlasur" },
  { domain: "caricom.org",    name: "CARICOM" },
  // Research and think tanks
  { domain: "brookings.edu",  name: "Brookings Institution" },
  { domain: "chathamhouse.org",name: "Chatham House" },
  { domain: "odi.org",        name: "ODI" },
  { domain: "ifpri.org",      name: "IFPRI" },
  { domain: "icrw.org",       name: "ICRW" },
  // Global South universities
  { domain: "makerere.ac.ug", name: "Makerere University" },
  { domain: "uonbi.ac.ke",    name: "University of Nairobi" },
  { domain: "uct.ac.za",      name: "University of Cape Town" },
  { domain: "usp.br",         name: "University of São Paulo" },
  { domain: "unam.mx",        name: "UNAM" },
  { domain: "aku.edu",        name: "Aga Khan University" },
  { domain: "icddrb.org",     name: "icddr,b" },
  { domain: "jimma.edu.et",   name: "Jimma University" },
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
              className="shrink-0 mx-3 opacity-80 hover:opacity-100 hover:scale-110 transition-all duration-300 flex items-center justify-center"
              style={{ width: 40, height: 40 }}
            >
              {failed.has(org.domain) ? (
                <span className="text-[10px] text-gray-400 font-medium text-center leading-tight whitespace-nowrap">
                  {org.domain.split(".")[0].toUpperCase()}
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://www.google.com/s2/favicons?domain=${org.domain}&sz=64`}
                  alt={org.name}
                  width={40}
                  height={40}
                  className="object-contain rounded-lg"
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
