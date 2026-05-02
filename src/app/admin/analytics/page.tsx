import { adminSupabase } from '@/lib/supabase/admin'
import AnalyticsCharts from '@/components/admin/AnalyticsCharts'

export const dynamic = 'force-dynamic'

type MonthPoint = { month: string; count: number }

function groupByMonth(dates: string[], monthsBack = 6): MonthPoint[] {
  const buckets: Record<string, number> = {}
  const now = new Date()
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets[`${d.toLocaleString('en-US', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`] = 0
  }
  for (const dateStr of dates) {
    const d = new Date(dateStr)
    const key = `${d.toLocaleString('en-US', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`
    if (key in buckets) buckets[key]++
  }
  return Object.entries(buckets).map(([month, count]) => ({ month, count }))
}

export default async function AdminAnalyticsPage() {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const since = sixMonthsAgo.toISOString()

  const [
    { data: profiles },
    { data: events },
    { data: saves },
    { data: proCount },
    { data: totalProfiles },
  ] = await Promise.all([
    adminSupabase.from('profiles').select('created_at').gte('created_at', since),
    adminSupabase.from('events').select('created_at, status, sdg_goals').gte('created_at', since),
    adminSupabase.from('saved_events').select('event_id'),
    adminSupabase.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_tier', 'pro'),
    adminSupabase.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  const signupsByMonth  = groupByMonth((profiles ?? []).map(p => p.created_at))
  const eventsByMonth   = groupByMonth((events ?? []).map(e => e.created_at))

  // Most saved events
  const saveCounts: Record<string, number> = {}
  for (const s of saves ?? []) saveCounts[s.event_id] = (saveCounts[s.event_id] ?? 0) + 1

  const topEventIds = Object.entries(saveCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id]) => id)

  let topSavedEvents: { id: string; title: string; saves: number }[] = []
  if (topEventIds.length > 0) {
    const { data: topData } = await adminSupabase
      .from('events')
      .select('id, title')
      .in('id', topEventIds)
    topSavedEvents = (topData ?? []).map(e => ({ id: e.id, title: e.title, saves: saveCounts[e.id] ?? 0 }))
      .sort((a, b) => b.saves - a.saves)
  }

  // SDG distribution
  const sdgCounts: Record<number, number> = {}
  for (const e of events ?? []) {
    for (const goal of (e.sdg_goals ?? [])) {
      sdgCounts[goal] = (sdgCounts[goal] ?? 0) + 1
    }
  }
  const sdgData = Object.entries(sdgCounts)
    .map(([goal, count]) => ({ goal: `SDG ${goal}`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Conversion rate
  const total = (totalProfiles as unknown as { count: number })?.count ?? 0
  const pro = (proCount as unknown as { count: number })?.count ?? 0
  const conversionRate = total > 0 ? Math.round((pro / total) * 100 * 10) / 10 : 0

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Analytics</h1>
        <p className="text-blue-400 text-sm mt-0.5">Last 6 months · live data</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pro Conversion', value: `${conversionRate}%`, sub: `${pro} of ${total} users` },
          { label: 'Total Saves', value: Object.values(saveCounts).reduce((a, b) => a + b, 0).toLocaleString(), sub: 'across all events' },
          { label: 'Events (6mo)', value: (events ?? []).length.toLocaleString(), sub: `${(events ?? []).filter(e => e.status === 'published').length} published` },
          { label: 'Signups (6mo)', value: (profiles ?? []).length.toLocaleString(), sub: 'new accounts' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-[#0d2240] border border-blue-900/40 rounded-xl p-4">
            <p className="text-blue-400 text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
            <p className="text-white text-2xl font-bold">{value}</p>
            <p className="text-blue-500 text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <AnalyticsCharts
        signupsByMonth={signupsByMonth}
        eventsByMonth={eventsByMonth}
        topSavedEvents={topSavedEvents}
        sdgData={sdgData}
      />
    </div>
  )
}
