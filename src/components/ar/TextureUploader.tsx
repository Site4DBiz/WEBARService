'use client'

import React, { useState, useCallback } from 'react'
import {
  Upload,
  X,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  ZoomIn,
  Maximize2,
  Minimize2,
  Download,
} from 'lucide-react'
import { TextureCompressor } from '@/lib/ar/texture-manager'

interface TextureFile {
  id: string
  file: File
  preview: string
  compressed?: Blob
  originalSize: number
  compressedSize?: number
  status: 'pending' | 'compressing' | 'compressed' | 'error'
  error?: string
}

interface TextureUploaderProps {
  onTexturesReady?: (textures: TextureFile[]) => void
  maxSize?: number
  quality?: number
  acceptedFormats?: string[]
}

export function TextureUploader({
  onTexturesReady,
  maxSize = 2048,
  quality = 0.85,
  acceptedFormats = ['image/png', 'image/jpeg', 'image/webp', '.ktx2'],
}: TextureUploaderProps) {
  const [textures, setTextures] = useState<TextureFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [selectedTexture, setSelectedTexture] = useState<string | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        acceptedFormats.some((format) =>
          format.startsWith('.') ? file.name.endsWith(format) : file.type === format
        )
      )

      await processFiles(files)
    },
    [acceptedFormats]
  )

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    await processFiles(files)
  }, [])

  const processFiles = async (files: File[]) => {
    const newTextures: TextureFile[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      originalSize: file.size,
      status: 'pending' as const,
    }))

    setTextures((prev) => [...prev, ...newTextures])

    // 自動圧縮
    if (files.length > 0) {
      await compressTextures(newTextures)
    }
  }

  const compressTextures = async (texturesToCompress: TextureFile[]) => {
    setIsCompressing(true)

    const compressedTextures = await Promise.all(
      texturesToCompress.map(async (texture) => {
        try {
          setTextures((prev) =>
            prev.map((t) => (t.id === texture.id ? { ...t, status: 'compressing' as const } : t))
          )

          // KTX2ファイルは圧縮しない
          if (texture.file.name.endsWith('.ktx2')) {
            return {
              ...texture,
              status: 'compressed' as const,
              compressed: texture.file,
              compressedSize: texture.originalSize,
            }
          }

          const compressed = await TextureCompressor.compressImage(texture.file, maxSize, quality)

          return {
            ...texture,
            status: 'compressed' as const,
            compressed,
            compressedSize: compressed.size,
          }
        } catch (error) {
          console.error('Compression error:', error)
          return {
            ...texture,
            status: 'error' as const,
            error: 'Compression failed',
          }
        }
      })
    )

    setTextures(compressedTextures)
    setIsCompressing(false)

    // 圧縮完了を通知
    const validTextures = compressedTextures.filter((t) => t.status === 'compressed')
    onTexturesReady?.(validTextures)
  }

  const removeTexture = (id: string) => {
    setTextures((prev) => {
      const texture = prev.find((t) => t.id === id)
      if (texture) {
        URL.revokeObjectURL(texture.preview)
      }
      return prev.filter((t) => t.id !== id)
    })
  }

  const downloadCompressed = (texture: TextureFile) => {
    if (!texture.compressed) return

    const url = URL.createObjectURL(texture.compressed)
    const a = document.createElement('a')
    a.href = url
    a.download = `compressed_${texture.file.name.replace(/\.[^/.]+$/, '.webp')}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const getCompressionRate = (original: number, compressed?: number) => {
    if (!compressed) return 0
    return Math.round((1 - compressed / original) * 100)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">テクスチャアップロード</h3>
        <p className="text-gray-600 text-sm">画像をドラッグ&ドロップまたは選択してアップロード</p>
      </div>

      {/* アップロードエリア */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          type="file"
          multiple
          accept={acceptedFormats.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          id="texture-upload"
        />

        <label htmlFor="texture-upload" className="cursor-pointer flex flex-col items-center">
          <Upload className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">ファイルをドラッグ&ドロップ</p>
          <p className="text-sm text-gray-500">または クリックして選択</p>
          <p className="text-xs text-gray-400 mt-2">
            対応形式: PNG, JPG, WebP, KTX2 (最大 {maxSize}px)
          </p>
        </label>

        {isCompressing && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">圧縮処理中...</p>
            </div>
          </div>
        )}
      </div>

      {/* テクスチャリスト */}
      {textures.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold mb-3">アップロード済みテクスチャ</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {textures.map((texture) => (
              <div
                key={texture.id}
                className="relative group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square bg-gray-100 relative">
                  <img
                    src={texture.preview}
                    alt={texture.file.name}
                    className="w-full h-full object-cover"
                  />

                  {/* ステータスオーバーレイ */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity">
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => setSelectedTexture(texture.id)}
                        className="p-1 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      {texture.compressed && (
                        <button
                          onClick={() => downloadCompressed(texture)}
                          className="p-1 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => removeTexture(texture.id)}
                        className="p-1 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* ステータスバッジ */}
                  <div className="absolute bottom-2 left-2">
                    {texture.status === 'compressing' && (
                      <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        圧縮中
                      </div>
                    )}
                    {texture.status === 'compressed' && (
                      <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {getCompressionRate(texture.originalSize, texture.compressedSize)}%削減
                      </div>
                    )}
                    {texture.status === 'error' && (
                      <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        エラー
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-2">
                  <p className="text-xs font-medium truncate" title={texture.file.name}>
                    {texture.file.name}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    <div>元: {formatFileSize(texture.originalSize)}</div>
                    {texture.compressedSize && (
                      <div>圧縮後: {formatFileSize(texture.compressedSize)}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* プレビューモーダル */}
      {selectedTexture && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTexture(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">
                {textures.find((t) => t.id === selectedTexture)?.file.name}
              </h3>
              <button
                onClick={() => setSelectedTexture(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={textures.find((t) => t.id === selectedTexture)?.preview}
                alt="Preview"
                className="max-w-full max-h-[70vh] mx-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
