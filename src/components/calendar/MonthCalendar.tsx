'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Official UN SDG colors
const SDG_COLORS: Record<number, string> = {
  1: '#E5243B', 2: '#DDA63A', 3: '#4C9F38', 4: '#C5192D',
  5: '#FF3A21', 6: '#26BDE2', 7: '#FCC30B', 8: '#A21942',
  9: '#FD6925', 10: '#DD1367', 11: '#FD9D24', 12: '#BF8B2E',
  13: '#3F7E44', 14: '#0A97D9', 15: '#56C02B', 16: '#00689D',
  17: '#19486A',
};

// Neutral slate for events with no SDG assigned
const SDG_FALLBACK = '#94a3b8';

// Max visible event rows per week before showing "+N more"
const MAX_VISIBLE_ROWS_PER_WEEK = 3;

export type CalendarEvent = {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  sdg_goals: number[];
  region: string | null;
  location: string | null;
  format: string;
  event_tier?: string;
};

type Props = {
  events: CalendarEvent[];
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  hoveredEventId?: string | null;
  onEventHover?: (id: string | null) => void;
  onEventClick?: (id: string) => void;
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function toUTCDateOnly(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function getSdgColor(sdgGoals: number[]): string {
  if (!sdgGoals || sdgGoals.length === 0) return SDG_FALLBACK;
  const first = sdgGoals[0];
  return SDG_COLORS[first] ?? SDG_FALLBACK;
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

export default function MonthCalendar({
  events,
  year,
  month,
  onMonthChange,
  hoveredEventId,
  onEventHover,
  onEventClick,
}: Props) {
  const calendarGrid = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);

    const cells: { day: number; currentMonth: boolean; utcDate: Date; isoKey: string }[] = [];
    const pushCell = (y: number, m: number, d: number, currentMonth: boolean) => {
      const utc = new Date(Date.UTC(y, m, d));
      cells.push({
        day: d,
        currentMonth,
        utcDate: utc,
        isoKey: utc.toISOString().slice(0, 10),
      });
    };

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const y = month === 0 ? year - 1 : year;
      const m = month === 0 ? 11 : month - 1;
      pushCell(y, m, d, false);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      pushCell(year, month, d, true);
    }
    let nextDay = 1;
    while (cells.length < 42) {
      const y = month === 11 ? year + 1 : year;
      const m = month === 11 ? 0 : month + 1;
      pushCell(y, m, nextDay, false);
      nextDay++;
    }
    const weeks: typeof cells[] = [];
    for (let i = 0; i < 6; i++) weeks.push(cells.slice(i * 7, i * 7 + 7));
    return weeks;
  }, [year, month]);

  const eventBarsByWeek = useMemo(() => {
    return calendarGrid.map((week) => {
      const weekStart = week[0].utcDate;
      const weekEnd = week[6].utcDate;

      const bars = events
        .map((e) => {
          const eStart = toUTCDateOnly(e.start_date);
          const eEnd = e.end_date ? toUTCDateOnly(e.end_date) : eStart;
          if (eEnd < weekStart || eStart > weekEnd) return null;
          const startCol = Math.max(0, daysBetween(weekStart, eStart));
          const endCol = Math.min(6, daysBetween(weekStart, eEnd));
          return {
            ...e,
            startCol,
            endCol,
            span: endCol - startCol + 1,
            color: getSdgColor(e.sdg_goals),
            row: 0,
          };
        })
        .filter(Boolean) as Array<CalendarEvent & { startCol: number; endCol: number; span: number; color: string; row: number }>;

      const rows: typeof bars[] = [];
      bars.forEach((bar) => {
        let placed = false;
        for (let r = 0; r < rows.length; r++) {
          if (rows[r].every((b) => bar.startCol > b.endCol || bar.endCol < b.startCol)) {
            rows[r].push(bar);
            bar.row = r;
            placed = true;
            break;
          }
        }
        if (!placed) {
          rows.push([bar]);
          bar.row = rows.length - 1;
        }
      });

      const visibleBars = bars.filter((b) => b.row < MAX_VISIBLE_ROWS_PER_WEEK);
      const hiddenBars = bars.filter((b) => b.row >= MAX_VISIBLE_ROWS_PER_WEEK);

      const overflowByCol: Record<number, number> = {};
      hiddenBars.forEach((b) => {
        for (let c = b.startCol; c <= b.endCol; c++) {
          overflowByCol[c] = (overflowByCol[c] ?? 0) + 1;
        }
      });

      return { visibleBars, overflowByCol, week };
    });
  }, [calendarGrid, events]);

  const changeMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 0) { newMonth = 11; newYear -= 1; }
    else if (newMonth > 11) { newMonth = 0; newYear += 1; }
    onMonthChange(newYear, newMonth);
  };

  const goToday = () => {
    const today = new Date();
    onMonthChange(today.getFullYear(), today.getMonth());
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 overflow-visible">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <h3 className="text-xl font-bold text-blue-900 uppercase tracking-wide">
          {MONTH_NAMES[month]} {year}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="p-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="p-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" role="row">
        {DAY_NAMES_SHORT.map((d, i) => (
          <div key={i} className="px-2 py-2 text-center text-sm font-medium text-slate-700 dark:text-slate-200" role="columnheader">
            {d}
          </div>
        ))}
      </div>

      <div role="grid" aria-label={`Events calendar for ${MONTH_NAMES[month]} ${year}`}>
        {eventBarsByWeek.map((weekData, wi) => {
          const { visibleBars, overflowByCol, week } = weekData;
          const maxRow = visibleBars.reduce((m, b) => Math.max(m, b.row), -1);
          const rowHeight = 16;
          const baseHeight = 60;
          const hasOverflow = Object.keys(overflowByCol).length > 0;
          const overflowRowHeight = hasOverflow ? 18 : 0;
          const weekHeight = baseHeight + (maxRow + 1) * rowHeight + overflowRowHeight + 6;

          return (
            <div
              key={wi}
              className="relative border-b border-slate-200 dark:border-slate-700 last:border-b-0"
              style={{ minHeight: weekHeight }}
              role="row"
            >
              <div className="grid grid-cols-7 h-full">
                {week.map((cell, di) => (
                  <div
                    key={di}
                    role="gridcell"
                    className={`px-2 py-1.5 text-sm border-r border-slate-100 dark:border-slate-800 last:border-r-0 ${
                      cell.currentMonth ? 'text-slate-900 dark:text-slate-100' : 'text-slate-300'
                    }`}
                  >
                    {cell.day}
                  </div>
                ))}
              </div>

              <div className="absolute inset-x-0 top-7 pointer-events-none">
                {visibleBars.map((bar, bi) => {
                  const leftPct = (bar.startCol / 7) * 100;
                  const widthPct = (bar.span / 7) * 100;
                  const top = bar.row * rowHeight;
                  const isHovered = hoveredEventId === bar.id;
                  return (
                    <React.Fragment key={`${bar.id}-${bi}`}>
                      <button
                        type="button"
                        onMouseEnter={() => onEventHover?.(bar.id)}
                        onMouseLeave={() => onEventHover?.(null)}
                        onFocus={() => onEventHover?.(bar.id)}
                        onBlur={() => onEventHover?.(null)}
                        onClick={() => onEventClick?.(bar.id)}
                        aria-label={`${bar.title}. Click for details.`}
                        className="absolute h-3 rounded-sm cursor-pointer pointer-events-auto transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 p-0 border-0"
                        style={{
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                          top: `${top}px`,
                          backgroundColor: bar.color,
                          opacity: isHovered ? 1 : 0.92,
                          transform: isHovered ? 'scaleY(1.2)' : 'scaleY(1)',
                          boxShadow: isHovered ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
                          zIndex: isHovered ? 10 : 1,
                        }}
                      />
                      {isHovered && (
                        <div
                          className="absolute w-60 max-w-xs bg-white dark:bg-slate-800 shadow-lg rounded-md border border-slate-200 dark:border-slate-700 p-3 z-50 pointer-events-none whitespace-normal"
                          style={{
                            left: `calc(${leftPct}% + 2px)`,
                            top: `${top + 18}px`,
                          }}
                        >
                          <div className="font-bold text-blue-900 text-sm leading-snug mb-1">
                            {bar.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 dark:dark:text-slate-500">
                            {formatDateRange(bar.start_date, bar.end_date)}
                            {bar.location ? ` | ${bar.location}` : ''}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {hasOverflow && (
                  <div
                    className="absolute inset-x-0"
                    style={{ top: `${(maxRow + 1) * rowHeight}px` }}
                  >
                    {Object.entries(overflowByCol).map(([col, count]) => {
                      const c = Number(col);
                      const leftPct = (c / 7) * 100;
                      const widthPct = (1 / 7) * 100;
                      const cell = week[c];
                      return (
                        <Link
                          key={col}
                          href={`/events?view=calendar&date=${cell.isoKey}`}
                          className="absolute h-4 rounded-sm text-[10px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 hover:bg-slate-300 pointer-events-auto flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                          style={{
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                          }}
                          aria-label={`${count} more events on ${cell.isoKey}`}
                        >
                          +{count} more
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { SDG_COLORS, SDG_FALLBACK };
