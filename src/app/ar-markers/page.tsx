'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ARMarkerList } from '@/components/ar/ARMarkerList'
import { Plus, Image, Upload, BarChart3 } from 'lucide-react'

export default function ARMarkersPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'public' | 'favorites'>('all')

  const tabs = [
    { id: 'all', label: 'すべて', description: '利用可能なすべてのマーカー' },
    { id: 'my', label: 'マイマーカー', description: '自分が作成したマーカー' },
    { id: 'public', label: '公開マーカー', description: '他のユーザーが公開したマーカー' },
    { id: 'favorites', label: 'お気に入り', description: 'お気に入りに追加したマーカー' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Image className="h-8 w-8 text-blue-600" />
                ARマーカー管理
              </h1>
              <p className="mt-2 text-gray-600">WebARで使用するマーカー画像を管理します</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/ar-markers/stats')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <BarChart3 className="h-5 w-5" />
                統計ダッシュボード
              </button>
              <button
                onClick={() => router.push('/ar-markers/batch')}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Upload className="h-5 w-5" />
                バッチアップロード
              </button>
              <button
                onClick={() => router.push('/ar-markers/new')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus className="h-5 w-5" />
                新規マーカー作成
              </button>
            </div>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600">総マーカー数</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600">公開マーカー</p>
              <p className="text-2xl font-bold text-blue-600">-</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600">お気に入り</p>
              <p className="text-2xl font-bold text-red-500">-</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600">総ビュー数</p>
              <p className="text-2xl font-bold text-green-600">-</p>
            </div>
          </div>

          {/* タブ */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* マーカーリスト */}
        <ARMarkerList filter={activeTab} />

        {/* ヘルプセクション */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">ARマーカーの使い方</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>1. 「新規マーカー作成」ボタンをクリックして、新しいマーカーを登録します</p>
            <p>2. マーカー画像をアップロードし、名前や説明を設定します</p>
            <p>3. 品質スコアが高いマーカーほど、ARトラッキングの精度が向上します</p>
            <p>4. 公開設定にすると、他のユーザーもそのマーカーを利用できるようになります</p>
          </div>
        </div>
      </div>
    </div>
  )
}
