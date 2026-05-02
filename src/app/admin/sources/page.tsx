import { adminSupabase } from '@/lib/supabase/admin'
import SourcesTable from '@/components/admin/SourcesTable'

export const dynamic = 'force-dynamic'

export default async function AdminSourcesPage() {
  const { data: sources } = await adminSupabase
    .from('sources')
    .select('id, organization, url, scrape_method, scrape_frequency, primary_sdg_goals, region, last_scraped_at, consecutive_failures, needs_attention, total_events_found, is_active')
    .order('needs_attention', { ascending: false })
    .order('organization')

  // Get per-source event counts (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data: recentEvents } = await adminSupabase
    .from('events')
    .select('source_id')
    .gte('created_at', thirtyDaysAgo)

  const recentCounts: Record<string, number> = {}
  for (const e of recentEvents ?? []) {
    if (e.source_id) recentCounts[e.source_id] = (recentCounts[e.source_id] ?? 0) + 1
  }

  const enriched = (sources ?? []).map(s => ({
    ...s,
    recent_events: recentCounts[s.id] ?? 0,
  }))

  const attentionCount = enriched.filter(s => s.needs_attention).length
  const activeCount    = enriched.filter(s => s.is_active).length

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Sources</h1>
        <p className="text-blue-400 text-sm mt-0.5">
          {activeCount} active of {enriched.length} sources
          {attentionCount > 0 && <span className="text-amber-400 ml-2">· {attentionCount} need attention</span>}
        </p>
      </div>
      <SourcesTable sources={enriched} />
    </div>
  )
}
