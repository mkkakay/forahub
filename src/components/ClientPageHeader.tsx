"use client";

import { useEffect, useState } from "react";
import PageHeader, { type PageHeaderProps } from "./PageHeader";
import type { PageBanner } from "@/lib/pageBanners";

/**
 * Client-side wrapper around <PageHeader> for pages declared as "use client"
 * (where we can't `await getPageBanner()` server-side). Fetches the banner
 * row on mount; renders the navy fallback in the meantime so there's no
 * layout shift — only a possible cross-fade to the image once it arrives.
 *
 * Props are identical to PageHeader except that `banner` is omitted (this
 * component fetches it internally).
 */
type Props = Omit<PageHeaderProps, "banner">;

export default function ClientPageHeader(props: Props) {
  const [banner, setBanner] = useState<PageBanner | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/page-banners/${encodeURIComponent(props.pageKey)}`);
        if (!res.ok) return;
        const json = (await res.json()) as { banner: PageBanner | null };
        if (!cancelled) setBanner(json.banner);
      } catch {
        // Silent fallback to navy header.
      }
    })();
    return () => { cancelled = true; };
  }, [props.pageKey]);

  return <PageHeader {...props} banner={banner} />;
}
