'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Upload,
  FileImage,
  X,
  Check,
  AlertCircle,
  Loader2,
  Download,
  Info,
} from 'lucide-react'
import { validateImage, generateUniqueFilename } from '@/utils/file-validation'
import { createClient } from '@/lib/supabase/client'

interface FileWithPreview {
  file: File
  preview: string
  name: string
  status: 'pending' | 'processing' | 'success' | 'error'
  error?: string
  qualityScore?: number
  markerUrl?: string
}

export default function BatchUploadPage() {
  const router = useRouter()
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [defaultSettings, setDefaultSettings] = useState({
    category: 'general',
    isPublic: false,
    targetWidth: 1,
    targetHeight: 1,
  })
  const [uploadSummary, setUploadSummary] = useState<{
    total: number
    success: number
    failed: number
  } | null>(null)

  const categories = [
    { value: 'general', label: '一般' },
    { value: 'product', label: '製品' },
    { value: 'education', label: '教育' },
    { value: 'entertainment', label: 'エンターテインメント' },
    { value: 'marketing', label: 'マーケティング' },
    { value: 'art', label: 'アート' },
    { value: 'other', label: 'その他' },
  ]

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const validFiles: FileWithPreview[] = []

    selectedFiles.forEach((file) => {
      const validation = validateImage(file)
      if (validation.isValid) {
        const reader = new FileReader()
        reader.onloadend = () => {
          const fileWithPreview: FileWithPreview = {
            file,
            preview: reader.result as string,
            name: file.name.replace(/\.[^/.]+$/, ''), // 拡張子を除いた名前
            status: 'pending',
          }
          setFiles((prev) => [...prev, fileWithPreview])
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleNameChange = (index: number, name: string) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, name } : f)))
  }

  const evaluateMarkerQuality = async (file: File): Promise<number> => {
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/ar/process-marker', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        return data.quality.score || 0
      }
    } catch (error) {
      console.error('品質評価エラー:', error)
    }
    return 0
  }

  const uploadFile = async (fileWithPreview: FileWithPreview, userId: string) => {
    const supabase = createClient()

    try {
      // 品質評価
      const qualityScore = await evaluateMarkerQuality(fileWithPreview.file)

      // 画像をアップロード
      const markerFilename = generateUniqueFilename(fileWithPreview.file.name)
      const markerPath = `${userId}/${markerFilename}`

      const { error: uploadError } = await supabase.storage
        .from('ar-markers')
        .upload(markerPath, fileWithPreview.file)

      if (uploadError) {
        throw new Error('画像のアップロードに失敗しました')
      }

      // URLを取得
      const {
        data: { publicUrl: markerUrl },
      } = supabase.storage.from('ar-markers').getPublicUrl(markerPath)

      // データベースに保存
      const { error: dbError } = await supabase.from('ar_markers').insert({
        user_id: userId,
        name: fileWithPreview.name,
        category: defaultSettings.category,
        is_public: defaultSettings.isPublic,
        marker_image_url: markerUrl,
        width: defaultSettings.targetWidth,
        height: defaultSettings.targetHeight,
        quality_score: qualityScore,
        metadata: {
          originalFilename: fileWithPreview.file.name,
          fileSize: fileWithPreview.file.size,
          mimeType: fileWithPreview.file.type,
          uploadedAt: new Date().toISOString(),
          batchUpload: true,
        },
      })

      if (dbError) {
        throw new Error('データベース保存エラー')
      }

      return {
        success: true,
        qualityScore,
        markerUrl,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'アップロードエラー',
      }
    }
  }

  const handleBatchUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadSummary(null)

    const supabase = createClient()

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      alert('認証が必要です')
      router.push('/auth/login')
      return
    }

    let successCount = 0
    let failedCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // ステータスを更新
      setFiles((prev) =>
        prev.map((f, index) => (index === i ? { ...f, status: 'processing' as const } : f))
      )

      // ファイルをアップロード
      const result = await uploadFile(file, user.id)

      if (result.success) {
        successCount++
        setFiles((prev) =>
          prev.map((f, index) =>
            index === i
              ? {
                  ...f,
                  status: 'success' as const,
                  qualityScore: result.qualityScore,
                  markerUrl: result.markerUrl,
                }
              : f
          )
        )
      } else {
        failedCount++
        setFiles((prev) =>
          prev.map((f, index) =>
            index === i
              ? {
                  ...f,
                  status: 'error' as const,
                  error: result.error,
                }
              : f
          )
        )
      }

      // 進捗更新
      setUploadProgress(Math.round(((i + 1) / files.length) * 100))
    }

    setUploadSummary({
      total: files.length,
      success: successCount,
      failed: failedCount,
    })
    setIsUploading(false)
  }

  const handleExportResults = () => {
    const results = files.map((f) => ({
      ファイル名: f.file.name,
      マーカー名: f.name,
      ステータス: f.status === 'success' ? '成功' : f.status === 'error' ? 'エラー' : f.status,
      品質スコア: f.qualityScore || '-',
      エラー: f.error || '-',
      URL: f.markerUrl || '-',
    }))

    const csv = [
      Object.keys(results[0]).join(','),
      ...results.map((r) => Object.values(r).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ar-markers-batch-upload-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <Upload className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">バッチアップロード</h1>
          </div>
          <p className="mt-2 text-gray-600">複数のマーカー画像を一括でアップロードします</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側: 設定 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h3 className="text-lg font-semibold mb-4">デフォルト設定</h3>
              <p className="text-sm text-gray-600 mb-4">すべてのマーカーに適用される共通設定です</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリー</label>
                  <select
                    value={defaultSettings.category}
                    onChange={(e) =>
                      setDefaultSettings((prev) => ({ ...prev, category: e.target.value }))
                    }
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ターゲットサイズ
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={defaultSettings.targetWidth}
                      onChange={(e) =>
                        setDefaultSettings((prev) => ({
                          ...prev,
                          targetWidth: parseFloat(e.target.value) || 1,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="幅(m)"
                      step="0.1"
                      min="0.1"
                      max="10"
                    />
                    <input
                      type="number"
                      value={defaultSettings.targetHeight}
                      onChange={(e) =>
                        setDefaultSettings((prev) => ({
                          ...prev,
                          targetHeight: parseFloat(e.target.value) || 1,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="高さ(m)"
                      step="0.1"
                      min="0.1"
                      max="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={defaultSettings.isPublic}
                      onChange={(e) =>
                        setDefaultSettings((prev) => ({ ...prev, isPublic: e.target.checked }))
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">マーカーを公開</span>
                  </label>
                </div>

                {/* アップロード情報 */}
                {uploadSummary && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">アップロード結果</h4>
                    <div className="space-y-1 text-sm">
                      <div>合計: {uploadSummary.total}件</div>
                      <div className="text-green-600">成功: {uploadSummary.success}件</div>
                      {uploadSummary.failed > 0 && (
                        <div className="text-red-600">失敗: {uploadSummary.failed}件</div>
                      )}
                    </div>
                    <button
                      onClick={handleExportResults}
                      className="mt-3 w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      結果をCSVでダウンロード
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右側: ファイルリスト */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* ファイル選択エリア */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors mb-6">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="batch-upload"
                  disabled={isUploading}
                />
                <label htmlFor="batch-upload" className="cursor-pointer">
                  <FileImage className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-600">
                    クリックまたはドラッグ＆ドロップで複数の画像を選択
                  </p>
                  <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP (各最大5MB)</p>
                </label>
              </div>

              {/* 進捗バー */}
              {isUploading && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>アップロード中...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* ファイルリスト */}
              {files.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">選択されたファイル ({files.length}件)</h3>
                    {!isUploading && files.length > 0 && (
                      <button
                        onClick={handleBatchUpload}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        一括アップロード
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 ${
                          file.status === 'processing'
                            ? 'border-blue-400 bg-blue-50'
                            : file.status === 'success'
                              ? 'border-green-400 bg-green-50'
                              : file.status === 'error'
                                ? 'border-red-400 bg-red-50'
                                : 'border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative w-16 h-16">
                            <Image
                              src={file.preview}
                              alt={file.name}
                              fill
                              className="object-cover rounded"
                              sizes="64px"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={file.name}
                              onChange={(e) => handleNameChange(index, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="マーカー名"
                              disabled={isUploading}
                            />
                            <p className="text-xs text-gray-500 mt-1">{file.file.name}</p>

                            {/* ステータス表示 */}
                            {file.status === 'processing' && (
                              <div className="flex items-center mt-2 text-blue-600">
                                <Loader2 className="animate-spin h-4 w-4 mr-1" />
                                <span className="text-sm">処理中...</span>
                              </div>
                            )}
                            {file.status === 'success' && (
                              <div className="mt-2">
                                <div className="flex items-center text-green-600">
                                  <Check className="h-4 w-4 mr-1" />
                                  <span className="text-sm">成功</span>
                                </div>
                                {file.qualityScore !== undefined && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    品質スコア: {file.qualityScore}/100
                                  </p>
                                )}
                              </div>
                            )}
                            {file.status === 'error' && (
                              <div className="flex items-start mt-2 text-red-600">
                                <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{file.error || 'エラー'}</span>
                              </div>
                            )}
                          </div>
                          {!isUploading && file.status === 'pending' && (
                            <button
                              onClick={() => handleRemoveFile(index)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 空の状態 */}
              {files.length === 0 && (
                <div className="text-center py-8">
                  <Info className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-gray-600">まだファイルが選択されていません</p>
                  <p className="text-sm text-gray-500 mt-1">
                    上のエリアをクリックして画像を選択してください
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
