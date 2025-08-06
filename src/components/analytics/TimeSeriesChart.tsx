'use client'

import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

interface TimeSeriesChartProps {
  data?: Array<{
    date: string
    users?: number
    views?: number
    sessions?: number
    contents?: number
  }>
  title?: string
  dataKey?: 'users' | 'views' | 'sessions' | 'contents'
}

export default function TimeSeriesChart({
  data,
  title = 'Time Series Data',
  dataKey = 'views',
}: TimeSeriesChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    if (!chartRef.current || !data) return

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    const labels = data.map((d) => {
      const date = new Date(d.date)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })

    const values = data.map((d) => d[dataKey] || 0)

    // Calculate trend
    const trend = values.length > 1 ? values[values.length - 1] - values[0] : 0

    const gradient = ctx.createLinearGradient(0, 0, 0, 400)
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)')
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)')

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: title,
            data: values,
            fill: true,
            backgroundColor: gradient,
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: 'rgb(59, 130, 246)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
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
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              label: (context) => {
                return `${formatValue(context.parsed.y)} ${getUnit(dataKey)}`
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
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 11,
              },
              callback: function (value) {
                return formatValue(Number(value))
              },
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data, title, dataKey])

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">No data available</div>
      </div>
    )
  }

  const calculateTrend = () => {
    if (!data || data.length < 2) return 0
    const values = data.map((d) => d[dataKey] || 0)
    const trend = ((values[values.length - 1] - values[0]) / Math.max(1, values[0])) * 100
    return trend
  }

  const trend = calculateTrend()

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {trend !== 0 && (
          <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}
            {trend.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="h-64">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  )
}

function formatValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toString()
}

function getUnit(dataKey: string): string {
  switch (dataKey) {
    case 'users':
      return 'users'
    case 'views':
      return 'views'
    case 'sessions':
      return 'sessions'
    case 'contents':
      return 'items'
    default:
      return ''
  }
}
