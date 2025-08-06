'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'

interface DataPoint {
  name: string
  current: number
  previous?: number
  [key: string]: any
}

interface ComparisonChartProps {
  title: string
  data: DataPoint[]
  currentPeriodLabel?: string
  previousPeriodLabel?: string
  type?: 'line' | 'area' | 'bar'
  height?: number
  showTrend?: boolean
  onDataPointClick?: (data: any) => void
}

export function ComparisonChart({
  title,
  data,
  currentPeriodLabel = 'Current Period',
  previousPeriodLabel = 'Previous Period',
  type = 'line',
  height = 350,
  showTrend = true,
  onDataPointClick,
}: ComparisonChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<any>(null)
  const [hoveredPoint, setHoveredPoint] = useState<any>(null)

  // Calculate trend
  const calculateTrend = () => {
    if (!data || data.length === 0) return { value: 0, percentage: 0, direction: 'neutral' }

    const currentTotal = data.reduce((sum, point) => sum + (point.current || 0), 0)
    const previousTotal = data.reduce((sum, point) => sum + (point.previous || 0), 0)

    if (previousTotal === 0) return { value: currentTotal, percentage: 100, direction: 'up' }

    const difference = currentTotal - previousTotal
    const percentage = ((difference / previousTotal) * 100).toFixed(1)
    const direction = difference > 0 ? 'up' : difference < 0 ? 'down' : 'neutral'

    return { value: difference, percentage: Math.abs(Number(percentage)), direction }
  }

  const trend = calculateTrend()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm text-gray-600">{entry.name}:</span>
              <span className="text-sm font-medium text-gray-900">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
          {payload[0]?.payload?.previous && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Change:{' '}
                {(
                  ((payload[0].payload.current - payload[0].payload.previous) /
                    payload[0].payload.previous) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  const handleClick = (data: any) => {
    setSelectedPoint(data)
    if (onDataPointClick) {
      onDataPointClick(data)
    }
  }

  const renderChart = () => {
    const chartProps = {
      data,
      onClick: handleClick,
      onMouseEnter: (data: any) => setHoveredPoint(data),
      onMouseLeave: () => setHoveredPoint(null),
    }

    switch (type) {
      case 'area':
        return (
          <AreaChart {...chartProps}>
            <defs>
              <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="current"
              stroke="#3B82F6"
              fillOpacity={1}
              fill="url(#colorCurrent)"
              strokeWidth={2}
              name={currentPeriodLabel}
              animationDuration={1000}
            />
            {data[0]?.previous !== undefined && (
              <Area
                type="monotone"
                dataKey="previous"
                stroke="#9CA3AF"
                fillOpacity={1}
                fill="url(#colorPrevious)"
                strokeWidth={2}
                name={previousPeriodLabel}
                strokeDasharray="5 5"
                animationDuration={1000}
              />
            )}
          </AreaChart>
        )
      case 'bar':
        return (
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="current"
              fill="#3B82F6"
              name={currentPeriodLabel}
              animationDuration={1000}
              radius={[4, 4, 0, 0]}
            />
            {data[0]?.previous !== undefined && (
              <Bar
                dataKey="previous"
                fill="#9CA3AF"
                name={previousPeriodLabel}
                animationDuration={1000}
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        )
      default:
        return (
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', r: 4 }}
              activeDot={{ r: 6 }}
              name={currentPeriodLabel}
              animationDuration={1000}
            />
            {data[0]?.previous !== undefined && (
              <Line
                type="monotone"
                dataKey="previous"
                stroke="#9CA3AF"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#9CA3AF', r: 4 }}
                activeDot={{ r: 6 }}
                name={previousPeriodLabel}
                animationDuration={1000}
              />
            )}
            {/* Add average line */}
            <ReferenceLine
              y={data.reduce((sum, point) => sum + point.current, 0) / data.length}
              stroke="#EF4444"
              strokeDasharray="3 3"
              label="Average"
            />
          </LineChart>
        )
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {showTrend && data[0]?.previous !== undefined && (
            <div className="flex items-center space-x-2 mt-2">
              {trend.direction === 'up' ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : trend.direction === 'down' ? (
                <TrendingDown className="h-5 w-5 text-red-500" />
              ) : (
                <Minus className="h-5 w-5 text-gray-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend.direction === 'up'
                    ? 'text-green-600'
                    : trend.direction === 'down'
                      ? 'text-red-600'
                      : 'text-gray-600'
                }`}
              >
                {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                {trend.percentage}% vs {previousPeriodLabel}
              </span>
            </div>
          )}
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <Info className="h-5 w-5" />
        </button>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>

      {selectedPoint && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900">
            Selected: {selectedPoint.activeLabel || selectedPoint.name}
          </p>
          <p className="text-xs text-blue-700 mt-1">Click on data points to see more details</p>
        </div>
      )}
    </div>
  )
}
