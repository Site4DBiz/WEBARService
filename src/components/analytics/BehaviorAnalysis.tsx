'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  MousePointer,
  Clock,
  Navigation,
  Eye,
  Heart,
  Share2,
  MessageCircle,
  BarChart3,
  TrendingUp,
  Users,
  Target,
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Sankey,
} from 'recharts'

interface UserJourney {
  step: string
  users: number
  dropoff: number
  avgTime: number
}

interface BehaviorPattern {
  pattern: string
  frequency: number
  impact: 'positive' | 'negative' | 'neutral'
  users: number
}

interface BehaviorAnalysisProps {
  dateRange: { start: number; end: number }
}

export function BehaviorAnalysis({ dateRange }: BehaviorAnalysisProps) {
  const [journeyData, setJourneyData] = useState<UserJourney[]>([])
  const [patterns, setPatterns] = useState<BehaviorPattern[]>([])
  const [heatmapData, setHeatmapData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<'journey' | 'patterns' | 'heatmap'>('journey')

  useEffect(() => {
    fetchBehaviorData()
  }, [dateRange])

  const fetchBehaviorData = async () => {
    setLoading(true)
    try {
      // Mock user journey data
      const mockJourney: UserJourney[] = [
        { step: 'Landing Page', users: 10000, dropoff: 0, avgTime: 45 },
        { step: 'Sign Up', users: 4500, dropoff: 55, avgTime: 120 },
        { step: 'Onboarding', users: 3800, dropoff: 15.5, avgTime: 300 },
        { step: 'First AR Experience', users: 3000, dropoff: 21, avgTime: 180 },
        { step: 'Content Creation', users: 1500, dropoff: 50, avgTime: 600 },
        { step: 'Share/Publish', users: 1200, dropoff: 20, avgTime: 60 },
        { step: 'Return Visit', users: 900, dropoff: 25, avgTime: 0 },
      ]

      // Mock behavior patterns
      const mockPatterns: BehaviorPattern[] = [
        { pattern: 'Quick AR Sessions (<30s)', frequency: 45, impact: 'negative', users: 2500 },
        { pattern: 'Multiple Content Views', frequency: 78, impact: 'positive', users: 4200 },
        { pattern: 'Social Sharing', frequency: 23, impact: 'positive', users: 1250 },
        { pattern: 'Early Exit Pattern', frequency: 34, impact: 'negative', users: 1850 },
        { pattern: 'Power User Activity', frequency: 12, impact: 'positive', users: 650 },
        { pattern: 'Weekend Engagement', frequency: 56, impact: 'neutral', users: 3000 },
      ]

      // Mock heatmap data (hourly activity)
      const mockHeatmap = []
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          mockHeatmap.push({
            day: days[day],
            hour,
            value: Math.floor(Math.random() * 100),
          })
        }
      }

      setJourneyData(mockJourney)
      setPatterns(mockPatterns)
      setHeatmapData(mockHeatmap)
    } catch (error) {
      console.error('Failed to fetch behavior data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getHeatmapColor = (value: number) => {
    if (value > 80) return '#22c55e'
    if (value > 60) return '#84cc16'
    if (value > 40) return '#eab308'
    if (value > 20) return '#f97316'
    return '#ef4444'
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            User Behavior Analysis
          </h2>
          <div className="flex gap-2">
            {[
              { id: 'journey', label: 'User Journey', icon: Navigation },
              { id: 'patterns', label: 'Behavior Patterns', icon: Target },
              { id: 'heatmap', label: 'Activity Heatmap', icon: BarChart3 },
            ].map((view) => {
              const Icon = view.icon
              return (
                <button
                  key={view.id}
                  onClick={() => setSelectedView(view.id as any)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    selectedView === view.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{view.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* User Journey Funnel */}
        {selectedView === 'journey' && (
          <div className="space-y-6">
            <div className="space-y-3">
              {journeyData.map((step, index) => {
                const width = (step.users / journeyData[0].users) * 100
                return (
                  <div key={index} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{step.step}</span>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{step.users.toLocaleString()} users</span>
                        {step.dropoff > 0 && <span className="text-red-600">-{step.dropoff}%</span>}
                        {step.avgTime > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {step.avgTime}s
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-8">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-8 rounded-full flex items-center justify-end pr-3"
                        style={{ width: `${width}%` }}
                      >
                        <span className="text-white text-xs font-medium">{width.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Conversion Insights</h3>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• Overall conversion rate: 9%</li>
                <li>• Biggest drop-off at Sign Up stage (55%)</li>
                <li>• Average time to conversion: 20 minutes</li>
              </ul>
            </div>
          </div>
        )}

        {/* Behavior Patterns */}
        {selectedView === 'patterns' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Pattern Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={patterns}
                      dataKey="frequency"
                      nameKey="pattern"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {patterns.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Pattern Impact</h3>
                {patterns.map((pattern, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          pattern.impact === 'positive'
                            ? 'bg-green-500'
                            : pattern.impact === 'negative'
                              ? 'bg-red-500'
                              : 'bg-gray-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{pattern.pattern}</p>
                        <p className="text-xs text-gray-500">
                          {pattern.users.toLocaleString()} users
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{pattern.frequency}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Activity Heatmap */}
        {selectedView === 'heatmap' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Weekly Activity Heatmap</h3>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-25 gap-1">
                  <div></div>
                  {[...Array(24)].map((_, i) => (
                    <div key={i} className="text-xs text-gray-500 text-center">
                      {i}
                    </div>
                  ))}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <>
                      <div
                        key={day}
                        className="text-xs text-gray-500 pr-2 flex items-center justify-end"
                      >
                        {day}
                      </div>
                      {[...Array(24)].map((_, hour) => {
                        const data = heatmapData.find((d) => d.day === day && d.hour === hour)
                        return (
                          <div
                            key={`${day}-${hour}`}
                            className="aspect-square rounded"
                            style={{ backgroundColor: getHeatmapColor(data?.value || 0) }}
                            title={`${day} ${hour}:00 - ${data?.value || 0} activities`}
                          />
                        )
                      })}
                    </>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>Less</span>
              <div className="flex gap-1">
                {[20, 40, 60, 80].map((val) => (
                  <div
                    key={val}
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: getHeatmapColor(val) }}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">Avg. Page Views</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">8.3</p>
          <p className="text-xs text-green-600 mt-1">+12% from last period</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-5 w-5 text-purple-600" />
            <span className="text-sm text-gray-600">Session Duration</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">5:42</p>
          <p className="text-xs text-green-600 mt-1">+8% from last period</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3 mb-2">
            <MousePointer className="h-5 w-5 text-green-600" />
            <span className="text-sm text-gray-600">Bounce Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">32%</p>
          <p className="text-xs text-red-600 mt-1">+5% from last period</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3 mb-2">
            <Share2 className="h-5 w-5 text-orange-600" />
            <span className="text-sm text-gray-600">Share Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">18%</p>
          <p className="text-xs text-green-600 mt-1">+23% from last period</p>
        </div>
      </div>
    </div>
  )
}
