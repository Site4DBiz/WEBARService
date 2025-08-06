'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Clock,
  CheckCircle,
  Download,
  Trash2,
  RefreshCw,
  User,
  FileText,
  Image as ImageIcon,
} from 'lucide-react'

interface MarkerVersion {
  id: string
  marker_id: string
  version_number: number
  image_url: string
  thumbnail_url: string | null
  quality_score: number
  file_size: number | null
  width: number | null
  height: number | null
  mime_type: string | null
  change_description: string | null
  is_current: boolean
  created_by: string | null
  created_at: string
  created_by_profile?: {
    username: string | null
    full_name: string | null
  }
}

interface ARMarkerVersionHistoryProps {
  markerId: string
  canEdit: boolean
}

export default function ARMarkerVersionHistory({ markerId, canEdit }: ARMarkerVersionHistoryProps) {
  const [versions, setVersions] = useState<MarkerVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<MarkerVersion | null>(null)

  useEffect(() => {
    fetchVersions()
  }, [markerId])

  const fetchVersions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ar-markers/versions?marker_id=${markerId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch versions')
      }

      const data = await response.json()
      setVersions(data.versions || [])
    } catch (err) {
      setError('バージョン履歴の取得に失敗しました')
      console.error('Error fetching versions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSetCurrent = async (versionId: string) => {
    if (!canEdit) return

    try {
      const response = await fetch('/api/ar-markers/versions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version_id: versionId,
          is_current: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update version')
      }

      await fetchVersions()
    } catch (err) {
      console.error('Error updating version:', err)
      alert('バージョンの更新に失敗しました')
    }
  }

  const handleDeleteVersion = async (versionId: string) => {
    if (!canEdit) return
    if (!confirm('このバージョンを削除してもよろしいですか？')) return

    try {
      const response = await fetch(`/api/ar-markers/versions?version_id=${versionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete version')
      }

      await fetchVersions()
    } catch (err: any) {
      console.error('Error deleting version:', err)
      alert(err.message || 'バージョンの削除に失敗しました')
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return <div className="text-red-600 text-center py-4">{error}</div>
  }

  if (versions.length === 0) {
    return <div className="text-gray-500 text-center py-8">バージョン履歴がありません</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          バージョン履歴
        </h3>
        <span className="text-sm text-gray-600">{versions.length} バージョン</span>
      </div>

      <div className="space-y-3">
        {versions.map((version) => (
          <div
            key={version.id}
            className={`border rounded-lg p-4 ${
              version.is_current ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                {/* サムネイル */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  {version.thumbnail_url || version.image_url ? (
                    <Image
                      src={version.thumbnail_url || version.image_url}
                      alt={`Version ${version.version_number}`}
                      fill
                      className="object-cover rounded"
                      sizes="80px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  {version.is_current && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* バージョン情報 */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">バージョン {version.version_number}</span>
                    {version.is_current && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">現在</span>
                    )}
                  </div>

                  {version.change_description && (
                    <p className="text-sm text-gray-600 mb-2 flex items-start gap-1">
                      <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {version.change_description}
                    </p>
                  )}

                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex items-center gap-4">
                      <span>品質スコア: {version.quality_score}/100</span>
                      <span>サイズ: {formatFileSize(version.file_size)}</span>
                      {version.width && version.height && (
                        <span>
                          {version.width} × {version.height}px
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" />
                      <span>
                        {version.created_by_profile?.username ||
                          version.created_by_profile?.full_name ||
                          '不明'}
                      </span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(version.created_at), {
                          addSuffix: true,
                          locale: ja,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* アクションボタン */}
              {canEdit && (
                <div className="flex items-center gap-2">
                  {!version.is_current && (
                    <>
                      <button
                        onClick={() => handleSetCurrent(version.id)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="このバージョンを使用"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVersion(version.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <a
                    href={version.image_url}
                    download
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="ダウンロード"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                バージョン {selectedVersion.version_number} の詳細
              </h3>
              <button
                onClick={() => setSelectedVersion(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              <Image
                src={selectedVersion.image_url}
                alt={`Version ${selectedVersion.version_number}`}
                fill
                className="rounded-lg object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
