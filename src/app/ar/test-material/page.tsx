'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const MaterialEditor = dynamic(() => import('@/components/ar/MaterialEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
      <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
    </div>
  ),
})

const TextureUploader = dynamic(() => import('@/components/ar/TextureUploader'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
      <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
    </div>
  ),
})

export default function TestMaterialPage() {
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null)
  const [uploadedTextures, setUploadedTextures] = useState<any[]>([])

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">テクスチャ/マテリアル管理テスト</h1>
          <p className="mt-2 text-gray-600">
            3Dモデルのテクスチャとマテリアルを管理・編集するテストページです
          </p>
        </div>

        <div className="space-y-8">
          {/* テクスチャアップローダー */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <TextureUploader
              onTexturesReady={(textures) => {
                console.log('Textures ready:', textures)
                setUploadedTextures(textures)
              }}
              maxSize={2048}
              quality={0.85}
            />
          </div>

          {/* マテリアルエディタ */}
          <div className="bg-white rounded-lg shadow-lg">
            <MaterialEditor
              onMaterialChange={(material) => {
                console.log('Material changed:', material)
                setSelectedMaterial(material)
              }}
            />
          </div>

          {/* デバッグ情報 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">デバッグ情報</h3>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">アップロード済みテクスチャ</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {uploadedTextures.length > 0 ? (
                    <ul className="space-y-1">
                      {uploadedTextures.map((texture, index) => (
                        <li key={index}>
                          {texture.file?.name} - {texture.status}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-500">テクスチャがアップロードされていません</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">選択中のマテリアル</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {selectedMaterial ? (
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(selectedMaterial, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-gray-500">マテリアルが選択されていません</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
