"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Building2 } from "lucide-react";

export interface OrgSuggestion {
  slug: string;
  name: string;
  short: string;
  logo_url: string | null;
}

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

export default function OrgCombobox({ value, onChange, onPicked, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
        setOpen(r.length > 0);
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

  return (
    <div className={`relative ${className ?? ""}`} ref={wrapperRef}>
      <div className="relative">
        <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            scheduleQuery(e.target.value);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder ?? "e.g. World Health Organization"}
          className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-9 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40 focus:border-[#4ea8de] transition-colors"
          autoComplete="off"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
          {results.map(org => (
            <li key={org.slug}>
              <button
                type="button"
                onClick={() => pick(org)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100 last:border-b-0"
              >
                <span className="shrink-0 w-8 h-8 rounded bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                  {org.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={org.logo_url} alt="" className="max-w-full max-h-full object-contain p-0.5" />
                  ) : (
                    <span className="text-[10px] font-bold text-gray-400">{org.short.slice(0, 3).toUpperCase()}</span>
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-900 block truncate">{org.short}</span>
                  <span className="text-[11px] text-gray-500 block truncate">{org.name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
