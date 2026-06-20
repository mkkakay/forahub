"use client";

// Horizontal logo marquee for the "Organizations represented on ForaHub
// include" surface. Drives off `getFeaturedOrgLogos()` which only returns
// rows from organization_overrides.is_featured = true with a real logo
// URL — so this strip is curated household-name orgs, NOT a random
// sample of the bulk-imported ROR/IATI directory.
//
// Honest framing:
//   - Heading is "represented on ForaHub include" — coverage, not
//     endorsement. Each tile links to /organizations/{slug} so the
//     implicit promise is "click to see their events on ForaHub".
//   - We do NOT render verified / claimed badges on the strip.
//
// Brandfetch theme caveat:
//   organizations_directory.logo_url stores the /theme/dark/ Brandfetch
//   variant (white logos for dark BG). On a white marquee they vanish.
//   We swap to /theme/light/ at render time and fall back to the
//   original URL onError, in case a given org has no light variant.
//
// Accessibility:
//   - Respects prefers-reduced-motion: animation is disabled and the
//     track wraps into a static grid instead.
//   - Each <img> has alt = org.name; the wrapping <Link> has aria-label.

import Link from "next/link";
import { useState } from "react";
import type { TrustOrgRow } from "@/lib/discovery/queries";

interface Props {
  orgs: TrustOrgRow[];
  heading?: string;
  subline?: string;
}

function lightVariant(url: string): string {
  return url.includes("/theme/dark/")
    ? url.replace("/theme/dark/", "/theme/light/")
    : url;
}

function LogoTile({ org }: { org: TrustOrgRow }) {
  const initial = org.logo_url ? lightVariant(org.logo_url) : "";
  const [src, setSrc] = useState(initial);
  const [errored, setErrored] = useState(false);

  return (
    <Link
      href={`/organizations/${org.slug}`}
      aria-label={`See events from ${org.name}`}
      className="group/tile shrink-0 mx-4 md:mx-6 flex items-center justify-center h-10 md:h-12 w-[120px] md:w-[140px]"
    >
      {org.logo_url && !errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={org.name}
          loading="lazy"
          className="max-h-7 md:max-h-9 max-w-full object-contain grayscale opacity-70 group-hover/marquee:opacity-90 group-hover/tile:grayscale-0 group-hover/tile:opacity-100 transition-all duration-300"
          onError={() => {
            // Try the original (dark) variant once, then give up and
            // render the org name as a text fallback.
            if (src !== org.logo_url && org.logo_url) {
              setSrc(org.logo_url);
            } else {
              setErrored(true);
            }
          }}
        />
      ) : (
        <span className="text-[11px] font-semibold text-gray-500 line-clamp-2 text-center px-2">
          {org.name}
        </span>
      )}
    </Link>
  );
}

export default function OrganizationLogoMarquee({
  orgs,
  heading = "Organizations represented on ForaHub include",
  subline = "Coverage is based on publicly indexed event sources and organization profiles.",
}: Props) {
  if (orgs.length === 0) return null;

  // Duplicate the set so the translateX(-50%) loop is seamless.
  const doubled = [...orgs, ...orgs];

  return (
    <section aria-labelledby="org-marquee-heading">
      <h3
        id="org-marquee-heading"
        className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500"
      >
        {heading}
      </h3>

      <div
        className="group/marquee relative mt-5 overflow-hidden"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0, black 8%, black 92%, transparent 100%)",
          maskImage:
            "linear-gradient(to right, transparent 0, black 8%, black 92%, transparent 100%)",
        }}
      >
        <div className="forahub-marquee-track flex w-max items-center">
          {doubled.map((org, i) => (
            <LogoTile key={`${org.slug}-${i}`} org={org} />
          ))}
        </div>

        {/* Reduced-motion fallback: hide the animated track and render a
            static, wrapping grid of unique orgs instead. */}
        <div
          aria-hidden="true"
          className="forahub-marquee-static hidden flex-wrap items-center justify-center gap-y-2"
        >
          {orgs.map((org, i) => (
            <LogoTile key={`static-${org.slug}-${i}`} org={org} />
          ))}
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-gray-400">
        {subline}
      </p>

      <style>{`
        @keyframes forahub-marquee-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .forahub-marquee-track {
          animation: forahub-marquee-scroll 50s linear infinite;
          will-change: transform;
        }
        .group\\/marquee:hover .forahub-marquee-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .forahub-marquee-track {
            display: none !important;
          }
          .forahub-marquee-static {
            display: flex !important;
          }
        }
      `}</style>
    </section>
  );
}
