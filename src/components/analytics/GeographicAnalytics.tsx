'use client'

import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { MapPin, Globe, TrendingUp } from 'lucide-react'

Chart.register(...registerables)

interface GeographicAnalyticsProps {
  data?: {
    countries?: Record<string, number>
    cities?: Record<string, number>
    topRegions?: Array<{ country: string; percentage: number }>
  }
}

export default function GeographicAnalytics({ data }: GeographicAnalyticsProps) {
  const countryChartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    if (!countryChartRef.current || !data?.countries) return

    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = countryChartRef.current.getContext('2d')
    if (!ctx) return

    const sortedCountries = Object.entries(data.countries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sortedCountries.map(([country]) => country),
        datasets: [
          {
            label: 'Users by Country',
            data: sortedCountries.map(([, percentage]) => percentage),
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(236, 72, 153, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(251, 146, 60, 0.8)',
              'rgba(99, 102, 241, 0.8)',
              'rgba(168, 85, 247, 0.8)',
            ],
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.parsed.x}% of users`
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            max: Math.max(...Object.values(data.countries)) + 10,
            ticks: {
              callback: function (value) {
                return value + '%'
              },
            },
          },
          y: {
            grid: {
              display: false,
            },
          },
        },
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data])

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Geographic Distribution</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          Loading geographic data...
        </div>
      </div>
    )
  }

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      Japan: '🇯🇵',
      'United States': '🇺🇸',
      'United Kingdom': '🇬🇧',
      Germany: '🇩🇪',
      France: '🇫🇷',
      Canada: '🇨🇦',
      Australia: '🇦🇺',
      China: '🇨🇳',
      India: '🇮🇳',
      Brazil: '🇧🇷',
    }
    return flags[country] || '🌍'
  }

  return (
    <div className="space-y-6">
      {/* Countries Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Globe className="h-5 w-5 mr-2 text-blue-600" />
            Geographic Distribution
          </h3>
        </div>

        <div className="h-64 mb-6">
          <canvas ref={countryChartRef}></canvas>
        </div>

        {/* Top Regions */}
        {data.topRegions && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Top Regions</h4>
            {data.topRegions.map((region, index) => (
              <div
                key={region.country}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-semibold text-gray-500 w-6">{index + 1}</span>
                  <span className="text-xl">{getCountryFlag(region.country)}</span>
                  <span className="font-medium text-gray-900">{region.country}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                      style={{ width: `${region.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                    {region.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cities Distribution */}
      {data.cities && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-green-600" />
              Top Cities
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(data.cities)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([city, percentage], index) => (
                <div
                  key={city}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{city}</span>
                    {index === 0 && <TrendingUp className="h-4 w-4 text-green-600" />}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          index === 0 ? 'bg-green-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${(percentage / 30) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-semibold text-gray-600">{percentage}%</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
