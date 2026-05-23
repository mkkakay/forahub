"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { type EventPreview } from "@/components/HomeClient";

const SDG_COLORS: Record<number, string> = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
  6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
  11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
  16: "#00689D", 17: "#19486A",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MS_PER_DAY = 86_400_000;
const MAX_LANES = 3;

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
  const d = new Date(s);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function eventColor(ev: EventPreview): string {
  return SDG_COLORS[ev.sdg_goals?.[0] ?? 0] ?? "#3b82f6";
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatDayName(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function formatDateRange(start: Date, end: Date | null): string {
  if (!end || sameDay(start, end)) {
    return start.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { day: "numeric", year: "numeric" })}`;
  }
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

interface Segment {
  event: EventPreview;
  startCol: number;
  endCol: number;
  span: number;
  isStart: boolean;
  isEnd: boolean;
  lane: number;
}

function buildWeeks(viewMonth: Date): Date[][] {
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startOffset = firstOfMonth.getDay();
  const cursor = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1 - startOffset);

  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    if (w >= 4 && week.every(d => d.getMonth() !== viewMonth.getMonth())) break;
    weeks.push(week);
  }
  return weeks;
}

function assignLanes(
  events: EventPreview[],
  week: Date[]
): { visible: Segment[]; hiddenByDay: Record<number, number> } {
  const weekStart = week[0];
  const weekEnd = week[6];

  const raw: Omit<Segment, "lane">[] = [];
  for (const ev of events) {
    const evStart = parseDateUTC(ev.start_date);
    const evEnd = ev.end_date ? parseDateUTC(ev.end_date) : evStart;
    if (evEnd.getTime() < weekStart.getTime()) continue;
    if (evStart.getTime() > weekEnd.getTime()) continue;

    const segStart = evStart.getTime() < weekStart.getTime() ? weekStart : evStart;
    const segEnd = evEnd.getTime() > weekEnd.getTime() ? weekEnd : evEnd;
    const startCol = Math.round((segStart.getTime() - weekStart.getTime()) / MS_PER_DAY);
    const endCol = Math.round((segEnd.getTime() - weekStart.getTime()) / MS_PER_DAY);

    raw.push({
      event: ev,
      startCol,
      endCol,
      span: endCol - startCol + 1,
      isStart: sameDay(segStart, evStart),
      isEnd: sameDay(segEnd, evEnd),
    });
  }

  raw.sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol;
    if (b.span !== a.span) return b.span - a.span;
    return (
      parseDateUTC(a.event.start_date).getTime() -
      parseDateUTC(b.event.start_date).getTime()
    );
  });

  const lanes: Segment[][] = [];
  const visible: Segment[] = [];
  const overflow: Omit<Segment, "lane">[] = [];

  for (const seg of raw) {
    let placed = false;
    for (let l = 0; l < MAX_LANES; l++) {
      if (!lanes[l]) lanes[l] = [];
      const conflict = lanes[l].some(
        s => !(s.endCol < seg.startCol || s.startCol > seg.endCol)
      );
      if (!conflict) {
        const placedSeg: Segment = { ...seg, lane: l };
        lanes[l].push(placedSeg);
        visible.push(placedSeg);
        placed = true;
        break;
      }
    }
    if (!placed) overflow.push(seg);
  }

  const hiddenByDay: Record<number, number> = {};
  for (const seg of overflow) {
    for (let c = seg.startCol; c <= seg.endCol; c++) {
      hiddenByDay[c] = (hiddenByDay[c] ?? 0) + 1;
    }
  }

  return { visible, hiddenByDay };
}

function CalendarView({
  events,
  viewMonth,
  onMonthChange,
  onEventClick,
  selectedId,
}: {
  events: EventPreview[];
  viewMonth: Date;
  onMonthChange: (d: Date) => void;
  onEventClick: (id: string) => void;
  selectedId: string | null;
}) {
  const weeks = useMemo(() => buildWeeks(viewMonth), [viewMonth]);
  const today = new Date();

  const monthOptions = useMemo(() => {
    const now = new Date();
    const opts: { value: string; label: string }[] = [];
    for (let i = -6; i <= 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      opts.push({
        value: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      });
    }
    return opts;
  }, []);

  function shiftMonth(delta: number) {
    onMonthChange(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));
  }

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-[#334155]">
        <h3 className="text-2xl md:text-3xl font-extrabold text-[#0f2a4a] dark:text-white tracking-tight">
          {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={`${viewMonth.getFullYear()}-${viewMonth.getMonth()}`}
            onChange={e => {
              const [y, m] = e.target.value.split("-").map(Number);
              onMonthChange(new Date(y, m, 1));
            }}
            aria-label="Jump to month"
            className="text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#0f2a4a]/30 cursor-pointer"
          >
            {monthOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => onMonthChange(startOfMonth(new Date()))}
            className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[#334155] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#475569] transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#334155] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#334155] transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-[#334155]">
        {DAY_LABELS.map((d, i) => (
          <div
            key={i}
            className={`text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center py-2 ${
              i === 0 || i === 6 ? "bg-gray-50/70 dark:bg-[#0f172a]/40" : ""
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div>
        {weeks.map((week, wi) => {
          const { visible, hiddenByDay } = assignLanes(events, week);
          return (
            <div
              key={wi}
              className="relative grid grid-cols-7 border-b border-gray-100 dark:border-[#334155] last:border-b-0"
            >
              {/* Day cells (background) */}
              {week.map((d, di) => {
                const inMonth = d.getMonth() === viewMonth.getMonth();
                const isToday = sameDay(d, today);
                const isWeekend = di === 0 || di === 6;
                const hidden = hiddenByDay[di] ?? 0;
                return (
                  <div
                    key={di}
                    className={`relative min-h-[100px] md:min-h-[110px] border-r border-gray-100 dark:border-[#334155] last:border-r-0 px-1.5 pt-1.5 ${
                      isToday
                        ? "bg-[#FFF9E6] dark:bg-[#3a3215]/40"
                        : isWeekend
                        ? "bg-gray-50/50 dark:bg-[#0f172a]/30"
                        : ""
                    } ${inMonth ? "" : "opacity-40"}`}
                  >
                    <div
                      className={`text-base font-semibold leading-none ${
                        isToday
                          ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#0f2a4a] text-white"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {d.getDate()}
                    </div>
                    {hidden > 0 && (
                      <div className="absolute left-1.5 bottom-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                        +{hidden} more
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Event bars (overlay) */}
              <div className="absolute inset-0 pt-9 px-0.5 pb-5 pointer-events-none">
                <div
                  className="grid grid-cols-7 h-full"
                  style={{
                    gridTemplateRows: `repeat(${MAX_LANES}, minmax(0, 18px))`,
                    rowGap: 3,
                  }}
                >
                  {visible.map((seg, si) => (
                    <button
                      key={si}
                      onClick={() => onEventClick(seg.event.id)}
                      title={seg.event.title}
                      className={`pointer-events-auto text-left text-[11px] leading-tight font-semibold text-white truncate px-2 mx-0.5 transition-all ${
                        seg.isStart ? "rounded-l-md" : ""
                      } ${seg.isEnd ? "rounded-r-md" : ""} ${
                        selectedId === seg.event.id
                          ? "ring-2 ring-offset-1 ring-[#0f2a4a] dark:ring-[#4ea8de]"
                          : "hover:brightness-110"
                      }`}
                      style={{
                        gridColumn: `${seg.startCol + 1} / span ${seg.span}`,
                        gridRow: seg.lane + 1,
                        backgroundColor: eventColor(seg.event),
                      }}
                    >
                      {seg.isStart ? seg.event.title : " "}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SidebarList({
  events,
  selectedId,
  onSelect,
  registerRef,
}: {
  events: EventPreview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
}) {
  if (events.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
        No events to show.
      </p>
    );
  }

  let lastDayKey = "";

  return (
    <div>
      {events.map(ev => {
        const startDate = parseDateUTC(ev.start_date);
        const dayKey = `${startDate.getFullYear()}-${startDate.getMonth()}-${startDate.getDate()}`;
        const showHeader = dayKey !== lastDayKey;
        lastDayKey = dayKey;
        const endDate = ev.end_date ? parseDateUTC(ev.end_date) : null;
        const isSelected = selectedId === ev.id;
        const color = eventColor(ev);
        const sdg = ev.sdg_goals?.[0];

        return (
          <div key={ev.id}>
            {showHeader && (
              <div className="px-4 py-2 bg-gray-50 dark:bg-[#0f172a] border-b border-gray-100 dark:border-[#334155]">
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  {formatDateLong(startDate)}
                  <span className="text-gray-400 dark:text-gray-500 font-medium ml-1">
                    — {formatDayName(startDate)}
                  </span>
                </p>
              </div>
            )}
            <Link
              ref={el => registerRef(ev.id, el as HTMLElement | null)}
              href={`/events/${ev.id}`}
              onClick={() => onSelect(ev.id)}
              className={`block px-4 py-3 border-l-4 border-b border-gray-100 dark:border-[#334155] hover:bg-gray-50 dark:hover:bg-[#0f172a]/60 transition-colors ${
                isSelected ? "bg-[#0f2a4a]/[0.05] dark:bg-[#4ea8de]/10" : ""
              }`}
              style={{ borderLeftColor: color }}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">
                {ev.title}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDateRange(startDate, endDate)}
                </p>
                {sdg && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider text-white px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: color }}
                  >
                    SDG {sdg}
                  </span>
                )}
              </div>
              {ev.location && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                  <MapPin size={11} className="shrink-0" />
                  <span className="truncate">{ev.location}</span>
                </p>
              )}
            </Link>
          </div>
        );
      })}
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
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const todayStart = startOfMonth(new Date()).getTime();
    const upcoming = events.find(
      e => parseDateUTC(e.start_date).getTime() >= todayStart
    );
    return upcoming
      ? startOfMonth(parseDateUTC(upcoming.start_date))
      : startOfMonth(new Date());
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});

  function registerRef(id: string, el: HTMLElement | null) {
    itemRefs.current[id] = el;
  }

  function handleEventClick(id: string) {
    setSelectedId(id);
    const el = itemRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const ev = events.find(e => e.id === id);
    if (ev) {
      const evMonth = startOfMonth(parseDateUTC(ev.start_date));
      if (
        evMonth.getFullYear() !== viewMonth.getFullYear() ||
        evMonth.getMonth() !== viewMonth.getMonth()
      ) {
        setViewMonth(evMonth);
      }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
      {/* ── LEFT: Calendar (70%) ─────────────────────────────────────── */}
      <div className="lg:col-span-7">
        <CalendarView
          events={events}
          viewMonth={viewMonth}
          onMonthChange={setViewMonth}
          onEventClick={handleEventClick}
          selectedId={selectedId}
        />
      </div>

      {/* ── RIGHT: Sidebar list (30%) ─────────────────────────────── */}
      <div className="lg:col-span-3">
        <div className="lg:sticky lg:top-20">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-[#334155] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-[#334155] flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                Events
              </h2>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: accentColor }}
              >
                {events.length}
              </span>
            </div>
            <div className="lg:max-h-[calc(100vh-10rem)] overflow-y-auto">
              <SidebarList
                events={events}
                selectedId={selectedId}
                onSelect={setSelectedId}
                registerRef={registerRef}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
