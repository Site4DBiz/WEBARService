import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { username, full_name, bio, website, avatar_url, is_public } = body

    // ユーザー名のバリデーション
    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ error: 'Invalid username format' }, { status: 400 })
    }

    // ウェブサイトのバリデーション
    if (website && !/^https?:\/\/.+/.test(website)) {
      return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 })
    }

    // 自己紹介の文字数制限
    if (bio && bio.length > 500) {
      return NextResponse.json({ error: 'Bio must be less than 500 characters' }, { status: 400 })
    }

    // プロファイルの存在確認
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    let profileData

    if (fetchError && fetchError.code === 'PGRST116') {
      // プロファイルが存在しない場合は作成
      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            username: username || null,
            full_name: full_name || null,
            bio: bio || null,
            website: website || null,
            avatar_url: avatar_url || null,
            is_public: is_public ?? true,
          },
        ])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      profileData = data
    } else {
      // プロファイルが存在する場合は更新
      const { data, error } = await supabase
        .from('profiles')
        .update({
          username: username || null,
          full_name: full_name || null,
          bio: bio || null,
          website: website || null,
          avatar_url: avatar_url || null,
          is_public: is_public ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      profileData = data
    }

    return NextResponse.json({ profile: profileData })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const avatarUrl = searchParams.get('avatar_url')

    if (avatarUrl) {
      // アバター画像を削除
      const path = avatarUrl.split('/').pop()
      if (path) {
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([`avatars/${path}`])

        if (deleteError) {
          console.error('Error deleting avatar:', deleteError)
        }
      }

      // プロファイルのアバターURLをnullに更新
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting avatar:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
