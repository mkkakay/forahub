'use client'

import { useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { publishEvent, rejectEvent, deleteEvent, updateEvent } from '@/app/admin/actions'
import { CheckCircle, XCircle, Trash2, Edit, ExternalLink, ChevronLeft, ChevronRight, Search } from 'lucide-react'

type EventRow = {
  id: string; title: string; organization: string | null; start_date: string
  event_type: string; format: string; status: string
  confidence_score: number | null; quality_score: number | null
  source_id: string | null; is_featured: boolean; sdg_goals: number[]
  location: string | null; registration_url: string | null
  description: string | null; is_side_event: boolean; region: string | null
  cost_type: string | null; language: string; end_date: string | null
}

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-400/10 text-green-400 border-green-400/20',
  pending:   'bg-amber-400/10 text-amber-400 border-amber-400/20',
  rejected:  'bg-red-400/10  text-red-400  border-red-400/20',
}

const SDG_LABELS: Record<number, string> = {
  1:'No Poverty',2:'Zero Hunger',3:'Good Health',4:'Quality Education',5:'Gender Equality',
  6:'Clean Water',7:'Clean Energy',8:'Decent Work',9:'Industry',10:'Reduced Inequalities',
  11:'Sustainable Cities',12:'Responsible Consumption',13:'Climate Action',14:'Life Below Water',
  15:'Life on Land',16:'Peace & Justice',17:'Partnerships',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status] ?? 'bg-blue-400/10 text-blue-400 border-blue-400/20'}`}>
      {status}
    </span>
  )
}

function ScoreDot({ score, max = 5 }: { score: number | null; max?: number }) {
  if (score === null) return <span className="text-blue-600 text-xs">—</span>
  const pct = score / max
  const color = pct >= 0.8 ? 'text-green-400' : pct >= 0.5 ? 'text-amber-400' : 'text-red-400'
  return <span className={`text-xs font-bold tabular-nums ${color}`}>{score}/{max}</span>
}

type EditState = {
  id: string; title: string; organization: string; description: string
  start_date: string; end_date: string; location: string; registration_url: string
  event_type: string; format: string; is_featured: boolean; sdg_goals: number[]
}

function EditModal({ event, onClose }: { event: EditState; onClose: () => void }) {
  const [form, setForm] = useState(event)
  const [pending, startTransition] = useTransition()
  const [sdgInput, setSdgInput] = useState(event.sdg_goals.join(', '))

  function set(k: keyof typeof form, v: unknown) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function handleSave() {
    startTransition(async () => {
      const sdgs = sdgInput.split(',').map(s => parseInt(s.trim())).filter(n => n >= 1 && n <= 17)
      await updateEvent(form.id, {
        title: form.title,
        organization: form.organization || null,
        description: form.description || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        location: form.location || null,
        registration_url: form.registration_url || null,
        event_type: form.event_type,
        format: form.format,
        is_featured: form.is_featured,
        sdg_goals: sdgs,
      })
      onClose()
    })
  }

  const inputCls = 'w-full bg-[#0a1929] border border-blue-900/60 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#4ea8de] placeholder-blue-700'
  const labelCls = 'block text-blue-400 text-xs font-medium mb-1'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-blue-900/40">
          <h3 className="text-white font-semibold">Edit Event</h3>
          <button onClick={onClose} className="text-blue-400 hover:text-white text-xl">×</button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Title *</label>
            <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Organization</label>
            <input className={inputCls} value={form.organization} onChange={e => set('organization', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input className={inputCls} value={form.location} onChange={e => set('location', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Start Date *</label>
            <input type="datetime-local" className={inputCls} value={form.start_date?.slice(0, 16)} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>End Date</label>
            <input type="datetime-local" className={inputCls} value={form.end_date?.slice(0, 16) ?? ''} onChange={e => set('end_date', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Event Type</label>
            <select className={inputCls} value={form.event_type} onChange={e => set('event_type', e.target.value)}>
              {['conference','side_event','webinar','training','consultation','summit'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Format</label>
            <select className={inputCls} value={form.format} onChange={e => set('format', e.target.value)}>
              {['in_person','virtual','hybrid'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Registration URL</label>
            <input className={inputCls} value={form.registration_url} onChange={e => set('registration_url', e.target.value)} placeholder="https://..." />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>SDG Goals (comma-separated numbers, 1–17)</label>
            <input className={inputCls} value={sdgInput} onChange={e => setSdgInput(e.target.value)} placeholder="3, 17, 1" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Description</label>
            <textarea className={`${inputCls} h-24 resize-none`} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <input type="checkbox" id="featured" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} className="w-4 h-4 accent-[#4ea8de]" />
            <label htmlFor="featured" className="text-blue-300 text-sm">Featured event</label>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-blue-900/40">
          <button onClick={handleSave} disabled={pending} className="bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
            {pending ? 'Saving…' : 'Save Changes'}
          </button>
          <button onClick={onClose} className="bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 text-sm px-5 py-2.5 rounded-lg transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function EventsTable({
  initialEvents, totalCount, currentPage, pageSize, currentStatus,
}: {
  initialEvents: EventRow[]; totalCount: number; currentPage: number
  pageSize: number; currentStatus: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [editTarget, setEditTarget] = useState<EditState | null>(null)
  const [pending, startTransition] = useTransition()

  const totalPages = Math.ceil(totalCount / pageSize)

  const filteredEvents = search.trim()
    ? initialEvents.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.organization ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : initialEvents

  function setStatus(s: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('status', s)
    p.delete('page')
    router.push(`/admin/events?${p.toString()}`)
  }

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`/admin/events?${params.toString()}`)
  }

  const doPublish = useCallback((id: string) => startTransition(() => publishEvent(id)), [])
  const doReject  = useCallback((id: string) => startTransition(() => rejectEvent(id)),  [])
  const doDelete  = useCallback((id: string) => {
    if (!confirm('Delete this event? This cannot be undone.')) return
    startTransition(() => deleteEvent(id))
  }, [])

  return (
    <>
      {editTarget && <EditModal event={editTarget} onClose={() => setEditTarget(null)} />}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
          <input
            type="text"
            placeholder="Search title or org…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#0a1929] border border-blue-900/60 text-white text-sm rounded-lg pl-8 pr-4 py-2 w-56 focus:outline-none focus:border-[#4ea8de] placeholder-blue-700"
          />
        </div>

        <div className="flex gap-1">
          {['all', 'published', 'pending', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentStatus === s
                  ? 'bg-[#4ea8de] text-white'
                  : 'bg-[#0a1929] border border-blue-900/60 text-blue-300 hover:text-white'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <Link href="/admin/events/new" className="ml-auto text-xs text-[#4ea8de] hover:underline">
          + New event
        </Link>
      </div>

      {/* Table */}
      <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-900/40">
                {['Title', 'Org', 'Date', 'Type', 'Status', 'C/Q', 'Actions'].map(h => (
                  <th key={h} className="text-left text-blue-500 text-xs font-medium uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/20">
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-blue-500 py-12 text-sm">No events found</td>
                </tr>
              )}
              {filteredEvents.map(ev => (
                <tr key={ev.id} className="hover:bg-blue-900/10 transition-colors">
                  <td className="px-4 py-3 max-w-[240px]">
                    <p className="text-white font-medium truncate">{ev.title}</p>
                    {ev.is_side_event && <span className="text-blue-500 text-xs">↳ side event</span>}
                  </td>
                  <td className="px-4 py-3 text-blue-300 truncate max-w-[120px]">{ev.organization ?? '—'}</td>
                  <td className="px-4 py-3 text-blue-300 whitespace-nowrap">
                    {new Date(ev.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-blue-400 text-xs">{ev.event_type}</td>
                  <td className="px-4 py-3"><StatusBadge status={ev.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ScoreDot score={ev.confidence_score} /> <span className="text-blue-700 text-xs">/</span> <ScoreDot score={ev.quality_score} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {ev.status !== 'published' && (
                        <button onClick={() => doPublish(ev.id)} disabled={pending} title="Publish" className="p-1.5 rounded hover:bg-green-400/10 text-green-400 hover:text-green-300 transition-colors">
                          <CheckCircle size={14} />
                        </button>
                      )}
                      {ev.status !== 'rejected' && (
                        <button onClick={() => doReject(ev.id)} disabled={pending} title="Reject" className="p-1.5 rounded hover:bg-red-400/10 text-red-400 hover:text-red-300 transition-colors">
                          <XCircle size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setEditTarget({
                          id: ev.id, title: ev.title, organization: ev.organization ?? '',
                          description: ev.description ?? '', start_date: ev.start_date,
                          end_date: ev.end_date ?? '', location: ev.location ?? '',
                          registration_url: ev.registration_url ?? '', event_type: ev.event_type,
                          format: ev.format, is_featured: ev.is_featured, sdg_goals: ev.sdg_goals ?? [],
                        })}
                        title="Edit"
                        className="p-1.5 rounded hover:bg-blue-400/10 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      {ev.registration_url && (
                        <a href={ev.registration_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-blue-400/10 text-blue-600 hover:text-blue-400 transition-colors">
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button onClick={() => doDelete(ev.id)} disabled={pending} title="Delete" className="p-1.5 rounded hover:bg-red-400/10 text-red-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-blue-900/40">
            <p className="text-blue-500 text-xs">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded text-blue-400 hover:text-white disabled:opacity-30 hover:bg-blue-900/30">
                <ChevronLeft size={16} />
              </button>
              <span className="text-blue-400 text-xs px-2">{currentPage} / {totalPages}</span>
              <button onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 rounded text-blue-400 hover:text-white disabled:opacity-30 hover:bg-blue-900/30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      {/* SDG reference */}
      <details className="mt-4">
        <summary className="text-blue-500 text-xs cursor-pointer hover:text-blue-300">SDG reference</summary>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
          {Object.entries(SDG_LABELS).map(([n, l]) => (
            <span key={n} className="text-blue-600 text-xs">SDG {n}: {l}</span>
          ))}
        </div>
      </details>
    </>
  )
}
