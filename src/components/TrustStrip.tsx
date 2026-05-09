"use client";

import { useState } from "react";
import { LOCAL_LOGOS } from "@/lib/logos";

// Ordered list of orgs to show; only those present in LOCAL_LOGOS are rendered.
const ORGS = [
  "WHO", "UNICEF", "UNDP", "UN Women", "FAO", "WFP",
  "IOM", "UNHCR", "UNAIDS", "UNEP", "ILO",
  "World Bank", "The Global Fund", "Gavi",
  "MSF", "Save the Children", "Oxfam", "CARE",
  "African Union", "ECOWAS", "ASEAN",
];

const STRIP_ORGS = ORGS.filter(name => LOCAL_LOGOS[name]);

// Triple for seamless infinite loop
const looped = [...STRIP_ORGS, ...STRIP_ORGS, ...STRIP_ORGS];

function LogoItem({ name }: { name: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="flex items-center justify-center mx-6 flex-shrink-0 h-8 w-28">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOCAL_LOGOS[name]!}
        alt={name}
        title={name}
        className="max-h-7 max-w-24 object-contain"
        onError={() => setHidden(true)}
      />
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
          {looped.map((name, i) => (
            <LogoItem key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>
    </div>
  );
}
