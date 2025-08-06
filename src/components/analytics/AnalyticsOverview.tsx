'use client'

import { TrendingUp, TrendingDown, Users, FileText, Eye, Activity } from 'lucide-react'

interface AnalyticsOverviewProps {
  data?: {
    users?: {
      total: number
      new: number
      active: number
      growthRate: number
    }
    contents?: {
      total: number
      new: number
      statusDistribution: Record<string, number>
    }
    sessions?: {
      total: number
      average: number
      bounceRate: number
      averageDuration: number
    }
    views?: {
      total: number
      unique: number
      averagePerSession: number
    }
  }
}

export default function AnalyticsOverview({ data }: AnalyticsOverviewProps) {
  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Total Users',
      value: data.users?.total || 0,
      change: data.users?.growthRate || 0,
      icon: Users,
      color: 'blue',
      subtitle: `${data.users?.new || 0} new users`
    },
    {
      title: 'Content Items',
      value: data.contents?.total || 0,
      change: data.contents?.new || 0,
      icon: FileText,
      color: 'green',
      subtitle: `${data.contents?.new || 0} new this period`
    },
    {
      title: 'Total Views',
      value: data.views?.total || 0,
      change: ((data.views?.total || 0) / Math.max(1, data.views?.unique || 1) * 100 - 100).toFixed(1),
      icon: Eye,
      color: 'purple',
      subtitle: `${data.views?.unique || 0} unique views`
    },
    {
      title: 'Sessions',
      value: data.sessions?.total || 0,
      change: data.sessions?.bounceRate ? -data.sessions.bounceRate : 0,
      icon: Activity,
      color: 'yellow',
      subtitle: `${formatDuration(data.sessions?.averageDuration || 0)} avg duration`
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        const isPositive = Number(card.change) > 0
        const TrendIcon = isPositive ? TrendingUp : TrendingDown
        
        return (
          <div key={index} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-${card.color}-100`}>
                <Icon className={`h-6 w-6 text-${card.color}-600`} />
              </div>
              {card.change !== 0 && (
                <div className={`flex items-center space-x-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendIcon className="h-4 w-4" />
                  <span>{Math.abs(Number(card.change))}%</span>
                </div>
              )}
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {formatNumber(card.value)}
            </p>
            <p className="text-xs text-gray-500">{card.subtitle}</p>
          </div>
        )
      })}
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
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}