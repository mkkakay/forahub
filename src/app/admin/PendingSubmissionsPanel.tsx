"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Inbox, ChevronDown, ChevronRight, Loader2, Check, X, AlertCircle,
  Upload, LinkIcon, PencilLine, ExternalLink,
} from "lucide-react";
import { parseApiResponse } from "@/lib/admin/fetchJson";
import { formatDateTime as formatDate } from "@/lib/date";

interface PendingRow {
  id: string;
  title: string;
  organization: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  format: string | null;
  submitter_email: string | null;
  submitted_by_user_id: string | null;
  submission_source: "flyer_ai" | "url_ai" | "manual" | null;
  submitted_at: string | null;
  registration_url: string | null;
  description: string | null;
}

function sourceIcon(source: PendingRow["submission_source"]) {
  if (source === "flyer_ai") return <Upload size={11} />;
  if (source === "url_ai") return <LinkIcon size={11} />;
  return <PencilLine size={11} />;
}

function sourceLabel(source: PendingRow["submission_source"]): string {
  return source === "flyer_ai" ? "flyer" : source === "url_ai" ? "url" : "manual";
}

export default function PendingSubmissionsPanel({ adminSecret }: { adminSecret: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const headers = { "x-admin-key": adminSecret } as const;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/submissions", { headers });
      const parsed = await parseApiResponse<{ data: PendingRow[] }>(res);
      if (!parsed.ok) throw new Error(parsed.error);
      setRows(parsed.data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [adminSecret]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  async function decide(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action,
          reason: action === "reject" ? (rejectReason[id] ?? "").trim() : undefined,
        }),
      });
      const parsed = await parseApiResponse(res);
      if (!parsed.ok) throw new Error(parsed.error);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#0f2a4a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Inbox size={18} className="text-[#4ea8de]" />
          <h2 className="text-white font-semibold">Pending Submissions</h2>
          <span className="text-xs text-blue-500">
            {rows.length > 0
              ? `${rows.length} awaiting review`
              : "user submissions via /submit waiting for approval"}
          </span>
        </div>
        {open ? <ChevronDown size={18} className="text-blue-400" /> : <ChevronRight size={18} className="text-blue-400" />}
      </button>

      {open && (
        <div className="border-t border-blue-900/40 p-5 space-y-3">
          <div className="text-xs text-blue-400 bg-[#0a1a2e] border border-blue-900/40 rounded-lg px-3 py-2">
            Anyone can submit via <code>/submit</code>. Verified orgs auto-publish; everyone else queues here. Approve → live on homepage immediately. Reject → hidden from the queue.
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span className="break-words">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">
                <X size={14} />
              </button>
            </div>
          )}

          {loading && rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-blue-500 text-sm flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-blue-500 text-sm">
              No pending user submissions.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map(row => {
                const isBusy = busyId === row.id;
                return (
                  <div key={row.id} className="bg-[#0a1a2e] border border-blue-900/40 rounded-lg p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-semibold leading-snug">{row.title}</p>
                        <p className="text-blue-400 text-xs mt-0.5">
                          {row.organization ?? "—"} · {formatDate(row.start_date)}
                          {row.location && ` · ${row.location}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-900/30 border border-blue-700/40 rounded px-1.5 py-0.5">
                          {sourceIcon(row.submission_source)}
                          {sourceLabel(row.submission_source)}
                        </span>
                        <Link
                          href={`/events/${row.id}`}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-300 hover:text-white border border-blue-900/40 hover:border-[#4ea8de]/50 rounded px-1.5 py-0.5"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Preview <ExternalLink size={10} />
                        </Link>
                      </div>
                    </div>

                    {row.description && (
                      <p className="text-xs text-blue-200/80 line-clamp-2 mb-2">{row.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-blue-500 mb-3">
                      <span>From: <span className="text-blue-300">{row.submitter_email ?? "—"}</span></span>
                      {row.submitted_by_user_id && (
                        <span className="text-green-400">• signed in</span>
                      )}
                      {row.submitted_at && <span>• submitted {formatDate(row.submitted_at)}</span>}
                      {row.registration_url && (
                        <a
                          href={row.registration_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#4ea8de] hover:underline truncate max-w-[40ch] inline-flex items-center gap-1"
                        >
                          {row.registration_url} <ExternalLink size={10} />
                        </a>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 md:items-center">
                      <input
                        type="text"
                        value={rejectReason[row.id] ?? ""}
                        onChange={e => setRejectReason(r => ({ ...r, [row.id]: e.target.value }))}
                        placeholder="Optional reason (sent in rejection email later)"
                        className="flex-1 bg-[#0d2240] border border-blue-900/40 text-white placeholder-blue-500 text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40"
                      />
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => decide(row.id, "reject")}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-100 border border-red-900/40 hover:border-red-500/50 disabled:opacity-50 rounded px-3 py-1.5"
                        >
                          {isBusy ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Reject
                        </button>
                        <button
                          onClick={() => decide(row.id, "approve")}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold rounded px-3 py-1.5"
                        >
                          {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Tiny inline Link helper so we don't pull next/link into the admin bundle path twice.
function Link(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
