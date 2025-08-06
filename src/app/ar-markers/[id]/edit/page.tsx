'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Image, Loader2, Save, Upload, AlertCircle, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { validateImage, generateUniqueFilename } from '@/utils/file-validation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditARMarkerPage({ params }: PageProps) {
  const router = useRouter()
  const [markerId, setMarkerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [marker, setMarker] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    tags: [] as string[],
    isPublic: false,
    targetWidth: 1,
    targetHeight: 1,
  })
  const [tagInput, setTagInput] = useState('')
  const [newImage, setNewImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [markerQuality, setMarkerQuality] = useState<{
    score: number
    warnings: string[]
    suggestions: string[]
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const categories = [
    { value: 'general', label: '一般' },
    { value: 'product', label: '製品' },
    { value: 'education', label: '教育' },
    { value: 'entertainment', label: 'エンターテインメント' },
    { value: 'marketing', label: 'マーケティング' },
    { value: 'art', label: 'アート' },
    { value: 'other', label: 'その他' },
  ]

  useEffect(() => {
    params.then((resolvedParams) => {
      setMarkerId(resolvedParams.id)
    })
  }, [params])

  useEffect(() => {
    if (markerId) {
      fetchMarker()
    }
  }, [markerId])

  const fetchMarker = async () => {
    if (!markerId) return

    setLoading(true)
    try {
      const supabase = createClient()

      // 現在のユーザーを取得
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // マーカー情報を取得
      const { data, error } = await supabase
        .from('ar_markers')
        .select('*')
        .eq('id', markerId)
        .single()

      if (error) {
        throw error
      }

      if (!data) {
        setError('マーカーが見つかりません')
        return
      }

      // 所有権の確認
      if (data.user_id !== user.id) {
        setError('このマーカーを編集する権限がありません')
        return
      }

      setMarker(data)
      setFormData({
        name: data.name,
        description: data.description || '',
        category: data.category || 'general',
        tags: data.tags || [],
        isPublic: data.is_public || false,
        targetWidth: data.width || 1,
        targetHeight: data.height || 1,
      })
    } catch (err: any) {
      setError(err.message || 'マーカーの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }))
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setMarkerQuality(null)

    // バリデーション
    const validation = validateImage(file)
    if (!validation.isValid) {
      setError(validation.error || '画像の検証に失敗しました')
      return
    }

    setNewImage(file)

    // プレビュー生成
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // 画像品質の評価
    await evaluateMarkerQuality(file)
  }

  const evaluateMarkerQuality = async (file: File) => {
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/ar/process-marker', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setMarkerQuality({
          score: data.quality.score,
          warnings: data.quality.warnings || [],
          suggestions: data.quality.suggestions || [],
        })
      }
    } catch (error) {
      console.error('マーカー品質評価エラー:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setError('マーカー名を入力してください')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      let markerImageUrl = marker.marker_image_url

      // 新しい画像がアップロードされた場合
      if (newImage) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('認証が必要です')
        }

        // 古い画像を削除（存在する場合）
        if (marker.marker_image_url) {
          const oldImagePath = marker.marker_image_url.split('/').pop()
          if (oldImagePath) {
            await supabase.storage
              .from('ar-markers')
              .remove([`${user.id}/${oldImagePath}`])
          }
        }

        // 新しい画像をアップロード
        const markerFilename = generateUniqueFilename(newImage.name)
        const markerPath = `${user.id}/${markerFilename}`

        const { error: uploadError } = await supabase.storage
          .from('ar-markers')
          .upload(markerPath, newImage)

        if (uploadError) {
          throw new Error('画像のアップロードに失敗しました')
        }

        // 新しい画像のURLを取得
        const { data: { publicUrl } } = supabase.storage
          .from('ar-markers')
          .getPublicUrl(markerPath)

        markerImageUrl = publicUrl
      }

      const response = await fetch('/api/ar-markers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: markerId,
          name: formData.name,
          description: formData.description,
          category: formData.category,
          tags: formData.tags,
          is_public: formData.isPublic,
          width: formData.targetWidth,
          height: formData.targetHeight,
          marker_image_url: markerImageUrl,
          quality_score: markerQuality?.score || marker.quality_score,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '更新に失敗しました')
      }

      router.push('/ar-markers')
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error && !marker) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/ar-markers')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            一覧に戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            戻る
          </button>

          <div className="flex items-center gap-3">
            <Image className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">ARマーカー編集</h1>
          </div>
          <p className="mt-2 text-gray-600">マーカー情報を編集します</p>
        </div>

        {/* 編集フォーム */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* マーカー画像プレビュー */}
          {marker && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">マーカー画像</h3>
              <div className="space-y-4">
                <div className="max-w-xs mx-auto">
                  <img
                    src={imagePreview || marker.marker_image_url}
                    alt={marker.name}
                    className="w-full rounded-lg shadow-md"
                  />
                  {!newImage && (
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      現在のマーカー画像
                    </p>
                  )}
                  {newImage && (
                    <p className="text-sm text-green-600 mt-2 text-center">
                      新しいマーカー画像
                    </p>
                  )}
                </div>

                {/* 画像アップロード */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                    id="marker-update"
                  />
                  <label htmlFor="marker-update" className="cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      クリックして画像を変更
                    </p>
                    <p className="text-xs text-gray-500">JPEG, PNG, WebP (最大5MB)</p>
                  </label>
                </div>

                {/* 品質評価結果 */}
                {isProcessing && (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    <span>画像を分析中...</span>
                  </div>
                )}

                {markerQuality && (
                  <div
                    className={`rounded-lg p-4 ${
                      markerQuality.score >= 70
                        ? 'bg-green-50 border border-green-200'
                        : markerQuality.score >= 50
                          ? 'bg-yellow-50 border border-yellow-200'
                          : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">トラッキング品質スコア</span>
                      <span
                        className={`text-lg font-bold ${
                          markerQuality.score >= 70
                            ? 'text-green-600'
                            : markerQuality.score >= 50
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {markerQuality.score}/100
                      </span>
                    </div>

                    {markerQuality.warnings.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">注意事項:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {markerQuality.warnings.map((warning, i) => (
                            <li key={i} className="flex items-start">
                              <AlertCircle className="h-4 w-4 text-yellow-500 mr-1 flex-shrink-0 mt-0.5" />
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {markerQuality.suggestions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">改善提案:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {markerQuality.suggestions.map((suggestion, i) => (
                            <li key={i} className="flex items-start">
                              <Info className="h-4 w-4 text-blue-500 mr-1 flex-shrink-0 mt-0.5" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 基本情報 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">基本情報</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  マーカー名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  説明
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリー
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">タグ</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="タグを入力してEnter"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    追加
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-blue-500 hover:text-blue-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AR設定 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">AR設定</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="width" className="block text-sm font-medium text-gray-700 mb-1">
                  ターゲット幅 (メートル)
                </label>
                <input
                  type="number"
                  id="width"
                  value={formData.targetWidth}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      targetWidth: parseFloat(e.target.value) || 1,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.1"
                  min="0.1"
                  max="10"
                />
              </div>

              <div>
                <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                  ターゲット高さ (メートル)
                </label>
                <input
                  type="number"
                  id="height"
                  value={formData.targetHeight}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      targetHeight: parseFloat(e.target.value) || 1,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.1"
                  min="0.1"
                  max="10"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  このマーカーを公開する（他のユーザーも利用可能）
                </span>
              </label>
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* 送信ボタン */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/ar-markers')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  変更を保存
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
