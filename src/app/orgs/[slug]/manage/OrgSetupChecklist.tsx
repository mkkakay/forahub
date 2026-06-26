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
        "rounded-2xl border shadow-[0_1px_2px_rgba(15,42,74,0.04)] overflow-hidden mb-6 " +
        (fullySetUp
          ? "bg-emerald-50/60 border-emerald-200/70"
          : "bg-white dark:bg-slate-800 border-gray-200/80 dark:border-slate-700/80")
      }
    >
      <button
        type="button"
        onClick={() => setCollapsed(v => !v)}
        aria-expanded={!collapsed}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <span className={
          "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center " +
          (fullySetUp ? "bg-emerald-100" : "bg-[#0f2a4a]/5")
        }>
          <Sparkles size={15} className={fullySetUp ? "text-emerald-700" : "text-[#0f2a4a] dark:text-slate-100"} aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#0f2a4a] dark:text-slate-100 inline-flex items-center gap-2">
            {fullySetUp
              ? "Your organization is well set up"
              : "Improve discoverability"}
            {!fullySetUp && coreItemsLeft > 0 && (
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                {coreItemsLeft} step{coreItemsLeft === 1 ? "" : "s"} left
              </span>
            )}
            {fullySetUp && (
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full text-emerald-700 bg-emerald-100 border border-emerald-200">
                Complete
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {fullySetUp
              ? "Optional extras below can still strengthen your page."
              : "A complete profile reaches more of the right audience."}
          </p>
          <ProgressBar pct={signals.corePct} done={fullySetUp} />
        </div>
        <span className="text-gray-400 dark:text-slate-500" aria-hidden="true">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </span>
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-2">
          <ChecklistItem
            done={signals.profileBasicsDone}
            label="Complete your profile"
            hint={
              signals.profileBasicsDone
                ? "Logo, description, and website on file."
                : `Add ${signals.profileMissing.join(", ")}.`
            }
            onClick={() => gotoTab("profile")}
          />
          <ChecklistItem
            done={signals.teamDone}
            label="Invite team members"
            hint={
              signals.teamReason === "has_co_managers"
                ? `${signals.managerCount} manager${signals.managerCount === 1 ? "" : "s"} on the team.`
                : signals.teamReason === "solo_acknowledged"
                  ? "You confirmed you're managing solo."
                  : "Invite a colleague, or confirm you're managing solo."
            }
            onClick={() => gotoTab("team")}
            extra={
              !signals.teamDone ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); acknowledgeSolo(); }}
                  disabled={acknowledging}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 px-2 py-1 text-gray-700 dark:text-slate-200 disabled:opacity-60 shrink-0"
                  title="Mark this org as managed solo so the Team item completes."
                >
                  {acknowledging ? <Loader2 size={11} className="animate-spin" /> : <Users size={11} />}
                  I&apos;m solo
                </button>
              ) : null
            }
          />
          <ChecklistItem
            done={signals.eventsDone}
            label="Publish upcoming events"
            hint={
              signals.eventsDone
                ? `${signals.publishedEventsCount} published event${signals.publishedEventsCount === 1 ? "" : "s"}.`
                : "Submit your first event so people can discover it."
            }
            onClick={() => gotoTab("events")}
          />

          {/* Optional bonus */}
          <div className="pt-2 mt-2 border-t border-gray-100 dark:border-slate-800">
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 text-gray-400 dark:text-slate-500">
              Optional
            </p>
            <ChecklistItem
              done={signals.seriesDone}
              label="Create a recurring series"
              hint={
                signals.seriesDone
                  ? `${signals.activeSeriesCount} active series.`
                  : "Save a parent rule for repeating events — optional, not counted."
              }
              onClick={() => gotoTab("series")}
              optional
            />
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700" aria-label="Dismiss">
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
  done, label, hint, onClick, optional, extra,
}: {
  done: boolean;
  label: string;
  hint: string;
  onClick: () => void;
  optional?: boolean;
  extra?: React.ReactNode;
}) {
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <div className="group flex items-start gap-3 rounded-xl px-3 py-2.5 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 hover:bg-gray-50/80 dark:hover:bg-slate-900/80 transition-colors">
      <Icon
        className={`w-4 h-4 mt-0.5 shrink-0 ${done ? "text-emerald-600" : "text-gray-300 dark:text-slate-600"}`}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-1.5">
          <span className={`text-[13px] font-semibold ${done ? "text-gray-700 dark:text-slate-200" : "text-[#0f2a4a] dark:text-slate-100"}`}>
            {label}
          </span>
          {optional && (
            <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700">
              optional
            </span>
          )}
        </div>
        <div className="text-[11px] mt-0.5 text-gray-500 dark:text-slate-400">{hint}</div>
      </button>
      {extra}
      <ArrowRight
        size={11}
        className="ml-auto mt-1 shrink-0 text-gray-300 dark:text-slate-600 group-hover:text-[#0f2a4a] dark:group-hover:text-slate-100 transition-colors"
        aria-hidden="true"
      />
    </div>
  );
}

function ProgressBar({ pct, done }: { pct: number; done: boolean }) {
  return (
    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
      <div
        className={
          "h-full transition-all duration-500 " +
          (done ? "bg-emerald-500" : "bg-[#0f2a4a]")
        }
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      />
    </div>
  );
}
