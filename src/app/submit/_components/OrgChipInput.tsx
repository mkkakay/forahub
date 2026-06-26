"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, X, Building2, Plus } from "lucide-react";
import { orgTypeBadge, type OrgSuggestion } from "./orgTypes";

interface Props {
  // Stored as a comma-separated string (matches the events table schema).
  value: string;
  onChange: (value: string) => void;
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

function parseValue(s: string): string[] {
  return s.split(",").map(t => t.trim()).filter(Boolean);
}

function joinValue(chips: string[]): string {
  return chips.join(", ");
}

export default function OrgChipInput({ value, onChange, placeholder, className }: Props) {
  const chips = parseValue(value);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [results, setResults] = useState<OrgSuggestion[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const scheduleQuery = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.trim().length < 1) {
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

  function addChip(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (chips.some(c => c.toLowerCase() === trimmed.toLowerCase())) return;
    onChange(joinValue([...chips, trimmed]));
    setDraft("");
    setResults([]);
    setOpen(false);
  }

  function removeChip(idx: number) {
    const next = chips.filter((_, i) => i !== idx);
    onChange(joinValue(next));
  }

  async function handleAddNew() {
    const name = draft.trim();
    if (!name) return;
    setAdding(true);
    try {
      const created = await submitNewOrg(name);
      addChip(created?.name ?? name);
    } finally {
      setAdding(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addChip(draft);
    } else if (e.key === "Backspace" && !draft && chips.length > 0) {
      removeChip(chips.length - 1);
    }
  }

  const lower = draft.trim().toLowerCase();
  const filteredResults = results.filter(o => !chips.some(c => c.toLowerCase() === o.name.toLowerCase()));
  const hasExactMatch = filteredResults.some(
    r => r.name.toLowerCase() === lower || r.short.toLowerCase() === lower
  );
  const showAddNew = open && draft.trim().length >= 2 && !hasExactMatch && !loading;
  const tier1 = filteredResults.filter(r => r.tier === 1);
  const tierOther = filteredResults.filter(r => r.tier !== 1);

  return (
    <div className={`relative ${className ?? ""}`} ref={wrapperRef}>
      <div className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-2 py-1.5 flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-[#4ea8de]/40 focus-within:border-[#4ea8de] transition-colors">
        {chips.map((c, i) => (
          <span
            key={`${c}-${i}`}
            className="inline-flex items-center gap-1 bg-[#4ea8de]/10 text-[#0f2a4a] dark:text-slate-100 text-xs font-semibold rounded-md px-2 py-0.5 border border-[#4ea8de]/30"
          >
            {c}
            <button
              type="button"
              onClick={() => removeChip(i)}
              className="text-[#0f2a4a]/60 hover:text-[#0f2a4a] dark:hover:text-slate-100"
              aria-label={`Remove ${c}`}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[140px]">
          <input
            type="text"
            value={draft}
            onChange={e => {
              setDraft(e.target.value);
              scheduleQuery(e.target.value);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
            onBlur={() => {
              // If the user types a free-form name and tabs away, persist it.
              if (draft.trim()) addChip(draft);
            }}
            placeholder={chips.length === 0 ? (placeholder ?? "Type to search, press Enter to add") : ""}
            className="w-full text-sm text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none bg-transparent py-1"
            autoComplete="off"
          />
          {loading && (
            <Loader2 size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 animate-spin" />
          )}
        </div>
      </div>
      {open && (filteredResults.length > 0 || showAddNew) && (
        <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-80 overflow-y-auto">
          {tier1.map(org => (
            <ChipResultRow key={org.slug} org={org} onPick={() => addChip(org.name)} />
          ))}
          {tier1.length > 0 && tierOther.length > 0 && (
            <li className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-900 border-y border-gray-100 dark:border-slate-800">
              More organizations
            </li>
          )}
          {tierOther.map(org => (
            <ChipResultRow key={org.slug} org={org} onPick={() => addChip(org.name)} />
          ))}
          {showAddNew && (
            <li>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}  // keep input from blurring before click
                onClick={handleAddNew}
                disabled={adding}
                className="w-full text-left px-3 py-2.5 hover:bg-amber-50 flex items-center gap-2 text-sm border-t border-gray-100 dark:border-slate-800 text-amber-900"
              >
                {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>
                  Add <span className="font-semibold">&ldquo;{draft.trim()}&rdquo;</span> as a new organization
                </span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function ChipResultRow({ org, onPick }: { org: OrgSuggestion; onPick: () => void }) {
  const badge = orgTypeBadge(org.org_type);
  return (
    <li>
      <button
        type="button"
        onMouseDown={e => e.preventDefault()}
        onClick={onPick}
        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-900 flex items-center gap-2 text-sm border-b border-gray-100 dark:border-slate-800 last:border-b-0"
      >
        <span className="shrink-0 w-7 h-7 rounded bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt="" className="max-w-full max-h-full object-contain p-0.5" />
          ) : (
            <Building2 size={12} className="text-gray-400 dark:text-slate-500" />
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="font-semibold text-gray-900 dark:text-slate-100 block truncate">{org.short}</span>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 block truncate">{org.name}</span>
        </span>
        <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.className}`}>
          {badge.label}
        </span>
      </button>
    </li>
  );
}
