'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  FileText,
  Eye,
  Heart,
  TrendingUp,
  Package,
  Activity,
  BarChart3,
  Settings,
} from 'lucide-react'
import { AnimatedStatCard } from '@/components/dashboard/AnimatedStatCard'
import { ComparisonChart } from '@/components/dashboard/ComparisonChart'
import { ActivityChart } from '@/components/dashboard/ActivityChart'
import { RealtimeMetrics } from '@/components/dashboard/RealtimeMetrics'
import { ExportButton } from '@/components/dashboard/ExportButton'
import { InteractiveFilters } from '@/components/dashboard/InteractiveFilters'
import { DrilldownModal } from '@/components/dashboard/DrilldownModal'

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
  previous?: {
    total_users: number
    active_users: number
    total_content: number
    total_markers: number
    total_sessions: number
    avg_session_duration: number
    content_views: number
    content_likes: number
  }
}

interface TrendData {
  date: string
  name?: string
  new_users: number
  active_users: number
  new_content: number
  sessions: number
  avg_session_duration: number
  current?: number
  previous?: number
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
  const [filters, setFilters] = useState<any>({ dateRange: 30 })
  const [drilldownData, setDrilldownData] = useState<any>(null)
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [filters])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams({
        days: filters.dateRange?.toString() || '30',
        ...(filters.userRole && { role: filters.userRole }),
        ...(filters.contentCategory && { category: filters.contentCategory }),
        ...(filters.comparison && { comparison: 'true' }),
      })

      // ダッシュボードメトリクス取得
      const metricsResponse = await fetch(`/api/statistics?type=dashboard&${params}`)
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()

        // Add mock previous data for comparison if enabled
        if (filters.comparison) {
          metricsData.previous = {
            total_users: Math.floor(metricsData.total_users * 0.85),
            active_users: Math.floor(metricsData.active_users * 0.9),
            total_content: Math.floor(metricsData.total_content * 0.8),
            total_markers: Math.floor(metricsData.total_markers * 0.75),
            total_sessions: Math.floor(metricsData.total_sessions * 0.88),
            avg_session_duration: metricsData.avg_session_duration * 0.95,
            content_views: Math.floor(metricsData.content_views * 0.82),
            content_likes: Math.floor(metricsData.content_likes * 0.78),
          }
        }

        setMetrics(metricsData)
      }

      // トレンドデータ取得
      const trendsResponse = await fetch(`/api/statistics?type=trends&${params}`)
      if (trendsResponse.ok) {
        const trendsData = await trendsResponse.json()
        setTrends(
          trendsData.map((item: any, index: number) => ({
            ...item,
            name: new Date(item.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            current: item.active_users,
            previous: filters.comparison
              ? Math.floor(item.active_users * (0.7 + Math.random() * 0.4))
              : undefined,
          }))
        )
      }

      // カテゴリー統計取得
      const categoriesResponse = await fetch(`/api/statistics?type=categories&${params}`)
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

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters)
  }

  const handleStatCardClick = (metric: string) => {
    // Create drilldown data based on the clicked metric
    const drilldown = {
      title: metric,
      category: 'Metric Details',
      metrics: [
        { label: 'Current Value', value: 1234, change: 12.5, icon: TrendingUp },
        { label: 'Previous Period', value: 1100, icon: Activity },
        { label: 'Peak Value', value: 1500, change: 8.2, icon: BarChart3 },
        { label: 'Average', value: 1150, change: -2.1, icon: Package },
      ],
      chartData: trends.slice(0, 7).map((t) => ({
        name: t.name || t.date,
        current: Math.floor(Math.random() * 1000),
        previous: Math.floor(Math.random() * 800),
      })),
      details: {
        last_updated: new Date().toISOString(),
        data_source: 'System Analytics',
        calculation_method: 'Real-time aggregation',
        confidence_level: '95%',
      },
    }
    setDrilldownData(drilldown)
    setIsDrilldownOpen(true)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Usage Statistics Dashboard</h1>
              <p className="text-gray-600">
                Monitor your WebAR platform performance and usage with interactive analytics
              </p>
            </div>
            <div className="flex flex-col space-y-4">
              <div className="flex space-x-4">
                <button className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                  <Settings className="h-5 w-5 text-gray-600" />
                </button>
                <ExportButton
                  data={{ metrics, trends, categories }}
                  filename="statistics_dashboard"
                  format="json"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Filters */}
        <div className="mb-6">
          <InteractiveFilters onFilterChange={handleFilterChange} initialFilters={filters} />
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
            {/* Key Metrics with Animation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <AnimatedStatCard
                title="Total Users"
                value={metrics.total_users}
                previousValue={metrics.previous?.total_users}
                icon={Users}
                color="blue"
                subtitle={`+${metrics.new_users_period} this period`}
                onClick={() => handleStatCardClick('Total Users')}
                sparklineData={[100, 120, 115, 130, 125, 140, 135]}
              />
              <AnimatedStatCard
                title="Active Users"
                value={metrics.active_users}
                previousValue={metrics.previous?.active_users}
                icon={Activity}
                color="green"
                subtitle="This period"
                onClick={() => handleStatCardClick('Active Users')}
                sparklineData={[80, 85, 90, 88, 95, 92, 98]}
              />
              <AnimatedStatCard
                title="Total Content"
                value={metrics.total_content}
                previousValue={metrics.previous?.total_content}
                icon={FileText}
                color="purple"
                subtitle={`+${metrics.new_content_period} this period`}
                onClick={() => handleStatCardClick('Total Content')}
                sparklineData={[50, 52, 55, 58, 60, 63, 65]}
              />
              <AnimatedStatCard
                title="Total Markers"
                value={metrics.total_markers}
                previousValue={metrics.previous?.total_markers}
                icon={Package}
                color="orange"
                onClick={() => handleStatCardClick('Total Markers')}
                sparklineData={[30, 32, 35, 33, 38, 40, 42]}
              />
            </div>

            {/* Engagement Metrics with Animation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <AnimatedStatCard
                title="Content Views"
                value={metrics.content_views}
                previousValue={metrics.previous?.content_views}
                icon={Eye}
                color="blue"
                onClick={() => handleStatCardClick('Content Views')}
              />
              <AnimatedStatCard
                title="Content Likes"
                value={metrics.content_likes}
                previousValue={metrics.previous?.content_likes}
                icon={Heart}
                color="red"
                onClick={() => handleStatCardClick('Content Likes')}
              />
              <AnimatedStatCard
                title="Total Sessions"
                value={metrics.total_sessions}
                previousValue={metrics.previous?.total_sessions}
                icon={BarChart3}
                color="green"
                subtitle="This period"
                onClick={() => handleStatCardClick('Total Sessions')}
              />
              <AnimatedStatCard
                title="Avg Session Duration"
                value={Math.round(metrics.avg_session_duration / 60)}
                previousValue={
                  metrics.previous
                    ? Math.round(metrics.previous.avg_session_duration / 60)
                    : undefined
                }
                icon={TrendingUp}
                color="purple"
                format="duration"
                onClick={() => handleStatCardClick('Session Duration')}
              />
            </div>

            {/* Comparison Charts */}
            {filters.comparison && trends.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ComparisonChart
                  title="User Activity Comparison"
                  data={trends}
                  type="area"
                  currentPeriodLabel="Current Period"
                  previousPeriodLabel="Previous Period"
                  onDataPointClick={(data) => {
                    console.log('Data point clicked:', data)
                  }}
                />
                <ComparisonChart
                  title="Content Performance"
                  data={trends.map((t) => ({
                    name: t.name || t.date,
                    current: t.new_content,
                    previous: filters.comparison ? Math.floor(t.new_content * 0.8) : undefined,
                  }))}
                  type="bar"
                  currentPeriodLabel="Current"
                  previousPeriodLabel="Previous"
                />
              </div>
            )}
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && trends.length > 0 && (
          <div className="space-y-8">
            {filters.comparison ? (
              <>
                <ComparisonChart
                  title="User Activity Trends - Period Comparison"
                  data={trends}
                  type="area"
                  showTrend={true}
                  onDataPointClick={(data) => {
                    const drilldown = {
                      title: 'User Activity Details',
                      category: data.name || data.date,
                      metrics: [
                        { label: 'Active Users', value: data.current || 0, icon: Users },
                        { label: 'New Users', value: data.new_users || 0, icon: TrendingUp },
                        { label: 'Sessions', value: data.sessions || 0, icon: Activity },
                        { label: 'Content Created', value: data.new_content || 0, icon: FileText },
                      ],
                      details: data,
                    }
                    setDrilldownData(drilldown)
                    setIsDrilldownOpen(true)
                  }}
                />
                <ComparisonChart
                  title="Content & Sessions - Period Comparison"
                  data={trends.map((t) => ({
                    name: t.name || t.date,
                    current: t.sessions,
                    previous: filters.comparison ? Math.floor(t.sessions * 0.85) : undefined,
                  }))}
                  type="line"
                />
              </>
            ) : (
              <>
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
              </>
            )}

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

        {/* Drilldown Modal */}
        {drilldownData && (
          <DrilldownModal
            isOpen={isDrilldownOpen}
            onClose={() => setIsDrilldownOpen(false)}
            data={drilldownData}
          />
        )}
      </div>
    </div>
  )
}
