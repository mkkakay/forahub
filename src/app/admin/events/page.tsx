import Link from 'next/link'
import { adminSupabase } from '@/lib/supabase/admin'
import EventsTable from '@/components/admin/EventsTable'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; page?: string }
}) {
  const status = searchParams.status ?? 'all'
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const PAGE_SIZE = 50
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = adminSupabase
    .from('events')
    .select('id,title,organization,start_date,end_date,event_type,format,status,confidence_score,quality_score,source_id,is_featured,sdg_goals,location,registration_url,description,is_side_event,region,cost_type,language', { count: 'exact' })
    .order('start_date', { ascending: true })
    .range(from, to)

  if (status !== 'all') query = query.eq('status', status)

  const { data: events, count } = await query

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Events</h1>
          <p className="text-blue-400 text-sm mt-0.5">{count ?? 0} total</p>
        </div>
        <Link
          href="/admin/events/new"
          className="flex items-center gap-2 bg-[#4ea8de] hover:bg-[#3a95cc] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Add Event
        </Link>
      </div>

      <EventsTable
        initialEvents={events ?? []}
        totalCount={count ?? 0}
        currentPage={page}
        pageSize={PAGE_SIZE}
        currentStatus={status}
      />
    </div>
  )
}
