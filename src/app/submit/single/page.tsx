"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Upload, LinkIcon, PencilLine, Loader2, Sparkles, CheckCircle2,
  AlertCircle, X, ArrowRight, Globe, ClipboardList, Calendar, Ticket, Users,
  Film, Scissors, FileText, Undo2, AlertTriangle, Video, Package, ChevronDown,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useSubscription } from "@/context/SubscriptionContext";
import { supabase } from "@/lib/supabase/client";
import { parseApiResponse } from "@/lib/admin/fetchJson";
import LocationCombobox from "../_components/LocationCombobox";
import OrgCombobox from "../_components/OrgCombobox";
import OrgChipInput from "../_components/OrgChipInput";
import { EVENT_CATEGORIES, type CategoryKey } from "@/lib/categories";
import { timezoneForCountry, languageForCountry } from "@/lib/location/countryTimezone";
import type { LocationResult } from "@/lib/location/nominatim";

type Tab = "flyer" | "url" | "manual";

type CostType = "free" | "paid" | "sliding_scale" | "donor_funded";

interface FormState {
  title: string;
  organization: string;
  description: string;
  start_date: string; // ISO local
  end_date: string;   // ISO local, optional
  registration_deadline: string; // ISO local, optional
  timezone: string;
  format: "in_person" | "virtual" | "hybrid";
  location: string;
  online_url: string;
  registration_url: string;
  primary_sdg: number | null;
  category: string | null;
  banner_image_url: string;
  uploaded_flyer_url: string;
  cost_type: CostType;
  cost_details: string;
  target_audience: string[];
  co_organizers: string;
  speakers: string;
  event_languages: string[];
  language_other: string; // free-text "Other" language label
  will_be_recorded: boolean;
  recording_url: string;
  capacity: string; // form-side keeps as string for empty-state UX, coerced to number on submit
  submitter_email: string;
}

interface AiFilled {
  title: boolean;
  organization: boolean;
  description: boolean;
  start_date: boolean;
  end_date: boolean;
  registration_deadline: boolean;
  location: boolean;
  registration_url: boolean;
  primary_sdg: boolean;
  banner_image_url: boolean;
  cost_type: boolean;
  cost_details: boolean;
  target_audience: boolean;
  co_organizers: boolean;
  speakers: boolean;
  event_languages: boolean;
}

const AUDIENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Open to all" },
  { value: "researchers", label: "Researchers / Academics" },
  { value: "government", label: "Government officials" },
  { value: "civil_society", label: "Civil society / NGOs" },
  { value: "private_sector", label: "Private sector" },
  { value: "youth", label: "Youth (under 30)" },
  { value: "donors", label: "Donors / Funders" },
  { value: "invite_only", label: "Invitation only" },
];

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "ar", label: "Arabic" },
  { code: "pt", label: "Portuguese" },
  { code: "zh", label: "Mandarin" },
];

const COST_OPTIONS: { value: CostType; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
  { value: "sliding_scale", label: "Sliding scale" },
  { value: "donor_funded", label: "Donor-funded" },
];

interface ExtractedFields {
  title: string | null;
  description: string | null;
  organization: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
  location: string | null;
  is_online: boolean | null;
  registration_url: string | null;
  primary_sdg: number | null;
  cost_type: CostType | null;
  cost_details: string | null;
  target_audience: string[] | null;
  co_organizers: string | null;
  speakers: string | null;
  event_languages: string[] | null;
  will_be_recorded: boolean | null;
  recording_url: string | null;
  capacity: number | null;
  confidence: "high" | "medium" | "low";
}

interface PastEventRow {
  id: string;
  title: string;
  organization: string | null;
  description: string | null;
  location: string | null;
  format: string | null;
  sdg_goals: number[] | null;
}

const SDG_LABELS: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health & Well-being",
  4: "Quality Education", 5: "Gender Equality", 6: "Clean Water",
  7: "Affordable & Clean Energy", 8: "Decent Work", 9: "Industry & Innovation",
  10: "Reduced Inequalities", 11: "Sustainable Cities", 12: "Responsible Consumption",
  13: "Climate Action", 14: "Life Below Water", 15: "Life on Land",
  16: "Peace & Justice", 17: "Partnerships",
};

const DRAFT_KEY = "forahub_event_draft_v1";
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function emptyForm(): FormState {
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  return {
    title: "",
    organization: "",
    description: "",
    start_date: "",
    end_date: "",
    registration_deadline: "",
    timezone: tz || "UTC",
    format: "in_person",
    location: "",
    online_url: "",
    registration_url: "",
    primary_sdg: null,
    category: null,
    banner_image_url: "",
    uploaded_flyer_url: "",
    cost_type: "free",
    cost_details: "",
    target_audience: [],
    co_organizers: "",
    speakers: "",
    event_languages: ["en"],
    language_other: "",
    will_be_recorded: false,
    recording_url: "",
    capacity: "",
    submitter_email: "",
  };
}

function emptyAi(): AiFilled {
  return {
    title: false, organization: false, description: false, start_date: false,
    end_date: false, registration_deadline: false, location: false,
    registration_url: false, primary_sdg: false, banner_image_url: false,
    cost_type: false, cost_details: false, target_audience: false,
    co_organizers: false, speakers: false, event_languages: false,
  };
}

function RewriteButton({
  onClick, disabled, active, icon, label,
}: {
  onClick: () => void;
  disabled: boolean;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold border rounded-full px-3 py-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-gradient-to-r from-purple-500 to-violet-500 border-purple-500 text-white shadow-md"
          : "border-gray-200 hover:border-purple-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 text-gray-700"
      }`}
    >
      <span aria-hidden="true" className="inline-flex">{icon}</span> {label}
    </button>
  );
}

function FormSection({
  id, icon, title, subtitle, children, first,
}: {
  id?: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <section id={id} className={`scroll-mt-32 ${first ? "" : "border-t border-gray-200 pt-8 mt-8 md:pt-10 md:mt-10"}`}>
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-flex">{icon}</span>
          <h2 className="text-lg md:text-xl font-bold text-[#0f2a4a]">{title}</h2>
        </div>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

type ProgressSection = {
  id: string;
  icon: React.ReactNode;
  name: string;
  complete: boolean;
};

function SubmitProgressBar({
  sections,
  currentSectionId,
}: {
  sections: ProgressSection[];
  currentSectionId: string | null;
}) {
  const completedCount = sections.filter(s => s.complete).length;
  const total = sections.length;
  const allComplete = completedCount === total;
  const pct = (completedCount / total) * 100;

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto py-3 px-4 flex items-center gap-3 md:gap-4">
        <div className="shrink-0 hidden md:block">
          <p className="text-xs font-semibold text-[#0f2a4a]">Your event submission</p>
          <p className={`text-[11px] mt-0.5 ${allComplete ? "text-green-700 font-semibold" : "text-gray-500"} inline-flex items-center gap-1`}>
            {allComplete ? (
              <>
                Ready to submit <Sparkles className="w-3 h-3 text-purple-600" />
              </>
            ) : (
              `${completedCount} of ${total} sections complete`
            )}
          </p>
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-3">
          <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${allComplete ? "bg-green-100" : "bg-gray-100"}`}>
            <div
              className={`h-full transition-all duration-500 ${allComplete ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`md:hidden text-[11px] font-semibold shrink-0 inline-flex items-center gap-1 ${allComplete ? "text-green-700" : "text-gray-600"}`}>
            {allComplete ? (
              <>
                Ready <Sparkles className="w-3 h-3 text-purple-600" />
              </>
            ) : (
              `${completedCount}/${total}`
            )}
          </span>
        </div>

        <ul className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
          {sections.map(s => {
            const isCurrent = s.id === currentSectionId;
            const base = "inline-flex items-center gap-1 text-xs px-1.5 py-1 rounded transition-colors";
            const stateClass = s.complete
              ? "text-green-700"
              : isCurrent
              ? "text-blue-700 font-bold border-b-2 border-blue-500 rounded-none"
              : "text-gray-400";
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => handleScrollTo(s.id)}
                  aria-current={isCurrent ? "true" : undefined}
                  className={`${base} ${stateClass} hover:bg-gray-50`}
                >
                  <span aria-hidden="true" className="inline-flex">{s.icon}</span>
                  <span className="hidden lg:inline">{s.name}</span>
                  {s.complete && <CheckCircle2 aria-label="complete" className="w-3.5 h-3.5 text-green-600" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** 8 major timezones shown below the Start Date & Time picker so submitters
 *  can sanity-check how the event lands for a global audience. */
const TIMEZONE_STRIP: { city: string; tz: string }[] = [
  { city: "New York", tz: "America/New_York" },
  { city: "São Paulo", tz: "America/Sao_Paulo" },
  { city: "London", tz: "Europe/London" },
  { city: "Geneva", tz: "Europe/Zurich" },
  { city: "Dubai", tz: "Asia/Dubai" },
  { city: "Nairobi", tz: "Africa/Nairobi" },
  { city: "Singapore", tz: "Asia/Singapore" },
  { city: "Tokyo", tz: "Asia/Tokyo" },
];

/** Render a wall-clock instant from (localInput, sourceTimezone) → formatted
 *  string in `displayTimezone`. Returns null if the input is unparseable. */
function formatInZone(localInput: string, sourceTimezone: string, displayTimezone: string): string | null {
  if (!localInput) return null;
  // Build an instant by treating the local input as wall-time in the source
  // timezone. We use Intl with a known reference to compute the source offset.
  try {
    // Parse Y-M-D-H-M from the datetime-local string.
    const m = localInput.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return null;
    const [, ys, ms, ds, hs, mins] = m;
    const y = Number(ys), mo = Number(ms) - 1, d = Number(ds), h = Number(hs), mn = Number(mins);
    // Start with a UTC guess for the wall-time, then correct by the offset
    // the source zone reports at that instant. Two iterations converges
    // around DST/standard-time boundaries.
    let utcGuess = Date.UTC(y, mo, d, h, mn);
    for (let i = 0; i < 2; i++) {
      const offset = tzOffsetMinutes(new Date(utcGuess), sourceTimezone);
      utcGuess = Date.UTC(y, mo, d, h, mn) - offset * 60_000;
    }
    const instant = new Date(utcGuess);
    if (isNaN(instant.getTime())) return null;
    return new Intl.DateTimeFormat("en-US", {
      timeZone: displayTimezone,
      hour: "numeric",
      minute: "2-digit",
      weekday: "short",
      hour12: true,
    }).format(instant);
  } catch {
    return null;
  }
}

/** Offset (minutes east of UTC) for a given IANA zone at a specific instant. */
function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(instant);
  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(map.year), Number(map.month) - 1, Number(map.day),
    Number(map.hour) === 24 ? 0 : Number(map.hour),
    Number(map.minute), Number(map.second)
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

function TimezoneStrip({ localInput, sourceTimezone }: { localInput: string; sourceTimezone: string }) {
  if (!localInput) return null;
  const rows = TIMEZONE_STRIP.map(z => ({
    city: z.city,
    text: formatInZone(localInput, sourceTimezone, z.tz),
  })).filter(r => r.text);
  if (rows.length === 0) return null;
  return (
    <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 inline-flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-emerald-600" />
        Time in major timezones
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-700">
        {rows.map(r => (
          <div key={r.city} className="flex justify-between">
            <span className="font-medium">{r.city}</span>
            <span className="tabular-nums text-gray-600">{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Convert an ISO timestamp from the API into a value suitable for
 *  <input type="datetime-local"> (YYYY-MM-DDTHH:mm). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SubmitPage() {
  const { userId, userEmail } = useSubscription();

  const [tab, setTab] = useState<Tab>("flyer");
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [aiFilled, setAiFilled] = useState<AiFilled>(emptyAi());
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ event_id: string; message: string; auto_approved: boolean } | null>(null);

  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // URL-fetch fallback: when a page blocks our request, we let the user paste
  // the content directly into a textarea that hits the same endpoint with `text`.
  const [pasteFallback, setPasteFallback] = useState<{ message: string; status: number } | null>(null);
  const [pasteText, setPasteText] = useState("");

  // Smart-defaults bookkeeping — once the user touches these fields directly,
  // we stop overwriting them from location pick / start-date change.
  const tzTouchedRef = useRef(false);
  const deadlineTouchedRef = useRef(false);

  // Debounced AI SDG suggestion in manual-entry mode.
  const [sdgSuggestion, setSdgSuggestion] = useState<{ sdg: number; label: string } | null>(null);
  const sdgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Category suggestion — runs after the form has enough signal.
  const [categorySuggestion, setCategorySuggestion] = useState<{ category: CategoryKey; confidence: number } | null>(null);
  const categoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Duplicate detection — soft warning modal before final submit.
  const [duplicates, setDuplicates] = useState<Array<{ id: string; title: string; start_date: string; organization: string | null; similarity_score: number; event_url: string }>>([]);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);

  // AI description rewrite state.
  const [rewriting, setRewriting] = useState<null | "polish" | "shorten" | "expand" | "translate_en" | "translate_fr" | "translate_es" | "translate_ar">(null);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [rewriteCount, setRewriteCount] = useState(0);
  const [undoOriginal, setUndoOriginal] = useState<string | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [translateOpen, setTranslateOpen] = useState(false);
  const MAX_REWRITES = 10;

  // Sticky progress bar — track which section is currently in the viewport.
  const [currentSectionId, setCurrentSectionId] = useState<string | null>("section-basics");

  // Section completion derived from required fields only (optional fields ignored).
  const progressSections: ProgressSection[] = useMemo(() => {
    const basicsComplete = !!(form.title.trim() && form.organization.trim() && form.description.trim());

    const formatRequiresLocation = form.format === "in_person" || form.format === "hybrid";
    const formatRequiresOnline = form.format === "virtual" || form.format === "hybrid";
    const locationOk = formatRequiresLocation ? form.location.trim().length > 0 : true;
    const onlineOk = formatRequiresOnline ? form.online_url.trim().length > 0 : true;
    const whenWhereComplete = !!(form.start_date && form.format && locationOk && onlineOk);

    const costComplete = !!form.cost_type;
    const partnersComplete = true; // all optional
    const finalComplete = userId ? true : !!form.submitter_email.trim();

    return [
      { id: "section-basics", icon: <ClipboardList className="w-4 h-4 text-slate-600" />, name: "Basics", complete: basicsComplete },
      { id: "section-when-where", icon: <Calendar className="w-4 h-4 text-blue-600" />, name: "When & Where", complete: whenWhereComplete },
      { id: "section-cost-audience", icon: <Ticket className="w-4 h-4 text-amber-600" />, name: "Cost & Audience", complete: costComplete },
      { id: "section-partners-speakers", icon: <Users className="w-4 h-4 text-violet-600" />, name: "Partners & Speakers", complete: partnersComplete },
      { id: "section-final-details", icon: <Film className="w-4 h-4 text-rose-600" />, name: "Final Details", complete: finalComplete },
    ];
  }, [form, userId]);

  // Intersection-observer-driven "current section" detection. The section
  // whose heading sits closest to (but below) the sticky bar wins.
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    const ids = ["section-basics", "section-when-where", "section-cost-audience", "section-partners-speakers", "section-final-details"];
    const visibility = new Map<string, number>();
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => visibility.set(e.target.id, e.intersectionRatio));
        // Pick the first id (in document order) with the highest visibility ratio.
        let bestId: string | null = null;
        let bestRatio = -1;
        for (const id of ids) {
          const r = visibility.get(id) ?? 0;
          if (r > bestRatio) {
            bestRatio = r;
            bestId = id;
          }
        }
        if (bestId && bestRatio > 0) setCurrentSectionId(bestId);
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    const els = ids.map(id => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Draft autosave
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const skipDraftRestoreRef = useRef(false);
  const draftRestoredRef = useRef(false);

  // Past events for logged-in users
  const [pastEvents, setPastEvents] = useState<PastEventRow[]>([]);

  // ── Draft restore on mount ──────────────────────────────────────────
  useEffect(() => {
    if (skipDraftRestoreRef.current) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { savedAt: number; form: FormState; aiFilled: AiFilled };
      if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      // Has any meaningful content?
      if (parsed.form.title.trim() || parsed.form.description.trim() || parsed.form.organization.trim()) {
        setShowResumeBanner(true);
      }
    } catch {
      // ignore
    }
  }, []);

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { form: FormState; aiFilled: AiFilled };
      setForm(parsed.form);
      setAiFilled(parsed.aiFilled);
      draftRestoredRef.current = true;
    } finally {
      setShowResumeBanner(false);
    }
  }

  function dismissDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setShowResumeBanner(false);
  }

  // ── Autosave every 10s ──────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const hasContent = form.title.trim() || form.description.trim() || form.organization.trim();
      if (!hasContent) return;
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), form, aiFilled }));
      } catch {
        // quota exceeded etc.
      }
    }, 10_000);
    return () => clearInterval(id);
  }, [form, aiFilled]);

  // ── Pre-fill email when user logs in ────────────────────────────────
  useEffect(() => {
    if (userEmail && !form.submitter_email) {
      setForm(f => ({ ...f, submitter_email: userEmail }));
    }
  }, [userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Smart default: registration_deadline = start_date − 7 days ──────
  useEffect(() => {
    if (deadlineTouchedRef.current) return;
    if (!form.start_date || form.registration_deadline) return;
    const start = new Date(form.start_date);
    if (isNaN(start.getTime())) return;
    const deadline = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const local = `${deadline.getFullYear()}-${pad(deadline.getMonth() + 1)}-${pad(deadline.getDate())}T${pad(deadline.getHours())}:${pad(deadline.getMinutes())}`;
    setForm(f => ({ ...f, registration_deadline: local }));
  }, [form.start_date, form.registration_deadline]);

  // ── Debounced AI SDG suggestion in manual mode ──────────────────────
  useEffect(() => {
    // Only run on the manual tab. The flyer/url tabs already get an SDG from extraction.
    if (tab !== "manual") return;
    if (form.primary_sdg !== null) {
      setSdgSuggestion(null);
      return;
    }
    if (form.title.trim().length <= 5 || form.description.trim().length <= 20) {
      setSdgSuggestion(null);
      return;
    }
    if (sdgTimerRef.current) clearTimeout(sdgTimerRef.current);
    sdgTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/events/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: `${form.title}\n\n${form.description}` }),
        });
        const parsed = await parseApiResponse<{ data: { primary_sdg: number | null } }>(res);
        if (!parsed.ok) return;
        const sdg = parsed.data.data?.primary_sdg;
        if (sdg && sdg >= 1 && sdg <= 17) {
          setSdgSuggestion({ sdg, label: SDG_LABELS[sdg] });
        }
      } catch {
        // silently ignore — non-essential helper
      }
    }, 2000);
    return () => {
      if (sdgTimerRef.current) clearTimeout(sdgTimerRef.current);
    };
  }, [tab, form.title, form.description, form.primary_sdg]);

  // ── Debounced category suggestion ───────────────────────────────────
  // Runs once the form has a title + some signal. Skipped if the submitter
  // already picked a category. Hits /api/events/categorize which runs the
  // same keyword + SDG + (cheap) AI classifier as the bulk admin endpoint.
  useEffect(() => {
    if (form.category) {
      setCategorySuggestion(null);
      return;
    }
    if (form.title.trim().length < 6) {
      setCategorySuggestion(null);
      return;
    }
    if (categoryTimerRef.current) clearTimeout(categoryTimerRef.current);
    categoryTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/events/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            organization: form.organization || null,
            description: form.description || null,
            primary_sdg: form.primary_sdg,
          }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { category: CategoryKey | null; confidence?: number };
        if (json.category) {
          setCategorySuggestion({ category: json.category, confidence: json.confidence ?? 0.7 });
        }
      } catch {
        // non-essential — silent failure is fine
      }
    }, 1500);
    return () => {
      if (categoryTimerRef.current) clearTimeout(categoryTimerRef.current);
    };
  }, [form.title, form.organization, form.description, form.primary_sdg, form.category]);

  // ── Load past events for logged-in users ────────────────────────────
  useEffect(() => {
    if (!userId) {
      setPastEvents([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, organization, description, location, format, sdg_goals")
        .eq("submitted_by_user_id", userId)
        .order("submitted_at", { ascending: false })
        .limit(3);
      if (cancelled) return;
      setPastEvents((data as PastEventRow[] | null) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function applyExtraction(extracted: ExtractedFields, ogImage?: string | null) {
    const next: FormState = { ...form };
    const filled: AiFilled = { ...aiFilled };
    if (extracted.title) { next.title = extracted.title; filled.title = true; }
    if (extracted.description) { next.description = extracted.description; filled.description = true; }
    if (extracted.organization) { next.organization = extracted.organization; filled.organization = true; }
    if (extracted.start_date) {
      const local = toLocalInput(extracted.start_date);
      if (local) { next.start_date = local; filled.start_date = true; }
    }
    if (extracted.end_date) {
      const local = toLocalInput(extracted.end_date);
      if (local) { next.end_date = local; filled.end_date = true; }
    }
    if (extracted.registration_deadline) {
      const local = toLocalInput(extracted.registration_deadline);
      if (local) { next.registration_deadline = local; filled.registration_deadline = true; }
    }
    if (extracted.location) { next.location = extracted.location; filled.location = true; }
    if (extracted.registration_url) { next.registration_url = extracted.registration_url; filled.registration_url = true; }
    if (typeof extracted.primary_sdg === "number") { next.primary_sdg = extracted.primary_sdg; filled.primary_sdg = true; }
    if (extracted.is_online === true && next.format === "in_person") next.format = "virtual";
    if (extracted.cost_type) { next.cost_type = extracted.cost_type; filled.cost_type = true; }
    if (extracted.cost_details) { next.cost_details = extracted.cost_details; filled.cost_details = true; }
    if (extracted.target_audience && extracted.target_audience.length > 0) {
      next.target_audience = extracted.target_audience;
      filled.target_audience = true;
    }
    if (extracted.co_organizers) { next.co_organizers = extracted.co_organizers; filled.co_organizers = true; }
    if (extracted.speakers) { next.speakers = extracted.speakers; filled.speakers = true; }
    if (extracted.event_languages && extracted.event_languages.length > 0) {
      next.event_languages = extracted.event_languages;
      filled.event_languages = true;
    }
    if (typeof extracted.will_be_recorded === "boolean") next.will_be_recorded = extracted.will_be_recorded;
    if (extracted.recording_url) next.recording_url = extracted.recording_url;
    if (typeof extracted.capacity === "number" && extracted.capacity > 0) next.capacity = String(extracted.capacity);
    if (ogImage && !next.banner_image_url) { next.banner_image_url = ogImage; filled.banner_image_url = true; }
    setForm(next);
    setAiFilled(filled);
  }

  /** Uploads any image file (flyer or explicit banner) to Supabase Storage via
   *  the public /api/events/upload-asset endpoint. Returns the public URL.
   *  PDF flyers are NOT uploaded as banners (banners must be photos/images). */
  async function uploadAsset(file: File, purpose: "flyer" | "banner"): Promise<string | null> {
    if (file.type === "application/pdf") return null;
    if (file.size > 5 * 1024 * 1024) return null; // 5MB cap on upload-asset
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", purpose);
      const res = await fetch("/api/events/upload-asset", { method: "POST", body: fd });
      const parsed = await parseApiResponse<{ url: string }>(res);
      if (!parsed.ok) return null;
      return parsed.data.url;
    } catch {
      return null;
    }
  }

  async function handleFlyerFile(file: File) {
    setExtractError(null);
    if (file.size > 10 * 1024 * 1024) {
      setExtractError("File too large: max 10MB. Try compressing first.");
      return;
    }
    setExtracting(true);
    try {
      // Run extraction + asset upload in parallel — the upload reuses the same
      // file so the flyer becomes the default banner without a second user step.
      const fd = new FormData();
      fd.append("file", file);
      const [extractRes, bannerUrl] = await Promise.all([
        fetch("/api/events/extract", { method: "POST", body: fd }),
        uploadAsset(file, "flyer"),
      ]);
      const parsed = await parseApiResponse<{ data: ExtractedFields }>(extractRes);
      if (!parsed.ok) throw new Error(parsed.error);
      applyExtraction(parsed.data.data);

      // If the upload succeeded AND the user hasn't set a banner yet, use the
      // flyer as both the cached flyer reference and the default banner.
      if (bannerUrl) {
        setForm(f => ({
          ...f,
          uploaded_flyer_url: bannerUrl,
          banner_image_url: f.banner_image_url || bannerUrl,
        }));
        setAiFilled(a => ({ ...a, banner_image_url: a.banner_image_url || !form.banner_image_url }));
      }
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  }

  async function rewriteDescription(mode: "polish" | "shorten" | "expand" | "translate_en" | "translate_fr" | "translate_es" | "translate_ar") {
    setRewriteError(null);
    const current = form.description.trim();
    if (current.length < 10) {
      setRewriteError("Description too short to rewrite (minimum 10 characters).");
      return;
    }
    if (rewriteCount >= MAX_REWRITES) {
      setRewriteError(`AI rewrites used (${MAX_REWRITES}/${MAX_REWRITES}). Refresh the page to reset.`);
      return;
    }
    setRewriting(mode);
    try {
      const payload = {
        text: current,
        mode,
        context: {
          title: form.title.trim() || undefined,
          organization: form.organization.trim() || undefined,
          sdg: form.primary_sdg ?? undefined,
        },
      };
      const res = await fetch("/api/events/rewrite-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const parsed = await parseApiResponse<{ rewritten_text: string; mode: string; cost: number }>(res);
      if (!parsed.ok) throw new Error(parsed.error);
      const newText = parsed.data.rewritten_text;
      // Stash original so the user can undo for 30s.
      setUndoOriginal(current);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoOriginal(null), 30_000);
      setForm(f => ({ ...f, description: newText }));
      setAiFilled(a => ({ ...a, description: true }));
      setRewriteCount(c => c + 1);
      setTranslateOpen(false);
    } catch (err) {
      setRewriteError(`Rewrite failed: ${err instanceof Error ? err.message : String(err)}. Try again.`);
    } finally {
      setRewriting(null);
    }
  }

  function undoRewrite() {
    if (!undoOriginal) return;
    setForm(f => ({ ...f, description: undoOriginal }));
    setAiFilled(a => ({ ...a, description: false }));
    setUndoOriginal(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }

  function handleLocationPicked(loc: LocationResult) {
    setAiFilled(a => ({ ...a, location: false }));
    // Auto-set timezone unless the user has touched it manually.
    if (!tzTouchedRef.current) {
      const tz = timezoneForCountry(loc.country_code);
      if (tz) setForm(f => ({ ...f, timezone: tz }));
    }
    // Auto-add the country's primary language if not already in the list.
    const lang = languageForCountry(loc.country_code);
    if (lang) {
      setForm(f =>
        f.event_languages.includes(lang) ? f : { ...f, event_languages: [...f.event_languages, lang] }
      );
    }
  }

  async function handleBannerFileUpload(file: File) {
    setExtractError(null);
    const url = await uploadAsset(file, "banner");
    if (!url) {
      setExtractError("Banner upload failed. Try a different file (max 5MB, JPG/PNG/WebP).");
      return;
    }
    setForm(f => ({ ...f, banner_image_url: url }));
    setAiFilled(a => ({ ...a, banner_image_url: false }));
  }

  /** Map a fetch_blocked status code to a friendly message. */
  function friendlyFetchError(status: number, raw: string): string {
    if (status === 403 || status === 401) return "This page blocks automated access. Try pasting the event details directly below.";
    if (status === 404) return "Page not found. Check the URL or paste details directly below.";
    if (status === 408) return "Page took too long to load. Try pasting details directly below.";
    return raw || "Couldn't read the page. Try pasting details directly below.";
  }

  async function handleUrlExtract() {
    const u = urlInput.trim();
    if (!u) {
      setExtractError("Paste a URL first");
      return;
    }
    setExtractError(null);
    setPasteFallback(null);
    setExtracting(true);
    try {
      const res = await fetch("/api/events/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: u }),
      });
      // Read raw body so we can distinguish fetch_blocked from other errors
      // — and from Vercel platform-level errors that may not be JSON at all.
      const rawText = await res.text();
      let body: {
        data?: ExtractedFields;
        og_image?: string | null;
        error?: string;
        message?: string;
        status_code?: number;
        allow_paste?: boolean;
      } | null = null;
      try { body = JSON.parse(rawText); } catch { /* non-JSON: handled below */ }

      if (res.ok && body?.data) {
        applyExtraction(body.data, body.og_image ?? null);
        return;
      }
      if (!res.ok && body?.error === "fetch_blocked") {
        const status = body.status_code ?? res.status;
        setPasteFallback({
          message: friendlyFetchError(status, body.message ?? ""),
          status,
        });
        return;
      }
      throw new Error(body?.error ?? body?.message ?? (rawText.slice(0, 200) || `HTTP ${res.status}`));
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  }

  async function handleTextExtract() {
    const t = pasteText.trim();
    if (!t) {
      setExtractError("Paste the event details first");
      return;
    }
    setExtractError(null);
    setExtracting(true);
    try {
      const res = await fetch("/api/events/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const parsed = await parseApiResponse<{ data: ExtractedFields }>(res);
      if (!parsed.ok) throw new Error(parsed.error);
      applyExtraction(parsed.data.data);
      // Pre-fill the registration URL with what the user originally pasted —
      // so they don't lose the link they were trying to extract from.
      if (urlInput.trim()) {
        setForm(f => ({ ...f, registration_url: f.registration_url || urlInput.trim() }));
      }
      setPasteFallback(null);
      setPasteText("");
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  }

  function applyPastEvent(ev: PastEventRow) {
    setForm(f => ({
      ...f,
      title: ev.title,
      organization: ev.organization ?? f.organization,
      description: ev.description ?? f.description,
      location: ev.location ?? f.location,
      format: (ev.format === "in_person" || ev.format === "virtual" || ev.format === "hybrid") ? ev.format : f.format,
      primary_sdg: ev.sdg_goals?.[0] ?? f.primary_sdg,
      // Intentionally leave dates blank — duplicating an event should always need fresh dates.
      start_date: "",
      end_date: "",
    }));
    setAiFilled(emptyAi());
    setTab("manual");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!form.title.trim()) return setSubmitError("Event title is required");
    if (!form.organization.trim()) return setSubmitError("Hosting organization is required");
    if (!form.description.trim()) return setSubmitError("Description is required");
    if (!form.start_date) return setSubmitError("Start date and time are required");
    if (!userId && !form.submitter_email.trim()) {
      return setSubmitError("Email is required for anonymous submissions");
    }

    // Soft duplicate check before final submit.
    try {
      const res = await fetch("/api/events/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          start_date: new Date(form.start_date).toISOString(),
          organization: form.organization.trim() || undefined,
        }),
      });
      const parsed = await parseApiResponse<{ has_duplicates: boolean; candidates: Array<{ id: string; title: string; start_date: string; organization: string | null; similarity_score: number; event_url: string }> }>(res);
      if (parsed.ok && parsed.data.has_duplicates) {
        const strong = parsed.data.candidates.filter(c => c.similarity_score > 0.6);
        if (strong.length > 0) {
          setDuplicates(parsed.data.candidates.slice(0, 3));
          setDuplicateModalOpen(true);
          return;
        }
      }
    } catch {
      // Duplicate check is best-effort; never block submission on its failure.
    }

    await performSubmit();
  }

  async function performSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    setDuplicateModalOpen(false);
    try {
      const source = aiFilled.title || aiFilled.organization
        ? (tab === "url" ? "url_ai" : "flyer_ai")
        : "manual";

      // Include any free-text "Other" language as `other:<label>`.
      const languages = [...form.event_languages];
      if (form.language_other.trim() && !languages.includes(`other:${form.language_other.trim()}`)) {
        languages.push(`other:${form.language_other.trim()}`);
      }

      const capacityNum = form.capacity.trim() ? Number(form.capacity.trim()) : null;

      const payload = {
        title: form.title.trim(),
        organization: form.organization.trim(),
        description: form.description.trim(),
        start_date: new Date(form.start_date).toISOString(),
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        registration_deadline: form.registration_deadline ? new Date(form.registration_deadline).toISOString() : null,
        timezone: form.timezone,
        format: form.format,
        location: form.location.trim() || null,
        online_url: form.online_url.trim() || null,
        registration_url: form.registration_url.trim() || null,
        primary_sdg: form.primary_sdg,
        category: form.category,
        banner_image_url: form.banner_image_url.trim() || null,
        uploaded_flyer_url: form.uploaded_flyer_url.trim() || null,
        cost_type: form.cost_type,
        cost_details: form.cost_details.trim() || null,
        target_audience: form.target_audience.length > 0 ? form.target_audience : null,
        co_organizers: form.co_organizers.trim() || null,
        speakers: form.speakers.trim() || null,
        event_languages: languages.length > 0 ? languages : ["en"],
        will_be_recorded: form.will_be_recorded,
        recording_url: form.recording_url.trim() || null,
        capacity: capacityNum && capacityNum > 0 ? capacityNum : null,
        source,
        submitted_by_user_id: userId ?? undefined,
        submitter_email: userId ? undefined : form.submitter_email.trim(),
      };

      const res = await fetch("/api/events/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const parsed = await parseApiResponse<{ event_id: string; message: string; auto_approved: boolean }>(res);
      if (!parsed.ok) throw new Error(parsed.error);

      // Clear draft on success
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
      skipDraftRestoreRef.current = true;

      setSuccess({
        event_id: parsed.data.event_id,
        message: parsed.data.message,
        auto_approved: parsed.data.auto_approved,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const labelClass = "block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1";
  const inputClass =
    "w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors";

  const aiBadge = (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-purple-50 border border-purple-200 rounded-full px-1.5 py-0.5 ml-1.5 shadow-sm">
      <Sparkles size={9} className="text-purple-600" />
      <span className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">AI</span>
    </span>
  );

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-10 text-center">
            <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f2a4a] mb-3">
              Your event has been submitted!
            </h1>
            <p className="text-base text-gray-600 mb-6 max-w-md mx-auto">{success.message}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {success.auto_approved && (
                <Link
                  href={`/events/${success.event_id}`}
                  className="inline-flex items-center gap-2 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  View your event <ArrowRight size={14} />
                </Link>
              )}
              <button
                onClick={() => {
                  setSuccess(null);
                  setForm(emptyForm());
                  setAiFilled(emptyAi());
                  setUrlInput("");
                  setTab("flyer");
                }}
                className="inline-flex items-center gap-2 border border-gray-300 hover:border-[#0f2a4a] text-[#0f2a4a] font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Submit another event
              </button>
            </div>
            <div className="border-t border-gray-100 pt-6 text-sm text-gray-500">
              {userId ? (
                <>
                  Manage your submissions in{" "}
                  <Link href="/dashboard" className="text-[#4ea8de] font-semibold hover:underline">
                    your dashboard
                  </Link>
                  .
                </>
              ) : (
                <>
                  Want to manage your events?{" "}
                  <Link href="/auth/signup" className="text-[#4ea8de] font-semibold hover:underline">
                    Create a free account
                  </Link>{" "}
                  — we&apos;ll link this submission to it automatically.
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <SubmitProgressBar sections={progressSections} currentSectionId={currentSectionId} />
      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <header className="mb-6 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f2a4a] tracking-tight">
            List your event on ForaHub
          </h1>
          <p className="text-base text-gray-600 mt-2 mb-3">
            Share your event with thousands of development professionals worldwide.
            We&apos;ll review and publish within 24 hours.
          </p>
          <Link
            href="/submit/bulk"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full px-3 py-1.5 transition-colors"
          >
            <Package className="w-4 h-4 text-amber-600" /> Submitting multiple events? Try bulk import <ArrowRight size={14} />
          </Link>
        </header>

        {showResumeBanner && (
          <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-sm text-blue-900">
              You have a saved draft. Resume where you left off?
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={restoreDraft}
                className="bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
              >
                Resume
              </button>
              <button
                onClick={dismissDraft}
                className="text-xs text-blue-700 hover:text-blue-900 px-2 py-1.5"
              >
                Start fresh
              </button>
            </div>
          </div>
        )}

        {userId && pastEvents.length > 0 && (
          <div className="mb-5 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Quick start: duplicate one of your past events
            </p>
            <div className="flex flex-wrap gap-2">
              {pastEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => applyPastEvent(ev)}
                  className="text-xs font-medium border border-gray-200 hover:border-[#4ea8de] hover:bg-[#4ea8de]/5 rounded-full px-3 py-1.5 transition-colors text-gray-700 hover:text-[#0f2a4a]"
                >
                  {ev.title.slice(0, 60)}{ev.title.length > 60 ? "…" : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5">
          <div className="grid grid-cols-3 gap-1 p-1 bg-gray-50">
            {(["flyer", "url", "manual"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative px-3 py-3 text-xs md:text-sm font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 rounded-lg ${
                  tab === t
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t === "flyer" && <Upload size={16} />}
                {t === "url" && <LinkIcon size={16} />}
                {t === "manual" && <PencilLine size={16} />}
                <span>{t === "flyer" ? "Upload Flyer" : t === "url" ? "Paste URL" : "Enter Manually"}</span>
                {t === "flyer" && (
                  <span className={`hidden sm:inline-flex items-center gap-0.5 absolute -top-1 -right-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-sm ${
                    tab === t ? "bg-white text-purple-600" : "bg-gradient-to-r from-purple-500 to-violet-500 text-white"
                  }`}>
                    <Sparkles className="w-2.5 h-2.5" /> Recommended
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === "flyer" && (
              <div className="space-y-3">
                <label
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFlyerFile(f);
                  }}
                  className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    dragOver ? "border-[#4ea8de] bg-[#4ea8de]/5" : "border-gray-300 hover:border-[#4ea8de] hover:bg-gray-50"
                  }`}
                >
                  {extracting ? (
                    <div className="flex flex-col items-center gap-2 text-gray-600">
                      <Loader2 size={28} className="animate-spin text-purple-600" />
                      <p className="text-sm font-medium inline-flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        Reading your flyer…
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload size={28} className="text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-700">
                        Drop a flyer or poster here, or click to choose
                      </p>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG, or PDF — max 10MB</p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    disabled={extracting}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleFlyerFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}

            {tab === "url" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Paste a link to your event page — Eventbrite, your university calendar, your org&apos;s site, anywhere.
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://example.com/event-page"
                    className={inputClass}
                    onKeyDown={e => e.key === "Enter" && !extracting && handleUrlExtract()}
                  />
                  <button
                    onClick={handleUrlExtract}
                    disabled={extracting || !urlInput.trim()}
                    className="shrink-0 bg-[#0f2a4a] hover:bg-[#1a3f6e] disabled:bg-gray-300 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors flex items-center gap-1.5"
                  >
                    {extracting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {extracting ? "Reading…" : "Extract"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">We&apos;ll read the page and fill in the form automatically.</p>

                {pasteFallback && (
                  <div className="mt-2 border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-2 text-sm text-amber-900">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold">Couldn&apos;t access the page</p>
                        <p className="text-amber-800 mt-0.5">{pasteFallback.message}</p>
                      </div>
                      <button
                        onClick={() => setPasteFallback(null)}
                        className="text-amber-700 hover:text-amber-900 shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-amber-900 mb-1">
                        Paste the event details here — copy whatever description, dates, location are on that page
                      </label>
                      <textarea
                        value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                        rows={8}
                        placeholder="Title, hosting org, date and time, location, registration link, short description…"
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400 transition-colors"
                      />
                      <p className="text-[11px] text-amber-700 mt-1">{pasteText.length}/8000 characters</p>
                    </div>
                    <button
                      onClick={handleTextExtract}
                      disabled={extracting || !pasteText.trim()}
                      className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                    >
                      {extracting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {extracting ? "Reading…" : "Extract from text"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === "manual" && (
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  Just fill in the form below — no extraction needed.
                </p>
                <p className="text-xs text-gray-500">
                  Fill in event details — fields auto-suggest as you type.
                </p>
              </div>
            )}
          </div>
        </div>

        {extractError && (
          <div className="mb-5 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span className="break-words">{extractError}</span>
            <button onClick={() => setExtractError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <X size={14} />
            </button>
          </div>
        )}

        {/* The shared verify-and-submit form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-8">
          <FormSection id="section-basics" first icon={<ClipboardList className="w-5 h-5 text-slate-600" />} title="The Basics" subtitle="What is your event and who is hosting it?">

          <div>
            <label className={labelClass}>
              Event title <span className="text-red-500">*</span>
              {aiFilled.title && aiBadge}
            </label>
            <input
              value={form.title}
              onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setAiFilled(a => ({ ...a, title: false })); }}
              placeholder="e.g., World Health Assembly 79th Session"
              maxLength={120}
              className={inputClass}
            />
          </div>

          {/* Category — placed BEFORE SDG so submitters frame their event
              against the humanitarian-development field first. */}
          <div>
            <label className={labelClass}>
              Category (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {EVENT_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const active = form.category === cat.key;
                return (
                  <button
                    type="button"
                    key={cat.key}
                    onClick={() => {
                      setForm(f => ({ ...f, category: active ? null : cat.key }));
                      setCategorySuggestion(null);
                    }}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                      active
                        ? "border-transparent text-white"
                        : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    }`}
                    style={active ? { backgroundColor: cat.color } : undefined}
                    title={cat.description}
                  >
                    <Icon size={12} style={!active ? { color: cat.color } : undefined} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
            {categorySuggestion && !form.category && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-gray-600 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  AI suggests:{" "}
                  <span className="font-semibold">
                    {EVENT_CATEGORIES.find(c => c.key === categorySuggestion.category)?.label}
                  </span>
                  <span className="text-gray-400">
                    ({Math.round(categorySuggestion.confidence * 100)}% confident)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setForm(f => ({ ...f, category: categorySuggestion.category }));
                    setCategorySuggestion(null);
                  }}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold px-2 py-0.5 rounded text-[11px] border border-amber-300/60"
                >
                  Use
                </button>
                <button
                  type="button"
                  onClick={() => setCategorySuggestion(null)}
                  className="text-gray-400 hover:text-gray-600 text-[11px]"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Hosting organization <span className="text-red-500">*</span>
                {aiFilled.organization && aiBadge}
              </label>
              <OrgCombobox
                value={form.organization}
                onChange={v => { setForm(f => ({ ...f, organization: v })); setAiFilled(a => ({ ...a, organization: false })); }}
                placeholder="Start typing your organization..."
              />
              <p className="text-xs text-gray-500 mt-1">Type at least 2 characters to see suggestions.</p>
            </div>
            <div>
              <label className={labelClass}>Primary SDG (optional){aiFilled.primary_sdg && aiBadge}</label>
              <select
                value={form.primary_sdg ?? ""}
                onChange={e => { setForm(f => ({ ...f, primary_sdg: e.target.value ? Number(e.target.value) : null })); setAiFilled(a => ({ ...a, primary_sdg: false })); setSdgSuggestion(null); }}
                className={inputClass}
              >
                <option value="">Not sure / not applicable</option>
                {Array.from({ length: 17 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>SDG {n}: {SDG_LABELS[n]}</option>
                ))}
              </select>
              {sdgSuggestion && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-gray-600 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    AI suggests: <span className="font-semibold">SDG {sdgSuggestion.sdg} — {sdgSuggestion.label}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(f => ({ ...f, primary_sdg: sdgSuggestion.sdg }));
                      setAiFilled(a => ({ ...a, primary_sdg: true }));
                      setSdgSuggestion(null);
                    }}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold px-2 py-0.5 rounded text-[11px] border border-amber-300/60"
                  >
                    Use
                  </button>
                  <button
                    type="button"
                    onClick={() => setSdgSuggestion(null)}
                    className="text-gray-400 hover:text-gray-600 text-[11px]"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Short description <span className="text-red-500">*</span>
              {aiFilled.description && aiBadge}
            </label>
            <textarea
              value={form.description}
              onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setAiFilled(a => ({ ...a, description: false })); }}
              placeholder="2-3 sentences. What's it about, who should attend?"
              maxLength={500}
              rows={3}
              className={inputClass}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] text-gray-400">{form.description.length}/500</p>
              <p className="text-[11px] text-gray-400">{rewriteCount}/{MAX_REWRITES} AI rewrites used</p>
            </div>

            {/* AI Polish toolbar */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RewriteButton onClick={() => rewriteDescription("polish")} disabled={!!rewriting || rewriteCount >= MAX_REWRITES} active={rewriting === "polish"} icon={<Sparkles className={`w-3.5 h-3.5 ${rewriting === "polish" ? "text-white" : "text-purple-600"}`} />} label="Polish" />
              <RewriteButton onClick={() => rewriteDescription("shorten")} disabled={!!rewriting || rewriteCount >= MAX_REWRITES} active={rewriting === "shorten"} icon={<Scissors className={`w-3.5 h-3.5 ${rewriting === "shorten" ? "text-white" : "text-purple-600"}`} />} label="Shorten" />
              <RewriteButton onClick={() => rewriteDescription("expand")} disabled={!!rewriting || rewriteCount >= MAX_REWRITES} active={rewriting === "expand"} icon={<FileText className={`w-3.5 h-3.5 ${rewriting === "expand" ? "text-white" : "text-purple-600"}`} />} label="Expand" />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTranslateOpen(o => !o)}
                  disabled={!!rewriting || rewriteCount >= MAX_REWRITES}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold border border-gray-200 hover:border-[#4ea8de] hover:bg-[#4ea8de]/5 disabled:opacity-40 disabled:cursor-not-allowed rounded-full px-2.5 py-1 text-gray-700 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-purple-600" /> Translate <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>
                {translateOpen && (
                  <ul className="absolute z-10 mt-1 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
                    {([
                      { m: "translate_en" as const, label: "To English" },
                      { m: "translate_fr" as const, label: "À Français" },
                      { m: "translate_es" as const, label: "Al Español" },
                      { m: "translate_ar" as const, label: "إلى العربية" },
                    ]).map(opt => (
                      <li key={opt.m}>
                        <button
                          type="button"
                          onClick={() => rewriteDescription(opt.m)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-700 border-b border-gray-100 last:border-b-0"
                        >
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {rewriting && (
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                  <Loader2 size={12} className="animate-spin text-purple-600" />
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  Rewriting…
                </span>
              )}
            </div>

            {undoOriginal && (
              <div className="mt-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                <span className="text-xs text-amber-900 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  Description rewritten — your original is saved for 30 seconds.
                </span>
                <button
                  type="button"
                  onClick={undoRewrite}
                  className="text-xs font-semibold text-amber-900 hover:text-amber-950 underline inline-flex items-center gap-1"
                >
                  <Undo2 className="w-3 h-3" /> Undo
                </button>
              </div>
            )}

            {rewriteError && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-1.5">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                <span className="flex-1">{rewriteError}</span>
                <button onClick={() => setRewriteError(null)} className="text-red-500 hover:text-red-700">
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
          </FormSection>

          <FormSection id="section-when-where" icon={<Calendar className="w-5 h-5 text-blue-600" />} title="When & Where" subtitle="When does it happen and where can people join?">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Start date & time <span className="text-red-500">*</span>
                {aiFilled.start_date && aiBadge}
              </label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={e => { setForm(f => ({ ...f, start_date: e.target.value })); setAiFilled(a => ({ ...a, start_date: false })); }}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>End date & time (optional){aiFilled.end_date && aiBadge}</label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={e => { setForm(f => ({ ...f, end_date: e.target.value })); setAiFilled(a => ({ ...a, end_date: false })); }}
                className={inputClass}
              />
            </div>
          </div>

          <TimezoneStrip localInput={form.start_date} sourceTimezone={form.timezone} />

          <div>
            <label className={labelClass}>Format <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {(["in_person", "virtual", "hybrid"] as const).map(f => (
                <label
                  key={f}
                  className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    form.format === f
                      ? "bg-[#0f2a4a] text-white border-[#0f2a4a]"
                      : "bg-white text-gray-700 border-gray-200 hover:border-[#0f2a4a]"
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={f}
                    checked={form.format === f}
                    onChange={() => setForm(form2 => ({ ...form2, format: f }))}
                    className="hidden"
                  />
                  {f === "in_person" ? "In-person" : f === "virtual" ? "Online" : "Hybrid"}
                </label>
              ))}
            </div>
          </div>

          {/* Location first — picking a city auto-sets the timezone below. */}
          {(form.format === "in_person" || form.format === "hybrid") && (
            <div>
              <label className={labelClass}>
                Location {form.format === "hybrid" && <span className="text-red-500">*</span>} {aiFilled.location && aiBadge}
              </label>
              <LocationCombobox
                value={form.location}
                onChange={v => { setForm(f => ({ ...f, location: v })); setAiFilled(a => ({ ...a, location: false })); }}
                onPickedLocation={handleLocationPicked}
                placeholder="Start typing city or country..."
              />
              <p className="text-xs text-gray-500 mt-1">Type at least 2 characters to see suggestions.</p>
            </div>
          )}

          {/* Online URL for virtual or hybrid events. */}
          {(form.format === "virtual" || form.format === "hybrid") && (
            <div>
              <label className={labelClass}>
                Meeting link / Online URL {form.format === "virtual" && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={form.online_url}
                  onChange={e => setForm(f => ({ ...f, online_url: e.target.value }))}
                  placeholder="https://zoom.us/j/... or any meeting link"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Zoom, Teams, Webex, or any meeting link.</p>
            </div>
          )}

          {/* Timezone — auto-filled when a location is picked, override if needed. */}
          <div>
            <label className={labelClass}>Timezone</label>
            <input
              value={form.timezone}
              onChange={e => { tzTouchedRef.current = true; setForm(f => ({ ...f, timezone: e.target.value })); }}
              placeholder="e.g. America/New_York"
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 mt-1">Auto-set from the selected location. Override if needed.</p>
          </div>

          {/* ── Registration deadline ────────────────────────────── */}
          <div>
            <label className={labelClass}>Registration deadline (optional) {aiFilled.registration_deadline && aiBadge}</label>
            <input
              type="datetime-local"
              value={form.registration_deadline}
              onChange={e => { deadlineTouchedRef.current = true; setForm(f => ({ ...f, registration_deadline: e.target.value })); setAiFilled(a => ({ ...a, registration_deadline: false })); }}
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 mt-1">Default: 7 days before the event start. Adjust or clear if not applicable.</p>
          </div>
          </FormSection>

          <FormSection id="section-cost-audience" icon={<Ticket className="w-5 h-5 text-amber-600" />} title="Cost & Audience" subtitle="Who is it for and what does it cost?">

          {/* ── Cost ─────────────────────────────────────────────── */}
          <div>
            <label className={labelClass}>Cost {aiFilled.cost_type && aiBadge}</label>
            <div className="flex flex-wrap gap-2">
              {COST_OPTIONS.map(o => (
                <label
                  key={o.value}
                  className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
                    form.cost_type === o.value
                      ? "bg-[#0f2a4a] text-white border-[#0f2a4a]"
                      : "bg-white text-gray-700 border-gray-200 hover:border-[#0f2a4a]"
                  }`}
                >
                  <input
                    type="radio"
                    name="cost_type"
                    value={o.value}
                    checked={form.cost_type === o.value}
                    onChange={() => { setForm(f => ({ ...f, cost_type: o.value })); setAiFilled(a => ({ ...a, cost_type: false })); }}
                    className="hidden"
                  />
                  {o.label}
                </label>
              ))}
            </div>
            {(form.cost_type === "paid" || form.cost_type === "sliding_scale") && (
              <input
                value={form.cost_details}
                onChange={e => { setForm(f => ({ ...f, cost_details: e.target.value })); setAiFilled(a => ({ ...a, cost_details: false })); }}
                placeholder="e.g., $50 USD, free for low-income country participants"
                className={`${inputClass} mt-2`}
              />
            )}
          </div>

          {/* ── Target audience ──────────────────────────────────── */}
          <div>
            <label className={labelClass}>Target audience {aiFilled.target_audience && aiBadge}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {AUDIENCE_OPTIONS.map(o => (
                <label key={o.value} className="flex items-center gap-2 text-sm text-gray-700 px-2 py-1 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.target_audience.includes(o.value)}
                    onChange={e => {
                      setForm(f => ({
                        ...f,
                        target_audience: e.target.checked
                          ? Array.from(new Set([...f.target_audience, o.value]))
                          : f.target_audience.filter(a => a !== o.value),
                      }));
                      setAiFilled(a => ({ ...a, target_audience: false }));
                    }}
                    className="accent-[#4ea8de]"
                  />
                  {o.label}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Leave all unchecked = open to everyone (default).</p>
          </div>

          {/* ── Capacity ─────────────────────────────────────────── */}
          <div>
            <label className={labelClass}>Capacity <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span></label>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
              placeholder="Leave blank for unlimited"
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 mt-1">Maximum attendees. Helps attendees know if there&apos;s a registration cap.</p>
          </div>
          </FormSection>

          <FormSection id="section-partners-speakers" icon={<Users className="w-5 h-5 text-violet-600" />} title="Partners & Speakers" subtitle="Who else is involved?">

          {/* ── Co-organizers / partners ─────────────────────────── */}
          <div>
            <label className={labelClass}>Co-organizers / partners (optional) {aiFilled.co_organizers && aiBadge}</label>
            <OrgChipInput
              value={form.co_organizers}
              onChange={v => { setForm(f => ({ ...f, co_organizers: v })); setAiFilled(a => ({ ...a, co_organizers: false })); }}
              placeholder="Start typing to add partner organizations..."
            />
            <p className="text-xs text-gray-500 mt-1">Type at least 2 characters to see suggestions. Press Enter to add a free-form name.</p>
          </div>

          {/* ── Speakers / panelists ─────────────────────────────── */}
          <div>
            <label className={labelClass}>Speakers / panelists (optional) {aiFilled.speakers && aiBadge}</label>
            <textarea
              value={form.speakers}
              onChange={e => { setForm(f => ({ ...f, speakers: e.target.value })); setAiFilled(a => ({ ...a, speakers: false })); }}
              placeholder={"Featured speakers, one per line or comma-separated\n\nDr. Jane Smith, WHO\nDr. John Doe, UNICEF"}
              rows={3}
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 mt-1">One per line or comma-separated.</p>
          </div>
          </FormSection>

          <FormSection id="section-final-details" icon={<Film className="w-5 h-5 text-rose-600" />} title="Final Details" subtitle="Last few things to make your event shine">

          {/* ── Banner ───────────────────────────────────────────── */}
          <div>
            <label className={labelClass}>Banner image (optional) {aiFilled.banner_image_url && aiBadge}</label>
            <div className="flex flex-col md:flex-row gap-2 items-start">
              <input
                type="url"
                value={form.banner_image_url}
                onChange={e => { setForm(f => ({ ...f, banner_image_url: e.target.value })); setAiFilled(a => ({ ...a, banner_image_url: false })); }}
                placeholder="https://images.unsplash.com/... (we'll auto-fetch a Pexels banner if you leave this blank)"
                className={inputClass}
              />
              <label className="shrink-0 cursor-pointer inline-flex items-center gap-1.5 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                <Upload size={14} /> Upload banner
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleBannerFileUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {form.banner_image_url && (
              <div className="mt-2 rounded-xl border border-gray-200 overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.banner_image_url} alt="Banner preview" className="w-full max-h-48 object-cover" />
              </div>
            )}
            <p className="text-[11px] text-gray-400 mt-1 inline-flex items-start gap-1.5">
              {form.uploaded_flyer_url && form.banner_image_url === form.uploaded_flyer_url ? (
                <>
                  <Sparkles className="w-3 h-3 text-purple-600 mt-0.5 shrink-0" />
                  <span>Using your uploaded flyer as the banner. Paste a URL or upload a different image to override.</span>
                </>
              ) : (
                "Leave blank and we'll auto-fetch a relevant Pexels image."
              )}
            </p>
          </div>

          {/* ── Recording / livestream ───────────────────────────── */}
          <div>
            <label className={labelClass}>Recording <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span></label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.will_be_recorded}
                onChange={e => setForm(f => ({ ...f, will_be_recorded: e.target.checked, recording_url: e.target.checked ? f.recording_url : "" }))}
                className="accent-[#4ea8de]"
              />
              <Video className="w-4 h-4 text-rose-600" /> This event will be recorded
            </label>
            {form.will_be_recorded && (
              <input
                type="url"
                value={form.recording_url}
                onChange={e => setForm(f => ({ ...f, recording_url: e.target.value }))}
                placeholder="https://... (optional, you can add this after the event)"
                className={`${inputClass} mt-2`}
              />
            )}
            <p className="text-[11px] text-gray-400 mt-1">Help attendees who can&apos;t join live.</p>
          </div>

          {/* ── Event languages ──────────────────────────────────── */}
          <div>
            <label className={labelClass}>Event language(s) {aiFilled.event_languages && aiBadge}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {LANGUAGE_OPTIONS.map(o => (
                <label key={o.code} className="flex items-center gap-2 text-sm text-gray-700 px-2 py-1 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.event_languages.includes(o.code)}
                    onChange={e => {
                      setForm(f => ({
                        ...f,
                        event_languages: e.target.checked
                          ? Array.from(new Set([...f.event_languages, o.code]))
                          : f.event_languages.filter(l => l !== o.code),
                      }));
                      setAiFilled(a => ({ ...a, event_languages: false }));
                    }}
                    className="accent-[#4ea8de]"
                  />
                  {o.label}
                </label>
              ))}
            </div>
            <input
              value={form.language_other}
              onChange={e => setForm(f => ({ ...f, language_other: e.target.value }))}
              placeholder="Other language (e.g. Swahili)"
              className={`${inputClass} mt-2`}
            />
          </div>

          {/* ── Registration / info URL ──────────────────────────── */}
          <div>
            <label className={labelClass}>Registration / info URL {aiFilled.registration_url && aiBadge}</label>
            <div className="relative">
              <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                value={form.registration_url}
                onChange={e => { setForm(f => ({ ...f, registration_url: e.target.value })); setAiFilled(a => ({ ...a, registration_url: false })); }}
                placeholder="https://..."
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {!userId && (
            <div className="border-t border-gray-100 pt-5">
              <label className={labelClass}>
                Your email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.submitter_email}
                onChange={e => setForm(f => ({ ...f, submitter_email: e.target.value }))}
                placeholder="you@example.com"
                className={inputClass}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                We&apos;ll email you when your event is approved.{" "}
                <Link href="/auth/signup" className="text-[#4ea8de] hover:underline font-medium">
                  Or sign up
                </Link>{" "}
                to manage submissions in your dashboard.
              </p>
            </div>
          )}
          </FormSection>

          {submitError && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span className="break-words">{submitError}</span>
            </div>
          )}

          <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <Globe size={11} /> Drafts auto-save every 10 seconds.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-semibold px-12 py-4 rounded-xl text-base shadow-lg hover:shadow-xl transition-all"
            >
              {submitting ? "Submitting…" : "Submit Event"}
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            </button>
          </div>
        </form>

        {/* Duplicate-detection soft warning modal */}
        {duplicateModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setDuplicateModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[#0f2a4a]">We may already have this event</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    These events on ForaHub look similar to what you&apos;re about to submit. Mind taking a look first?
                  </p>
                </div>
              </div>
              <ul className="space-y-2 mb-5">
                {duplicates.map(d => (
                  <li key={d.id} className="border border-gray-200 rounded-xl p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{d.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {d.organization ?? "—"} · {new Date(d.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                        <span className="ml-2 text-gray-400">{Math.round(d.similarity_score * 100)}% match</span>
                      </p>
                    </div>
                    <a
                      href={d.event_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-semibold text-[#4ea8de] hover:text-[#3a95cc] underline"
                    >
                      View →
                    </a>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setDuplicateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel — I&apos;ll check first
                </button>
                <button
                  type="button"
                  onClick={() => performSubmit()}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#4ea8de] hover:bg-[#3a95cc] text-white text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Yes, mine is different — submit anyway"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
