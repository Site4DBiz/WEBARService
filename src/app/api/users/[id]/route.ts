import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get user details
    const { data: userProfile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Get user statistics
    const { data: stats } = await supabase.rpc('get_user_stats', { user_id: id })
    
    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('user_activity_logs')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Get user's AR contents
    const { data: arContents } = await supabase
      .from('ar_contents')
      .select('id, title, status, view_count, like_count, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(5)
    
    // Get API keys (show only metadata, not actual keys)
    const { data: apiKeys } = await supabase
      .from('api_keys')
      .select('id, name, is_active, last_used_at, created_at')
      .eq('user_id', id)
    
    return NextResponse.json({
      user: userProfile,
      stats: stats?.[0] || {
        total_contents: 0,
        total_views: 0,
        total_likes: 0,
        total_followers: 0,
        total_following: 0
      },
      recentActivity,
      arContents,
      apiKeys
    })
  } catch (error) {
    console.error('Error in GET /api/users/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Update user profile
    const { data, error } = await supabase
      .from('profiles')
      .update(body)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
    
    // Log the activity
    await supabase
      .from('user_activity_logs')
      .insert({
        user_id: user.id,
        activity_type: 'update',
        resource_type: 'profile',
        resource_id: id,
        action_details: body
      })
    
    return NextResponse.json({ user: data })
  } catch (error) {
    console.error('Error in PATCH /api/users/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}