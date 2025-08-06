'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ARMarkerForm } from '@/components/ar/ARMarkerForm'
import { ArrowLeft, Image } from 'lucide-react'

export default function NewARMarkerPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            戻る
          </button>

          <div className="flex items-center gap-3">
            <Image className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">新規ARマーカー登録</h1>
          </div>
          <p className="mt-2 text-gray-600">WebARで使用する新しいマーカー画像を登録します</p>
        </div>

        {/* フォーム */}
        <ARMarkerForm />

        {/* ガイドライン */}
        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">良いマーカー画像の条件</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>高コントラストで特徴的なパターンを含む画像</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>解像度が512x512ピクセル以上の画像</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>左右非対称で回転に強い画像</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>細かいディテールとエッジが多い画像</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✗</span>
              <span className="text-red-600">単色や繰り返しパターンの画像は避ける</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✗</span>
              <span className="text-red-600">ぼやけた画像や低解像度の画像は避ける</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
