import { adminSupabase } from '@/lib/supabase/admin'
import UsersTable from '@/components/admin/UsersTable'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  // Fetch all users from Supabase Auth (service role required)
  const { data: { users } } = await adminSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  })

  // Fetch all profiles for subscription tier + admin status
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, subscription_tier, subscription_end_date, trial_end_date, is_admin, created_at')

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  const enriched = users.map(u => ({
    id: u.id,
    email: u.email ?? '(no email)',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    tier: profileMap[u.id]?.subscription_tier ?? 'free',
    subscription_end_date: profileMap[u.id]?.subscription_end_date ?? null,
    trial_end_date: profileMap[u.id]?.trial_end_date ?? null,
    is_admin: profileMap[u.id]?.is_admin ?? false,
  }))

  // Sort by signup date newest first
  enriched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Users</h1>
        <p className="text-blue-400 text-sm mt-0.5">{enriched.length} registered accounts</p>
      </div>
      <UsersTable users={enriched} />
    </div>
  )
}
