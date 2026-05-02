import Link from 'next/link'
import { adminSupabase } from '@/lib/supabase/admin'
import {
  CalendarDays, Users, TrendingUp, Star,
  AlertTriangle, Clock, CheckCircle, Radio,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const [
    { count: totalEvents },
    { count: pendingEvents },
    { count: publishedEvents },
    { count: proUsers },
    { count: foundingUsers },
    { count: freeUsers },
    { data: attentionSources },
    { data: recentRuns },
    { data: { users: allUsers } },
  ] = await Promise.all([
    adminSupabase.from('events').select('*', { count: 'exact', head: true }),
    adminSupabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    adminSupabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_tier', 'pro'),
    adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_tier', 'founding'),
    adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_tier', 'free'),
    adminSupabase.from('sources').select('id, organization, url, consecutive_failures, last_scraped_at').eq('needs_attention', true).eq('is_active', true).limit(5),
    adminSupabase.from('scraping_runs').select('source_id, events_inserted, events_found, started_at, error_message').order('started_at', { ascending: false }).limit(8),
    adminSupabase.auth.admin.listUsers({ page: 1, perPage: 8 }),
  ])

  const totalUsers = (freeUsers ?? 0) + (proUsers ?? 0) + (foundingUsers ?? 0)
  const mrr = (proUsers ?? 0) * (9.99 / 12)

  // Recent signups — sort by created_at desc
  const recentSignups = [...(allUsers ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)

  return {
    totalEvents: totalEvents ?? 0,
    pendingEvents: pendingEvents ?? 0,
    publishedEvents: publishedEvents ?? 0,
    proUsers: proUsers ?? 0,
    foundingUsers: foundingUsers ?? 0,
    totalUsers,
    mrr,
    attentionSources: attentionSources ?? [],
    recentRuns: recentRuns ?? [],
    recentSignups,
  }
}

function StatCard({
  label, value, sub, icon: Icon, accent = false,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; accent?: boolean
}) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? 'bg-[#0f2a4a] border-[#4ea8de]/30' : 'bg-[#0d2240] border-blue-900/40'}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-blue-400 text-xs font-medium uppercase tracking-wider">{label}</p>
        <Icon size={16} className={accent ? 'text-[#4ea8de]' : 'text-blue-600'} />
      </div>
      <p className="text-white text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-blue-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboard() {
  const d = await getDashboardData()

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <p className="text-blue-400 text-sm mt-1">ForaHub platform overview</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Published Events" value={d.publishedEvents.toLocaleString()} icon={CalendarDays} accent />
        <StatCard label="Pending Review"   value={d.pendingEvents}  sub="awaiting approval" icon={Clock} accent={d.pendingEvents > 0} />
        <StatCard label="Total Users"      value={d.totalUsers.toLocaleString()} icon={Users} />
        <StatCard label="Pro Subscribers"  value={d.proUsers} sub={`${d.foundingUsers} founding`} icon={Star} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Founding Members" value={d.foundingUsers} icon={Star} />
        <StatCard label="Monthly Revenue"  value={`$${d.mrr.toFixed(0)}`} sub="MRR (pro recurring)" icon={TrendingUp} accent />
        <StatCard label="Sources Active"   value={d.attentionSources.length > 0 ? `⚠ ${d.attentionSources.length} issues` : 'All OK'} icon={Radio} accent={d.attentionSources.length > 0} />
        <StatCard label="Total Events"     value={d.totalEvents.toLocaleString()} icon={CalendarDays} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sources needing attention */}
        <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              Sources Needing Attention
            </h2>
            <Link href="/admin/sources" className="text-[#4ea8de] text-xs hover:underline">
              View all →
            </Link>
          </div>
          {d.attentionSources.length === 0 ? (
            <div className="flex items-center gap-2 text-green-400 text-sm py-4">
              <CheckCircle size={15} />
              All sources healthy
            </div>
          ) : (
            <div className="space-y-2">
              {d.attentionSources.map((src: { id: string; organization: string; consecutive_failures: number; last_scraped_at: string | null }) => (
                <div key={src.id} className="flex items-center justify-between py-2 border-b border-blue-900/30 last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{src.organization}</p>
                    <p className="text-blue-500 text-xs">{src.consecutive_failures} consecutive failures</p>
                  </div>
                  <span className="text-amber-400 text-xs bg-amber-400/10 px-2 py-0.5 rounded-full">Needs attention</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent signups */}
        <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Users size={16} className="text-[#4ea8de]" />
              Recent Signups
            </h2>
            <Link href="/admin/users" className="text-[#4ea8de] text-xs hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-0">
            {d.recentSignups.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-blue-900/30 last:border-0">
                <p className="text-blue-200 text-sm truncate max-w-[200px]">{u.email}</p>
                <p className="text-blue-500 text-xs shrink-0 ml-2">
                  {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { href: '/admin/events/new', label: '+ Add Event' },
          { href: '/admin/review',     label: `Review (${d.pendingEvents})` },
          { href: '/admin/events',     label: 'Events' },
          { href: '/admin/users',      label: 'Users' },
          { href: '/admin/sources',    label: 'Sources' },
          { href: '/admin/analytics',  label: 'Analytics' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="bg-[#0f2a4a] border border-blue-900/40 hover:border-[#4ea8de]/40 hover:bg-[#1a3a5c] text-blue-300 hover:text-white text-sm font-medium px-4 py-3 rounded-lg text-center transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
