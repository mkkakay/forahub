'use client';

// Note: when used on the homepage, parent should render the title "Flagship Events This Month".
// When used on /events?view=calendar, no title needed — page header handles it.

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, List } from 'lucide-react';
import MonthCalendar, { SDG_COLORS, SDG_FALLBACK, type CalendarEvent } from './MonthCalendar';
import EventList from './EventList';

type Props = {
  events: CalendarEvent[];
  initialYear?: number;
  initialMonth?: number;
  showLegend?: boolean;
  mobileDefaultTab?: 'calendar' | 'list';
};

export default function CalendarSection({
  events,
  initialYear,
  initialMonth,
  showLegend = true,
  mobileDefaultTab = 'list',
}: Props) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState<number>(initialYear ?? now.getFullYear());
  const [month, setMonth] = useState<number>(initialMonth ?? now.getMonth());
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'calendar' | 'list'>(mobileDefaultTab);

  const handleEventClick = (id: string) => {
    router.push(`/events/${id}`);
  };

  const handleMonthChange = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
  };

  return (
    <div className="w-full">
      {/* Mobile tabs — hidden on lg+ */}
      <div className="lg:hidden mb-4 flex gap-2 bg-slate-100 p-1 rounded-md" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'list'}
          onClick={() => setMobileTab('list')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
            mobileTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <List size={14} /> List
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'calendar'}
          onClick={() => setMobileTab('calendar')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
            mobileTab === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarDays size={14} /> Calendar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Calendar — always visible on lg+, conditionally on mobile */}
        <div className={`lg:col-span-2 ${mobileTab === 'calendar' ? 'block' : 'hidden'} lg:block`}>
          <MonthCalendar
            events={events}
            year={year}
            month={month}
            onMonthChange={handleMonthChange}
            hoveredEventId={hoveredEventId}
            onEventHover={setHoveredEventId}
            onEventClick={handleEventClick}
          />
        </div>

        {/* List — always visible on lg+, conditionally on mobile */}
        <div className={`lg:col-span-1 ${mobileTab === 'list' ? 'block' : 'hidden'} lg:block`}>
          <EventList
            events={events}
            year={year}
            month={month}
            hoveredEventId={hoveredEventId}
            onEventHover={setHoveredEventId}
            onEventClick={handleEventClick}
          />
        </div>
      </div>

      {showLegend && (
        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600 justify-center">
          {Object.entries(SDG_COLORS).map(([num, color]) => (
            <div key={num} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <span>SDG {num}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SDG_FALLBACK }} />
            <span>Uncategorized</span>
          </div>
        </div>
      )}
    </div>
  );
}
