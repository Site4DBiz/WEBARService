'use client'

import { useState } from 'react'
import {
  BarChart3,
  LineChart,
  PieChart,
  Download,
  Plus,
  X,
  Settings,
  Save,
  Share2,
  Clock,
  Calendar,
  Filter,
  Layers,
  Eye,
} from 'lucide-react'

interface ReportWidget {
  id: string
  type: 'chart' | 'metric' | 'table' | 'text'
  title: string
  chartType?: 'line' | 'bar' | 'pie' | 'area'
  metric?: string
  timeRange?: string
  filters?: any
  position: { x: number; y: number; w: number; h: number }
}

interface SavedReport {
  id: string
  name: string
  description: string
  widgets: ReportWidget[]
  createdAt: Date
  lastModified: Date
  shared: boolean
}

export function CustomReportBuilder() {
  const [widgets, setWidgets] = useState<ReportWidget[]>([])
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [selectedWidget, setSelectedWidget] = useState<ReportWidget | null>(null)
  const [reportName, setReportName] = useState('Untitled Report')
  const [isPreview, setIsPreview] = useState(false)

  const addWidget = (type: ReportWidget['type'], chartType?: ReportWidget['chartType']) => {
    const newWidget: ReportWidget = {
      id: Date.now().toString(),
      type,
      chartType,
      title: `New ${type} Widget`,
      position: { x: 0, y: 0, w: 6, h: 4 },
      timeRange: '30d',
      metric: 'users',
    }
    setWidgets([...widgets, newWidget])
    setSelectedWidget(newWidget)
  }

  const updateWidget = (widgetId: string, updates: Partial<ReportWidget>) => {
    setWidgets(widgets.map((w) => (w.id === widgetId ? { ...w, ...updates } : w)))
  }

  const removeWidget = (widgetId: string) => {
    setWidgets(widgets.filter((w) => w.id !== widgetId))
    if (selectedWidget?.id === widgetId) {
      setSelectedWidget(null)
    }
  }

  const saveReport = () => {
    const report: SavedReport = {
      id: Date.now().toString(),
      name: reportName,
      description: 'Custom analytics report',
      widgets,
      createdAt: new Date(),
      lastModified: new Date(),
      shared: false,
    }
    setSavedReports([...savedReports, report])
    alert('Report saved successfully!')
  }

  const exportReport = () => {
    const reportData = {
      name: reportName,
      widgets,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportName.replace(/\s+/g, '_')}.json`
    a.click()
  }

  const renderWidgetContent = (widget: ReportWidget) => {
    switch (widget.type) {
      case 'chart':
        return (
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
            {widget.chartType === 'line' && <LineChart className="h-16 w-16 text-blue-600" />}
            {widget.chartType === 'bar' && <BarChart3 className="h-16 w-16 text-blue-600" />}
            {widget.chartType === 'pie' && <PieChart className="h-16 w-16 text-blue-600" />}
          </div>
        )
      case 'metric':
        return (
          <div className="h-full flex flex-col items-center justify-center">
            <p className="text-3xl font-bold text-gray-900">1,234</p>
            <p className="text-sm text-gray-600">{widget.metric}</p>
          </div>
        )
      case 'table':
        return (
          <div className="p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Metric</th>
                  <th className="text-right py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Users</td>
                  <td className="text-right">1,234</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Sessions</td>
                  <td className="text-right">5,678</td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      case 'text':
        return (
          <div className="p-4">
            <p className="text-sm text-gray-700">
              This is a text widget. You can add custom notes and descriptions here.
            </p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div>
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="text-xl font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-sm text-gray-600 mt-1">
              Build custom reports with drag-and-drop widgets
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                isPreview ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Eye className="h-4 w-4" />
              {isPreview ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={saveReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
            <button
              onClick={exportReport}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Widget Palette */}
      {!isPreview && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Widgets</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => addWidget('chart', 'line')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <LineChart className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-700">Line Chart</p>
            </button>
            <button
              onClick={() => addWidget('chart', 'bar')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-700">Bar Chart</p>
            </button>
            <button
              onClick={() => addWidget('chart', 'pie')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <PieChart className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-700">Pie Chart</p>
            </button>
            <button
              onClick={() => addWidget('metric')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Layers className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-700">Metric Card</p>
            </button>
            <button
              onClick={() => addWidget('table')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Settings className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-700">Data Table</p>
            </button>
            <button
              onClick={() => addWidget('text')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Plus className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-700">Text Block</p>
            </button>
          </div>
        </div>
      )}

      {/* Report Canvas */}
      <div className="bg-gray-50 rounded-xl p-6 min-h-[600px]">
        {widgets.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Layers className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No widgets added yet</p>
              <p className="text-sm text-gray-500">
                Add widgets from the palette above to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            {widgets.map((widget) => (
              <div
                key={widget.id}
                className={`bg-white rounded-lg shadow-sm overflow-hidden ${
                  selectedWidget?.id === widget.id && !isPreview ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  gridColumn: `span ${widget.position.w}`,
                  minHeight: `${widget.position.h * 50}px`,
                }}
                onClick={() => !isPreview && setSelectedWidget(widget)}
              >
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">{widget.title}</h4>
                  {!isPreview && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeWidget(widget.id)
                      }}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="p-4">{renderWidgetContent(widget)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Widget Settings */}
      {selectedWidget && !isPreview && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Widget Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={selectedWidget.title}
                onChange={(e) => updateWidget(selectedWidget.id, { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={selectedWidget.timeRange}
                onChange={(e) => updateWidget(selectedWidget.id, { timeRange: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Width (columns)
              </label>
              <input
                type="number"
                min="3"
                max="12"
                value={selectedWidget.position.w}
                onChange={(e) =>
                  updateWidget(selectedWidget.id, {
                    position: { ...selectedWidget.position, w: parseInt(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Reports</h3>
          <div className="space-y-3">
            {savedReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <h4 className="font-medium text-gray-900">{report.name}</h4>
                  <p className="text-sm text-gray-600">
                    {report.widgets.length} widgets • Last modified{' '}
                    {report.lastModified.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Share2 className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Download className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
