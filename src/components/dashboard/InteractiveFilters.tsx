'use client'

import { useState } from 'react'
import { Calendar, Filter, Users, Package, Activity, TrendingUp, X } from 'lucide-react'

interface FilterOptions {
  dateRange: number
  userRole?: string
  contentCategory?: string
  deviceType?: string
  minQualityScore?: number
  comparison?: boolean
}

interface InteractiveFiltersProps {
  onFilterChange: (filters: FilterOptions) => void
  initialFilters?: FilterOptions
}

export function InteractiveFilters({ onFilterChange, initialFilters }: InteractiveFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>(
    initialFilters || {
      dateRange: 30,
      comparison: false,
    }
  )
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)

    if (value && value !== '' && value !== 0) {
      if (!activeFilters.includes(key)) {
        setActiveFilters([...activeFilters, key])
      }
    } else {
      setActiveFilters(activeFilters.filter((f) => f !== key))
    }

    onFilterChange(newFilters)
  }

  const clearFilter = (key: keyof FilterOptions) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    setFilters(newFilters)
    setActiveFilters(activeFilters.filter((f) => f !== key))
    onFilterChange(newFilters)
  }

  const clearAllFilters = () => {
    const newFilters = { dateRange: 30, comparison: false }
    setFilters(newFilters)
    setActiveFilters([])
    onFilterChange(newFilters)
  }

  const quickFilters = [
    { label: 'Today', value: 1, icon: Calendar },
    { label: 'Week', value: 7, icon: TrendingUp },
    { label: 'Month', value: 30, icon: Activity },
    { label: 'Quarter', value: 90, icon: Package },
  ]

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Filter className="h-4 w-4" />
        <span>Filters</span>
        {activeFilters.length > 0 && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
            {activeFilters.length}
          </span>
        )}
      </button>

      {/* Quick Filters */}
      <div className="flex space-x-2 mt-4">
        {quickFilters.map((filter) => {
          const Icon = filter.icon
          return (
            <button
              key={filter.value}
              onClick={() => handleFilterChange('dateRange', filter.value)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
                filters.dateRange === filter.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm">{filter.label}</span>
            </button>
          )
        })}
      </div>

      {/* Filter Panel */}
      {isOpen && (
        <div className="absolute top-12 left-0 z-50 w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Advanced Filters</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Date Range */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>

          {/* User Role Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">User Role</label>
            <select
              value={filters.userRole || ''}
              onChange={(e) => handleFilterChange('userRole', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="creator">Creator</option>
              <option value="viewer">Viewer</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>

          {/* Content Category Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Content Category</label>
            <select
              value={filters.contentCategory || ''}
              onChange={(e) => handleFilterChange('contentCategory', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="education">Education</option>
              <option value="entertainment">Entertainment</option>
              <option value="retail">Retail</option>
              <option value="marketing">Marketing</option>
              <option value="art">Art</option>
              <option value="gaming">Gaming</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Device Type Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Device Type</label>
            <select
              value={filters.deviceType || ''}
              onChange={(e) => handleFilterChange('deviceType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Devices</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
              <option value="desktop">Desktop</option>
              <option value="vr">VR Headset</option>
            </select>
          </div>

          {/* Quality Score Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Quality Score
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.minQualityScore || 0}
              onChange={(e) => handleFilterChange('minQualityScore', Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span>{filters.minQualityScore || 0}</span>
              <span>100</span>
            </div>
          </div>

          {/* Comparison Mode */}
          <div className="mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.comparison || false}
                onChange={(e) => handleFilterChange('comparison', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable period comparison</span>
            </label>
          </div>

          {/* Active Filters Display */}
          {activeFilters.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((filter) => (
                  <span
                    key={filter}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {filter}
                    <button
                      onClick={() => clearFilter(filter as keyof FilterOptions)}
                      className="ml-1 hover:text-blue-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
