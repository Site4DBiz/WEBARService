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
import { InteractiveFilters } from '@/components/dashboard/InteractiveFilters'
import { DrilldownModal } from '@/components/dashboard/DrilldownModal'
import { ExportButton } from '@/components/dashboard/ExportButton'

interface DashboardMetrics {
  total_users: number
  active_users: number
  total_content: number
  total_markers: number
  content_views: number
  content_likes: number
  total_sessions: number
  avg_session_duration: number
  ar_detection_rate: number
  error_rate: number
  realtime_active_users: number
  device_distribution: {
    mobile: number
    desktop: number
    tablet: number
  }
  previous?: {
    total_users: number
    active_users: number
    total_content: number
    total_markers: number
    content_views: number
    content_likes: number
    total_sessions: number
    avg_session_duration: number
  }
}

interface TrendData {
  date: string
  users: number
  content: number
  sessions: number
  views: number
  name?: string
  value?: number
}

interface CategoryData {
  category: string
  count: number
  views: number
  quality: number
}

export default function StatisticsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_users: 1234,
    active_users: 456,
    total_content: 789,
    total_markers: 567,
    content_views: 12345,
    content_likes: 2345,
    total_sessions: 5678,
    avg_session_duration: 245,
    ar_detection_rate: 92.5,
    error_rate: 0.8,
    realtime_active_users: 23,
    device_distribution: {
      mobile: 65,
      desktop: 25,
      tablet: 10,
    },
    previous: {
      total_users: 1100,
      active_users: 400,
      total_content: 700,
      total_markers: 500,
      content_views: 11000,
      content_likes: 2000,
      total_sessions: 5000,
      avg_session_duration: 230,
    },
  })

  const [trends, setTrends] = useState<TrendData[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'categories'>('overview')
  const [dateRange, setDateRange] = useState('7d')
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false)
  const [drilldownData, setDrilldownData] = useState<any>(null)
  const [filters, setFilters] = useState({
    dateRange: 'week',
    userRole: 'all',
    category: 'all',
    deviceType: 'all',
    comparison: false,
  })

  useEffect(() => {
    fetchStatistics()
    const interval = setInterval(fetchStatistics, 30000)
    return () => clearInterval(interval)
  }, [dateRange, filters])

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      const [metricsData, trendsData, categoriesData] = await Promise.all([
        fetchMetrics(),
        fetchTrends(),
        fetchCategories(),
      ])
      setMetrics(metricsData)
      setTrends(trendsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    const mockData: DashboardMetrics = {
      total_users: Math.floor(Math.random() * 500) + 1000,
      active_users: Math.floor(Math.random() * 200) + 400,
      total_content: Math.floor(Math.random() * 300) + 700,
      total_markers: Math.floor(Math.random() * 200) + 500,
      content_views: Math.floor(Math.random() * 5000) + 10000,
      content_likes: Math.floor(Math.random() * 1000) + 2000,
      total_sessions: Math.floor(Math.random() * 2000) + 5000,
      avg_session_duration: Math.floor(Math.random() * 50) + 220,
      ar_detection_rate: 90 + Math.random() * 8,
      error_rate: Math.random() * 2,
      realtime_active_users: Math.floor(Math.random() * 50) + 10,
      device_distribution: {
        mobile: 60 + Math.floor(Math.random() * 10),
        desktop: 20 + Math.floor(Math.random() * 10),
        tablet: 10 + Math.floor(Math.random() * 5),
      },
      previous: {
        total_users: Math.floor(Math.random() * 400) + 900,
        active_users: Math.floor(Math.random() * 150) + 350,
        total_content: Math.floor(Math.random() * 250) + 650,
        total_markers: Math.floor(Math.random() * 150) + 450,
        content_views: Math.floor(Math.random() * 4000) + 9000,
        content_likes: Math.floor(Math.random() * 800) + 1800,
        total_sessions: Math.floor(Math.random() * 1500) + 4500,
        avg_session_duration: Math.floor(Math.random() * 40) + 210,
      },
    }
    return mockData
  }

  const fetchTrends = async () => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
    const data: TrendData[] = []
    const now = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      data.push({
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 100) + 50,
        content: Math.floor(Math.random() * 50) + 20,
        sessions: Math.floor(Math.random() * 200) + 100,
        views: Math.floor(Math.random() * 500) + 300,
      })
    }
    return data
  }

  const fetchCategories = async () => {
    return [
      { category: 'Education', count: 234, views: 5678, quality: 92 },
      { category: 'Entertainment', count: 189, views: 4567, quality: 88 },
      { category: 'Business', count: 145, views: 3456, quality: 95 },
      { category: 'Art', count: 98, views: 2345, quality: 90 },
      { category: 'Technology', count: 76, views: 1234, quality: 94 },
    ]
  }

  const handleExport = (format: 'csv' | 'json') => {
    const data = {
      metrics,
      trends,
      categories,
      exportDate: new Date().toISOString(),
    }

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `statistics-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const csvRows = [
        ['Metric', 'Value', 'Previous Value', 'Change %'],
        [
          'Total Users',
          metrics.total_users,
          metrics.previous?.total_users || 0,
          (
            ((metrics.total_users - (metrics.previous?.total_users || 0)) /
              (metrics.previous?.total_users || 1)) *
            100
          ).toFixed(2),
        ],
      ]
      const csvContent = csvRows.map((row) => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `statistics-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleStatCardClick = (title: string) => {
    setDrilldownData({
      title,
      data: trends,
      details: `Detailed analytics for ${title}`,
    })
    setIsDrilldownOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">統計ダッシュボード</h1>
        <div className="flex gap-4">
          <InteractiveFilters filters={filters} onFiltersChange={setFilters} />
          <ExportButton onExport={handleExport} />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'trends' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Trends
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'categories' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Categories
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatedStatCard
              title="Total Users"
              value={metrics.total_users}
              previousValue={metrics.previous?.total_users}
              icon={Users}
              color="blue"
              onClick={() => handleStatCardClick('Total Users')}
            />
            <AnimatedStatCard
              title="Active Users"
              value={metrics.active_users}
              previousValue={metrics.previous?.active_users}
              icon={Activity}
              color="green"
              onClick={() => handleStatCardClick('Active Users')}
            />
            <AnimatedStatCard
              title="Total Content"
              value={metrics.total_content}
              previousValue={metrics.previous?.total_content}
              icon={FileText}
              color="purple"
              onClick={() => handleStatCardClick('Total Content')}
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
              unit="min"
              subtitle="Per session"
              onClick={() => handleStatCardClick('Avg Session Duration')}
            />
          </div>

          <RealtimeMetrics
            activeUsers={metrics.realtime_active_users}
            detectionRate={metrics.ar_detection_rate}
            errorRate={metrics.error_rate}
            deviceDistribution={metrics.device_distribution}
          />

          {filters.comparison && (
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
                title="Content Performance Comparison"
                data={trends.map((t) => ({
                  name: t.date,
                  current: t.views,
                  previous: Math.floor(t.views * 0.9),
                }))}
                type="bar"
                currentPeriodLabel="Current"
                previousPeriodLabel="Previous"
              />
            </div>
          )}
        </div>
      )}

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
                    data: trends,
                    details: `Details for ${data.name}: ${data.value}`,
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
              <ActivityChart title="User Activity Trends" data={trends} height={400} />
              <ActivityChart
                title="Content & Sessions"
                data={trends.map((t) => ({
                  date: t.date,
                  users: t.users,
                  content: t.content,
                  sessions: t.sessions,
                  views: t.views,
                }))}
                height={300}
              />
            </>
          )}
        </div>
      )}

      {activeTab === 'categories' && categories.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Content by Category</h3>
            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{cat.category}</span>
                      <span className="text-sm text-gray-600">{cat.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(cat.count / 250) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Category Performance</h3>
            <ActivityChart
              title=""
              data={categories.map((cat) => ({
                date: cat.category,
                users: cat.views,
                content: cat.count,
                sessions: cat.quality,
                views: cat.views,
              }))}
              height={250}
            />
          </div>
        </div>
      )}

      <DrilldownModal
        isOpen={isDrilldownOpen}
        onClose={() => setIsDrilldownOpen(false)}
        data={drilldownData}
      />
    </div>
  )
}
