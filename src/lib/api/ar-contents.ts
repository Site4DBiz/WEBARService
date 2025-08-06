import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type ARContent = Database['public']['Tables']['user_ar_contents']['Row']
type ARContentInsert = Database['public']['Tables']['user_ar_contents']['Insert']
type ARContentUpdate = Database['public']['Tables']['user_ar_contents']['Update']

export async function getUserARContents(userId: string): Promise<ARContent[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_ar_contents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching AR contents:', error)
    return []
  }

  return data || []
}

export async function getPublicARContents(): Promise<ARContent[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_ar_contents')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching public AR contents:', error)
    return []
  }

  return data || []
}

export async function getARContent(contentId: string): Promise<ARContent | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_ar_contents')
    .select('*')
    .eq('id', contentId)
    .single()

  if (error) {
    console.error('Error fetching AR content:', error)
    return null
  }

  return data
}

export async function createARContent(content: ARContentInsert): Promise<ARContent | null> {
  const supabase = createClient()

  const { data, error } = await supabase.from('user_ar_contents').insert(content).select().single()

  if (error) {
    console.error('Error creating AR content:', error)
    return null
  }

  return data
}

export async function updateARContent(
  contentId: string,
  updates: ARContentUpdate
): Promise<ARContent | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_ar_contents')
    .update(updates)
    .eq('id', contentId)
    .select()
    .single()

  if (error) {
    console.error('Error updating AR content:', error)
    return null
  }

  return data
}

export async function deleteARContent(contentId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase.from('user_ar_contents').delete().eq('id', contentId)

  if (error) {
    console.error('Error deleting AR content:', error)
    return false
  }

  return true
}

export async function incrementViewCount(contentId: string): Promise<void> {
  const supabase = createClient()

  // Get current view count
  const { data: currentData, error: fetchError } = await supabase
    .from('user_ar_contents')
    .select('view_count')
    .eq('id', contentId)
    .single()

  if (fetchError) {
    console.error('Error fetching current view count:', fetchError)
    return
  }

  // Increment the view count
  const { error: updateError } = await supabase
    .from('user_ar_contents')
    .update({ view_count: (currentData?.view_count || 0) + 1 })
    .eq('id', contentId)

  if (updateError) {
    console.error('Error incrementing view count:', updateError)
  }
}
