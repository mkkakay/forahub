"use client";

// Top-tab nav for the manage page. Wraps the existing five panels +
// settings as named slots; only the active panel renders. URL state is
// synced via ?tab= so refresh / shared links / bookmarks land on the
// right section. No data fetching, no permissions logic — those still
// live in page.tsx and each child panel.
//
// Mobile: tabs become a horizontally-scrollable strip with snap-points
// so the active tab is always reachable without a drawer. Desktop: pill
// row.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  User, Users, Calendar, Repeat, BarChart3, Settings as SettingsIcon,
} from "lucide-react";

export type TabId = "profile" | "team" | "events" | "series" | "analytics" | "settings";

const TAB_DEFS: { id: TabId; label: string; Icon: typeof User }[] = [
  { id: "profile",   label: "Profile",   Icon: User },
  { id: "team",      label: "Team",      Icon: Users },
  { id: "events",    label: "Events",    Icon: Calendar },
  { id: "series",    label: "Series",    Icon: Repeat },
  { id: "analytics", label: "Analytics", Icon: BarChart3 },
  { id: "settings",  label: "Settings",  Icon: SettingsIcon },
];

interface TabSlots {
  profile:   ReactNode;
  team:      ReactNode;
  events:    ReactNode;
  series:    ReactNode;
  analytics: ReactNode;
  settings:  ReactNode;
}

interface TabBadges {
  team?:   number;
  events?: number;
  series?: number;
}

interface Props {
  slots: TabSlots;
  badges?: TabBadges;
  defaultTab?: TabId;
}

function safeTab(raw: string | null, fallback: TabId): TabId {
  if (raw === "profile" || raw === "team" || raw === "events"
      || raw === "series" || raw === "analytics" || raw === "settings") return raw;
  return fallback;
}

export default function ManageTabs({ slots, badges, defaultTab = "profile" }: Props) {
  const sp = useSearchParams();
  const initialFromUrl = useMemo(() => safeTab(sp.get("tab"), defaultTab), [sp, defaultTab]);
  const [active, setActive] = useState<TabId>(initialFromUrl);

  // Sync if the URL changes via back/forward without our doing.
  useEffect(() => {
    const next = safeTab(sp.get("tab"), defaultTab);
    if (next !== active) setActive(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // External components (e.g. the page-level OrgSetupChecklist) switch
  // tabs by dispatching a window CustomEvent. Avoids a Next router
  // navigation + re-render just to jump between sections we already
  // have mounted.
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (typeof detail !== "string") return;
      const next = safeTab(detail, defaultTab);
      pick(next);
    }
    window.addEventListener("forahub:tab-change", handler);
    return () => window.removeEventListener("forahub:tab-change", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTab]);

  function pick(id: TabId) {
    setActive(id);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    // replaceState — tab clicks shouldn't pollute browser history.
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <>
      {/* Tab nav. Underline-on-active for the more polished product-nav
          feel. Horizontally-scrollable on mobile so the active tab is
          always reachable without a drawer. */}
      <nav
        role="tablist"
        aria-label="Manage sections"
        className="mb-6 -mx-4 sm:mx-0 sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/85 border-b border-gray-200/70 dark:border-slate-700/70"
      >
        <div className="px-4 sm:px-0 overflow-x-auto scrollbar-none">
          <div className="inline-flex items-center gap-1 min-w-full sm:min-w-0">
            {TAB_DEFS.map(({ id, label, Icon }) => {
              const isActive = active === id;
              const count =
                id === "team"   ? badges?.team :
                id === "events" ? badges?.events :
                id === "series" ? badges?.series :
                undefined;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`manage-tab-${id}`}
                  onClick={() => pick(id)}
                  className={
                    "relative shrink-0 inline-flex items-center gap-2 px-3.5 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4ea8de]/40 rounded-md " +
                    (isActive
                      ? "text-[#0f2a4a] dark:text-slate-100"
                      : "text-gray-500 dark:text-slate-400 hover:text-[#0f2a4a] dark:hover:text-slate-100")
                  }
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#0f2a4a] dark:text-slate-100" : "text-gray-400 dark:text-slate-500"}`} aria-hidden="true" />
                  <span>{label}</span>
                  {typeof count === "number" && count > 0 && (
                    <span
                      className={
                        "ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-semibold tabular-nums px-1 " +
                        (isActive
                          ? "bg-[#0f2a4a] text-white"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400")
                      }
                    >
                      {count}
                    </span>
                  )}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-[#0f2a4a]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Active panel. Render only one to keep the DOM (and Recharts /
          rrule client instances) cheap. State inside each panel resets
          on tab switch — acceptable trade-off for a settings page. */}
      <div role="tabpanel" id={`manage-tab-${active}`}>
        {slots[active]}
      </div>
    </>
  );
}
