"use client";

import { useState } from "react";
import { LOCAL_LOGOS } from "@/lib/logos";

// Ordered list of orgs to show; only those present in LOCAL_LOGOS are rendered.
const ORGS = [
  // UN agencies
  "WHO", "UNICEF", "UNDP", "UN Women", "FAO", "WFP",
  "IOM", "UNHCR", "UNAIDS", "UNEP", "ILO", "UNFPA", "UNFCCC",
  // Development finance
  "World Bank", "The Global Fund", "Gavi", "AfDB", "ADB", "IDB", "IsDB",
  // INGOs
  "MSF", "Save the Children", "Oxfam", "CARE", "Rotary International",
  // Health & public health
  "PAHO", "Africa CDC", "CDC", "NIH", "LSHTM",
  // Think tanks & intergovernmental
  "OECD", "WEF", "Brookings", "Chatham House",
  // Foundations
  "Gates Foundation", "Rockefeller Foundation",
  // Regional bodies
  "African Union", "ECOWAS", "ASEAN", "SADC",
  // Universities & research institutions
  "NUS", "Harvard University", "Stanford University", "MIT",
  "University of Cambridge", "Oxford", "Johns Hopkins",
  "Karolinska", "Aga Khan University", "University of Cape Town",
];

const STRIP_ORGS = ORGS.filter(name => LOCAL_LOGOS[name]);

// Duplicate exactly twice: -50% CSS keyframe scrolls one full set then loops seamlessly
const looped = [...STRIP_ORGS, ...STRIP_ORGS];

function LogoItem({ name, index }: { name: string; index: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div className="flex items-center justify-center mx-6 flex-shrink-0 h-8 w-28">
      {imgFailed ? (
        <span className="text-xs font-semibold text-gray-600 text-center leading-tight">
          {name}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${LOCAL_LOGOS[name]}?v=2`}
          alt={name}
          title={name}
          className="max-h-7 max-w-24 object-contain"
          loading={index < 10 ? "eager" : "lazy"}
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
          {looped.map((name, i) => (
            <LogoItem key={`${name}-${i}`} name={name} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
