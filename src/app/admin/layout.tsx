import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import AdminNav from '@/components/admin/AdminNav'

export const metadata = { title: 'Admin — ForaHub', robots: 'noindex, nofollow' }

// Local debug-only logger. In production we don't want admin emails or
// raw profile rows in Vercel function logs — those are PII that should
// stay out of long-lived log storage.
const debugLog = process.env.NODE_ENV !== 'production'
  ? (...args: unknown[]) => console.log('[admin]', ...args)
  : () => { /* no-op in prod */ }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  debugLog('getUser err:', authErr?.message ?? 'none')

  if (!user) {
    debugLog('redirect — no user')
    redirect('/')
  }

  const { data: profile, error: profileErr } = await adminSupabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  debugLog('profile err:', profileErr?.message ?? 'none', 'is_admin:', !!profile?.is_admin)

  if (!profile?.is_admin) {
    debugLog('redirect — not admin')
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-[#060d18] flex font-sans">
      <AdminNav userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
