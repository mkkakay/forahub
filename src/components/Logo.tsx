"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";
import { useState } from "react";

interface LogoProps {
  href?: string;
  className?: string;
}

export default function Logo({ href = "/", className = "" }: LogoProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "high-contrast";
  const [imgError, setImgError] = useState(false);

  const logoSrc = isDark
    ? "/images/forahub-logo-white.png"
    : "/images/forahub-logo-navy.png";

  const content = imgError ? (
    <FallbackLogo isDark={isDark} />
  ) : (
    <>
      {/* Mobile: FH mark */}
      <div className="sm:hidden">
        <Image
          src={logoSrc}
          alt="FH"
          width={32}
          height={32}
          className="h-8 w-auto"
          onError={() => setImgError(true)}
        />
      </div>
      {/* Desktop: full wordmark */}
      <div className="hidden sm:block">
        <Image
          src={logoSrc}
          alt="ForaHub"
          width={120}
          height={40}
          className="h-10 w-auto"
          onError={() => setImgError(true)}
        />
      </div>
    </>
  );

  return (
    <Link href={href} className={`flex items-center ${className}`}>
      {content}
    </Link>
  );
}

function FallbackLogo({ isDark }: { isDark: boolean }) {
  return (
    <>
      <span className="sm:hidden text-lg font-extrabold tracking-tight" style={{ color: isDark ? "#ffffff" : "#0f2a4a" }}>
        FH
      </span>
      <span className="hidden sm:inline text-xl font-extrabold tracking-tight" style={{ color: isDark ? "#ffffff" : "#0f2a4a" }}>
        Fora<span style={{ color: "#4ea8de" }}>Hub</span>
      </span>
    </>
  );
}
