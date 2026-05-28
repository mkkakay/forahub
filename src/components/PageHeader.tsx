import Link from "next/link";
import type { OverlayLevel, PageBanner } from "@/lib/pageBanners";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  pageKey: string;
  title: string;
  subtitle?: string;
  breadcrumb?: BreadcrumbItem[];
  variant?: "standard" | "slim";
  banner?: PageBanner | null;
}

// Minimum overlay floor for each level. Even "light" keeps text WCAG-readable
// against busy photos (top 0.45 → bottom 0.60 of slate-900).
const OVERLAY_GRADIENT: Record<OverlayLevel, string> = {
  light: "linear-gradient(to bottom, rgba(15,23,42,0.45), rgba(15,23,42,0.60))",
  medium: "linear-gradient(to bottom, rgba(15,23,42,0.55), rgba(15,23,42,0.70))",
  dark: "linear-gradient(to bottom, rgba(15,23,42,0.70), rgba(15,23,42,0.85))",
};

const HEIGHT_CLASS: Record<"standard" | "slim", string> = {
  // Mobile / desktop heights. Tailwind doesn't have a direct h-[140px]/h-[220px]
  // arbitrary-value class without JIT — these classes ship through the JIT.
  standard: "h-[140px] md:h-[220px]",
  slim: "h-[90px] md:h-[120px]",
};

export default function PageHeader({
  title,
  subtitle,
  breadcrumb,
  variant = "standard",
  banner,
}: PageHeaderProps) {
  const useImage = !!(banner && banner.is_active && banner.image_url);
  const overlay = OVERLAY_GRADIENT[banner?.overlay_level ?? "medium"];
  const heightCls = HEIGHT_CLASS[variant];

  return (
    <header
      className={`relative ${heightCls} bg-[#0f2a4a] overflow-hidden`}
      style={useImage ? undefined : undefined /* explicit no-op so navy fallback stays pixel-identical to existing markup */}
    >
      {/* Background image (only when admin has activated one) */}
      {useImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner!.image_url!}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
          {/* Mandatory dark gradient overlay for contrast */}
          <div className="absolute inset-0" style={{ background: overlay }} aria-hidden="true" />
        </>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="hidden md:flex items-center gap-2 text-blue-300 text-sm mb-2">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-white transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white">{crumb.label}</span>
                )}
                {i < breadcrumb.length - 1 && <span aria-hidden="true">/</span>}
              </span>
            ))}
          </div>
        )}
        <h1 className={`${variant === "slim" ? "text-xl md:text-3xl" : "text-2xl md:text-4xl"} font-bold text-white tracking-tight leading-tight line-clamp-2`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`${variant === "slim" ? "text-xs md:text-sm mt-1" : "text-sm md:text-base mt-2"} text-white/80 line-clamp-2`}>
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
