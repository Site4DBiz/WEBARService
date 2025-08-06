'use client'

import { FileText, Eye, TrendingUp, Award, User } from 'lucide-react'

interface ContentPerformanceProps {
  data?: {
    contents?: Array<{
      id: string
      title: string
      views_count: number
      created_at: string
    }>
    creators?: Array<{
      id: string
      username: string
      email: string
    }>
    engagement?: Array<{
      id: string
      title: string
      views_count: number
      engagementRate: string
    }>
  }
  title?: string
}

export default function ContentPerformance({ data, title = 'Content Performance' }: ContentPerformanceProps) {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      
      <div className="space-y-6">
        {/* Top Contents */}
        {data.contents && data.contents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2 text-blue-600" />
              Top Performing Contents
            </h4>
            <div className="space-y-3">
              {data.contents.map((content, index) => (
                <div key={content.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-600' :
                      'bg-blue-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{content.title}</p>
                      <p className="text-xs text-gray-500">
                        Created {new Date(content.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">
                      {formatNumber(content.views_count)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Creators */}
        {data.creators && data.creators.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <User className="h-4 w-4 mr-2 text-green-600" />
              Top Creators
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.creators.map((creator, index) => (
                <div key={creator.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {creator.username?.charAt(0).toUpperCase() || creator.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">
                      {creator.username || creator.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-500">{creator.email}</p>
                  </div>
                  {index === 0 && <Award className="h-5 w-5 text-yellow-500" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engagement Metrics */}
        {data.engagement && data.engagement.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-purple-600" />
              Highest Engagement
            </h4>
            <div className="space-y-2">
              {data.engagement.map((item) => (
                <div key={item.id} className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                      {item.engagementRate}% engagement
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{formatNumber(item.views_count)} views</span>
                    <span className="text-green-600 font-medium">
                      +{((Number(item.engagementRate) - 5) * 10).toFixed(0)}% vs avg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!data.contents || data.contents.length === 0) && 
         (!data.creators || data.creators.length === 0) && 
         (!data.engagement || data.engagement.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No performance data available</p>
          </div>
        )}
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