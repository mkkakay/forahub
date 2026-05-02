'use client'

import { useRef, useState, useTransition } from 'react'
import { createEvent } from '@/app/admin/actions'

const SDG_GOALS = Array.from({ length: 17 }, (_, i) => i + 1)
const SDG_LABELS: Record<number, string> = {
  1:'No Poverty',2:'Zero Hunger',3:'Good Health & Well-being',4:'Quality Education',
  5:'Gender Equality',6:'Clean Water & Sanitation',7:'Affordable Clean Energy',
  8:'Decent Work & Economic Growth',9:'Industry, Innovation & Infrastructure',
  10:'Reduced Inequalities',11:'Sustainable Cities',12:'Responsible Consumption',
  13:'Climate Action',14:'Life Below Water',15:'Life on Land',
  16:'Peace, Justice & Strong Institutions',17:'Partnerships for the Goals',
}

export default function AddEventForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedSdgs, setSelectedSdgs] = useState<number[]>([3])
  const [isFeatured, setIsFeatured] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggleSdg(n: number) {
    setSelectedSdgs(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b)
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (selectedSdgs.length === 0) { setError('Select at least one SDG goal.'); return }
    const fd = new FormData(formRef.current!)
    fd.set('sdg_goals', selectedSdgs.join(','))
    fd.set('is_featured', String(isFeatured))
    startTransition(async () => {
      try {
        await createEvent(fd)
      } catch (err) {
        setError(String(err))
      }
    })
  }

  const inputCls = 'w-full bg-[#0a1929] border border-blue-900/60 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#4ea8de] placeholder-blue-700'
  const labelCls = 'block text-blue-400 text-xs font-medium mb-1.5'

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className={labelCls}>Title *</label>
        <input name="title" required className={inputCls} placeholder="World Health Summit 2027" />
      </div>

      {/* Org + Location row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Organization</label>
          <input name="organization" className={inputCls} placeholder="WHO" />
        </div>
        <div>
          <label className={labelCls}>Location</label>
          <input name="location" className={inputCls} placeholder="Geneva, Switzerland" />
        </div>
      </div>

      {/* Date row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Start Date *</label>
          <input name="start_date" type="datetime-local" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>End Date</label>
          <input name="end_date" type="datetime-local" className={inputCls} />
        </div>
      </div>

      {/* Type + Format row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Event Type *</label>
          <select name="event_type" defaultValue="conference" className={inputCls}>
            <option value="conference">Conference</option>
            <option value="side_event">Side Event</option>
            <option value="webinar">Webinar</option>
            <option value="training">Training</option>
            <option value="consultation">Consultation</option>
            <option value="summit">Summit</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Format *</label>
          <select name="format" defaultValue="in_person" className={inputCls}>
            <option value="in_person">In Person</option>
            <option value="virtual">Virtual</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
      </div>

      {/* Registration URL */}
      <div>
        <label className={labelCls}>Registration URL</label>
        <input name="registration_url" type="url" className={inputCls} placeholder="https://..." />
      </div>

      {/* SDG Goals */}
      <div>
        <label className={labelCls}>SDG Goals * <span className="text-blue-600 font-normal">({selectedSdgs.length} selected)</span></label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {SDG_GOALS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => toggleSdg(n)}
              className={`text-left px-2.5 py-2 rounded-lg text-xs transition-colors border ${
                selectedSdgs.includes(n)
                  ? 'bg-[#4ea8de]/20 border-[#4ea8de]/50 text-[#4ea8de]'
                  : 'bg-[#0a1929] border-blue-900/60 text-blue-500 hover:text-blue-300 hover:border-blue-700'
              }`}
            >
              <span className="font-bold">{n}</span>
              <span className="block text-[10px] leading-tight mt-0.5 opacity-80">{SDG_LABELS[n]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>Description</label>
        <textarea name="description" rows={4} className={`${inputCls} resize-none`} placeholder="Event overview…" />
      </div>

      {/* Featured toggle */}
      <div className="flex items-center gap-3 py-1">
        <button
          type="button"
          onClick={() => setIsFeatured(!isFeatured)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isFeatured ? 'bg-[#4ea8de]' : 'bg-blue-900/60'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isFeatured ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <label className="text-blue-300 text-sm">Feature this event on the homepage</label>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
        >
          {pending ? 'Saving…' : 'Publish Event'}
        </button>
        <a href="/admin/events" className="text-blue-400 hover:text-white text-sm transition-colors">Cancel</a>
      </div>
    </form>
  )
}
