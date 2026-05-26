"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Upload, LinkIcon, Loader2, Sparkles, CheckCircle2, AlertCircle, X, ArrowRight, Trash2, ChevronDown, ChevronUp,
  Package, ClipboardList, Paperclip, Link2, Target, AlertTriangle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useSubscription } from "@/context/SubscriptionContext";
import { parseApiResponse } from "@/lib/admin/fetchJson";

type InputTab = "paste" | "upload" | "url";

type Confidence = "high" | "medium" | "low";
type SourceType = "text" | "url" | "pdf" | "docx" | "csv" | "xlsx" | "txt" | "image";

interface DetectedEvent {
  title: string;
  description: string | null;
  organization: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  is_online: boolean;
  registration_url: string | null;
  primary_sdg: number | null;
  confidence: Confidence;
}

interface EditableEvent extends DetectedEvent {
  client_id: string;
  removed: boolean;
  expanded: boolean;
}

const SDG_LABELS: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Affordable Energy", 8: "Decent Work",
  9: "Industry & Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships",
};

const inputClass =
  "w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors";
const labelClass = "block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ".pdf,.docx,.csv,.xlsx,.xls,.txt,.md";

function confidenceBadge(c: Confidence) {
  const cls =
    c === "high"
      ? "bg-green-100 text-green-800 border-green-200"
      : c === "medium"
      ? "bg-amber-100 text-amber-900 border-amber-200"
      : "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${cls}`}>
      {c}
    </span>
  );
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  // datetime-local expects "YYYY-MM-DDTHH:mm" in local time.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function BulkSubmitPage() {
  const { userId } = useSubscription();

  const [tab, setTab] = useState<InputTab>("paste");
  const [pasteText, setPasteText] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  const [detected, setDetected] = useState<EditableEvent[] | null>(null);
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [truncated, setTruncated] = useState(false);

  const [submitterEmail, setSubmitterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<{ submitted: number; skipped: number } | null>(null);

  function resetResults() {
    setDetected(null);
    setSourceType(null);
    setTruncated(false);
    setDetectError(null);
  }

  function makeClientId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  async function handleDetect() {
    setDetecting(true);
    setDetectError(null);
    setSubmitSuccess(null);
    try {
      let res: Response;
      if (tab === "paste") {
        if (!pasteText.trim()) {
          setDetectError("Paste some content first.");
          setDetecting(false);
          return;
        }
        res = await fetch("/api/events/bulk-extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: pasteText }),
        });
      } else if (tab === "url") {
        if (!urlInput.trim()) {
          setDetectError("Paste a URL first.");
          setDetecting(false);
          return;
        }
        res = await fetch("/api/events/bulk-extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput.trim() }),
        });
      } else {
        if (!file) {
          setDetectError("Choose a file first.");
          setDetecting(false);
          return;
        }
        if (file.size > MAX_FILE_BYTES) {
          setDetectError(`File exceeds 10MB (${(file.size / 1024 / 1024).toFixed(2)}MB).`);
          setDetecting(false);
          return;
        }
        const fd = new FormData();
        fd.append("file", file);
        res = await fetch("/api/events/bulk-extract", { method: "POST", body: fd });
      }

      const parsed = await parseApiResponse<{
        events?: DetectedEvent[];
        detected_count?: number;
        source_type?: SourceType;
        truncated?: boolean;
        error?: string;
        message?: string;
        allow_paste?: boolean;
      }>(res);
      if (!parsed.ok) {
        setDetectError(parsed.error || "Detection failed.");
        return;
      }
      const data = parsed.data;
      if (data.error === "fetch_blocked") {
        setDetectError(`${data.message ?? "Could not fetch the URL"} — try copy-pasting the page content into the Paste tab instead.`);
        return;
      }
      const events = (data.events ?? []).map(e => ({
        ...e,
        client_id: makeClientId(),
        removed: false,
        expanded: false,
      }));
      if (events.length === 0) {
        setDetectError("No events detected. Try formatting your content more clearly (one event per block) or paste a different source.");
        return;
      }
      setDetected(events);
      setSourceType(data.source_type ?? null);
      setTruncated(!!data.truncated);
    } catch (err) {
      setDetectError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetecting(false);
    }
  }

  function updateEvent(client_id: string, patch: Partial<EditableEvent>) {
    setDetected(prev => prev?.map(e => (e.client_id === client_id ? { ...e, ...patch } : e)) ?? null);
  }

  async function handleSubmitAll() {
    if (!detected) return;
    const toSubmit = detected.filter(e => !e.removed);
    if (toSubmit.length === 0) {
      setSubmitError("All events removed. Add at least one to submit.");
      return;
    }
    if (!userId && !submitterEmail.trim()) {
      setSubmitError("Your email is required for anonymous submissions.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        events: toSubmit.map(e => ({
          title: e.title,
          description: e.description,
          organization: e.organization,
          start_date: e.start_date,
          end_date: e.end_date,
          location: e.location,
          is_online: e.is_online,
          registration_url: e.registration_url,
          primary_sdg: e.primary_sdg,
        })),
        submitter_email: userId ? undefined : submitterEmail.trim(),
        submitted_by_user_id: userId ?? undefined,
        source_type: sourceType ?? "text",
      };
      const res = await fetch("/api/events/bulk-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const parsed = await parseApiResponse<{ submitted?: number; skipped?: number; error?: string }>(res);
      if (!parsed.ok) {
        setSubmitError(parsed.error || "Submission failed.");
        return;
      }
      setSubmitSuccess({
        submitted: parsed.data.submitted ?? 0,
        skipped: parsed.data.skipped ?? 0,
      });
      setDetected(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ─────────────────────────────────────────────────
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f2a4a] flex items-center justify-center gap-2">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
              {submitSuccess.submitted} event{submitSuccess.submitted === 1 ? "" : "s"} submitted for review
            </h1>
            {submitSuccess.skipped > 0 && (
              <p className="text-sm text-amber-700 mt-2">
                {submitSuccess.skipped} event{submitSuccess.skipped === 1 ? " was" : "s were"} skipped (missing required fields).
              </p>
            )}
            <p className="text-base text-gray-600 mt-3">
              All events go through admin review before publishing. You&apos;ll receive an email when each is approved.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/submit/single"
                className="inline-flex items-center gap-2 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                Submit another event
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                Back to ForaHub
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <header className="mb-6 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f2a4a] tracking-tight flex items-center justify-center md:justify-start gap-3">
            <Package className="w-8 h-8 text-amber-600" />
            Bulk import events
          </h1>
          <p className="text-base text-gray-600 mt-2">
            Paste a list, upload a document, or paste a URL — we&apos;ll detect each event and let you review.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Submitting one event? <Link href="/submit/single" className="text-blue-600 hover:underline font-medium">Use the single-event form →</Link>
          </p>
        </header>

        {/* Input card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6">
          <div className="grid grid-cols-3 gap-1 p-1 bg-gray-50 rounded-xl mb-5">
            {(["paste", "upload", "url"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); resetResults(); }}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  tab === t
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {t === "paste" && <ClipboardList className={`w-5 h-5 ${tab === t ? "text-white" : "text-slate-600"}`} />}
                {t === "upload" && <Paperclip className={`w-5 h-5 ${tab === t ? "text-white" : "text-slate-600"}`} />}
                {t === "url" && <Link2 className={`w-5 h-5 ${tab === t ? "text-white" : "text-blue-600"}`} />}
                <span>{t === "paste" ? "Paste content" : t === "upload" ? "Upload file" : "Paste URL"}</span>
              </button>
            ))}
          </div>

          {tab === "paste" && (
            <div>
              <label className={labelClass}>Paste your events list</label>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={15}
                placeholder="Paste your events list, calendar table, or any text..."
                className={inputClass}
              />
              <p className="text-[11px] text-gray-500 mt-1">Any format works: bullets, tables, prose, JSON. We&apos;ll figure it out.</p>
            </div>
          )}

          {tab === "upload" && (
            <div>
              <label className={labelClass}>Upload a document</label>
              <label
                className={`block border-2 border-dashed rounded-xl px-4 py-8 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 bg-gray-50"
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) setFile(f);
                }}
              >
                <input
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setFile(f);
                  }}
                />
                <Upload size={28} className="text-gray-400 mx-auto mb-2" />
                {file ? (
                  <>
                    <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB · click to change</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-700">Drop a file or click to choose</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOCX, CSV, XLSX, or TXT · max 10MB</p>
                  </>
                )}
              </label>
            </div>
          )}

          {tab === "url" && (
            <div>
              <label className={labelClass}>URL to your org&apos;s events page</label>
              <div className="relative">
                <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://example.org/events"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">A page listing multiple events works best.</p>
            </div>
          )}

          {detectError && (
            <div className="mt-3 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span className="flex-1">{detectError}</span>
              <button onClick={() => setDetectError(null)} className="text-red-500 hover:text-red-700">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleDetect}
              disabled={detecting}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold px-6 py-3 rounded-xl text-sm shadow-md hover:shadow-lg transition-all"
            >
              {detecting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {detecting ? "Detecting…" : "Detect Events"}
            </button>
          </div>
        </div>

        {/* Detected events */}
        {detected && (
          <div className="mt-8">
            <div className="flex items-end justify-between mb-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-[#0f2a4a] flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Detected {detected.filter(e => !e.removed).length} event{detected.filter(e => !e.removed).length === 1 ? "" : "s"}
                </h2>
                {truncated && (
                  <p className="text-xs text-amber-700 mt-1 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <span>Content was truncated — only the first chunk was analyzed. Re-paste in smaller batches if events are missing.</span>
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500">{detected.filter(e => e.removed).length} removed</p>
            </div>

            <ul className="space-y-3">
              {detected.map(evt => (
                <EventCard
                  key={evt.client_id}
                  event={evt}
                  onChange={patch => updateEvent(evt.client_id, patch)}
                />
              ))}
            </ul>

            {/* Email field for anonymous */}
            {!userId && (
              <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <label className={labelClass}>Your email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={submitterEmail}
                  onChange={e => setSubmitterEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
                <p className="text-[11px] text-gray-500 mt-1">We&apos;ll email you when your events are approved.</p>
              </div>
            )}

            {submitError && (
              <div className="mt-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span className="flex-1">{submitError}</span>
                <button onClick={() => setSubmitError(null)} className="text-red-500 hover:text-red-700">
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleSubmitAll}
                disabled={submitting || detected.every(e => e.removed)}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold px-10 py-4 rounded-xl text-base shadow-lg hover:shadow-xl transition-all"
              >
                {submitting ? "Submitting…" : `Submit ${detected.filter(e => !e.removed).length} Event${detected.filter(e => !e.removed).length === 1 ? "" : "s"}`}
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function EventCard({
  event,
  onChange,
}: {
  event: EditableEvent;
  onChange: (patch: Partial<EditableEvent>) => void;
}) {
  if (event.removed) {
    return (
      <li className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between text-sm text-gray-500">
        <span className="line-through truncate">{event.title}</span>
        <button
          type="button"
          onClick={() => onChange({ removed: false })}
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          Restore
        </button>
      </li>
    );
  }

  return (
    <li className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {confidenceBadge(event.confidence)}
          {event.primary_sdg && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 border border-blue-200 text-blue-800 rounded-full px-2 py-0.5">
              SDG {event.primary_sdg}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange({ removed: true })}
          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
          aria-label="Remove event"
        >
          <Trash2 size={13} /> Remove
        </button>
      </div>

      <input
        value={event.title}
        onChange={e => onChange({ title: e.target.value })}
        placeholder="Event title"
        className={`${inputClass} font-semibold`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
        <input
          type="datetime-local"
          value={toDatetimeLocalValue(event.start_date)}
          onChange={e => onChange({ start_date: fromDatetimeLocalValue(e.target.value) })}
          className={inputClass}
        />
        <input
          value={event.organization ?? ""}
          onChange={e => onChange({ organization: e.target.value || null })}
          placeholder="Hosting organization"
          className={inputClass}
        />
      </div>

      <input
        value={event.location ?? ""}
        onChange={e => onChange({ location: e.target.value || null })}
        placeholder="Location (city, country) or leave blank if online"
        className={`${inputClass} mt-2`}
      />

      {event.expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={event.description ?? ""}
              onChange={e => onChange({ description: e.target.value || null })}
              rows={3}
              placeholder="Short description"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>End date</label>
              <input
                type="datetime-local"
                value={toDatetimeLocalValue(event.end_date)}
                onChange={e => onChange({ end_date: fromDatetimeLocalValue(e.target.value) })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Primary SDG</label>
              <select
                value={event.primary_sdg ?? ""}
                onChange={e => onChange({ primary_sdg: e.target.value ? Number(e.target.value) : null })}
                className={inputClass}
              >
                <option value="">None</option>
                {Array.from({ length: 17 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>SDG {n}: {SDG_LABELS[n]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Registration URL</label>
            <input
              type="url"
              value={event.registration_url ?? ""}
              onChange={e => onChange({ registration_url: e.target.value || null })}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 mt-1">
            <input
              type="checkbox"
              checked={event.is_online}
              onChange={e => onChange({ is_online: e.target.checked })}
              className="accent-blue-600"
            />
            Online / virtual event
          </label>
        </div>
      )}

      <button
        type="button"
        onClick={() => onChange({ expanded: !event.expanded })}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
      >
        {event.expanded ? <><ChevronUp size={13} /> Hide details</> : <><ChevronDown size={13} /> Edit details</>}
      </button>
    </li>
  );
}
