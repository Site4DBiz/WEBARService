'use client'

import { useEffect, useState } from 'react'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react'

interface Insight {
  id: string
  type: 'growth' | 'decline' | 'warning' | 'opportunity'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  metric: string
  value: number
  change: number
  recommendation: string
  priority: number
}

interface AnalyticsInsightsProps {
  dateRange: { start: number; end: number }
}

export function AnalyticsInsights({ dateRange }: AnalyticsInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)

  useEffect(() => {
    fetchInsights()
  }, [dateRange])

  const fetchInsights = async () => {
    setLoading(true)
    try {
      // Simulate AI-generated insights
      const mockInsights: Insight[] = [
        {
          id: '1',
          type: 'growth',
          title: 'User Engagement Surge',
          description: 'User engagement has increased by 45% in the last week',
          impact: 'high',
          metric: 'Daily Active Users',
          value: 1250,
          change: 45,
          recommendation: 'Consider launching a retention campaign to maintain this momentum',
          priority: 1,
        },
        {
          id: '2',
          type: 'warning',
          title: 'Content Creation Declining',
          description: 'New content creation has dropped by 23% compared to last month',
          impact: 'medium',
          metric: 'New Content/Day',
          value: 12,
          change: -23,
          recommendation: 'Implement creator incentives or simplify the content creation process',
          priority: 2,
        },
        {
          id: '3',
          type: 'opportunity',
          title: 'Peak Usage Pattern Detected',
          description: 'Most users are active between 2-4 PM on weekdays',
          impact: 'medium',
          metric: 'Peak Active Users',
          value: 850,
          change: 12,
          recommendation: 'Schedule important announcements and content releases during peak hours',
          priority: 3,
        },
        {
          id: '4',
          type: 'growth',
          title: 'AR Session Quality Improved',
          description: 'Average AR session success rate increased to 92%',
          impact: 'high',
          metric: 'Session Success Rate',
          value: 92,
          change: 8,
          recommendation: 'Document and share best practices that led to this improvement',
          priority: 4,
        },
        {
          id: '5',
          type: 'decline',
          title: 'Mobile User Retention Drop',
          description: 'Mobile user 7-day retention has decreased by 15%',
          impact: 'high',
          metric: '7-Day Retention',
          value: 35,
          change: -15,
          recommendation: 'Review mobile app performance and user experience issues',
          priority: 1,
        },
        {
          id: '6',
          type: 'opportunity',
          title: 'Untapped Category Potential',
          description: 'Education category shows 200% growth potential based on trends',
          impact: 'high',
          metric: 'Category Growth Potential',
          value: 200,
          change: 200,
          recommendation: 'Focus marketing efforts on education sector and create targeted content',
          priority: 2,
        },
      ]

      // Sort by priority
      mockInsights.sort((a, b) => a.priority - b.priority)
      setInsights(mockInsights)
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'growth':
        return TrendingUp
      case 'decline':
        return TrendingDown
      case 'warning':
        return AlertTriangle
      case 'opportunity':
        return Lightbulb
      default:
        return Info
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'growth':
        return 'green'
      case 'decline':
        return 'red'
      case 'warning':
        return 'yellow'
      case 'opportunity':
        return 'blue'
      default:
        return 'gray'
    }
  }

  const getImpactBadge = (impact: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    }
    return colors[impact as keyof typeof colors] || colors.low
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* AI Summary */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <Brain className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              AI-Powered Insights
              <Sparkles className="h-5 w-5" />
            </h2>
            <p className="text-blue-100">
              Based on your data from the last {dateRange.start} days, we've identified{' '}
              {insights.length} key insights that require your attention. Focus on high-impact items
              first for maximum effectiveness.
            </p>
          </div>
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {insights.map((insight) => {
          const Icon = getInsightIcon(insight.type)
          const color = getInsightColor(insight.type)

          return (
            <div
              key={insight.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedInsight(insight)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-${color}-50`}>
                    <Icon className={`h-5 w-5 text-${color}-600`} />
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${getImpactBadge(insight.impact)}`}
                  >
                    {insight.impact.toUpperCase()} IMPACT
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{insight.title}</h3>

                <p className="text-sm text-gray-600 mb-4">{insight.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-500">{insight.metric}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {insight.value}
                      {insight.metric.includes('Rate') || insight.metric.includes('%') ? '%' : ''}
                    </p>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm font-medium ${
                      insight.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {insight.change > 0 ? '+' : ''}
                    {insight.change}%
                    {insight.change > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-700 mb-1">Recommendation</p>
                      <p className="text-xs text-gray-600">{insight.recommendation}</p>
                    </div>
                  </div>
                </div>

                <button className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  View Details
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Insight Modal */}
      {selectedInsight && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedInsight(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedInsight.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedInsight.description}</p>
                </div>
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Current Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedInsight.value}
                    {selectedInsight.metric.includes('Rate') || selectedInsight.metric.includes('%')
                      ? '%'
                      : ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Change</p>
                  <p
                    className={`text-2xl font-bold ${
                      selectedInsight.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {selectedInsight.change > 0 ? '+' : ''}
                    {selectedInsight.change}%
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Recommended Action</h3>
                <p className="text-sm text-blue-700">{selectedInsight.recommendation}</p>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700 transition-colors">
                  Take Action
                </button>
                <button className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2 font-medium hover:bg-gray-200 transition-colors">
                  Schedule Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
