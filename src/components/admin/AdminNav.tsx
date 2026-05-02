'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  LayoutDashboard, CalendarDays, ClipboardCheck, Users,
  Radio, BarChart2, LogOut, ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin',            label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/events',     label: 'Events',     icon: CalendarDays    },
  { href: '/admin/review',     label: 'Review',     icon: ClipboardCheck  },
  { href: '/admin/users',      label: 'Users',      icon: Users           },
  { href: '/admin/sources',    label: 'Sources',    icon: Radio           },
  { href: '/admin/analytics',  label: 'Analytics',  icon: BarChart2       },
]

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="w-56 shrink-0 bg-[#0a1929] border-r border-blue-900/40 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-blue-900/40">
        <Link href="/" className="text-white text-lg font-bold tracking-tight">
          Fora<span className="text-[#4ea8de]">Hub</span>
        </Link>
        <p className="text-blue-500 text-xs mt-0.5 font-medium uppercase tracking-wider">Admin</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#4ea8de]/15 text-[#4ea8de]'
                  : 'text-blue-300 hover:bg-blue-900/30 hover:text-white'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
              {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-blue-900/40 space-y-1">
        <p className="text-blue-500 text-xs px-3 truncate">{userEmail}</p>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-blue-300 hover:bg-blue-900/30 hover:text-white transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
