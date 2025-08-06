'use client'

import { useEffect, useState } from 'react'
import { Activity, Users, FileText, Package, AlertCircle, CheckCircle } from 'lucide-react'

interface RealtimeStats {
  current_active_users: number
  active_sessions: number
  today_new_users: number
  today_new_content: number
  today_sessions: number
  system_health: 'healthy' | 'warning' | 'error'
}

export function RealtimeMetrics() {
  const [stats, setStats] = useState<RealtimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRealtimeStats = async () => {
    try {
      const response = await fetch('/api/statistics?type=realtime')
      if (!response.ok) throw new Error('Failed to fetch realtime stats')
      const data = await response.json()
      setStats(data)
      setError(null)
    } catch (err) {
      setError('Failed to load realtime metrics')
      console.error('Realtime metrics error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRealtimeStats()
    const interval = setInterval(fetchRealtimeStats, 30000) // 30秒ごとに更新
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center text-red-600">
          <AlertCircle className="mr-2" size={20} />
          <span>{error || 'No data available'}</span>
        </div>
      </div>
    )
  }

  const healthIcon =
    stats.system_health === 'healthy' ? (
      <CheckCircle className="text-green-500" size={20} />
    ) : (
      <AlertCircle className="text-yellow-500" size={20} />
    )

  const metrics = [
    {
      label: 'Active Users',
      value: stats.current_active_users,
      icon: <Users className="text-blue-500" size={16} />,
      subtitle: 'Last 15 minutes',
    },
    {
      label: 'Active Sessions',
      value: stats.active_sessions,
      icon: <Activity className="text-green-500" size={16} />,
      subtitle: 'Currently running',
    },
    {
      label: 'New Users Today',
      value: stats.today_new_users,
      icon: <Users className="text-purple-500" size={16} />,
      subtitle: 'Since midnight',
    },
    {
      label: 'New Content Today',
      value: stats.today_new_content,
      icon: <FileText className="text-orange-500" size={16} />,
      subtitle: 'Created today',
    },
    {
      label: 'Total Sessions Today',
      value: stats.today_sessions,
      icon: <Package className="text-indigo-500" size={16} />,
      subtitle: 'Since midnight',
    },
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Realtime Metrics</h3>
        <div className="flex items-center space-x-2">
          {healthIcon}
          <span className="text-sm text-gray-600">System {stats.system_health}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="text-center">
            <div className="flex items-center justify-center mb-1">
              {metric.icon}
              <span className="ml-1 text-xs text-gray-500">{metric.label}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
            <div className="text-xs text-gray-500">{metric.subtitle}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Auto-refresh: 30s</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  )
}
