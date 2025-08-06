'use client'

import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { Smartphone, Monitor, Tablet, Globe, Chrome } from 'lucide-react'

Chart.register(...registerables)

interface DeviceAnalyticsProps {
  data?: {
    devices?: Record<string, number>
    browsers?: Record<string, number>
    os?: Record<string, number>
  }
}

export default function DeviceAnalytics({ data }: DeviceAnalyticsProps) {
  const deviceChartRef = useRef<HTMLCanvasElement>(null)
  const browserChartRef = useRef<HTMLCanvasElement>(null)
  const deviceChartInstance = useRef<Chart | null>(null)
  const browserChartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    if (!data) return

    // Device Chart
    if (deviceChartRef.current && data.devices) {
      if (deviceChartInstance.current) {
        deviceChartInstance.current.destroy()
      }

      const ctx = deviceChartRef.current.getContext('2d')
      if (!ctx) return

      deviceChartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(data.devices),
          datasets: [
            {
              data: Object.values(data.devices),
              backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(139, 92, 246, 0.8)',
              ],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 15,
                font: {
                  size: 12,
                },
              },
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  return `${context.label}: ${context.parsed}%`
                },
              },
            },
          },
        },
      })
    }

    // Browser Chart
    if (browserChartRef.current && data.browsers) {
      if (browserChartInstance.current) {
        browserChartInstance.current.destroy()
      }

      const ctx = browserChartRef.current.getContext('2d')
      if (!ctx) return

      const sortedBrowsers = Object.entries(data.browsers).sort((a, b) => b[1] - a[1])

      browserChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sortedBrowsers.map(([browser]) => browser),
          datasets: [
            {
              label: 'Usage %',
              data: sortedBrowsers.map(([, percentage]) => percentage),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  return `${context.parsed.y}%`
                },
              },
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
            },
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function (value) {
                  return value + '%'
                },
              },
            },
          },
        },
      })
    }

    return () => {
      if (deviceChartInstance.current) {
        deviceChartInstance.current.destroy()
      }
      if (browserChartInstance.current) {
        browserChartInstance.current.destroy()
      }
    }
  }, [data])

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Analytics</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Loading device data...
        </div>
      </div>
    )
  }

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return Smartphone
      case 'desktop':
        return Monitor
      case 'tablet':
        return Tablet
      default:
        return Globe
    }
  }

  return (
    <div className="space-y-6">
      {/* Device Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Distribution</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64">
            <canvas ref={deviceChartRef}></canvas>
          </div>
          <div className="space-y-3">
            {data.devices &&
              Object.entries(data.devices).map(([device, percentage]) => {
                const Icon = getDeviceIcon(device)
                return (
                  <div
                    key={device}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <span className="font-medium text-gray-900 capitalize">{device}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Browser Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Browser Usage</h3>
        <div className="h-64">
          <canvas ref={browserChartRef}></canvas>
        </div>
        {data.os && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Operating Systems</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(data.os).map(([os, percentage]) => (
                <div key={os} className="text-center p-2 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600 capitalize">{os}</p>
                  <p className="text-lg font-semibold text-gray-900">{percentage}%</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
