"use client";

// Org-wide setup checklist. Sits at page-level above the tabs so it
// reflects readiness across the whole org (not just one tab). Three
// core items make up the percentage:
//
//   - Profile basics: logo, description, website (all three set)
//   - Team:           ≥2 managers OR solo acknowledged
//   - Events:         ≥1 published event
//
// Plus an optional "bonus" item (Recurring series) shown beneath the
// core items but NOT counted in the percentage. An org with no series
// can still hit 100%.
//
// Signals are computed server-side in page.tsx and passed in as
// booleans + counts. Click handlers dispatch a window CustomEvent so
// ManageTabs picks up the switch without a Next router navigation.
// The "I'm managing solo" button hits PATCH /api/orgs/[slug]/manage
// with { solo_acknowledged: true } and refreshes the route.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Circle, ArrowRight, Sparkles, Loader2, AlertCircle, X,
  Users, ChevronDown, ChevronUp,
} from "lucide-react";
import type { TabId } from "./ManageTabs";

export interface OrgSetupSignals {
  profileBasicsDone: boolean;
  /** Per-field breakdown so the inline hint reads "logo, description, website" honestly. */
  profileMissing: ("logo" | "description" | "website")[];
  teamDone: boolean;
  /** Lets us split "by colleague invite" vs "by solo ack" in the copy. */
  teamReason: "has_co_managers" | "solo_acknowledged" | "incomplete";
  managerCount: number;
  eventsDone: boolean;
  publishedEventsCount: number;
  seriesDone: boolean;
  activeSeriesCount: number;
  /** Pre-rounded by the server so the meter is identical to the bar. */
  corePct: number;
}

interface Props {
  slug: string;
  signals: OrgSetupSignals;
}

function gotoTab(id: TabId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("forahub:tab-change", { detail: id }));
  // Scroll to top so the tab content is visible (the checklist is
  // taller than the viewport on mobile).
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export default function OrgSetupChecklist({ slug, signals }: Props) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullySetUp = signals.corePct === 100;
  const coreItemsLeft = [
    signals.profileBasicsDone, signals.teamDone, signals.eventsDone,
  ].filter(v => !v).length;

  async function acknowledgeSolo() {
    setAcknowledging(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${encodeURIComponent(slug)}/manage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solo_acknowledged: true }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json?.error === "not_authorized"
          ? "You don't have permission to do that."
          : "Couldn't save that. Please try again.");
        return;
      }
      // The signals were computed server-side; re-run the server
      // component so the checklist redraws with team marked done.
      router.refresh();
    } catch {
      setError("Couldn't save that. Please try again.");
    } finally {
      setAcknowledging(false);
    }
  }

  return (
    <section
      className={
        "rounded-2xl border shadow-sm overflow-hidden mb-6 " +
        (fullySetUp
          ? "bg-emerald-50 border-emerald-200"
          : "bg-gradient-to-br from-[#0f2a4a] via-[#1a3f6e] to-[#1f4d83] border-blue-900/20")
      }
    >
      <button
        type="button"
        onClick={() => setCollapsed(v => !v)}
        aria-expanded={!collapsed}
        className={
          "w-full flex items-center gap-3 px-5 py-4 text-left " +
          (fullySetUp ? "" : "text-white")
        }
      >
        <Sparkles size={16} className={fullySetUp ? "text-emerald-700" : "text-[#bfe1ff]"} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold inline-flex items-center gap-2 ${fullySetUp ? "text-emerald-900" : "text-white"}`}>
            {fullySetUp
              ? "Your org is fully set up"
              : `Org setup ${signals.corePct}% complete`}
            {!fullySetUp && coreItemsLeft > 0 && (
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-white/15 border border-white/15">
                {coreItemsLeft} step{coreItemsLeft === 1 ? "" : "s"} left
              </span>
            )}
          </p>
          <ProgressBar pct={signals.corePct} dark={!fullySetUp} />
        </div>
        <span className={fullySetUp ? "text-emerald-700/70" : "text-white/70"} aria-hidden="true">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </span>
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-2">
          {/* Core items */}
          <ChecklistItem
            done={signals.profileBasicsDone}
            dark={!fullySetUp}
            label="Profile basics"
            hint={
              signals.profileBasicsDone
                ? "Logo, description, and website all set."
                : `Add ${signals.profileMissing.join(", ")}.`
            }
            onClick={() => gotoTab("profile")}
          />
          <ChecklistItem
            done={signals.teamDone}
            dark={!fullySetUp}
            label="Team"
            hint={
              signals.teamReason === "has_co_managers"
                ? `${signals.managerCount} manager${signals.managerCount === 1 ? "" : "s"} on the team.`
                : signals.teamReason === "solo_acknowledged"
                  ? "You acknowledged managing solo."
                  : "Invite a colleague or acknowledge managing solo."
            }
            onClick={() => gotoTab("team")}
            extra={
              !signals.teamDone ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); acknowledgeSolo(); }}
                  disabled={acknowledging}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-md border border-white/30 bg-white/5 hover:bg-white/15 px-2 py-1 text-white disabled:opacity-60 shrink-0"
                  title="Mark this org as managed solo so the Team item completes."
                >
                  {acknowledging ? <Loader2 size={11} className="animate-spin" /> : <Users size={11} />}
                  I&apos;m managing solo
                </button>
              ) : null
            }
          />
          <ChecklistItem
            done={signals.eventsDone}
            dark={!fullySetUp}
            label="Events"
            hint={
              signals.eventsDone
                ? `${signals.publishedEventsCount} published event${signals.publishedEventsCount === 1 ? "" : "s"}.`
                : "Submit your first event or wait for one to be published."
            }
            onClick={() => gotoTab("events")}
          />

          {/* Optional bonus */}
          <div className={fullySetUp ? "pt-2 mt-2 border-t border-emerald-200" : "pt-2 mt-2 border-t border-white/15"}>
            <p className={
              "text-[10px] uppercase tracking-wider font-semibold mb-1.5 " +
              (fullySetUp ? "text-emerald-700/80" : "text-white/60")
            }>
              Optional
            </p>
            <ChecklistItem
              done={signals.seriesDone}
              dark={!fullySetUp}
              label="Recurring series"
              hint={
                signals.seriesDone
                  ? `${signals.activeSeriesCount} active series.`
                  : "Save a parent rule for repeating events. Bonus — not required to be set up."
              }
              onClick={() => gotoTab("series")}
              optional
            />
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 text-xs text-red-50 bg-red-900/30 border border-red-400/30 rounded-lg px-3 py-2">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-white/60 hover:text-white" aria-label="Dismiss">
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ChecklistItem({
  done, label, hint, onClick, dark, optional, extra,
}: {
  done: boolean;
  label: string;
  hint: string;
  onClick: () => void;
  dark: boolean;
  optional?: boolean;
  extra?: React.ReactNode;
}) {
  // Inside the dark navy gradient: muted surfaces over a translucent
  // white wash. Inside the emerald complete state: white surfaces.
  const surfaceCls = dark
    ? "bg-white/8 hover:bg-white/15 border border-white/10 hover:border-white/25"
    : "bg-white border border-emerald-200 hover:border-emerald-300";
  const labelCls = dark ? "text-white" : "text-emerald-900";
  const hintCls = dark ? "text-white/70" : "text-emerald-800/80";
  const Icon = done ? CheckCircle2 : Circle;
  const iconCls = done
    ? (dark ? "text-emerald-300" : "text-emerald-600")
    : (dark ? "text-white/40" : "text-emerald-700/30");

  return (
    <div className={`group flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition-colors ${surfaceCls}`}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconCls}`} aria-hidden="true" />
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-1.5">
          <span className={`text-[13px] font-semibold ${labelCls}`}>{label}</span>
          {optional && (
            <span className={
              "text-[9px] uppercase tracking-wider font-semibold px-1 py-0.5 rounded " +
              (dark ? "bg-white/10 text-white/70 border border-white/15" : "bg-emerald-100 text-emerald-800")
            }>
              bonus
            </span>
          )}
        </div>
        <div className={`text-[11px] mt-0.5 ${hintCls}`}>{hint}</div>
      </button>
      {extra}
      <ArrowRight
        size={11}
        className={(dark ? "text-white/40 group-hover:text-white/80" : "text-emerald-600/50 group-hover:text-emerald-700") + " ml-auto mt-1 shrink-0"}
        aria-hidden="true"
      />
    </div>
  );
}

function ProgressBar({ pct, dark }: { pct: number; dark: boolean }) {
  const trackCls = dark ? "bg-white/15" : "bg-emerald-100";
  const fillCls = dark
    ? "bg-gradient-to-r from-[#4ea8de] to-emerald-400"
    : "bg-emerald-500";
  return (
    <div className={`mt-2 h-1.5 w-full rounded-full ${trackCls} overflow-hidden`}>
      <div
        className={`h-full ${fillCls} transition-all duration-500`}
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      />
    </div>
  );
}
