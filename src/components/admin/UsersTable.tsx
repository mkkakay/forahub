'use client'

import { useState, useTransition } from 'react'
import { updateUserTier } from '@/app/admin/actions'
import { Shield, Search } from 'lucide-react'

type UserRow = {
  id: string; email: string; created_at: string; last_sign_in_at: string | null
  tier: string; subscription_end_date: string | null; trial_end_date: string | null
  is_admin: boolean
}

const TIER_BADGE: Record<string, string> = {
  founding: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  pro:      'bg-[#4ea8de]/10 text-[#4ea8de] border-[#4ea8de]/20',
  free:     'bg-blue-900/20 text-blue-500 border-blue-800/30',
}

function TierSelect({ userId, currentTier }: { userId: string; currentTier: string }) {
  const [tier, setTier] = useState(currentTier)
  const [pending, startTransition] = useTransition()

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as 'free' | 'pro' | 'founding'
    if (next === tier) return
    if (!confirm(`Change ${userId.slice(0, 8)} to ${next}?`)) return
    setTier(next)
    startTransition(() => updateUserTier(userId, next))
  }

  return (
    <select
      value={tier}
      onChange={onChange}
      disabled={pending}
      className="bg-[#0a1929] border border-blue-900/60 text-sm text-white rounded-lg px-2 py-1 focus:outline-none focus:border-[#4ea8de] disabled:opacity-50"
    >
      <option value="free">Free</option>
      <option value="pro">Pro</option>
      <option value="founding">Founding</option>
    </select>
  )
}

export default function UsersTable({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))
    : users

  const tierCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.tier] = (acc[u.tier] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
      {/* Summary */}
      <div className="flex flex-wrap gap-3 mb-5">
        {Object.entries(tierCounts).map(([tier, count]) => (
          <div key={tier} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${TIER_BADGE[tier]}`}>
            {tier.charAt(0).toUpperCase() + tier.slice(1)}: {count}
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
        <input
          type="text"
          placeholder="Search email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-[#0a1929] border border-blue-900/60 text-white text-sm rounded-lg pl-8 pr-4 py-2 w-full focus:outline-none focus:border-[#4ea8de] placeholder-blue-700"
        />
      </div>

      {/* Table */}
      <div className="bg-[#0d2240] border border-blue-900/40 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-900/40">
                {['Email', 'Signed up', 'Last active', 'Tier', 'Subscription ends', 'Role', 'Change tier'].map(h => (
                  <th key={h} className="text-left text-blue-500 text-xs font-medium uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/20">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-blue-500 py-10 text-sm">No users found</td></tr>
              )}
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-blue-900/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">{u.email}</span>
                      {u.is_admin && (
                        <span title="Admin" className="text-[#4ea8de]"><Shield size={12} /></span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-blue-400 text-xs whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-blue-500 text-xs whitespace-nowrap">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TIER_BADGE[u.tier]}`}>
                      {u.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-blue-500 text-xs whitespace-nowrap">
                    {u.subscription_end_date
                      ? new Date(u.subscription_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                      : u.trial_end_date
                        ? `Trial until ${new Date(u.trial_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : '—'}
                  </td>
                  <td className="px-4 py-3 text-blue-500 text-xs">{u.is_admin ? 'Admin' : 'User'}</td>
                  <td className="px-4 py-3">
                    <TierSelect userId={u.id} currentTier={u.tier} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
