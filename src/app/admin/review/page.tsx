import { adminSupabase } from '@/lib/supabase/admin'
import ReviewQueue from '@/components/admin/ReviewQueue'

export const dynamic = 'force-dynamic'

export default async function AdminReviewPage() {
  const { data: events, count } = await adminSupabase
    .from('events')
    .select(
      'id,title,description,organization,start_date,end_date,location,event_type,format,registration_url,sdg_goals,confidence_score,quality_score,source_url,source_id,is_side_event,parent_conference_name,is_recurring,series_name,region,cost_type,audience_level,speakers,language,event_brief,sdg_inferred',
      { count: 'exact' },
    )
    .eq('status', 'pending')
    .order('confidence_score', { ascending: false })
    .order('quality_score',    { ascending: false })
    .limit(100)

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Review Queue</h1>
        <p className="text-blue-400 text-sm mt-0.5">
          {count ?? 0} events pending review — sorted by confidence score
        </p>
      </div>
      <ReviewQueue events={events ?? []} />
    </div>
  )
}
