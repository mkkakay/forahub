import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'
import AdminNav from '@/components/admin/AdminNav'

export const metadata = { title: 'Admin — ForaHub', robots: 'noindex, nofollow' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  console.log('[admin] getUser:', user?.email ?? 'null', 'err:', authErr?.message ?? 'none')

  if (!user) {
    console.log('[admin] redirecting — no user')
    redirect('/')
  }

  const { data: profile, error: profileErr } = await adminSupabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  console.log('[admin] profile:', JSON.stringify(profile), 'err:', profileErr?.message ?? 'none')

  if (!profile?.is_admin) {
    console.log('[admin] redirecting — is_admin false/null for', user.email)
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
