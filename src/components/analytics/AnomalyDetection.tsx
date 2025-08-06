'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Bell,
  Shield,
  Zap,
  Clock,
  Info,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from 'recharts'

interface Anomaly {
  id: string
  timestamp: Date
  metric: string
  severity: 'critical' | 'warning' | 'info'
  type: 'spike' | 'drop' | 'pattern' | 'threshold'
  value: number
  expected: number
  deviation: number
  description: string
  possibleCauses: string[]
  resolved: boolean
}

interface MetricData {
  timestamp: string
  value: number
  expected: number
  isAnomaly: boolean
}

interface AnomalyDetectionProps {
  dateRange: { start: number; end: number }
}

export function AnomalyDetection({ dateRange }: AnomalyDetectionProps) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [metricData, setMetricData] = useState<MetricData[]>([])
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null)
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnomalies()
  }, [dateRange])

  const fetchAnomalies = async () => {
    setLoading(true)
    try {
      // Mock anomalies
      const mockAnomalies: Anomaly[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          metric: 'API Response Time',
          severity: 'critical',
          type: 'spike',
          value: 2500,
          expected: 200,
          deviation: 1150,
          description: 'API response time spiked to 2.5 seconds, 10x above normal',
          possibleCauses: ['Database overload', 'Network congestion', 'DDoS attack'],
          resolved: false,
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
          metric: 'User Registrations',
          severity: 'warning',
          type: 'drop',
          value: 5,
          expected: 45,
          deviation: -88,
          description: 'New user registrations dropped by 88% in the last hour',
          possibleCauses: [
            'Registration form issue',
            'Email service down',
            'Marketing campaign ended',
          ],
          resolved: true,
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
          metric: 'Content Upload Rate',
          severity: 'info',
          type: 'pattern',
          value: 150,
          expected: 50,
          deviation: 200,
          description: 'Unusual pattern detected: 3x increase in content uploads',
          possibleCauses: ['Viral content', 'Bot activity', 'Special event'],
          resolved: false,
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
          metric: 'Error Rate',
          severity: 'critical',
          type: 'threshold',
          value: 5.2,
          expected: 1,
          deviation: 420,
          description: 'Error rate exceeded critical threshold of 5%',
          possibleCauses: [
            'Service degradation',
            'Code deployment issue',
            'Infrastructure problem',
          ],
          resolved: true,
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000),
          metric: 'Session Duration',
          severity: 'warning',
          type: 'drop',
          value: 120,
          expected: 300,
          deviation: -60,
          description: 'Average session duration decreased by 60%',
          possibleCauses: ['UX issues', 'Performance problems', 'Content quality'],
          resolved: false,
        },
        {
          id: '6',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          metric: 'AR Success Rate',
          severity: 'info',
          type: 'spike',
          value: 98,
          expected: 92,
          deviation: 6.5,
          description: 'AR tracking success rate improved unexpectedly',
          possibleCauses: ['Algorithm improvement', 'Better lighting conditions', 'User education'],
          resolved: false,
        },
      ]

      // Generate metric data with anomalies
      const mockMetricData: MetricData[] = []
      for (let i = 48; i >= 0; i--) {
        const timestamp = new Date(Date.now() - i * 60 * 60 * 1000)
        const expected = 100 + Math.sin(i / 5) * 20
        let value = expected + (Math.random() - 0.5) * 10

        // Add some anomalies
        let isAnomaly = false
        if (i === 2 || i === 5 || i === 12) {
          value = expected * (Math.random() > 0.5 ? 2.5 : 0.3)
          isAnomaly = true
        }

        mockMetricData.push({
          timestamp: timestamp.toLocaleTimeString('en-US', { hour: '2-digit' }),
          value: Math.round(value),
          expected: Math.round(expected),
          isAnomaly,
        })
      }

      setAnomalies(mockAnomalies)
      setMetricData(mockMetricData)
    } catch (error) {
      console.error('Failed to fetch anomalies:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />
      default:
        return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const filteredAnomalies =
    filter === 'all' ? anomalies : anomalies.filter((a) => a.severity === filter)

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
      {/* Anomaly Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              Anomaly Detection
            </h2>
            <p className="text-sm text-gray-600 mt-1">Real-time monitoring and anomaly detection</p>
          </div>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="text-sm text-gray-600">Auto-alerts enabled</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metricData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="expected"
              stroke="#9CA3AF"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="Expected"
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props
                if (payload.isAnomaly) {
                  return (
                    <circle cx={cx} cy={cy} r={6} fill="#EF4444" stroke="#fff" strokeWidth={2} />
                  )
                }
                return null
              }}
              name="Actual"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Anomaly Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(['all', 'critical', 'warning', 'info'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === level ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
                {level !== 'all' && (
                  <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                    {anomalies.filter((a) => a.severity === level).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Resolved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="space-y-4">
        {filteredAnomalies.map((anomaly) => (
          <div
            key={anomaly.id}
            className={`rounded-xl border p-6 cursor-pointer transition-all hover:shadow-md ${getSeverityColor(anomaly.severity)}`}
            onClick={() => setSelectedAnomaly(anomaly)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="mt-1">{getSeverityIcon(anomaly.severity)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{anomaly.metric}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        anomaly.resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {anomaly.resolved ? 'Resolved' : 'Active'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{anomaly.description}</p>
                  <div className="flex items-center gap-6 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {anomaly.timestamp.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {anomaly.type}
                    </div>
                    <div className="flex items-center gap-1">
                      {anomaly.deviation > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(anomaly.deviation)}% deviation
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{anomaly.value}</p>
                <p className="text-xs text-gray-500">Expected: {anomaly.expected}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Anomaly Detail Modal */}
      {selectedAnomaly && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAnomaly(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getSeverityIcon(selectedAnomaly.severity)}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedAnomaly.metric}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">{selectedAnomaly.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAnomaly(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Actual Value</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedAnomaly.value}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Expected Value</p>
                  <p className="text-2xl font-bold text-gray-600">{selectedAnomaly.expected}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Deviation</p>
                  <p
                    className={`text-2xl font-bold ${
                      selectedAnomaly.deviation > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {selectedAnomaly.deviation > 0 ? '+' : ''}
                    {selectedAnomaly.deviation}%
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Possible Causes</h3>
                <ul className="space-y-2">
                  {selectedAnomaly.possibleCauses.map((cause, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <span className="text-sm text-gray-700">{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700 transition-colors">
                  Investigate
                </button>
                <button className="flex-1 bg-gray-100 text-gray-700 rounded-lg px-4 py-2 font-medium hover:bg-gray-200 transition-colors">
                  Mark as Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
