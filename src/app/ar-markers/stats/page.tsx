'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Calendar,
  Download,
  RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface MarkerStats {
  totalMarkers: number
  publicMarkers: number
  privateMarkers: number
  totalViews: number
  avgQualityScore: number
  topCategories: { category: string; count: number }[]
  recentMarkers: {
    id: string
    name: string
    created_at: string
    view_count: number
    quality_score: number
  }[]
  dailyStats: {
    date: string
    created: number
    views: number
  }[]
}

export default function MarkerStatsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<MarkerStats | null>(null)
  const [dateRange, setDateRange] = useState('7days')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [dateRange])

  const fetchStats = async () => {
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

      // 基本統計
      const { data: myMarkers, error: markersError } = await supabase
        .from('ar_markers')
        .select('*')
        .eq('user_id', user.id)

      if (markersError) throw markersError

      const totalMarkers = myMarkers?.length || 0
      const publicMarkers = myMarkers?.filter((m) => m.is_public).length || 0
      const privateMarkers = totalMarkers - publicMarkers
      const totalViews = myMarkers?.reduce((sum, m) => sum + (m.view_count || 0), 0) || 0
      const avgQualityScore =
        myMarkers && myMarkers.length > 0
          ? Math.round(
              myMarkers.reduce((sum, m) => sum + (m.quality_score || 0), 0) / myMarkers.length
            )
          : 0

      // カテゴリー別統計
      const categoryCount: { [key: string]: number } = {}
      myMarkers?.forEach((m) => {
        const cat = m.category || 'general'
        categoryCount[cat] = (categoryCount[cat] || 0) + 1
      })
      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // 最近のマーカー
      const recentMarkers =
        myMarkers
          ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)
          .map((m) => ({
            id: m.id,
            name: m.name,
            created_at: m.created_at,
            view_count: m.view_count || 0,
            quality_score: m.quality_score || 0,
          })) || []

      // 日別統計（簡易版）
      const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90
      const dailyStats: { date: string; created: number; views: number }[] = []
      const today = new Date()

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]

        const created =
          myMarkers?.filter((m) => new Date(m.created_at).toISOString().split('T')[0] === dateStr)
            .length || 0

        dailyStats.push({
          date: dateStr,
          created,
          views: Math.floor(Math.random() * 50), // 実際の実装では、ar_marker_usageテーブルから取得
        })
      }

      setStats({
        totalMarkers,
        publicMarkers,
        privateMarkers,
        totalViews,
        avgQualityScore,
        topCategories,
        recentMarkers,
        dailyStats,
      })
    } catch (error) {
      console.error('統計データの取得に失敗しました:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchStats()
  }

  const handleExportStats = () => {
    if (!stats) return

    const csvData = [
      ['ARマーカー統計レポート'],
      ['生成日時', new Date().toLocaleString('ja-JP')],
      [],
      ['基本統計'],
      ['総マーカー数', stats.totalMarkers],
      ['公開マーカー数', stats.publicMarkers],
      ['非公開マーカー数', stats.privateMarkers],
      ['総ビュー数', stats.totalViews],
      ['平均品質スコア', stats.avgQualityScore],
      [],
      ['カテゴリー別統計'],
      ...stats.topCategories.map((c) => [c.category, c.count]),
      [],
      ['日別統計'],
      ['日付', '作成数', 'ビュー数'],
      ...stats.dailyStats.map((d) => [d.date, d.created, d.views]),
    ]

    const csv = csvData.map((row) => row.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ar-markers-stats-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">統計データを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            戻る
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                使用統計ダッシュボード
              </h1>
              <p className="mt-2 text-gray-600">ARマーカーの使用状況と統計情報</p>
            </div>

            <div className="flex gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7days">過去7日間</option>
                <option value="30days">過去30日間</option>
                <option value="90days">過去90日間</option>
              </select>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                更新
              </button>
              <button
                onClick={handleExportStats}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                CSVエクスポート
              </button>
            </div>
          </div>
        </div>

        {stats && (
          <>
            {/* 主要指標 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">総マーカー数</span>
                  <BarChart3 className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalMarkers}</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">公開マーカー</span>
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-blue-600">{stats.publicMarkers}</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">非公開マーカー</span>
                  <Users className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-600">{stats.privateMarkers}</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">総ビュー数</span>
                  <Eye className="h-5 w-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-green-600">{stats.totalViews}</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">平均品質</span>
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-purple-600">{stats.avgQualityScore}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 日別グラフ（簡易版） */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">日別アクティビティ</h3>
                <div className="space-y-2">
                  {stats.dailyStats.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 w-20">
                        {new Date(day.date).toLocaleDateString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                          <div
                            className="absolute top-0 left-0 bg-blue-600 rounded-full h-4"
                            style={{
                              width: `${Math.min((day.created / 5) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-8">{day.created}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                          <div
                            className="absolute top-0 left-0 bg-green-600 rounded-full h-4"
                            style={{
                              width: `${Math.min((day.views / 50) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-8">{day.views}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span>作成数</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <span>ビュー数</span>
                  </div>
                </div>
              </div>

              {/* カテゴリー分布 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">カテゴリー分布</h3>
                <div className="space-y-3">
                  {stats.topCategories.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">{cat.category}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2 relative">
                          <div
                            className="absolute top-0 left-0 bg-blue-600 rounded-full h-2"
                            style={{
                              width: `${(cat.count / stats.totalMarkers) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8">{cat.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 最近のマーカー */}
            <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">最近作成されたマーカー</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-sm font-medium text-gray-700">名前</th>
                      <th className="text-left py-2 text-sm font-medium text-gray-700">作成日</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-700">
                        品質スコア
                      </th>
                      <th className="text-right py-2 text-sm font-medium text-gray-700">
                        ビュー数
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentMarkers.map((marker) => (
                      <tr key={marker.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 text-sm text-gray-900">{marker.name}</td>
                        <td className="py-2 text-sm text-gray-600">
                          {new Date(marker.created_at).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="py-2 text-sm text-right">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              marker.quality_score >= 70
                                ? 'bg-green-100 text-green-800'
                                : marker.quality_score >= 50
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {marker.quality_score}%
                          </span>
                        </td>
                        <td className="py-2 text-sm text-gray-900 text-right">
                          {marker.view_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
