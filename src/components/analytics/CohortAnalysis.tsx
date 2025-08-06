'use client'

import { useEffect, useState } from 'react'
import { Users, Calendar, TrendingUp, Download, Filter } from 'lucide-react'

interface CohortData {
  cohort: string
  week0: number
  week1: number
  week2: number
  week3: number
  week4: number
  week5: number
  week6: number
  week7: number
  users: number
}

interface CohortAnalysisProps {
  dateRange: { start: number; end: number }
}

export function CohortAnalysis({ dateRange }: CohortAnalysisProps) {
  const [cohortData, setCohortData] = useState<CohortData[]>([])
  const [metric, setMetric] = useState<'retention' | 'engagement' | 'conversion'>('retention')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCohortData()
  }, [dateRange, metric])

  const fetchCohortData = async () => {
    setLoading(true)
    try {
      // Mock cohort data
      const mockData: CohortData[] = []
      const weeks = 8
      const now = new Date()

      for (let i = 0; i < weeks; i++) {
        const cohortDate = new Date(now)
        cohortDate.setDate(cohortDate.getDate() - i * 7)

        const cohort: CohortData = {
          cohort: cohortDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          users: Math.floor(Math.random() * 200) + 100,
          week0: 100,
          week1: 0,
          week2: 0,
          week3: 0,
          week4: 0,
          week5: 0,
          week6: 0,
          week7: 0,
        }

        // Generate retention data
        let prevValue = 100
        for (let w = 1; w <= Math.min(i, 7); w++) {
          const retention = prevValue * (0.5 + Math.random() * 0.3)
          cohort[`week${w}` as keyof CohortData] = Math.round(retention) as number
          prevValue = retention
        }

        mockData.push(cohort)
      }

      setCohortData(mockData)
    } catch (error) {
      console.error('Failed to fetch cohort data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getColorIntensity = (value: number) => {
    if (value === 0) return 'bg-gray-100'
    if (value >= 80) return 'bg-green-500 text-white'
    if (value >= 60) return 'bg-green-400 text-white'
    if (value >= 40) return 'bg-green-300'
    if (value >= 20) return 'bg-green-200'
    return 'bg-green-100'
  }

  const exportData = () => {
    const csv = [
      [
        'Cohort',
        'Users',
        'Week 0',
        'Week 1',
        'Week 2',
        'Week 3',
        'Week 4',
        'Week 5',
        'Week 6',
        'Week 7',
      ],
      ...cohortData.map((row) => [
        row.cohort,
        row.users,
        row.week0,
        row.week1,
        row.week2,
        row.week3,
        row.week4,
        row.week5,
        row.week6,
        row.week7,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cohort_analysis_${metric}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Cohort Analysis
            </h2>
            <p className="text-sm text-gray-600 mt-1">Track user behavior over time by cohort</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={metric}
              onChange={(e) => setMetric(e.target.value as any)}
            >
              <option value="retention">Retention Rate</option>
              <option value="engagement">Engagement Rate</option>
              <option value="conversion">Conversion Rate</option>
            </select>
            <button
              onClick={exportData}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Cohort Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                  Cohort
                </th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                  Users
                </th>
                {[...Array(8)].map((_, i) => (
                  <th
                    key={i}
                    className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider p-3"
                  >
                    Week {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cohortData.map((row, idx) => (
                <tr key={idx}>
                  <td className="p-3 text-sm font-medium text-gray-900">{row.cohort}</td>
                  <td className="p-3 text-center text-sm text-gray-600">{row.users}</td>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((week) => {
                    const value = row[`week${week}` as keyof CohortData] as number
                    return (
                      <td key={week} className="p-2">
                        {value > 0 ? (
                          <div
                            className={`rounded-lg px-3 py-2 text-center text-sm font-medium ${getColorIntensity(value)}`}
                          >
                            {value}%
                          </div>
                        ) : (
                          <div className="rounded-lg px-3 py-2 text-center text-sm text-gray-400">
                            -
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-xs text-gray-600">80-100%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400 rounded"></div>
            <span className="text-xs text-gray-600">60-79%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-300 rounded"></div>
            <span className="text-xs text-gray-600">40-59%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-200 rounded"></div>
            <span className="text-xs text-gray-600">20-39%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 rounded"></div>
            <span className="text-xs text-gray-600">1-19%</span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Insights</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
            <span className="text-sm text-gray-700">
              Week 1 retention averages 65%, which is above industry standard
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-blue-600 mt-0.5" />
            <span className="text-sm text-gray-700">
              Recent cohorts show improved retention compared to older ones
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Users className="h-4 w-4 text-blue-600 mt-0.5" />
            <span className="text-sm text-gray-700">
              The largest drop occurs between Week 0 and Week 1
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}
