"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard, type EventPreview } from "@/components/HomeClient";

const SDG_COLORS: Record<number, string> = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
  6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
  11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
  16: "#00689D", 17: "#19486A",
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseDateUTC(s: string): Date {
  // Treat DB date as UTC midnight, then build a local-equivalent date so
  // calendar cells line up with the displayed day.
  const d = new Date(s);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function eventColor(ev: EventPreview): string {
  return SDG_COLORS[ev.sdg_goals?.[0] ?? 0] ?? "#3b82f6";
}

function CalendarView({
  events,
  onEventClick,
  accentColor,
}: {
  events: EventPreview[];
  onEventClick: (id: string) => void;
  accentColor: string;
}) {
  const initialMonth = useMemo(() => {
    const upcoming = events.find(
      e => parseDateUTC(e.start_date).getTime() >= startOfMonth(new Date()).getTime()
    );
    return upcoming ? startOfMonth(parseDateUTC(upcoming.start_date)) : startOfMonth(new Date());
  }, [events]);

  const [viewMonth, setViewMonth] = useState<Date>(initialMonth);

  const cells = useMemo(() => {
    const firstDay = viewMonth.getDay();
    const daysInMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth() + 1,
      0
    ).getDate();
    const list: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++)
      list.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [viewMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventPreview[]>();
    for (const ev of events) {
      const start = parseDateUTC(ev.start_date);
      const end = ev.end_date ? parseDateUTC(ev.end_date) : start;
      const cursor = new Date(start);
      while (cursor.getTime() <= end.getTime()) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
        const arr = map.get(key) ?? [];
        arr.push(ev);
        map.set(key, arr);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  function shiftMonth(delta: number) {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  const today = new Date();

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#334155]">
        <button
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#334155] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
            {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </h3>
          <button
            onClick={() => setViewMonth(startOfMonth(new Date()))}
            className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Today
          </button>
        </div>
        <button
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#334155] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 px-2 pt-3 pb-1">
        {DAY_LABELS.map((d, i) => (
          <div
            key={i}
            className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1 px-2 pb-3">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="min-h-[72px]" />;
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = sameDay(d, today);
          return (
            <div
              key={i}
              className={`min-h-[72px] rounded-lg p-1 border ${
                isToday
                  ? "border-[#0f2a4a] dark:border-[#4ea8de] bg-[#0f2a4a]/[0.03] dark:bg-[#4ea8de]/10"
                  : "border-transparent hover:border-gray-200 dark:hover:border-[#334155]"
              } transition-colors`}
            >
              <div
                className={`text-[11px] font-semibold mb-1 ${
                  isToday
                    ? "text-[#0f2a4a] dark:text-[#4ea8de]"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {d.getDate()}
              </div>
              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 2).map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev.id)}
                    title={ev.title}
                    className="text-left text-[10px] leading-tight font-medium text-white rounded px-1 py-0.5 truncate hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: eventColor(ev) }}
                  >
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 px-1">
                    +{dayEvents.length - 2} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend hint */}
      <div
        className="px-4 py-2 border-t border-gray-100 dark:border-[#334155] text-[10px] uppercase tracking-wider text-gray-400 flex items-center gap-1.5"
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        Tap any event to jump to it in the list
      </div>
    </div>
  );
}

export default function OrgPageClient({
  events,
  accentColor,
}: {
  events: EventPreview[];
  accentColor: string;
}) {
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);

  function scrollToEvent(id: string) {
    const el = itemRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    setTimeout(() => setHighlightId(prev => (prev === id ? null : prev)), 2000);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ── LEFT: chronological list (60%) ───────────────────────────── */}
      <div className="lg:col-span-3 order-2 lg:order-1">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">
          Events
        </h2>
        <div className="flex flex-col gap-4">
          {events.map(event => (
            <div
              key={event.id}
              ref={el => {
                itemRefs.current[event.id] = el;
              }}
              className={`rounded-2xl transition-shadow duration-500 ${
                highlightId === event.id
                  ? "ring-2 ring-offset-2 ring-[#0f2a4a] dark:ring-[#4ea8de]"
                  : ""
              }`}
            >
              <EventCard event={event} />
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: calendar (40%) ────────────────────────────────────── */}
      <div className="lg:col-span-2 order-1 lg:order-2">
        <div className="lg:sticky lg:top-20">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">
            Calendar
          </h2>
          <CalendarView
            events={events}
            onEventClick={scrollToEvent}
            accentColor={accentColor}
          />
        </div>
      </div>
    </div>
  );
}
