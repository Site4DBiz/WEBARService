'use client'

import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { Users, UserPlus, UserMinus } from 'lucide-react'

Chart.register(...registerables)

interface UserGrowthChartProps {
  data?: Array<{
    date: string
    users?: number
  }>
}

export default function UserGrowthChart({ data }: UserGrowthChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    if (!chartRef.current || !data) return

    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    // Calculate cumulative growth
    let cumulative = 100 // Starting base
    const cumulativeData = data.map((d) => {
      cumulative += d.users || 0
      return cumulative
    })

    // Calculate daily new users (difference from previous day)
    const newUsersData = data.map((d, i) => {
      if (i === 0) return d.users || 0
      return (d.users || 0) - (data[i - 1].users || 0)
    })

    const labels = data.map((d) => {
      const date = new Date(d.date)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Users',
            data: cumulativeData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            yAxisID: 'y',
          },
          {
            label: 'New Users',
            data: data.map((d) => d.users || 0),
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            yAxisID: 'y1',
            borderDash: [5, 5],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || ''
                const value = context.parsed.y
                if (label === 'Total Users') {
                  return `${label}: ${formatNumber(value)}`
                }
                return `${label}: +${formatNumber(value)}`
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 11,
              },
            },
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 11,
              },
              callback: function (value) {
                return formatNumber(Number(value))
              },
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 11,
              },
              callback: function (value) {
                return '+' + formatNumber(Number(value))
              },
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

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">No data available</div>
      </div>
    )
  }

  // Calculate growth statistics
  const totalUsers = data.reduce((sum, d) => sum + (d.users || 0), 0)
  const avgDailyGrowth = Math.round(totalUsers / data.length)
  const growthRate =
    data.length > 1
      ? (((data[data.length - 1].users || 0) - (data[0].users || 0)) /
          Math.max(1, data[0].users || 1)) *
        100
      : 0

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-600" />
          User Growth Analytics
        </h3>
      </div>

      {/* Growth Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <UserPlus className="h-5 w-5 text-blue-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600">New Users</p>
          <p className="text-lg font-bold text-gray-900">+{formatNumber(totalUsers)}</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <Users className="h-5 w-5 text-green-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Daily Avg</p>
          <p className="text-lg font-bold text-gray-900">+{formatNumber(avgDailyGrowth)}</p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="h-5 w-5 mx-auto mb-1 text-purple-600 font-bold">%</div>
          <p className="text-xs text-gray-600">Growth Rate</p>
          <p className="text-lg font-bold text-gray-900">
            {growthRate > 0 ? '+' : ''}
            {growthRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <canvas ref={chartRef}></canvas>
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
