'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye,
  Edit,
  Trash2,
  Heart,
  Download,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  FileDown,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getMindARCompiler } from '@/lib/utils/mindar-compiler'

interface ARMarker {
  id: string
  name: string
  description: string | null
  category: string
  tags: string[]
  is_public: boolean
  marker_image_url: string
  marker_pattern_url: string | null
  width: number
  height: number
  quality_score: number
  view_count: number
  created_at: string
  user_id: string
  user?: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
  is_favorite?: boolean
}

interface ARMarkerListProps {
  filter?: 'all' | 'my' | 'public' | 'favorites'
  showActions?: boolean
}

export function ARMarkerList({ filter = 'all', showActions = true }: ARMarkerListProps) {
  const router = useRouter()
  const [markers, setMarkers] = useState<ARMarker[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [compilingMarkers, setCompilingMarkers] = useState<Set<string>>(new Set())
  const itemsPerPage = 12

  const categories = [
    { value: 'all', label: 'すべて' },
    { value: 'general', label: '一般' },
    { value: 'product', label: '製品' },
    { value: 'education', label: '教育' },
    { value: 'entertainment', label: 'エンターテインメント' },
    { value: 'marketing', label: 'マーケティング' },
    { value: 'art', label: 'アート' },
    { value: 'other', label: 'その他' },
  ]

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    fetchMarkers()
  }, [filter, searchQuery, selectedCategory, currentPage])

  const fetchCurrentUser = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const fetchMarkers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        filter,
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
      })

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/ar-markers?${params}`)
      const data = await response.json()

      if (response.ok) {
        setMarkers(data.markers)
        setTotalCount(data.total)
      }
    } catch (error) {
      console.error('マーカー取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (markerId: string) => {
    if (!confirm('このマーカーを削除してもよろしいですか？')) {
      return
    }

    try {
      const response = await fetch(`/api/ar-markers?id=${markerId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMarkers((prev) => prev.filter((m) => m.id !== markerId))
        setTotalCount((prev) => prev - 1)
      }
    } catch (error) {
      console.error('削除エラー:', error)
    }
  }

  const handleToggleFavorite = async (markerId: string, isFavorite: boolean) => {
    if (!currentUser) {
      router.push('/auth/login')
      return
    }

    try {
      const supabase = createClient()

      if (isFavorite) {
        await supabase
          .from('ar_marker_favorites')
          .delete()
          .eq('marker_id', markerId)
          .eq('user_id', currentUser.id)
      } else {
        await supabase.from('ar_marker_favorites').insert({
          marker_id: markerId,
          user_id: currentUser.id,
        })
      }

      setMarkers((prev) =>
        prev.map((m) => (m.id === markerId ? { ...m, is_favorite: !isFavorite } : m))
      )
    } catch (error) {
      console.error('お気に入り操作エラー:', error)
    }
  }

  const handleDownloadMind = async (marker: ARMarker) => {
    if (!currentUser) {
      router.push('/auth/login')
      return
    }

    setCompilingMarkers((prev) => new Set(prev).add(marker.id))

    try {
      // 画像をフェッチ
      const response = await fetch(marker.marker_image_url)
      const blob = await response.blob()
      const file = new File([blob], 'marker.jpg', { type: blob.type })

      // .mindファイルを生成
      const compiler = getMindARCompiler()
      const result = await compiler.compile(file, {
        quality:
          marker.quality_score >= 70 ? 'high' : marker.quality_score >= 50 ? 'medium' : 'low',
        widthInMM: marker.width,
        heightInMM: marker.height,
      })

      if (result.success && result.data) {
        // ダウンロード
        const url = URL.createObjectURL(result.data)
        const a = document.createElement('a')
        a.href = url
        a.download = `${marker.name.replace(/[^a-z0-9]/gi, '_')}.mind`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        // APIに記録
        await fetch('/api/ar-markers/compile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ marker_id: marker.id }),
        })
      } else {
        alert('MindARファイルの生成に失敗しました')
      }
    } catch (error) {
      console.error('MindARファイル生成エラー:', error)
      alert('エラーが発生しました')
    } finally {
      setCompilingMarkers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(marker.id)
        return newSet
      })
    }
  }

  const getQualityColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-50'
    if (score >= 50) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ツールバー */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 検索 */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="マーカーを検索..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* カテゴリーフィルター */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* ビューモード切り替え */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              title="グリッドビュー"
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              title="リストビュー"
            >
              <List className="h-5 w-5" />
            </button>
          </div>

          {/* 新規作成ボタン */}
          {showActions && (
            <button
              onClick={() => router.push('/ar-markers/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              新規マーカー
            </button>
          )}
        </div>
      </div>

      {/* マーカー一覧 */}
      {markers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-gray-500">
            <p className="text-lg mb-2">マーカーが見つかりません</p>
            <p className="text-sm">検索条件を変更するか、新しいマーカーを作成してください</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {markers.map((marker) => (
            <div
              key={marker.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* マーカー画像 */}
              <div className="aspect-square relative bg-gray-100">
                <img
                  src={marker.marker_image_url}
                  alt={marker.name}
                  className="w-full h-full object-cover"
                />
                {marker.is_public && (
                  <span className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
                    公開
                  </span>
                )}
              </div>

              {/* マーカー情報 */}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1 truncate">{marker.name}</h3>
                {marker.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{marker.description}</p>
                )}

                {/* 品質スコア */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${getQualityColor(marker.quality_score)}`}
                  >
                    品質: {marker.quality_score}/100
                  </span>
                  <div className="flex items-center text-sm text-gray-500">
                    <Eye className="h-4 w-4 mr-1" />
                    {marker.view_count}
                  </div>
                </div>

                {/* タグ */}
                {marker.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {marker.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {marker.tags.length > 3 && (
                      <span className="text-xs px-2 py-1 text-gray-500">
                        +{marker.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* アクション */}
                {showActions && (
                  <div className="flex justify-between items-center pt-3 border-t">
                    <div className="flex gap-2">
                      {currentUser?.id === marker.user_id && (
                        <>
                          <button
                            onClick={() => router.push(`/ar-markers/${marker.id}/edit`)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="編集"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(marker.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="削除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleToggleFavorite(marker.id, marker.is_favorite || false)}
                        className={`p-2 rounded-lg transition-colors ${
                          marker.is_favorite
                            ? 'text-red-500 hover:bg-red-50'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title="お気に入り"
                      >
                        <Heart className={`h-4 w-4 ${marker.is_favorite ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDownloadMind(marker)}
                        disabled={compilingMarkers.has(marker.id)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                        title=".mindファイルをダウンロード"
                      >
                        {compilingMarkers.has(marker.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => router.push(`/ar-markers/${marker.id}`)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      詳細 →
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {markers.map((marker) => (
            <div key={marker.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                {/* サムネイル */}
                <img
                  src={marker.marker_image_url}
                  alt={marker.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />

                {/* 情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{marker.name}</h3>
                      {marker.description && (
                        <p className="text-sm text-gray-600 mt-1">{marker.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span
                          className={`text-xs px-2 py-1 rounded ${getQualityColor(marker.quality_score)}`}
                        >
                          品質: {marker.quality_score}/100
                        </span>
                        <span className="text-sm text-gray-500">
                          <Eye className="inline h-4 w-4 mr-1" />
                          {marker.view_count} views
                        </span>
                        {marker.is_public && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                            公開
                          </span>
                        )}
                      </div>
                    </div>

                    {/* アクション */}
                    {showActions && (
                      <div className="flex gap-2 ml-4">
                        {currentUser?.id === marker.user_id && (
                          <>
                            <button
                              onClick={() => router.push(`/ar-markers/${marker.id}/edit`)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="編集"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(marker.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="削除"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() =>
                            handleToggleFavorite(marker.id, marker.is_favorite || false)
                          }
                          className={`p-2 rounded-lg transition-colors ${
                            marker.is_favorite
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          title="お気に入り"
                        >
                          <Heart
                            className={`h-5 w-5 ${marker.is_favorite ? 'fill-current' : ''}`}
                          />
                        </button>
                        <button
                          onClick={() => handleDownloadMind(marker)}
                          disabled={compilingMarkers.has(marker.id)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                          title=".mindファイルをダウンロード"
                        >
                          {compilingMarkers.has(marker.id) ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <FileDown className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            前へ
          </button>

          {[...Array(totalPages)].map((_, i) => {
            const page = i + 1
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            } else if (page === currentPage - 2 || page === currentPage + 2) {
              return (
                <span key={page} className="px-2 py-2">
                  ...
                </span>
              )
            }
            return null
          })}

          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  )
}
