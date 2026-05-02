'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'

type MonthPoint = { month: string; count: number }
type SavedEvent = { id: string; title: string; saves: number }
type SdgPoint   = { goal: string; count: number }

const TOOLTIP_STYLE = {
  backgroundColor: '#0d2240',
  border: '1px solid rgba(78,168,222,0.2)',
  borderRadius: '8px',
  color: '#93c5fd',
  fontSize: 12,
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl p-5">
      <h3 className="text-white font-semibold text-sm mb-4">{title}</h3>
      {children}
    </div>
  )
}

export default function AnalyticsCharts({
  signupsByMonth,
  eventsByMonth,
  topSavedEvents,
  sdgData,
}: {
  signupsByMonth: MonthPoint[]
  eventsByMonth:  MonthPoint[]
  topSavedEvents: SavedEvent[]
  sdgData:        SdgPoint[]
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Signups over time */}
      <ChartCard title="New Signups (last 6 months)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={signupsByMonth} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,100,0.6)" />
            <XAxis dataKey="month" tick={{ fill: '#4b6fa0', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#4b6fa0', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#93c5fd' }} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#4ea8de"
              strokeWidth={2}
              dot={{ fill: '#4ea8de', r: 3 }}
              activeDot={{ r: 5 }}
              name="Signups"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Events over time */}
      <ChartCard title="Events Added (last 6 months)">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={eventsByMonth} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,100,0.6)" />
            <XAxis dataKey="month" tick={{ fill: '#4b6fa0', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#4b6fa0', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#93c5fd' }} />
            <Bar dataKey="count" fill="#4ea8de" radius={[4, 4, 0, 0]} name="Events" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Most saved events */}
      <ChartCard title="Most Saved Events">
        {topSavedEvents.length === 0 ? (
          <p className="text-blue-500 text-sm text-center py-8">No save data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={topSavedEvents.length * 36 + 20}>
            <BarChart
              data={topSavedEvents.map(e => ({ name: e.title.length > 40 ? e.title.slice(0, 40) + '…' : e.title, saves: e.saves }))}
              layout="vertical"
              margin={{ top: 0, right: 8, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,100,0.6)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#4b6fa0', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fill: '#93c5fd', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="saves" fill="#4ea8de" radius={[0, 4, 4, 0]} name="Saves" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* SDG distribution */}
      <ChartCard title="Events by SDG Goal (last 6 months)">
        {sdgData.length === 0 ? (
          <p className="text-blue-500 text-sm text-center py-8">No SDG data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sdgData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,100,0.6)" />
              <XAxis dataKey="goal" tick={{ fill: '#4b6fa0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4b6fa0', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#93c5fd' }} />
              <Bar dataKey="count" fill="#4ea8de" radius={[4, 4, 0, 0]} name="Events" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Search tracking placeholder */}
      <div className="lg:col-span-2 bg-[#0d2240] border border-blue-900/40 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-2">Most Searched Terms</h3>
        <p className="text-blue-500 text-sm">
          Search term tracking requires a search-log table. Add a server action to
          log search queries to a <code className="text-[#4ea8de] text-xs bg-blue-900/30 px-1 py-0.5 rounded">search_logs</code> table,
          then this chart will populate automatically.
        </p>
      </div>
    </div>
  )
}
