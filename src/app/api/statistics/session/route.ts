import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ARセッションの開始/更新/終了を管理
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const body = await request.json()
    const { action, sessionData } = body

    switch (action) {
      case 'start': {
        // セッション開始
        const { data: session, error } = await supabase
          .from('ar_sessions')
          .insert({
            user_id: user?.id || null,
            content_id: sessionData.contentId,
            marker_id: sessionData.markerId,
            session_id: sessionData.sessionId || crypto.randomUUID(),
            device_type: sessionData.deviceType,
            browser: sessionData.browser,
            user_agent: request.headers.get('user-agent'),
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            location: sessionData.location || {},
          })
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ session })
      }

      case 'update': {
        // セッション更新
        const { data: session, error } = await supabase
          .from('ar_sessions')
          .update({
            detection_success: sessionData.detectionSuccess,
            detection_time: sessionData.detectionTime,
            quality_metrics: sessionData.qualityMetrics,
          })
          .eq('session_id', sessionData.sessionId)
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ session })
      }

      case 'end': {
        // セッション終了
        const { data: existingSession } = await supabase
          .from('ar_sessions')
          .select('started_at')
          .eq('session_id', sessionData.sessionId)
          .single()

        if (existingSession) {
          const duration = Math.floor(
            (new Date().getTime() - new Date(existingSession.started_at).getTime()) / 1000
          )

          const { data: session, error } = await supabase
            .from('ar_sessions')
            .update({
              ended_at: new Date().toISOString(),
              duration_seconds: duration,
            })
            .eq('session_id', sessionData.sessionId)
            .select()
            .single()

          if (error) throw error
          return NextResponse.json({ session })
        }
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json({ error: 'Failed to manage session' }, { status: 500 })
  }
}

// セッション情報の取得
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (sessionId) {
      // 特定のセッション情報を取得
      const { data: session, error } = await supabase
        .from('ar_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (error) throw error

      // 権限チェック
      if (session.user_id !== user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user?.id)
          .single()

        if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }

      return NextResponse.json(session)
    } else {
      // ユーザーのセッション一覧を取得
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: sessions, error } = await supabase
        .from('ar_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return NextResponse.json(sessions)
    }
  } catch (error) {
    console.error('Session GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
