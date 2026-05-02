'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { adminSupabase } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ── Auth guard ────────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<string> {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/')
  return user.id
}

// ── Event actions ─────────────────────────────────────────────────────────────

export async function publishEvent(eventId: string) {
  await requireAdmin()
  await adminSupabase.from('events').update({ status: 'published' }).eq('id', eventId)
  revalidatePath('/admin')
  revalidatePath('/admin/events')
  revalidatePath('/admin/review')
}

export async function rejectEvent(eventId: string) {
  await requireAdmin()
  await adminSupabase.from('events').update({ status: 'rejected' }).eq('id', eventId)
  revalidatePath('/admin')
  revalidatePath('/admin/events')
  revalidatePath('/admin/review')
}

export async function deleteEvent(eventId: string) {
  await requireAdmin()
  await adminSupabase.from('events').delete().eq('id', eventId)
  revalidatePath('/admin')
  revalidatePath('/admin/events')
}

export async function updateEvent(eventId: string, data: Record<string, unknown>) {
  await requireAdmin()
  const { error } = await adminSupabase
    .from('events')
    .update(data)
    .eq('id', eventId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/events')
  revalidatePath('/admin/review')
  revalidatePath('/events')
}

export async function createEvent(formData: FormData) {
  await requireAdmin()

  const sdgRaw = formData.get('sdg_goals') as string
  const sdg_goals = sdgRaw ? sdgRaw.split(',').map(Number).filter(Boolean) : []

  const row = {
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    start_date: formData.get('start_date') as string,
    end_date: (formData.get('end_date') as string) || null,
    location: (formData.get('location') as string) || null,
    organization: (formData.get('organization') as string) || null,
    sdg_goals,
    event_type: (formData.get('event_type') as string) || 'conference',
    format: (formData.get('format') as string) || 'in_person',
    registration_url: (formData.get('registration_url') as string) || null,
    is_featured: formData.get('is_featured') === 'true',
    status: 'published' as const,
    source_id: null,
  }

  const { error } = await adminSupabase.from('events').insert(row)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/events')
  revalidatePath('/events')
  redirect('/admin/events')
}

// ── User actions ──────────────────────────────────────────────────────────────

export async function updateUserTier(
  userId: string,
  tier: 'free' | 'pro' | 'founding',
) {
  await requireAdmin()
  await adminSupabase
    .from('profiles')
    .update({ subscription_tier: tier })
    .eq('id', userId)
  revalidatePath('/admin/users')
}

// ── Source actions ────────────────────────────────────────────────────────────

export async function toggleSourceActive(sourceId: string, isActive: boolean) {
  await requireAdmin()
  await adminSupabase
    .from('sources')
    .update({ is_active: isActive, ...(isActive ? { needs_attention: false, consecutive_failures: 0 } : {}) })
    .eq('id', sourceId)
  revalidatePath('/admin/sources')
  revalidatePath('/admin')
}

export async function resetSourceFailures(sourceId: string) {
  await requireAdmin()
  await adminSupabase
    .from('sources')
    .update({ consecutive_failures: 0, needs_attention: false })
    .eq('id', sourceId)
  revalidatePath('/admin/sources')
}
