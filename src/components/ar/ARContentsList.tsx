'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Download,
  Upload,
  Globe,
  Lock,
  Archive,
  FileText,
  Plus,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import ARContentForm from './ARContentForm'
import ARContentDetail from './ARContentDetail'

interface ARContent {
  id: string
  title: string
  description: string | null
  category: string | null
  tags: string[] | null
  content_type: 'image-target' | 'marker-based' | 'location-based'
  marker_url: string | null
  model_url: string | null
  thumbnail_url: string | null
  status: 'draft' | 'published' | 'archived' | 'deleted'
  is_public: boolean
  view_count: number
  created_at: string
  updated_at: string
  profiles?: {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
  ar_markers?: Array<{
    id: string
    marker_type: string
    marker_image_url: string
    is_active: boolean
  }>
}

export default function ARContentsList() {
  const [contents, setContents] = useState<ARContent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [categories, setCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null)
  const limit = 10

  const fetchContents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: searchQuery,
        status: statusFilter,
        category: categoryFilter,
        sortBy,
        sortOrder,
      })

      const response = await fetch(`/api/ar-contents?${params}`)
      const data = await response.json()

      if (response.ok) {
        setContents(data.contents)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Error fetching contents:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, statusFilter, categoryFilter, sortBy, sortOrder])

  useEffect(() => {
    fetchContents()
  }, [fetchContents])

  const handleSelectAll = () => {
    if (selectedIds.size === contents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contents.map((c) => c.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleDelete = async (ids: string[]) => {
    setDeleteTargetIds(ids)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/ar-contents?ids=${deleteTargetIds.join(',')}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchContents()
        setSelectedIds(new Set())
      }
    } catch (error) {
      console.error('Error deleting contents:', error)
    } finally {
      setShowDeleteModal(false)
      setDeleteTargetIds([])
    }
  }

  const handleStatusChange = async (ids: string[], status: string) => {
    try {
      const response = await fetch('/api/ar-contents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status }),
      })

      if (response.ok) {
        await fetchContents()
        setSelectedIds(new Set())
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleView = (contentId: string) => {
    setSelectedContentId(contentId)
    setShowDetailModal(true)
  }

  const handleEdit = (contentId: string) => {
    setSelectedContentId(contentId)
    setShowEditModal(true)
  }

  const handleCreateSave = () => {
    setShowCreateModal(false)
    fetchContents()
  }

  const handleEditSave = () => {
    setShowEditModal(false)
    setSelectedContentId(null)
    fetchContents()
  }

  const handleDetailEdit = () => {
    setShowDetailModal(false)
    setShowEditModal(true)
  }

  const handleDetailDelete = () => {
    setShowDetailModal(false)
    setSelectedContentId(null)
    fetchContents()
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { icon: FileText, label: '下書き', className: 'bg-gray-100 text-gray-700' },
      published: { icon: Globe, label: '公開中', className: 'bg-green-100 text-green-700' },
      archived: { icon: Archive, label: 'アーカイブ', className: 'bg-yellow-100 text-yellow-700' },
      deleted: { icon: Trash2, label: '削除済み', className: 'bg-red-100 text-red-700' },
    }
    const badge = badges[status as keyof typeof badges] || badges.draft
    const Icon = badge.icon
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}
      >
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  const getContentTypeBadge = (type: string) => {
    const types = {
      'image-target': { label: '画像認識', className: 'bg-blue-100 text-blue-700' },
      'marker-based': { label: 'マーカー', className: 'bg-purple-100 text-purple-700' },
      'location-based': { label: '位置情報', className: 'bg-indigo-100 text-indigo-700' },
    }
    const typeInfo = types[type as keyof typeof types] || types['marker-based']
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeInfo.className}`}
      >
        {typeInfo.label}
      </span>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ARコンテンツ一覧</h1>
          <p className="text-gray-600">作成したARコンテンツを管理します</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          新規作成
        </button>
      </div>

      {/* フィルターとアクション */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="コンテンツを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべてのステータス</option>
              <option value="draft">下書き</option>
              <option value="published">公開中</option>
              <option value="archived">アーカイブ</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべてのカテゴリ</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusChange(Array.from(selectedIds), 'published')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                公開
              </button>
              <button
                onClick={() => handleStatusChange(Array.from(selectedIds), 'archived')}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                アーカイブ
              </button>
              <button
                onClick={() => handleDelete(Array.from(selectedIds))}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                削除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {selectedIds.size === contents.length && contents.length > 0 ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  コンテンツ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイプ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  公開設定
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  閲覧数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  更新日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    読み込み中...
                  </td>
                </tr>
              ) : contents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    コンテンツがありません
                  </td>
                </tr>
              ) : (
                contents.map((content) => (
                  <tr key={content.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleSelectOne(content.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {selectedIds.has(content.id) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {content.thumbnail_url ? (
                          <Image
                            src={content.thumbnail_url}
                            alt={content.title}
                            width={48}
                            height={48}
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{content.title}</p>
                          {content.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {content.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getContentTypeBadge(content.content_type)}</td>
                    <td className="px-6 py-4">{getStatusBadge(content.status)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1">
                        {content.is_public ? (
                          <>
                            <Globe className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-gray-600">公開</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">非公開</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{content.view_count}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {formatDistanceToNow(new Date(content.updated_at), {
                          addSuffix: true,
                          locale: ja,
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(content.id)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="詳細"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(content.id)}
                          className="p-1 text-gray-400 hover:text-green-600"
                          title="編集"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete([content.id])}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                全{total}件中 {(currentPage - 1) * limit + 1}-{Math.min(currentPage * limit, total)}
                件を表示
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-3 py-1 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 削除確認モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">削除の確認</h3>
            <p className="text-gray-600 mb-6">
              選択した{deleteTargetIds.length}件のコンテンツを削除してもよろしいですか？
              この操作は取り消せません。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="relative bg-white rounded-lg w-full max-w-4xl mx-4 my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">新規ARコンテンツ作成</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <ARContentForm
                mode="create"
                onSave={handleCreateSave}
                onCancel={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {showEditModal && selectedContentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="relative bg-white rounded-lg w-full max-w-4xl mx-4 my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">ARコンテンツ編集</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedContentId(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <ARContentForm
                contentId={selectedContentId}
                mode="edit"
                onSave={handleEditSave}
                onCancel={() => {
                  setShowEditModal(false)
                  setSelectedContentId(null)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 詳細表示モーダル */}
      {showDetailModal && selectedContentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="relative bg-white rounded-lg w-full max-w-6xl mx-4 my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">ARコンテンツ詳細</h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedContentId(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <ARContentDetail
                contentId={selectedContentId}
                onEdit={handleDetailEdit}
                onDelete={handleDetailDelete}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
