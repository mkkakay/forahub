'use client'

import { useState, useTransition } from 'react'
import { publishEvent, rejectEvent, updateEvent } from '@/app/admin/actions'
import { CheckCircle, XCircle, Edit, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

type PendingEvent = {
  id: string; title: string; description: string | null; organization: string | null
  start_date: string; end_date: string | null; location: string | null
  event_type: string; format: string; registration_url: string | null
  sdg_goals: number[]; confidence_score: number | null; quality_score: number | null
  source_url: string | null; source_id: string | null; is_side_event: boolean
  parent_conference_name: string | null; is_recurring: boolean; series_name: string | null
  region: string | null; cost_type: string | null; audience_level: string | null
  speakers: string[] | null; language: string; event_brief: string | null
  sdg_inferred: boolean
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (!score) return null
  const colors = score >= 4 ? 'bg-green-400/10 text-green-400 border-green-400/20'
    : score === 3 ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
    : 'bg-red-400/10 text-red-400 border-red-400/20'
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors}`}>Confidence {score}/5</span>
}

function QualityBadge({ score }: { score: number | null }) {
  if (!score) return null
  const colors = score >= 3 ? 'bg-blue-400/10 text-blue-400 border-blue-400/20'
    : 'bg-blue-800/30 text-blue-500 border-blue-700/30'
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors}`}>Quality {score}/5</span>
}

function ReviewCard({ event, onDone }: { event: PendingEvent; onDone: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(event.title)
  const [editDesc, setEditDesc] = useState(event.description ?? '')
  const [editOrg, setEditOrg] = useState(event.organization ?? '')
  const [editLoc, setEditLoc] = useState(event.location ?? '')
  const [editRegUrl, setEditRegUrl] = useState(event.registration_url ?? '')
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  if (done) return null

  const doAction = (fn: () => Promise<void>) =>
    startTransition(async () => { await fn(); setDone(true); onDone() })

  async function saveAndApprove() {
    await updateEvent(event.id, {
      title: editTitle, description: editDesc || null,
      organization: editOrg || null, location: editLoc || null,
      registration_url: editRegUrl || null,
    })
    await publishEvent(event.id)
    setDone(true)
    onDone()
  }

  const inputCls = 'w-full bg-[#0a1929] border border-blue-900/60 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#4ea8de]'

  return (
    <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input className={inputCls} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            ) : (
              <h3 className="text-white font-semibold text-base leading-snug">{event.title}</h3>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <ConfidenceBadge score={event.confidence_score} />
              <QualityBadge score={event.quality_score} />
              {event.sdg_inferred && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400 border border-purple-400/20">SDGs inferred</span>
              )}
              {event.cost_type === 'free' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-400/10 text-teal-400 border border-teal-400/20">FREE</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setEditing(!editing)}
              className={`p-2 rounded-lg text-blue-400 hover:text-white transition-colors ${editing ? 'bg-blue-400/10' : 'hover:bg-blue-900/30'}`}
              title="Edit"
            >
              <Edit size={15} />
            </button>
            <button
              onClick={() => doAction(() => rejectEvent(event.id))}
              disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-400/10 text-xs font-medium transition-colors disabled:opacity-40"
            >
              <XCircle size={13} /> Reject
            </button>
            <button
              onClick={() => editing ? startTransition(saveAndApprove) : doAction(() => publishEvent(event.id))}
              disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-400/10 hover:bg-green-400/20 text-green-400 text-xs font-medium transition-colors disabled:opacity-40"
            >
              <CheckCircle size={13} /> {editing ? 'Save & Approve' : 'Approve'}
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-blue-400">
          {event.organization && <span>🏢 {event.organization}</span>}
          <span>📅 {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{event.end_date ? ` — ${new Date(event.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</span>
          {event.location && <span>📍 {event.location}</span>}
          {event.region && <span>🌍 {event.region}</span>}
          <span>🎭 {event.event_type} · {event.format}</span>
          {event.sdg_goals?.length > 0 && <span>🎯 SDG {event.sdg_goals.join(', ')}</span>}
        </div>
      </div>

      {/* Editing fields */}
      {editing && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-3 border-t border-blue-900/30 pt-4">
          <div>
            <label className="text-blue-500 text-xs mb-1 block">Organization</label>
            <input className={inputCls} value={editOrg} onChange={e => setEditOrg(e.target.value)} />
          </div>
          <div>
            <label className="text-blue-500 text-xs mb-1 block">Location</label>
            <input className={inputCls} value={editLoc} onChange={e => setEditLoc(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-blue-500 text-xs mb-1 block">Registration URL</label>
            <input className={inputCls} value={editRegUrl} onChange={e => setEditRegUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="col-span-2">
            <label className="text-blue-500 text-xs mb-1 block">Description</label>
            <textarea className={`${inputCls} h-20 resize-none`} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
          </div>
        </div>
      )}

      {/* Expandable details */}
      <div className="border-t border-blue-900/30">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-blue-500 hover:text-blue-300 text-xs transition-colors"
        >
          <span>View extracted data</span>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 text-xs">
            {event.description && (
              <div>
                <p className="text-blue-500 mb-1">Description</p>
                <p className="text-blue-200 leading-relaxed">{event.description}</p>
              </div>
            )}
            {event.event_brief && (
              <div>
                <p className="text-blue-500 mb-1">Auto-generated brief</p>
                <p className="text-blue-300 leading-relaxed italic">{event.event_brief}</p>
              </div>
            )}
            {event.speakers && event.speakers.length > 0 && (
              <div>
                <p className="text-blue-500 mb-1">Speakers</p>
                <p className="text-blue-300">{event.speakers.join(' · ')}</p>
              </div>
            )}
            {event.source_url && (
              <div className="flex items-center gap-2">
                <p className="text-blue-500">Source:</p>
                <a href={event.source_url} target="_blank" rel="noopener noreferrer" className="text-[#4ea8de] hover:underline flex items-center gap-1">
                  {new URL(event.source_url).hostname} <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReviewQueue({ events }: { events: PendingEvent[] }) {
  const [list] = useState(events)
  const approved = 0
  const rejected = 0

  if (list.length === 0) {
    return (
      <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl p-12 text-center">
        <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
        <p className="text-white font-semibold">All caught up!</p>
        <p className="text-blue-400 text-sm mt-1">No pending events to review.</p>
        {(approved + rejected) > 0 && (
          <p className="text-blue-500 text-xs mt-3">This session: {approved} approved · {rejected} rejected</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-blue-500">
        <span>{list.length} remaining</span>
        {approved > 0 && <span className="text-green-400">✓ {approved} approved</span>}
        {rejected > 0 && <span className="text-red-400">✗ {rejected} rejected</span>}
      </div>
      {list.map(ev => (
        <ReviewCard
          key={ev.id}
          event={ev}
          onDone={() => {}}
        />
      ))}
    </div>
  )
}
