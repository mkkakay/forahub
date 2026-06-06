"use client";

import { useState } from "react";

const BRANDFETCH_KEY = "NJ56JESB-y_Yq9XLTApT75PLDyFi9Qf7-pz31r4tAVRcF1jD_r6AES98YRgJyToYZCUmW98HtK9wj_41zhBQjQ";

const bf = (domain: string) =>
  `https://cdn.brandfetch.io/${domain}/w/200/h/200/logo?c=${BRANDFETCH_KEY}`;

// Fallback list — used only when the trust_logos table returns zero active
// rows (e.g. fresh install). Once the admin has added entries, the server
// passes them via the `logos` prop and this list is ignored.
const DEFAULT_ORGS: { name: string; logo: string }[] = [
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

interface TrustStripProps {
  /** Active logo rows from the trust_logos table. Empty array = use defaults. */
  logos?: { name: string; image_url: string }[];
}

function LogoItem({ name, src }: { name: string; src: string }) {
  const [hidden, setHidden] = useState(false);
  // Per CLAUDE.md: on the public strip a broken image is hidden, never shown
  // as text. The container collapses with the image so the marquee rhythm
  // stays even when a logo fails.
  if (hidden) return null;
  return (
    <div className="flex items-center justify-center mx-6 flex-shrink-0 h-12 w-40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        title={name}
        className="max-h-10 max-w-36 w-auto object-contain"
        crossOrigin="anonymous"
        onError={() => setHidden(true)}
      />
    </div>
  );
}

export default function TrustStrip({ logos }: TrustStripProps) {
  const source =
    logos && logos.length > 0
      ? logos.map(l => ({ name: l.name, logo: l.image_url }))
      : DEFAULT_ORGS;

  // Duplicate exactly twice: -50% CSS keyframe scrolls one full set then loops seamlessly.
  const looped = [...source, ...source];

  return (
    <div className="w-full bg-white py-6 px-4">
      <p className="text-xs text-gray-400 uppercase tracking-widest text-center mb-4">
        Tracking events from 1,000+ organizations worldwide
      </p>
      <div className="overflow-hidden">
        <div className="logos-track pause-on-hover flex items-center">
          {looped.map((org, i) => (
            <LogoItem key={`${org.name}-${i}`} name={org.name} src={org.logo} />
          ))}
        </div>
      </div>
    </div>
  );
}
