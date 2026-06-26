"use client";

import type { ShowFilter, ColorMode } from "./EventsMap";

const SHOW_OPTIONS: { value: ShowFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
  { value: "featured", label: "Featured" },
];

const COLOR_OPTIONS: { value: ColorMode; label: string }[] = [
  { value: "sdg", label: "SDG" },
  { value: "date", label: "Date" },
  { value: "format", label: "Format" },
];

interface PillGroupProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

function PillGroup<T extends string>({ label, options, value, onChange }: PillGroupProps<T>) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-slate-500 dark:text-slate-400 dark:dark:text-slate-500 font-medium uppercase tracking-wide shrink-0">{label}:</span>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
              active
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function ShowFilterPills({
  value,
  onChange,
}: {
  value: ShowFilter;
  onChange: (v: ShowFilter) => void;
}) {
  return <PillGroup<ShowFilter> label="Show" options={SHOW_OPTIONS} value={value} onChange={onChange} />;
}

export function ColorByPills({
  value,
  onChange,
}: {
  value: ColorMode;
  onChange: (v: ColorMode) => void;
}) {
  return <PillGroup<ColorMode> label="Color by" options={COLOR_OPTIONS} value={value} onChange={onChange} />;
}
