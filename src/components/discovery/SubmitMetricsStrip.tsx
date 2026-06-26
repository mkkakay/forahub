// Real-data metrics strip. Receives the four signals from a server
// page that called getDirectoryMetrics(). Any signal that came back as
// null is HIDDEN — never substituted with a placeholder. The component
// returns null if every signal is missing so the page doesn't render
// an empty band.

import { Building2, Globe2, Target, CalendarDays } from "lucide-react";
import type { DirectoryMetrics } from "@/lib/discovery/queries";
import { roundedDownLabel } from "@/lib/discovery/queries";

interface Props {
  metrics: DirectoryMetrics;
}

interface Tile {
  label: string;
  Icon: typeof Building2;
  /** Pre-formatted to honour the rounded-down-only rule. */
  display: string;
}

export default function SubmitMetricsStrip({ metrics }: Props) {
  const tiles: Tile[] = [];

  if (metrics.orgsActive !== null && metrics.orgsActive > 0) {
    const rounded = roundedDownLabel(metrics.orgsActive);
    tiles.push({
      label: "Organizations indexed",
      Icon: Building2,
      display: rounded ?? metrics.orgsActive.toLocaleString(),
    });
  }
  if (metrics.regionsCovered !== null && metrics.regionsCovered > 0) {
    tiles.push({
      label: "Regions covered",
      Icon: Globe2,
      display: metrics.regionsCovered.toLocaleString(),
    });
  }
  if (metrics.sdgsRepresented !== null && metrics.sdgsRepresented > 0) {
    tiles.push({
      label: "SDGs represented",
      Icon: Target,
      display: `${metrics.sdgsRepresented} / 17`,
    });
  }
  if (metrics.eventsPublished !== null && metrics.eventsPublished > 0) {
    tiles.push({
      label: "Events indexed",
      Icon: CalendarDays,
      display: metrics.eventsPublished.toLocaleString(),
    });
  }

  if (tiles.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {tiles.map(({ label, Icon, display }) => (
        <div
          key={label}
          className="bg-white dark:bg-slate-800 border border-gray-200/70 dark:border-slate-700/70 rounded-2xl px-5 py-4 shadow-[0_1px_2px_rgba(15,42,74,0.04)]"
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            <Icon className="w-3.5 h-3.5 text-[#0f2a4a]/60" aria-hidden="true" />
            {label}
          </div>
          <div className="mt-1.5 text-2xl md:text-[28px] font-bold text-[#0f2a4a] dark:text-slate-100 tabular-nums leading-tight">
            {display}
          </div>
        </div>
      ))}
    </div>
  );
}
