'use client';

import React, { useMemo } from 'react';
import { SDG_COLORS, SDG_FALLBACK, type CalendarEvent } from './MonthCalendar';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function toUTCDateOnly(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatDateRange(start: string, end: string | null): string {
  const s = toUTCDateOnly(start);
  const e = end ? toUTCDateOnly(end) : s;
  const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
  const sameMonth = sameYear && s.getUTCMonth() === e.getUTCMonth();
  const sameDay = s.getTime() === e.getTime();
  const monthShort = (date: Date) => MONTH_NAMES[date.getUTCMonth()].slice(0, 3);

  if (sameDay) return `${s.getUTCDate()} ${monthShort(s)} ${s.getUTCFullYear()}`;
  if (sameMonth) return `${s.getUTCDate()} – ${e.getUTCDate()} ${monthShort(s)} ${s.getUTCFullYear()}`;
  if (sameYear) return `${s.getUTCDate()} ${monthShort(s)} – ${e.getUTCDate()} ${monthShort(e)} ${s.getUTCFullYear()}`;
  return `${s.getUTCDate()} ${monthShort(s)} ${s.getUTCFullYear()} – ${e.getUTCDate()} ${monthShort(e)} ${e.getUTCFullYear()}`;
}

function formatShortDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}

function getSdgColor(sdgGoals: number[]): string {
  if (!sdgGoals || sdgGoals.length === 0) return SDG_FALLBACK;
  const first = sdgGoals[0];
  return SDG_COLORS[first] ?? SDG_FALLBACK;
}

type Props = {
  events: CalendarEvent[];
  year: number;
  month: number;
  maxHeight?: number;
  hoveredEventId?: string | null;
  onEventHover?: (id: string | null) => void;
  onEventClick?: (id: string) => void;
};

type GroupEntry = {
  event: CalendarEvent;
  ongoing: boolean;
  originalStart: Date;
};

export default function EventList({
  events,
  year,
  month,
  maxHeight = 720,
  hoveredEventId,
  onEventHover,
  onEventClick,
}: Props) {
  const grouped = useMemo(() => {
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

    const inMonth = events.filter((e) => {
      const s = toUTCDateOnly(e.start_date);
      const en = e.end_date ? toUTCDateOnly(e.end_date) : s;
      return en >= monthStart && s <= monthEnd;
    });

    // Build grouped structure. Events starting in or after the visible month
    // get their natural start date as the group key. Events starting before
    // the visible month (but extending into it) get bucketed under the
    // month's first day with an "ongoing" flag.
    const groups: Record<string, { date: Date; entries: GroupEntry[] }> = {};

    inMonth.forEach((e) => {
      const naturalStart = toUTCDateOnly(e.start_date);
      const startsBeforeMonth = naturalStart < monthStart;
      const groupDate = startsBeforeMonth ? monthStart : naturalStart;
      const key = groupDate.toISOString().slice(0, 10);
      if (!groups[key]) groups[key] = { date: groupDate, entries: [] };
      groups[key].entries.push({
        event: e,
        ongoing: startsBeforeMonth,
        originalStart: naturalStart,
      });
    });

    // Within each group: ongoing events first, then by start time
    const sortedGroups = Object.values(groups).sort((a, b) => a.date.getTime() - b.date.getTime());
    sortedGroups.forEach((g) => {
      g.entries.sort((a, b) => {
        if (a.ongoing && !b.ongoing) return -1;
        if (!a.ongoing && b.ongoing) return 1;
        return new Date(a.event.start_date).getTime() - new Date(b.event.start_date).getTime();
      });
    });

    return sortedGroups;
  }, [events, year, month]);

  return (
    <div className="bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col" style={{ maxHeight }}>
      <div className="px-4 py-3 bg-blue-900 text-white">
        <h3 className="text-lg font-bold">{MONTH_NAMES[month]} {year}</h3>
      </div>
      <div className="overflow-y-auto flex-1">
        {grouped.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-sm">No events this month.</div>
        )}
        {grouped.map((group, gi) => (
          <div key={gi}>
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-900">
                {MONTH_NAMES[group.date.getUTCMonth()]} {group.date.getUTCDate()}, {group.date.getUTCFullYear()}
              </span>
              <span className="text-sm font-bold text-slate-900">{DAY_NAMES_FULL[group.date.getUTCDay()]}</span>
            </div>
            {group.entries.map((entry) => {
              const e = entry.event;
              const sdgColor = getSdgColor(e.sdg_goals);
              const isHovered = hoveredEventId === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onMouseEnter={() => onEventHover?.(e.id)}
                  onMouseLeave={() => onEventHover?.(null)}
                  onFocus={() => onEventHover?.(e.id)}
                  onBlur={() => onEventHover?.(null)}
                  onClick={() => onEventClick?.(e.id)}
                  aria-label={`${e.title}. ${formatDateRange(e.start_date, e.end_date)}. Click for details.`}
                  className={`w-full text-left px-4 py-3.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors focus:outline-none focus:bg-slate-100 ${
                    isHovered ? 'bg-slate-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: sdgColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-blue-900 leading-snug">{e.title}</h4>
                        {entry.ongoing && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                            Ongoing
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5">
                        {entry.ongoing ? `Started ${formatShortDate(entry.originalStart)} | ` : ''}
                        {formatDateRange(e.start_date, e.end_date)}
                        {e.location ? ` | ${e.location}` : ''}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
