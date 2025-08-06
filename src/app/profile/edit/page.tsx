'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  User,
  Mail,
  Globe,
  Lock,
  Camera,
  X,
  Loader2,
  Check,
  AlertCircle,
  Upload,
} from 'lucide-react'

interface Profile {
  id: string
  username: string | null
  full_name: string | null
  bio: string | null
  website: string | null
  avatar_url: string | null
  is_public: boolean
}

export default function ProfileEditPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    website: '',
    is_public: true,
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (profile) {
        setProfile(profile)
        setFormData({
          username: profile.username || '',
          full_name: profile.full_name || '',
          bio: profile.bio || '',
          website: profile.website || '',
          is_public: profile.is_public ?? true,
        })
        if (profile.avatar_url) {
          setAvatarPreview(profile.avatar_url)
        }
      } else {
        // プロファイルが存在しない場合は作成
        const newProfile = {
          id: user.id,
          username: null,
          full_name: null,
          bio: null,
          website: null,
          avatar_url: null,
          is_public: true,
        }
        const { data, error: insertError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single()

        if (insertError) throw insertError
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setMessage({ type: 'error', text: 'プロファイルの取得に失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, avatar: 'ファイルサイズは5MB以下にしてください' })
      return
    }

    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, avatar: '画像ファイルを選択してください' })
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setErrors({ ...errors, avatar: '' })
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !profile) return null

    setUploading(true)
    try {
      const supabase = createClient()
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${profile.id}_${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // 既存のアバターを削除
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop()
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`avatars/${oldPath}`])
        }
      }

      // 新しいアバターをアップロード
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile)

      if (uploadError) throw uploadError

      // 公開URLを取得
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      setMessage({ type: 'error', text: 'アバターのアップロードに失敗しました' })
      return null
    } finally {
      setUploading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // ユーザー名の検証
    if (formData.username && !/^[a-zA-Z0-9_]{3,20}$/.test(formData.username)) {
      newErrors.username = 'ユーザー名は3〜20文字の英数字とアンダースコアのみ使用できます'
    }

    // ウェブサイトの検証
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = '有効なURLを入力してください'
    }

    // 自己紹介の文字数制限
    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = '自己紹介は500文字以内で入力してください'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !profile) return

    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()

      // アバターをアップロード
      let avatarUrl = profile.avatar_url
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar()
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
        }
      }

      // プロファイルを更新
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username || null,
          full_name: formData.full_name || null,
          bio: formData.bio || null,
          website: formData.website || null,
          avatar_url: avatarUrl,
          is_public: formData.is_public,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'プロファイルを更新しました' })
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Error updating profile:', error)
      if (error.code === '23505') {
        setErrors({ username: 'このユーザー名は既に使用されています' })
      } else {
        setMessage({ type: 'error', text: 'プロファイルの更新に失敗しました' })
      }
    } finally {
      setLoading(false)
    }
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>プロファイル編集</CardTitle>
          <CardDescription>あなたのプロファイル情報を編集できます</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* アバター画像 */}
            <div className="space-y-2">
              <Label>アバター画像</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {avatarPreview ? (
                    <div className="relative">
                      <div className="relative h-24 w-24">
                        <Image
                          src={avatarPreview}
                          alt="Avatar preview"
                          fill
                          className="rounded-full object-cover border-2 border-gray-200"
                          sizes="96px"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={removeAvatar}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    画像を選択
                  </label>
                  <p className="text-sm text-gray-500 mt-2">JPG、PNG、GIF（最大5MB）</p>
                  {errors.avatar && <p className="text-sm text-red-500 mt-1">{errors.avatar}</p>}
                </div>
              </div>
            </div>

            {/* ユーザー名 */}
            <div className="space-y-2">
              <Label htmlFor="username">
                <User className="inline h-4 w-4 mr-1" />
                ユーザー名
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="username123"
              />
              {errors.username && <p className="text-sm text-red-500">{errors.username}</p>}
              <p className="text-sm text-gray-500">
                3〜20文字の英数字とアンダースコアのみ使用できます
              </p>
            </div>

            {/* フルネーム */}
            <div className="space-y-2">
              <Label htmlFor="full_name">フルネーム</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="山田 太郎"
              />
            </div>

            {/* 自己紹介 */}
            <div className="space-y-2">
              <Label htmlFor="bio">自己紹介</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="あなたについて教えてください"
                rows={4}
              />
              {errors.bio && <p className="text-sm text-red-500">{errors.bio}</p>}
              <p className="text-sm text-gray-500">{formData.bio.length}/500文字</p>
            </div>

            {/* ウェブサイト */}
            <div className="space-y-2">
              <Label htmlFor="website">
                <Globe className="inline h-4 w-4 mr-1" />
                ウェブサイト
              </Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
              {errors.website && <p className="text-sm text-red-500">{errors.website}</p>}
            </div>

            {/* プロファイル公開設定 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="is_public" className="flex items-center gap-2">
                  {formData.is_public ? (
                    <Globe className="h-4 w-4 text-green-500" />
                  ) : (
                    <Lock className="h-4 w-4 text-gray-500" />
                  )}
                  プロファイルを公開
                </Label>
                <p className="text-sm text-gray-500">
                  {formData.is_public
                    ? '他のユーザーがあなたのプロファイルを閲覧できます'
                    : 'プロファイルは非公開です'}
                </p>
              </div>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
            </div>

            {/* メッセージ */}
            {message && (
              <Alert className={message.type === 'error' ? 'border-red-200' : 'border-green-200'}>
                {message.type === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                <AlertDescription
                  className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}
                >
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            {/* ボタン */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading || uploading} className="flex-1">
                {loading || uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    保存
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="flex-1"
              >
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
