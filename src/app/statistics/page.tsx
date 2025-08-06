'use client'

import { useEffect, useState } from 'react'
import { Users, FileText, Eye, Heart, TrendingUp, Package, Activity, BarChart3 } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { ActivityChart } from '@/components/dashboard/ActivityChart'
import { RealtimeMetrics } from '@/components/dashboard/RealtimeMetrics'
import { ExportButton } from '@/components/dashboard/ExportButton'

interface DashboardMetrics {
  total_users: number
  active_users: number
  total_content: number
  total_markers: number
  total_sessions: number
  avg_session_duration: number
  content_views: number
  content_likes: number
  new_users_period: number
  new_content_period: number
}

interface TrendData {
  date: string
  new_users: number
  active_users: number
  new_content: number
  sessions: number
  avg_session_duration: number
}

interface CategoryData {
  category: string
  content_count: number
  total_views: number
  total_likes: number
  avg_quality_score: number
  active_users: number
}

export default function StatisticsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [trends, setTrends] = useState<TrendData[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(30)
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'categories'>('overview')

  useEffect(() => {
    fetchDashboardData()
  }, [dateRange])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // ダッシュボードメトリクス取得
      const metricsResponse = await fetch(`/api/statistics?type=dashboard&days=${dateRange}`)
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData)
      }

      // トレンドデータ取得
      const trendsResponse = await fetch(`/api/statistics?type=trends&days=${dateRange}`)
      if (trendsResponse.ok) {
        const trendsData = await trendsResponse.json()
        setTrends(
          trendsData.map((item: any) => ({
            ...item,
            date: new Date(item.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
          }))
        )
      }

      // カテゴリー統計取得
      const categoriesResponse = await fetch('/api/statistics?type=categories')
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json()
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Usage Statistics Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Monitor your WebAR platform performance and usage
              </p>
            </div>
            <div className="flex space-x-4">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <ExportButton
                data={{ metrics, trends, categories }}
                filename="statistics_dashboard"
                format="json"
              />
            </div>
          </div>
        </div>

        {/* Realtime Metrics */}
        <div className="mb-8">
          <RealtimeMetrics />
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {(['overview', 'trends', 'categories'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && metrics && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Users"
                value={metrics.total_users}
                icon={Users}
                color="blue"
                subtitle={`+${metrics.new_users_period} this period`}
              />
              <StatCard
                title="Active Users"
                value={metrics.active_users}
                icon={Activity}
                color="green"
                subtitle="This period"
              />
              <StatCard
                title="Total Content"
                value={metrics.total_content}
                icon={FileText}
                color="purple"
                subtitle={`+${metrics.new_content_period} this period`}
              />
              <StatCard
                title="Total Markers"
                value={metrics.total_markers}
                icon={Package}
                color="orange"
              />
            </div>

            {/* Engagement Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Content Views"
                value={metrics.content_views}
                icon={Eye}
                color="blue"
              />
              <StatCard
                title="Content Likes"
                value={metrics.content_likes}
                icon={Heart}
                color="red"
              />
              <StatCard
                title="Total Sessions"
                value={metrics.total_sessions}
                icon={BarChart3}
                color="green"
                subtitle="This period"
              />
              <StatCard
                title="Avg Session Duration"
                value={`${Math.round(metrics.avg_session_duration / 60)}m`}
                icon={TrendingUp}
                color="purple"
              />
            </div>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && trends.length > 0 && (
          <div className="space-y-8">
            <ActivityChart
              title="User Activity Trends"
              data={trends}
              type="area"
              dataKeys={[
                { key: 'active_users', color: '#3B82F6', name: 'Active Users' },
                { key: 'new_users', color: '#10B981', name: 'New Users' },
              ]}
              height={350}
            />

            <ActivityChart
              title="Content & Sessions"
              data={trends}
              type="line"
              dataKeys={[
                { key: 'new_content', color: '#8B5CF6', name: 'New Content' },
                { key: 'sessions', color: '#F59E0B', name: 'Sessions' },
              ]}
              height={350}
            />

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Trend Data</h3>
              <div className="flex space-x-4">
                <ExportButton data={trends} filename="trends" format="csv" />
                <ExportButton data={trends} filename="trends" format="json" />
              </div>
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && categories.length > 0 && (
          <div className="space-y-8">
            <ActivityChart
              title="Content by Category"
              data={categories.slice(0, 10)}
              type="bar"
              dataKeys={[
                { key: 'content_count', color: '#3B82F6', name: 'Content Count' },
                { key: 'active_users', color: '#10B981', name: 'Active Users' },
              ]}
              height={350}
            />

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Category Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Content
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Views
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Likes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quality Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Active Users
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.map((cat, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {cat.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cat.content_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cat.total_views}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cat.total_likes}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cat.avg_quality_score ? cat.avg_quality_score.toFixed(1) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {cat.active_users}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-gray-200">
                <ExportButton data={categories} filename="categories" format="csv" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
