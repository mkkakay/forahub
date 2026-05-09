"use client";

import { useState } from "react";

const BRANDFETCH_KEY = "NJ56JESB-y_Yq9XLTApT75PLDyFi9Qf7-pz31r4tAVRcF1jD_r6AES98YRgJyToYZCUmW98HtK9wj_41zhBQjQ";

const bf = (domain: string) =>
  `https://cdn.brandfetch.io/${domain}/w/200/h/200/logo?c=${BRANDFETCH_KEY}`;

const ORGS: { name: string; logo: string }[] = [
  // Confirmed Wikipedia SVGs — served locally
  { name: "WHO",               logo: "/images/logos/who.svg" },
  { name: "UNICEF",            logo: "/images/logos/unicef.svg" },
  { name: "UNDP",              logo: "/images/logos/undp.svg" },
  { name: "UN Women",          logo: "/images/logos/unwomen.svg" },
  { name: "FAO",               logo: "/images/logos/fao.svg" },
  { name: "WFP",               logo: "/images/logos/wfp.svg" },
  { name: "IOM",               logo: "/images/logos/iom.svg" },
  { name: "UNHCR",             logo: "/images/logos/unhcr.svg" },
  { name: "UNAIDS",            logo: "/images/logos/unaids.svg" },
  { name: "UNEP",              logo: "/images/logos/unep.svg" },
  { name: "ILO",               logo: "/images/logos/ilo.svg" },
  { name: "World Bank",        logo: "/images/logos/worldbank.svg" },
  { name: "Global Fund",       logo: "/images/logos/globalfund.svg" },
  { name: "MSF",               logo: "/images/logos/msf.svg" },
  { name: "Save the Children", logo: "/images/logos/savechildren.svg" },
  { name: "Oxfam",             logo: "/images/logos/oxfam.svg" },
  { name: "CARE",              logo: "/images/logos/care.svg" },
  { name: "African Union",     logo: "/images/logos/au.svg" },
  { name: "ECOWAS",            logo: "/images/logos/ecowas.svg" },
  { name: "ASEAN",             logo: "/images/logos/asean.svg" },
  { name: "NUS",               logo: "/images/logos/nus.svg" },
  // Brandfetch CDN
  { name: "Gates Foundation",  logo: bf("gatesfoundation.org") },
  { name: "CDC",               logo: bf("cdc.gov") },
  { name: "NIH",               logo: bf("nih.gov") },
  { name: "USAID",             logo: bf("usaid.gov") },
  { name: "Harvard",           logo: bf("harvard.edu") },
  { name: "Johns Hopkins",     logo: bf("jhu.edu") },
  { name: "Stanford",          logo: bf("stanford.edu") },
  { name: "MIT",               logo: bf("mit.edu") },
  { name: "Oxford",            logo: bf("ox.ac.uk") },
  { name: "Cambridge",         logo: bf("cam.ac.uk") },
  { name: "Karolinska",        logo: bf("ki.se") },
  { name: "LSHTM",             logo: bf("lshtm.ac.uk") },
  { name: "UCT",               logo: bf("uct.ac.za") },
  { name: "Makerere",          logo: bf("mak.ac.ug") },
  { name: "Aga Khan Univ.",    logo: bf("aku.edu") },
  { name: "WEF",               logo: bf("weforum.org") },
  { name: "OECD",              logo: bf("oecd.org") },
  { name: "Brookings",         logo: bf("brookings.edu") },
  { name: "Chatham House",     logo: bf("chathamhouse.org") },
  { name: "Wellcome Trust",    logo: bf("wellcome.org") },
  { name: "Rockefeller",       logo: bf("rockefellerfoundation.org") },
  { name: "Rotary",            logo: bf("rotary.org") },
  { name: "Gavi",              logo: bf("gavi.org") },
  { name: "AfDB",              logo: bf("afdb.org") },
  { name: "ADB",               logo: bf("adb.org") },
  { name: "JICA",              logo: bf("jica.go.jp") },
  { name: "KOICA",             logo: bf("koica.go.kr") },
  { name: "PAHO",              logo: bf("paho.org") },
  { name: "Africa CDC",        logo: bf("africacdc.org") },
  { name: "SADC",              logo: bf("sadc.int") },
  { name: "UNFCCC",            logo: bf("unfccc.int") },
  { name: "UNFPA",             logo: bf("unfpa.org") },
  { name: "IsDB",              logo: bf("isdb.org") },
  { name: "IDB",               logo: bf("iadb.org") },
];

// Duplicate exactly twice: -50% CSS keyframe scrolls one full set then loops seamlessly
const looped = [...ORGS, ...ORGS];

function LogoItem({ name, logo }: { name: string; logo: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div className="flex items-center justify-center mx-6 flex-shrink-0 h-8 w-28">
      {imgFailed ? (
        <span className="text-xs font-semibold text-gray-500 text-center leading-tight">
          {name}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={name}
          title={name}
          className="max-h-7 max-w-24 object-contain"
          crossOrigin="anonymous"
          onError={() => setImgFailed(true)}
        />
      )}
    </div>
  );
}

export default function TrustStrip() {
  return (
    <div className="w-full bg-white py-6 px-4">
      <p className="text-xs text-gray-400 uppercase tracking-widest text-center mb-4">
        Tracking events from 1,000+ organizations worldwide
      </p>
      <div className="overflow-hidden">
        <div className="logos-track pause-on-hover flex items-center">
          {looped.map((org, i) => (
            <LogoItem key={`${org.name}-${i}`} name={org.name} logo={org.logo} />
          ))}
        </div>
      </div>
    </div>
  );
}
