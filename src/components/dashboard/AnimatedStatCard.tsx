'use client'

import { useState, useEffect } from 'react'
import { LucideIcon, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AnimatedStatCardProps {
  title: string
  value: number | string
  previousValue?: number
  icon: LucideIcon
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  subtitle?: string
  format?: 'number' | 'currency' | 'percentage' | 'duration'
  onClick?: () => void
  isLoading?: boolean
  sparklineData?: number[]
}

export function AnimatedStatCard({
  title,
  value,
  previousValue,
  icon: Icon,
  color = 'blue',
  subtitle,
  format = 'number',
  onClick,
  isLoading = false,
  sparklineData,
}: AnimatedStatCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [displayValue, setDisplayValue] = useState(0)

  const colorClasses = {
    blue: 'bg-blue-500 text-blue-600 bg-blue-50 border-blue-200',
    green: 'bg-green-500 text-green-600 bg-green-50 border-green-200',
    purple: 'bg-purple-500 text-purple-600 bg-purple-50 border-purple-200',
    orange: 'bg-orange-500 text-orange-600 bg-orange-50 border-orange-200',
    red: 'bg-red-500 text-red-600 bg-red-50 border-red-200',
  }

  const colors = colorClasses[color].split(' ')
  const bgColor = colors[0]
  const textColor = colors[1]
  const lightBg = colors[2]
  const borderColor = colors[3]

  // Animate number counting
  useEffect(() => {
    if (typeof value === 'number') {
      const duration = 1000 // 1 second
      const steps = 60
      const stepDuration = duration / steps
      const increment = value / steps
      let current = 0

      const timer = setInterval(() => {
        current += increment
        if (current >= value) {
          setDisplayValue(value)
          clearInterval(timer)
        } else {
          setDisplayValue(Math.floor(current))
        }
      }, stepDuration)

      return () => clearInterval(timer)
    }
  }, [value])

  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
        }).format(val)
      case 'percentage':
        return `${val}%`
      case 'duration':
        const hours = Math.floor(val / 3600)
        const minutes = Math.floor((val % 3600) / 60)
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
      default:
        return val.toLocaleString()
    }
  }

  const calculateChange = () => {
    if (!previousValue || typeof value !== 'number') return null
    const change = ((value - previousValue) / previousValue) * 100
    return {
      value: change.toFixed(1),
      isPositive: change > 0,
      isNeutral: change === 0,
    }
  }

  const change = calculateChange()

  // Generate sparkline path
  const generateSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return ''

    const width = 100
    const height = 30
    const max = Math.max(...sparklineData)
    const min = Math.min(...sparklineData)
    const range = max - min || 1

    const points = sparklineData.map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * width
      const y = height - ((val - min) / range) * height
      return `${x},${y}`
    })

    return `M ${points.join(' L ')}`
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-6 cursor-pointer border-2 ${
        isHovered ? borderColor : 'border-transparent'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${lightBg}`}>
          <Icon className={`h-6 w-6 ${textColor}`} />
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <svg width="100" height="30" className="opacity-50">
            <path
              d={generateSparkline()}
              fill="none"
              stroke={bgColor.replace('bg-', '#')}
              strokeWidth="2"
            />
          </svg>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <div className="flex items-baseline space-x-2">
          <motion.p
            key={displayValue}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold text-gray-900"
          >
            {formatValue(typeof value === 'number' ? displayValue : value)}
          </motion.p>
          {change && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center"
              >
                {change.isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : change.isNeutral ? (
                  <Minus className="h-4 w-4 text-gray-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`text-sm ml-1 ${
                    change.isPositive
                      ? 'text-green-600'
                      : change.isNeutral
                        ? 'text-gray-600'
                        : 'text-red-600'
                  }`}
                >
                  {change.isPositive && '+'}
                  {change.value}%
                </span>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>

      {onClick && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute bottom-2 right-2"
        >
          <ChevronRight className={`h-4 w-4 ${textColor}`} />
        </motion.div>
      )}
    </motion.div>
  )
}
