"use client";

import { useState } from "react";
import { LOCAL_LOGOS } from "@/lib/logos";

const SIZE_CLS = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

interface OrgLogoProps {
  name: string;
  color: string;  // hex with or without leading #
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function OrgLogo({ name, color, size = "sm", className = "" }: OrgLogoProps) {
  const localSrc = LOCAL_LOGOS[name] ?? null;
  const [useFallback, setUseFallback] = useState(!localSrc);

  const hex = color.replace("#", "");
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${hex}&color=fff&size=128&bold=true`;
  const sizeCls = SIZE_CLS[size];
  const cls = `${sizeCls} rounded-lg object-contain ${className}`.trim();

  if (useFallback) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className={cls} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={localSrc!}
      alt={name}
      className={cls}
      onError={() => setUseFallback(true)}
    />
  );
}
