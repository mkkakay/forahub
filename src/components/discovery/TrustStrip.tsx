// "Organizations represented on ForaHub include" — a coverage strip,
// NOT an endorsement strip. Each tile is a real row from
// organizations_directory with a real logo URL. We link the tile to
// the org's public page so the framing is "click to see their events
// on ForaHub", which is honest.
//
// We deliberately do not show is_claimed / is_verified badges in the
// strip: most rows are imported from ROR/IATI and have not actively
// claimed their page. Showing a verification icon on every tile would
// imply unearned action.

import Link from "next/link";
import type { TrustOrgRow } from "@/lib/discovery/queries";

interface Props {
  orgs: TrustOrgRow[];
  heading?: string;
}

export default function TrustStrip({
  orgs,
  heading = "Organizations represented on ForaHub include",
}: Props) {
  if (orgs.length === 0) return null;

  return (
    <section aria-labelledby="trust-strip-heading">
      <h3
        id="trust-strip-heading"
        className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-400"
      >
        {heading}
      </h3>
      <ul className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {orgs.map(org => (
          <li key={org.slug}>
            <Link
              href={`/organizations/${org.slug}`}
              className="group flex items-center justify-center h-16 md:h-20 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200/70 dark:border-slate-700/70 hover:border-[#0f2a4a]/30 transition-colors px-4"
              aria-label={`See events from ${org.name}`}
            >
              {org.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={org.logo_url}
                  alt={org.name}
                  className="max-h-9 md:max-h-10 max-w-full object-contain opacity-75 group-hover:opacity-100 transition-opacity"
                  loading="lazy"
                />
              ) : (
                <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 line-clamp-2 text-center">
                  {org.name}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
