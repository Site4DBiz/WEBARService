'use client'

import { useState, useEffect } from 'react'
import { X, Download, Share2, Maximize2, TrendingUp, Users, Eye, Heart } from 'lucide-react'
import { ComparisonChart } from './ComparisonChart'

interface DrilldownData {
  title: string
  category: string
  metrics: {
    label: string
    value: string | number
    change?: number
    icon?: any
  }[]
  chartData?: any[]
  details?: {
    [key: string]: any
  }
}

interface DrilldownModalProps {
  isOpen: boolean
  onClose: () => void
  data: DrilldownData
  onExport?: (format: 'csv' | 'json') => void
}

export function DrilldownModal({ isOpen, onClose, data, onExport }: DrilldownModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'trends'>('overview')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleExport = (format: 'csv' | 'json') => {
    if (onExport) {
      onExport(format)
    } else {
      // Default export implementation
      const dataStr = format === 'json' ? JSON.stringify(data, null, 2) : convertToCSV(data)
      const blob = new Blob([dataStr], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${data.title.replace(/\s+/g, '_')}_drilldown.${format}`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const convertToCSV = (data: any) => {
    // Simple CSV conversion
    let csv = 'Metric,Value,Change\n'
    data.metrics.forEach((metric: any) => {
      csv += `"${metric.label}","${metric.value}","${metric.change || 'N/A'}"\n`
    })
    return csv
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`absolute bg-white shadow-2xl transition-all transform ${
          isFullscreen
            ? 'inset-4'
            : 'inset-x-4 bottom-0 top-20 md:inset-x-auto md:right-0 md:w-1/2 lg:w-2/5'
        } rounded-t-xl md:rounded-l-xl overflow-hidden`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">{data.title}</h2>
              <p className="text-blue-100">{data.category}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Maximize2 className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex space-x-8 px-6">
            {(['overview', 'details', 'trends'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 200px)' }}>
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                {data.metrics.map((metric, index) => {
                  const Icon = metric.icon || TrendingUp
                  return (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {typeof metric.value === 'number'
                              ? metric.value.toLocaleString()
                              : metric.value}
                          </p>
                          {metric.change !== undefined && (
                            <p
                              className={`text-sm mt-1 ${
                                metric.change > 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {metric.change > 0 ? '+' : ''}
                              {metric.change}%
                            </p>
                          )}
                        </div>
                        <Icon className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Mini Chart */}
              {data.chartData && data.chartData.length > 0 && (
                <div className="mt-6">
                  <ComparisonChart
                    title="Performance Overview"
                    data={data.chartData}
                    type="area"
                    height={250}
                    showTrend={false}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="p-6">
              {data.details ? (
                <div className="space-y-4">
                  {Object.entries(data.details).map(([key, value]) => (
                    <div key={key} className="border-b border-gray-200 pb-4">
                      <dt className="text-sm font-medium text-gray-500 mb-1">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </dt>
                      <dd className="text-base text-gray-900">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </dd>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No additional details available</p>
              )}
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="p-6">
              {data.chartData && data.chartData.length > 0 ? (
                <div className="space-y-6">
                  <ComparisonChart
                    title="Trend Analysis"
                    data={data.chartData}
                    type="line"
                    height={300}
                  />
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Average</p>
                      <p className="text-xl font-bold text-gray-900">
                        {Math.round(
                          data.chartData.reduce((sum, d) => sum + (d.current || 0), 0) /
                            data.chartData.length
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Peak</p>
                      <p className="text-xl font-bold text-gray-900">
                        {Math.max(...data.chartData.map((d) => d.current || 0)).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-xl font-bold text-gray-900">
                        {data.chartData
                          .reduce((sum, d) => sum + (d.current || 0), 0)
                          .toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No trend data available</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="flex justify-between">
            <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
            <div className="flex space-x-2">
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
