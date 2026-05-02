'use client'

import { useState, useTransition } from 'react'
import { toggleSourceActive, resetSourceFailures } from '@/app/admin/actions'
import { AlertTriangle, CheckCircle, RefreshCw, ExternalLink } from 'lucide-react'

type SourceRow = {
  id: string; organization: string; url: string; scrape_method: string
  scrape_frequency: string; primary_sdg_goals: number[]; region: string | null
  last_scraped_at: string | null; consecutive_failures: number
  needs_attention: boolean; total_events_found: number; is_active: boolean
  recent_events: number
}

const FREQ_COLORS: Record<string, string> = {
  hourly: 'text-[#4ea8de]',
  daily:  'text-green-400',
  weekly: 'text-blue-500',
}

function ToggleSwitch({ sourceId, isActive }: { sourceId: string; isActive: boolean }) {
  const [active, setActive] = useState(isActive)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !active
    setActive(next)
    startTransition(() => toggleSourceActive(sourceId, next))
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${active ? 'bg-[#4ea8de]' : 'bg-blue-900/60'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function SourcesTable({ sources }: { sources: SourceRow[] }) {
  const [filter, setFilter] = useState<'all' | 'attention' | 'inactive'>('all')
  const [pending, startTransition] = useTransition()

  const filtered = sources.filter(s => {
    if (filter === 'attention') return s.needs_attention
    if (filter === 'inactive')  return !s.is_active
    return true
  })

  function doReset(id: string) {
    startTransition(() => resetSourceFailures(id))
  }

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {(['all', 'attention', 'inactive'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f ? 'bg-[#4ea8de] text-white' : 'bg-[#0a1929] border border-blue-900/60 text-blue-300 hover:text-white'
            }`}
          >
            {f === 'all' ? `All (${sources.length})` : f === 'attention' ? `⚠ Attention (${sources.filter(s => s.needs_attention).length})` : `Inactive (${sources.filter(s => !s.is_active).length})`}
          </button>
        ))}
      </div>

      <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-900/40">
                {['Organization', 'Method', 'Freq', 'Last scraped', 'Events (30d)', 'All-time', 'Failures', 'Active', 'Actions'].map(h => (
                  <th key={h} className="text-left text-blue-500 text-xs font-medium uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/20">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-blue-500 py-10 text-sm">No sources in this view</td></tr>
              )}
              {filtered.map(src => (
                <tr key={src.id} className={`hover:bg-blue-900/10 transition-colors ${!src.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {src.needs_attention && <AlertTriangle size={12} className="text-amber-400 shrink-0" />}
                      <div>
                        <p className="text-white font-medium text-sm">{src.organization}</p>
                        <p className="text-blue-600 text-xs">SDG {src.primary_sdg_goals.join(', ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-blue-400 text-xs font-mono">{src.scrape_method}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${FREQ_COLORS[src.scrape_frequency]}`}>{src.scrape_frequency}</span>
                  </td>
                  <td className="px-4 py-3 text-blue-400 text-xs whitespace-nowrap">
                    {src.last_scraped_at
                      ? new Date(src.last_scraped_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : <span className="text-blue-700">Never</span>}
                  </td>
                  <td className="px-4 py-3 text-white font-bold tabular-nums">{src.recent_events}</td>
                  <td className="px-4 py-3 text-blue-400 tabular-nums">{src.total_events_found}</td>
                  <td className="px-4 py-3">
                    {src.consecutive_failures > 0 ? (
                      <span className={`text-xs font-bold ${src.consecutive_failures >= 3 ? 'text-red-400' : 'text-amber-400'}`}>
                        {src.consecutive_failures}×
                      </span>
                    ) : (
                      <CheckCircle size={13} className="text-green-400" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ToggleSwitch sourceId={src.id} isActive={src.is_active} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {src.consecutive_failures > 0 && (
                        <button
                          onClick={() => doReset(src.id)}
                          disabled={pending}
                          title="Reset failures"
                          className="p-1.5 rounded hover:bg-blue-400/10 text-blue-400 hover:text-white transition-colors disabled:opacity-40"
                        >
                          <RefreshCw size={13} />
                        </button>
                      )}
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-blue-400/10 text-blue-600 hover:text-blue-400 transition-colors">
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-blue-600 text-xs mt-3">
        Note: sources without DB records (not yet synced) will appear after the first scraping run.
      </p>
    </>
  )
}
