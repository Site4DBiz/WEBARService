import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Get query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
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

    // Build query
    let query = supabase.from('profiles').select(
      `
        *,
        ar_contents:ar_contents(count),
        _count:user_activity_logs(count)
      `,
      { count: 'exact' }
    )

    // Apply filters
    if (search) {
      query = query.or(
        `username.ilike.%${search}%,full_name.ilike.%${search}%,email.ilike.%${search}%`
      )
    }

    if (role) {
      query = query.eq('role', role)
    }

    if (status === 'active') {
      query = query.eq('is_verified', true)
    } else if (status === 'inactive') {
      query = query.eq('is_verified', false)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: users, error, count } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get user statistics for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // Get content stats
        const { data: contentStats } = await supabase
          .from('ar_contents')
          .select('view_count, like_count')
          .eq('user_id', user.id)

        const totalViews =
          contentStats?.reduce((sum, content) => sum + (content.view_count || 0), 0) || 0
        const totalLikes =
          contentStats?.reduce((sum, content) => sum + (content.like_count || 0), 0) || 0

        // Get follower count
        const { count: followerCount } = await supabase
          .from('user_relationships')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', user.id)

        // Get following count
        const { count: followingCount } = await supabase
          .from('user_relationships')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', user.id)

        return {
          ...user,
          stats: {
            contentCount: user.ar_contents?.[0]?.count || 0,
            totalViews,
            totalLikes,
            followerCount: followerCount || 0,
            followingCount: followingCount || 0,
          },
        }
      })
    )

    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error in GET /api/users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { userId, updates } = body

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
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
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    // Log the activity
    await supabase.from('user_activity_logs').insert({
      user_id: user.id,
      activity_type: 'update',
      resource_type: 'profile',
      resource_id: userId,
      action_details: { updates },
    })

    return NextResponse.json({ user: data })
  } catch (error) {
    console.error('Error in PATCH /api/users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userIds = searchParams.get('ids')?.split(',') || []

    if (userIds.length === 0) {
      return NextResponse.json({ error: 'No user IDs provided' }, { status: 400 })
    }

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
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

    // Soft delete users by setting a deleted flag or moving to archive
    // For now, we'll just update their status
    const { error } = await supabase
      .from('profiles')
      .update({ is_public: false, is_verified: false })
      .in('id', userIds)

    if (error) {
      console.error('Error deleting users:', error)
      return NextResponse.json({ error: 'Failed to delete users' }, { status: 500 })
    }

    // Log the activity
    await supabase.from('user_activity_logs').insert({
      user_id: user.id,
      activity_type: 'delete',
      resource_type: 'profile',
      action_details: { userIds },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
