'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp,
  AlertCircle,
  Target,
  Calendar,
  ChevronUp,
  ChevronDown,
  Activity,
  Users,
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface Prediction {
  metric: string
  current: number
  predicted: number
  confidence: number
  trend: 'up' | 'down' | 'stable'
  change: number
  factors: string[]
}

interface ForecastData {
  date: string
  actual?: number
  predicted: number
  upperBound: number
  lowerBound: number
}

interface PredictiveAnalyticsProps {
  dateRange: { start: number; end: number }
}

export function PredictiveAnalytics({ dateRange }: PredictiveAnalyticsProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [forecastData, setForecastData] = useState<ForecastData[]>([])
  const [selectedMetric, setSelectedMetric] = useState('users')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPredictions()
  }, [dateRange, selectedMetric])

  const fetchPredictions = async () => {
    setLoading(true)
    try {
      // Mock predictions
      const mockPredictions: Prediction[] = [
        {
          metric: 'Monthly Active Users',
          current: 15000,
          predicted: 18500,
          confidence: 85,
          trend: 'up',
          change: 23.3,
          factors: ['Seasonal trend', 'Marketing campaign impact', 'Product improvements'],
        },
        {
          metric: 'Content Creation Rate',
          current: 450,
          predicted: 520,
          confidence: 78,
          trend: 'up',
          change: 15.6,
          factors: ['Creator incentives', 'Simplified workflow', 'Community growth'],
        },
        {
          metric: 'Churn Rate',
          current: 8.5,
          predicted: 7.2,
          confidence: 82,
          trend: 'down',
          change: -15.3,
          factors: ['Improved onboarding', 'Feature updates', 'Better support'],
        },
        {
          metric: 'Revenue Growth',
          current: 125000,
          predicted: 145000,
          confidence: 75,
          trend: 'up',
          change: 16,
          factors: ['User growth', 'Premium features', 'Market expansion'],
        },
        {
          metric: 'AR Session Success Rate',
          current: 92,
          predicted: 94.5,
          confidence: 90,
          trend: 'up',
          change: 2.7,
          factors: ['Technical improvements', 'Better device support', 'Optimizations'],
        },
        {
          metric: 'Support Tickets',
          current: 320,
          predicted: 280,
          confidence: 72,
          trend: 'down',
          change: -12.5,
          factors: ['Self-service improvements', 'Documentation updates', 'Bug fixes'],
        },
      ]

      // Generate forecast data
      const mockForecast: ForecastData[] = []
      const today = new Date()

      // Historical data (past 30 days)
      for (let i = 30; i > 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)

        const baseValue = 1000 + Math.random() * 200
        mockForecast.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          actual: baseValue,
          predicted: baseValue + (Math.random() - 0.5) * 50,
          upperBound: baseValue + 100,
          lowerBound: baseValue - 100,
        })
      }

      // Future predictions (next 30 days)
      for (let i = 1; i <= 30; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() + i)

        const baseValue = 1100 + i * 5 + Math.random() * 100
        mockForecast.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          predicted: baseValue,
          upperBound: baseValue + 150,
          lowerBound: baseValue - 150,
        })
      }

      setPredictions(mockPredictions)
      setForecastData(mockForecast)
    } catch (error) {
      console.error('Failed to fetch predictions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <ChevronUp className="h-5 w-5 text-green-600" />
    if (trend === 'down') return <ChevronDown className="h-5 w-5 text-red-600" />
    return <Activity className="h-5 w-5 text-gray-600" />
  }

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
      {/* Forecast Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              Predictive Forecast
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              AI-powered predictions for the next 30 days
            </p>
          </div>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            <option value="users">Users</option>
            <option value="revenue">Revenue</option>
            <option value="content">Content</option>
            <option value="sessions">Sessions</option>
          </select>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="lowerBound"
              stackId="1"
              stroke="transparent"
              fill="#f3f4f6"
              name="Lower Bound"
            />
            <Area
              type="monotone"
              dataKey="upperBound"
              stackId="2"
              stroke="transparent"
              fill="#e5e7eb"
              name="Upper Bound"
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="Actual"
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#10B981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Predicted"
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Forecast Summary:</strong> Based on current trends and seasonal patterns, we
            predict a 23% increase in user activity over the next 30 days with 85% confidence.
          </p>
        </div>
      </div>

      {/* Predictions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {predictions.map((prediction, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{prediction.metric}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-sm font-medium ${getConfidenceColor(prediction.confidence)}`}
                  >
                    {prediction.confidence}% confidence
                  </span>
                </div>
              </div>
              {getTrendIcon(prediction.trend)}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Current</p>
                <p className="text-xl font-bold text-gray-900">
                  {prediction.current.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Predicted</p>
                <p className="text-xl font-bold text-blue-600">
                  {prediction.predicted.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div
                className={`text-sm font-medium ${
                  prediction.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {prediction.change > 0 ? '+' : ''}
                {prediction.change}% change
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-medium text-gray-700 mb-2">Key Factors:</p>
              <ul className="space-y-1">
                {prediction.factors.map((factor, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                    <span className="text-gray-400">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          Recommended Actions
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-purple-600">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Scale Infrastructure</p>
              <p className="text-xs text-gray-600 mt-1">
                With predicted 23% user growth, consider scaling server capacity by end of month
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-purple-600">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Enhance Creator Tools</p>
              <p className="text-xs text-gray-600 mt-1">
                Content creation is trending upward - invest in better creation tools
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-purple-600">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Prepare Support Team</p>
              <p className="text-xs text-gray-600 mt-1">
                Despite improvements, expect 280 support tickets - ensure adequate staffing
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
