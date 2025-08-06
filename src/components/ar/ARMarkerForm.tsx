'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Image, AlertCircle, Check, Loader2, Info, Cube, Eye, X } from 'lucide-react'
import { validateImage, validateFile, generateUniqueFilename } from '@/utils/file-validation'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

const ModelViewer = dynamic(() => import('../3d/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
      <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
    </div>
  ),
})

interface ARMarkerFormData {
  name: string
  description: string
  category: string
  tags: string[]
  isPublic: boolean
  markerImage: File | null
  targetWidth: number
  targetHeight: number
  modelFile: File | null
  modelScale: number
  modelPosition: { x: number; y: number; z: number }
  modelRotation: { x: number; y: number; z: number }
  enableAnimation: boolean
  enableInteraction: boolean
}

interface MarkerQuality {
  score: number
  warnings: string[]
  suggestions: string[]
}

export function ARMarkerForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [markerQuality, setMarkerQuality] = useState<MarkerQuality | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const [formData, setFormData] = useState<ARMarkerFormData>({
    name: '',
    description: '',
    category: 'general',
    tags: [],
    isPublic: false,
    markerImage: null,
    targetWidth: 1,
    targetHeight: 1,
    modelFile: null,
    modelScale: 1,
    modelPosition: { x: 0, y: 0, z: 0 },
    modelRotation: { x: 0, y: 0, z: 0 },
    enableAnimation: true,
    enableInteraction: true,
  })

  const [modelPreview, setModelPreview] = useState<string | null>(null)
  const [showModelPreview, setShowModelPreview] = useState(false)
  const modelInputRef = useRef<HTMLInputElement>(null)

  const [tagInput, setTagInput] = useState('')

  const handleModelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // バリデーション
    const validation = validateFile(file, 'model')
    if (!validation.isValid) {
      setError(validation.error || '3Dモデルの検証に失敗しました')
      return
    }

    setFormData((prev) => ({ ...prev, modelFile: file }))

    // プレビュー用URLを生成
    const url = URL.createObjectURL(file)
    setModelPreview(url)
  }

  const removeModel = () => {
    setFormData((prev) => ({ ...prev, modelFile: null }))
    if (modelPreview) {
      URL.revokeObjectURL(modelPreview)
      setModelPreview(null)
    }
    setShowModelPreview(false)
    if (modelInputRef.current) {
      modelInputRef.current.value = ''
    }
  }

  const categories = [
    { value: 'general', label: '一般' },
    { value: 'product', label: '製品' },
    { value: 'education', label: '教育' },
    { value: 'entertainment', label: 'エンターテインメント' },
    { value: 'marketing', label: 'マーケティング' },
    { value: 'art', label: 'アート' },
    { value: 'other', label: 'その他' },
  ]

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

    setFormData((prev) => ({ ...prev, markerImage: file }))

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.markerImage) {
      setError('マーカー画像を選択してください')
      return
    }

    if (!formData.name.trim()) {
      setError('マーカー名を入力してください')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()

      // 現在のユーザーを取得
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('認証が必要です')
      }

      // マーカー画像をアップロード
      const markerFilename = generateUniqueFilename(formData.markerImage.name)
      const markerPath = `${user.id}/${markerFilename}`

      const { error: uploadError } = await supabase.storage
        .from('ar-markers')
        .upload(markerPath, formData.markerImage)

      if (uploadError) {
        throw new Error('画像のアップロードに失敗しました')
      }

      // マーカー画像のURLを取得
      const {
        data: { publicUrl: markerUrl },
      } = supabase.storage.from('ar-markers').getPublicUrl(markerPath)

      // 3Dモデルをアップロード（存在する場合）
      let modelUrl = null
      if (formData.modelFile) {
        const modelFilename = generateUniqueFilename(formData.modelFile.name)
        const modelPath = `${user.id}/models/${modelFilename}`

        const { error: modelUploadError } = await supabase.storage
          .from('ar-models')
          .upload(modelPath, formData.modelFile)

        if (modelUploadError) {
          console.error('3Dモデルのアップロードエラー:', modelUploadError)
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from('ar-models').getPublicUrl(modelPath)
          modelUrl = publicUrl
        }
      }

      // データベースに保存
      const { error: dbError } = await supabase.from('ar_markers').insert({
        user_id: user.id,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        tags: formData.tags,
        is_public: formData.isPublic,
        marker_image_url: markerUrl,
        width: formData.targetWidth,
        height: formData.targetHeight,
        quality_score: markerQuality?.score || 0,
        metadata: {
          originalFilename: formData.markerImage.name,
          fileSize: formData.markerImage.size,
          mimeType: formData.markerImage.type,
          uploadedAt: new Date().toISOString(),
          modelUrl: modelUrl,
          modelSettings: formData.modelFile ? {
            scale: formData.modelScale,
            position: formData.modelPosition,
            rotation: formData.modelRotation,
            enableAnimation: formData.enableAnimation,
            enableInteraction: formData.enableInteraction,
          } : null,
        },
      })

      if (dbError) {
        throw new Error('マーカー情報の保存に失敗しました')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/ar-markers')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {/* マーカー画像アップロード */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">マーカー画像</h3>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
              id="marker-upload"
            />
            <label htmlFor="marker-upload" className="cursor-pointer">
              {imagePreview ? (
                <div className="space-y-4">
                  <img
                    src={imagePreview}
                    alt="マーカープレビュー"
                    className="mx-auto max-w-xs rounded-lg shadow-md"
                  />
                  <p className="text-sm text-gray-600">クリックして画像を変更</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="text-gray-600">
                    クリックまたはドラッグ＆ドロップで画像をアップロード
                  </p>
                  <p className="text-xs text-gray-500">JPEG, PNG, WebP (最大5MB)</p>
                </div>
              )}
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
              placeholder="例: 商品パッケージマーカー"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="このマーカーの用途や特徴を説明してください"
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

      {/* 3Dモデル設定 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">3Dモデル</h3>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              ref={modelInputRef}
              type="file"
              accept=".glb,.gltf,.fbx,.obj"
              onChange={handleModelChange}
              className="hidden"
              id="model-upload"
            />
            <label htmlFor="model-upload" className="cursor-pointer">
              {formData.modelFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <Cube className="h-8 w-8 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium">{formData.modelFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(formData.modelFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setShowModelPreview(true)
                      }}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      プレビュー
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        removeModel()
                      }}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      削除
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Cube className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="text-gray-600">
                    クリックまたはドラッグ＆ドロップで3Dモデルをアップロード
                  </p>
                  <p className="text-xs text-gray-500">GLB, GLTF, FBX, OBJ (最大50MB)</p>
                </div>
              )}
            </label>
          </div>

          {formData.modelFile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  スケール
                </label>
                <input
                  type="number"
                  value={formData.modelScale}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      modelScale: parseFloat(e.target.value) || 1,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.1"
                  min="0.1"
                  max="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  位置 (Y軸)
                </label>
                <input
                  type="number"
                  value={formData.modelPosition.y}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      modelPosition: {
                        ...prev.modelPosition,
                        y: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.1"
                  min="-5"
                  max="5"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enableAnimation}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, enableAnimation: e.target.checked }))
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">アニメーションを有効化</span>
                </label>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enableInteraction}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, enableInteraction: e.target.checked }))
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">インタラクションを有効化</span>
                </label>
              </div>
            </div>
          )}
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
                setFormData((prev) => ({ ...prev, targetWidth: parseFloat(e.target.value) || 1 }))
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
                setFormData((prev) => ({ ...prev, targetHeight: parseFloat(e.target.value) || 1 }))
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

      {/* 成功メッセージ */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <Check className="h-5 w-5 mr-2" />
          マーカーが正常に登録されました。リダイレクト中...
        </div>
      )}

      {/* 3Dモデルプレビューモーダル */}
      {showModelPreview && modelPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">3Dモデルプレビュー</h3>
              <button
                onClick={() => setShowModelPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4" style={{ height: '500px' }}>
              <ModelViewer
                modelUrl={modelPreview}
                scale={formData.modelScale}
                position={formData.modelPosition}
                rotation={formData.modelRotation}
                enableAnimation={formData.enableAnimation}
                enableInteraction={formData.enableInteraction}
              />
            </div>
          </div>
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
          disabled={isSubmitting || !formData.markerImage || !formData.name}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              登録中...
            </>
          ) : (
            '登録する'
          )}
        </button>
      </div>
    </form>
  )
}
