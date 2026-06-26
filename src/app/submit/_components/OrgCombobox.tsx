"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Building2, Plus, BadgeCheck } from "lucide-react";
import { orgTypeBadge, type OrgSuggestion } from "./orgTypes";

export type { OrgSuggestion };

interface Props {
  value: string;
  onChange: (value: string) => void;
  onPicked?: (org: OrgSuggestion) => void;
  placeholder?: string;
  className?: string;
}

const DEBOUNCE_MS = 250;

async function searchOrgs(query: string): Promise<OrgSuggestion[]> {
  if (query.trim().length < 1) return [];
  const res = await fetch(`/api/orgs/search?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: OrgSuggestion[] };
  return json.data ?? [];
}

async function submitNewOrg(name: string): Promise<OrgSuggestion | null> {
  const res = await fetch("/api/orgs/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: OrgSuggestion };
  return json.data ?? null;
}

export default function OrgCombobox({ value, onChange, onPicked, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [results, setResults] = useState<OrgSuggestion[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const lastPickedRef = useRef<string>("");

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const scheduleQuery = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.trim().length < 1 || q === lastPickedRef.current) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchOrgs(q);
        setResults(r);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  function pick(org: OrgSuggestion) {
    lastPickedRef.current = org.name;
    onChange(org.name);
    onPicked?.(org);
    setOpen(false);
    setResults([]);
  }

  async function handleAddNew() {
    const name = value.trim();
    if (!name) return;
    setAdding(true);
    try {
      const created = await submitNewOrg(name);
      if (created) pick(created);
    } finally {
      setAdding(false);
    }
  }

  const lower = value.trim().toLowerCase();
  const hasExactMatch = results.some(
    r => r.name.toLowerCase() === lower || r.short.toLowerCase() === lower
  );
  const showAddNew = open && value.trim().length >= 2 && !hasExactMatch && !loading;

  const tier1 = results.filter(r => r.tier === 1);
  const tierOther = results.filter(r => r.tier !== 1);

  return (
    <div className={`relative ${className ?? ""}`} ref={wrapperRef}>
      <div className="relative">
        <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            scheduleQuery(e.target.value);
          }}
          onFocus={() => (results.length > 0 || value.trim()) && setOpen(true)}
          placeholder={placeholder ?? "e.g. World Health Organization"}
          className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl pl-9 pr-9 py-2 text-sm text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40 focus:border-[#4ea8de] transition-colors"
          autoComplete="off"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 animate-spin" />
        )}
      </div>
      {open && (results.length > 0 || showAddNew) && (
        <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-80 overflow-y-auto">
          {tier1.map(org => (
            <ResultRow key={org.slug} org={org} onPick={() => pick(org)} />
          ))}
          {tier1.length > 0 && tierOther.length > 0 && (
            <li className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-900 border-y border-gray-100 dark:border-slate-800">
              More organizations
            </li>
          )}
          {tierOther.map(org => (
            <ResultRow key={org.slug} org={org} onPick={() => pick(org)} />
          ))}
          {showAddNew && (
            <li>
              <button
                type="button"
                onClick={handleAddNew}
                disabled={adding}
                className="w-full text-left px-3 py-2.5 hover:bg-amber-50 flex items-center gap-2 text-sm border-t border-gray-100 dark:border-slate-800 text-amber-900"
              >
                {adding ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                <span>
                  Add <span className="font-semibold">&ldquo;{value.trim()}&rdquo;</span> as a new organization
                </span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function ResultRow({ org, onPick }: { org: OrgSuggestion; onPick: () => void }) {
  const badge = orgTypeBadge(org.org_type);
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-900 flex items-center gap-2 text-sm border-b border-gray-100 dark:border-slate-800 last:border-b-0"
      >
        <span className="shrink-0 w-8 h-8 rounded bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt="" className="max-w-full max-h-full object-contain p-0.5" />
          ) : (
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">{org.short.slice(0, 3).toUpperCase()}</span>
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="font-semibold text-gray-900 dark:text-slate-100 truncate inline-flex items-center gap-1">
            {org.short}
            {org.is_verified && org.is_claimed && (
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-label="Verified organization" />
            )}
            {/* Tier-3 community / auto-discovered rows surface a small
                "unverified org" pill so the picker shows the user this is
                not a curated listing. */}
            {org.tier === 3 && (
              <span
                className="ml-1 shrink-0 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200"
                title="This organization hasn't been verified yet."
              >
                Unverified
              </span>
            )}
          </span>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 block truncate">{org.name}</span>
        </span>
        <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.className}`}>
          {badge.label}
        </span>
      </button>
    </li>
  );
}
