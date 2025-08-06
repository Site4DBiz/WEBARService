'use client'

import { useState, useEffect } from 'react'
import { SystemStatus as SystemStatusType } from '@/app/api/system-status/route'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Key,
  RefreshCw,
  Server,
  TrendingUp,
  Users,
  Zap,
  AlertTriangle,
  Wifi,
  WifiOff,
} from 'lucide-react'

export default function SystemStatus() {
  const [status, setStatus] = useState<SystemStatusType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/system-status')
      if (!response.ok) throw new Error('Failed to fetch status')
      const data = await response.json()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    if (autoRefresh) {
      const interval = setInterval(fetchStatus, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
      case 'healthy':
        return 'text-green-500'
      case 'degraded':
        return 'text-yellow-500'
      case 'down':
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'operational':
      case 'healthy':
        return 'bg-green-100'
      case 'degraded':
        return 'bg-yellow-100'
      case 'down':
      case 'error':
        return 'bg-red-100'
      default:
        return 'bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
      case 'healthy':
        return <CheckCircle className="w-5 h-5" />
      case 'degraded':
        return <AlertTriangle className="w-5 h-5" />
      case 'down':
      case 'error':
        return <AlertCircle className="w-5 h-5" />
      default:
        return <Activity className="w-5 h-5" />
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatBytes = (bytes: number) => {
    return `${bytes.toFixed(2)} GB`
  }

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-500">Loading system status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Status</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!status) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${getStatusBgColor(status.status)}`}>
              <div className={getStatusColor(status.status)}>{getStatusIcon(status.status)}</div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">System Status</h2>
              <p className="text-sm text-gray-500">
                Overall Status:{' '}
                <span className={`font-semibold ${getStatusColor(status.status)}`}>
                  {status.status.toUpperCase()}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {autoRefresh ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
                </span>
              </div>
            </button>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">Refresh</span>
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Uptime</p>
              <p className="font-semibold text-gray-900">{formatUptime(status.uptime)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Activity className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Last Updated</p>
              <p className="font-semibold text-gray-900">
                {new Date(status.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Users className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Active Sessions</p>
              <p className="font-semibold text-gray-900">{status.activity.activeSessions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(status.services).map(([key, service]) => (
            <div key={key} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {key === 'database' && <Database className="w-5 h-5 text-gray-500" />}
                  {key === 'storage' && <HardDrive className="w-5 h-5 text-gray-500" />}
                  {key === 'auth' && <Key className="w-5 h-5 text-gray-500" />}
                  {key === 'api' && <Server className="w-5 h-5 text-gray-500" />}
                  <span className="font-medium text-gray-900">{service.name}</span>
                </div>
                <div className={getStatusColor(service.status)}>
                  {getStatusIcon(service.status)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium ${getStatusColor(service.status)}`}>
                    {service.status.toUpperCase()}
                  </span>
                </div>
                {service.responseTime !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Response</span>
                    <span className="font-medium text-gray-900">{service.responseTime}ms</span>
                  </div>
                )}
                {service.message && <p className="text-xs text-gray-500 mt-2">{service.message}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Memory */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Memory</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Used</span>
              <span className="font-medium text-gray-900">
                {formatBytes(status.metrics.memory.used)} /{' '}
                {formatBytes(status.metrics.memory.total)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  status.metrics.memory.percentage > 90
                    ? 'bg-red-500'
                    : status.metrics.memory.percentage > 70
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${status.metrics.memory.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Free</span>
              <span className="font-medium text-gray-900">
                {formatBytes(status.metrics.memory.free)}
              </span>
            </div>
          </div>
        </div>

        {/* CPU */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900">CPU</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Usage</span>
              <span
                className={`font-medium ${
                  status.metrics.cpu.usage > 80
                    ? 'text-red-600'
                    : status.metrics.cpu.usage > 60
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }`}
              >
                {status.metrics.cpu.usage}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Cores</span>
              <span className="font-medium text-gray-900">{status.metrics.cpu.cores}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Load Average</span>
              <span className="font-medium text-gray-900">
                {status.metrics.cpu.loadAverage.join(' / ')}
              </span>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Avg Response</span>
              <span className="font-medium text-gray-900">
                {status.metrics.performance.avgResponseTime.toFixed(2)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Requests/min</span>
              <span className="font-medium text-gray-900">
                {status.metrics.performance.requestsPerMinute}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Error Rate</span>
              <span
                className={`font-medium ${
                  status.metrics.performance.errorRate > 5
                    ? 'text-red-600'
                    : status.metrics.performance.errorRate > 2
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }`}
              >
                {status.metrics.performance.errorRate.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <Users className="w-6 h-6 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{status.activity.totalUsers}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <Server className="w-6 h-6 text-green-500" />
            <div>
              <p className="text-sm text-gray-500">AR Contents</p>
              <p className="text-2xl font-bold text-gray-900">{status.activity.totalContent}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
            <TrendingUp className="w-6 h-6 text-purple-500" />
            <div>
              <p className="text-sm text-gray-500">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{status.activity.activeSessions}</p>
            </div>
          </div>
        </div>

        {/* Recent Errors */}
        {status.activity.recentErrors.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Errors (24h)</h4>
            <div className="space-y-2">
              {status.activity.recentErrors.map((error, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <AlertCircle
                    className={`w-4 h-4 mt-0.5 ${
                      error.level === 'error' ? 'text-red-500' : 'text-yellow-500'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{error.message}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-gray-500">
                        {new Date(error.timestamp).toLocaleString()}
                      </span>
                      {error.count > 1 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          {error.count} occurrences
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
