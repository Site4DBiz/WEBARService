'use client'

import { useEffect, useState, Suspense, lazy } from 'react'
import {
  Users,
  TrendingUp,
  Activity,
  BarChart3,
  LineChart,
  Calendar,
  Download,
  Filter,
  AlertCircle,
  Target,
  ChevronDown,
  ChevronRight,
  Info,
  PieChart,
  Brain,
} from 'lucide-react'
import { ComponentLoader } from '@/components/ui/LoadingSpinner'

// Lazy load heavy analytics components
const CohortAnalysis = lazy(() => import('@/components/analytics/CohortAnalysis').then(mod => ({ default: mod.CohortAnalysis })))
const PredictiveAnalytics = lazy(() => import('@/components/analytics/PredictiveAnalytics').then(mod => ({ default: mod.PredictiveAnalytics })))
const CustomReportBuilder = lazy(() => import('@/components/analytics/CustomReportBuilder').then(mod => ({ default: mod.CustomReportBuilder })))
const BehaviorAnalysis = lazy(() => import('@/components/analytics/BehaviorAnalysis').then(mod => ({ default: mod.BehaviorAnalysis })))
const AnomalyDetection = lazy(() => import('@/components/analytics/AnomalyDetection').then(mod => ({ default: mod.AnomalyDetection })))
const AnalyticsInsights = lazy(() => import('@/components/analytics/AnalyticsInsights').then(mod => ({ default: mod.AnalyticsInsights })))

interface AnalyticsTab {
  id: string
  label: string
  icon: any
  description: string
}

const tabs: AnalyticsTab[] = [
  {
    id: 'insights',
    label: 'AI Insights',
    icon: Brain,
    description: 'AI-powered insights and recommendations',
  },
  {
    id: 'cohort',
    label: 'Cohort Analysis',
    icon: Users,
    description: 'User behavior analysis by cohort',
  },
  {
    id: 'behavior',
    label: 'Behavior Analysis',
    icon: Activity,
    description: 'Deep dive into user behavior patterns',
  },
  {
    id: 'predictive',
    label: 'Predictive Analytics',
    icon: TrendingUp,
    description: 'Forecast trends and predict future metrics',
  },
  {
    id: 'anomaly',
    label: 'Anomaly Detection',
    icon: AlertCircle,
    description: 'Detect unusual patterns and outliers',
  },
  {
    id: 'custom',
    label: 'Custom Reports',
    icon: BarChart3,
    description: 'Build custom reports and dashboards',
  },
]

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('insights')
  const [dateRange, setDateRange] = useState({ start: 30, end: 0 })
  const [loading, setLoading] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setExpandedSection(null)
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <PieChart className="h-8 w-8 text-blue-600" />
                  Analytics View
                </h1>
                <p className="text-gray-600 mt-2">
                  Advanced analytics and insights for your WebAR platform
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <select
                    className="bg-transparent text-sm focus:outline-none"
                    value={dateRange.start}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, start: parseInt(e.target.value) })
                    }
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                    <option value={365}>Last year</option>
                  </select>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Filter className="h-5 w-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm p-2">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      flex flex-col items-center p-3 rounded-lg transition-all
                      ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600 shadow-sm'
                          : 'hover:bg-gray-50 text-gray-600'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-xs font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tab Description */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  {tabs.find((t) => t.id === activeTab)?.label}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {tabs.find((t) => t.id === activeTab)?.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          <Suspense fallback={<ComponentLoader message="Loading analytics data..." />}>
            {activeTab === 'insights' && <AnalyticsInsights dateRange={dateRange} />}

            {activeTab === 'cohort' && <CohortAnalysis dateRange={dateRange} />}

            {activeTab === 'behavior' && <BehaviorAnalysis dateRange={dateRange} />}

            {activeTab === 'predictive' && <PredictiveAnalytics dateRange={dateRange} />}

            {activeTab === 'anomaly' && <AnomalyDetection dateRange={dateRange} />}

            {activeTab === 'custom' && <CustomReportBuilder />}
          </Suspense>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <Download className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Export Report</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
              <button className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Schedule Report</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
              <button className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Set Goals</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
