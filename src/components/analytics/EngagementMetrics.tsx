'use client'

import { Activity, Clock, MousePointer, Target, TrendingUp, Users } from 'lucide-react'

interface EngagementMetricsProps {
  data?: any
}

export default function EngagementMetrics({ data }: EngagementMetricsProps) {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const metrics = [
    {
      label: 'Avg. Session Duration',
      value: formatDuration(data.overview?.sessions?.averageDuration || 245),
      change: '+12%',
      icon: Clock,
      color: 'blue',
      description: 'Time users spend per session'
    },
    {
      label: 'Bounce Rate',
      value: `${data.overview?.sessions?.bounceRate || 35.5}%`,
      change: '-5%',
      icon: MousePointer,
      color: 'green',
      description: 'Users who leave after one page',
      isInverse: true
    },
    {
      label: 'Pages per Session',
      value: data.overview?.views?.averagePerSession || '3.2',
      change: '+8%',
      icon: Target,
      color: 'purple',
      description: 'Average pages viewed per visit'
    },
    {
      label: 'Active Users',
      value: formatNumber(data.overview?.users?.active || 0),
      change: `+${data.overview?.users?.growthRate || 15}%`,
      icon: Users,
      color: 'yellow',
      description: 'Currently active users'
    },
    {
      label: 'Engagement Rate',
      value: '68%',
      change: '+3%',
      icon: Activity,
      color: 'indigo',
      description: 'Users who actively interact'
    },
    {
      label: 'Return Rate',
      value: '42%',
      change: '+7%',
      icon: TrendingUp,
      color: 'pink',
      description: 'Users who return within 7 days'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Engagement Metrics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon
            const isPositive = metric.change.startsWith('+')
            const changeColor = metric.isInverse 
              ? (isPositive ? 'text-red-600' : 'text-green-600')
              : (isPositive ? 'text-green-600' : 'text-red-600')
            
            return (
              <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-${metric.color}-100`}>
                    <Icon className={`h-5 w-5 text-${metric.color}-600`} />
                  </div>
                  <span className={`text-sm font-medium ${changeColor}`}>
                    {metric.change}
                  </span>
                </div>
                <div className="mb-2">
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <p className="text-sm font-medium text-gray-700 mt-1">{metric.label}</p>
                </div>
                <p className="text-xs text-gray-500">{metric.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Engagement Funnel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Funnel</h3>
        <div className="space-y-3">
          {[
            { stage: 'Page Views', value: 10000, percentage: 100 },
            { stage: 'Interactions', value: 6800, percentage: 68 },
            { stage: 'AR Sessions', value: 4200, percentage: 42 },
            { stage: 'Completions', value: 2100, percentage: 21 },
            { stage: 'Shares', value: 840, percentage: 8.4 }
          ].map((stage, index) => (
            <div key={index} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                <span className="text-sm text-gray-600">
                  {formatNumber(stage.value)} ({stage.percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-8 rounded-full flex items-center justify-end pr-3"
                  style={{ width: `${stage.percentage}%` }}
                >
                  <span className="text-xs text-white font-medium">
                    {stage.percentage}%
                  </span>
                </div>
              </div>
              {index < 4 && (
                <div className="text-xs text-gray-500 mt-1">
                  Drop-off: {((stage.value - (index < 4 ? [6800, 4200, 2100, 840][index] : 0)) / stage.value * 100).toFixed(1)}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}