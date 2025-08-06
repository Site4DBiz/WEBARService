'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Settings, Download, Upload, Trash2 } from 'lucide-react'
import * as THREE from 'three'
import {
  TextureOptimizer,
  TextureOptimizationOptions,
  TextureStats,
  TextureCache,
} from '@/lib/ar/TextureOptimizer'

interface TextureSettingsProps {
  texture?: THREE.Texture
  onOptimize?: (texture: THREE.Texture, stats: TextureStats) => void
  onReset?: () => void
}

export default function TextureSettings({ texture, onOptimize, onReset }: TextureSettingsProps) {
  const [optimizer] = useState(() => new TextureOptimizer())
  const [cache] = useState(() => new TextureCache(100)) // 100MB cache

  const [options, setOptions] = useState<TextureOptimizationOptions>({
    maxSize: 2048,
    quality: 85,
    format: 'webp',
    generateMipmaps: true,
    powerOfTwo: true,
    removeAlpha: false,
    compress: true,
  })

  const [stats, setStats] = useState<TextureStats | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cacheInfo, setCacheInfo] = useState({ count: 0, size: 0, maxSize: 104857600 })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      optimizer.dispose()
      cache.clear()
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [])

  useEffect(() => {
    const info = cache.getInfo()
    setCacheInfo(info)
  }, [stats])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setError(null)
    }
  }

  const handleOptimize = async () => {
    if (!texture && !selectedFile) {
      setError('テクスチャを選択してください')
      return
    }

    setIsOptimizing(true)
    setError(null)

    try {
      let textureToOptimize: THREE.Texture | string

      if (selectedFile) {
        textureToOptimize = previewUrl!
      } else {
        textureToOptimize = texture!
      }

      const result = await optimizer.optimizeTexture(textureToOptimize, options)
      setStats(result.stats)

      // Cache the optimized texture
      cache.set(
        textureToOptimize instanceof THREE.Texture ? textureToOptimize.uuid : textureToOptimize,
        result.texture,
        result.stats.optimizedSize
      )

      if (onOptimize) {
        onOptimize(result.texture, result.stats)
      }
    } catch (err) {
      console.error('Texture optimization error:', err)
      setError('テクスチャの最適化に失敗しました')
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleReset = () => {
    setOptions({
      maxSize: 2048,
      quality: 85,
      format: 'webp',
      generateMipmaps: true,
      powerOfTwo: true,
      removeAlpha: false,
      compress: true,
    })
    setStats(null)
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (onReset) {
      onReset()
    }
  }

  const handleClearCache = () => {
    cache.clear()
    setCacheInfo({ count: 0, size: 0, maxSize: 104857600 })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            テクスチャ最適化設定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          {!texture && (
            <div className="space-y-2">
              <Label>テクスチャファイル</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('texture-file')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  ファイル選択
                </Button>
                <input
                  id="texture-file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile && (
                  <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
                )}
              </div>
              {previewUrl && (
                <div className="mt-2">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded border"
                  />
                </div>
              )}
            </div>
          )}

          {/* Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="format">出力フォーマット</Label>
            <Select
              value={options.format}
              onValueChange={(value) => setOptions({ ...options, format: value as any })}
            >
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webp">WebP (推奨)</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="basis">Basis Universal</SelectItem>
                <SelectItem value="ktx2">KTX2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quality Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="quality">品質</Label>
              <span className="text-sm text-muted-foreground">{options.quality}%</span>
            </div>
            <Slider
              id="quality"
              min={0}
              max={100}
              step={5}
              value={[options.quality || 85]}
              onValueChange={(value) => setOptions({ ...options, quality: value[0] })}
              className="w-full"
            />
          </div>

          {/* Max Size */}
          <div className="space-y-2">
            <Label htmlFor="maxSize">最大サイズ</Label>
            <Select
              value={String(options.maxSize)}
              onValueChange={(value) => setOptions({ ...options, maxSize: parseInt(value) })}
            >
              <SelectTrigger id="maxSize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="512">512px</SelectItem>
                <SelectItem value="1024">1024px</SelectItem>
                <SelectItem value="2048">2048px</SelectItem>
                <SelectItem value="4096">4096px</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="compress">圧縮を有効化</Label>
              <Switch
                id="compress"
                checked={options.compress}
                onCheckedChange={(checked) => setOptions({ ...options, compress: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="mipmaps">ミップマップ生成</Label>
              <Switch
                id="mipmaps"
                checked={options.generateMipmaps}
                onCheckedChange={(checked) => setOptions({ ...options, generateMipmaps: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="pot">Power of Twoサイズに調整</Label>
              <Switch
                id="pot"
                checked={options.powerOfTwo}
                onCheckedChange={(checked) => setOptions({ ...options, powerOfTwo: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="removeAlpha">アルファチャンネル削除</Label>
              <Switch
                id="removeAlpha"
                checked={options.removeAlpha}
                onCheckedChange={(checked) => setOptions({ ...options, removeAlpha: checked })}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleOptimize} disabled={isOptimizing || (!texture && !selectedFile)}>
              {isOptimizing ? '最適化中...' : '最適化実行'}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              リセット
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Optimization Stats */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>最適化結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">元のサイズ</p>
                <p className="text-2xl font-bold">{formatFileSize(stats.originalSize)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">最適化後</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatFileSize(stats.optimizedSize)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">圧縮率</p>
                <p className="text-2xl font-bold">{stats.compressionRatio.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm font-medium">解像度</p>
                <p className="text-2xl font-bold">
                  {stats.width} × {stats.height}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">フォーマット</p>
                <p className="text-lg font-semibold">{stats.format.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm font-medium">アルファチャンネル</p>
                <p className="text-lg font-semibold">{stats.hasAlpha ? 'あり' : 'なし'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cache Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>キャッシュ情報</span>
            <Button variant="ghost" size="sm" onClick={handleClearCache}>
              <Trash2 className="w-4 h-4 mr-2" />
              クリア
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium">キャッシュ数</p>
              <p className="text-xl font-bold">{cacheInfo.count}</p>
            </div>
            <div>
              <p className="text-sm font-medium">使用容量</p>
              <p className="text-xl font-bold">{formatFileSize(cacheInfo.size)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">最大容量</p>
              <p className="text-xl font-bold">{formatFileSize(cacheInfo.maxSize)}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(cacheInfo.size / cacheInfo.maxSize) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          テクスチャ最適化により、ファイルサイズを削減し、レンダリングパフォーマンスを向上させることができます。
          WebP形式は高い圧縮率と品質を両立できる推奨フォーマットです。
        </AlertDescription>
      </Alert>
    </div>
  )
}
