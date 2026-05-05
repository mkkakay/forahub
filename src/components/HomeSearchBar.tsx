"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock } from "lucide-react";
import { suggestTitles } from "@/lib/search";

const POPULAR_CHIPS = [
  "Health", "Climate", "WHA", "SDG 3", "Water",
  "Education", "Humanitarian", "Gender",
];
const RECENT_KEY = "forahub_recent_searches";
const MAX_RECENT = 5;

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const next = [
    trimmed,
    ...getRecent().filter(q => q.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export default function HomeSearchBar({ eventTitles }: { eventTitles: string[] }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => { setRecents(getRecent()); }, []);

  useEffect(() => {
    const s = suggestTitles(eventTitles, query);
    setSuggestions(s);
    setOpen(s.length > 0);
    setActiveIndex(-1);
  }, [query, eventTitles]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function navigate(q: string) {
    const trimmed = q.trim();
    if (trimmed) saveRecent(trimmed);
    setRecents(getRecent());
    setOpen(false);
    router.push(trimmed ? `/events?q=${encodeURIComponent(trimmed)}` : "/events");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      navigate(activeIndex >= 0 ? suggestions[activeIndex] : query);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function clearQuery() {
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="mt-8 max-w-2xl mx-auto">
      <div ref={containerRef} className="relative">
        {/* Input row */}
        <div className="flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/20">
          <Search className="ml-5 text-gray-400 shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="Search events, organizations, or SDG goals…"
            className="flex-1 px-4 py-5 text-gray-800 placeholder-gray-400 text-sm focus:outline-none"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls="search-suggestions"
          />
          {query && (
            <button
              onClick={clearQuery}
              className="px-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={() => navigate(query)}
            className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-7 py-5 text-sm transition-colors shrink-0"
          >
            Search
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {open && (
          <ul
            id="search-suggestions"
            role="listbox"
            className="absolute z-50 left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          >
            {suggestions.map((title, i) => (
              <li
                key={title}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={() => navigate(title)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition-colors ${
                  i === activeIndex
                    ? "bg-blue-50 text-[#0f2a4a]"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Search size={13} className="text-gray-400 shrink-0" />
                {title}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Popular chips */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {POPULAR_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => navigate(chip)}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Recent searches */}
      {recents.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 justify-center">
          <span className="flex items-center gap-1 text-xs text-blue-300">
            <Clock size={12} />
            Recent:
          </span>
          {recents.map(r => (
            <button
              key={r}
              onClick={() => { setQuery(r); navigate(r); }}
              className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-blue-100 border border-white/10 transition-colors"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
