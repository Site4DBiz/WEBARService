'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Palette,
  Upload,
  Download,
  Eye,
  X,
  Sliders,
  Sparkles,
  Droplets,
  Shield,
  Zap,
  Package,
  Grid3x3,
  Image as ImageIcon,
} from 'lucide-react'
import * as THREE from 'three'
import { MaterialManager, MaterialProperties, MaterialPreset } from '@/lib/ar/material-manager'
import { TextureManager, TextureType } from '@/lib/ar/texture-manager'
import dynamic from 'next/dynamic'

const ModelViewer = dynamic(() => import('../3d/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  ),
})

interface MaterialEditorProps {
  initialMaterial?: THREE.Material
  onMaterialChange?: (material: THREE.Material) => void
  modelUrl?: string
}

export function MaterialEditor({
  initialMaterial,
  onMaterialChange,
  modelUrl,
}: MaterialEditorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [previewGeometry, setPreviewGeometry] = useState<'sphere' | 'cube' | 'torus' | 'cylinder'>(
    'sphere'
  )
  const [activeTab, setActiveTab] = useState<'presets' | 'properties' | 'textures'>('presets')

  const textureManagerRef = useRef<TextureManager | null>(null)
  const materialManagerRef = useRef<MaterialManager | null>(null)

  const [materialProperties, setMaterialProperties] = useState<MaterialProperties>({
    type: 'physical',
    color: '#ffffff',
    metalness: 0.5,
    roughness: 0.5,
    opacity: 1.0,
    transparent: false,
    emissive: '#000000',
    emissiveIntensity: 0,
  })

  const [textures, setTextures] = useState<{
    diffuse?: File
    normal?: File
    roughness?: File
    metalness?: File
    emissive?: File
    ao?: File
    displacement?: File
    alpha?: File
  }>({})

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    // マネージャーの初期化
    const renderer = new THREE.WebGLRenderer()
    textureManagerRef.current = new TextureManager(renderer)
    materialManagerRef.current = new MaterialManager(textureManagerRef.current)

    return () => {
      textureManagerRef.current?.dispose()
      materialManagerRef.current?.dispose()
      renderer.dispose()
    }
  }, [])

  const handlePresetSelect = async (presetId: string) => {
    setSelectedPreset(presetId)

    if (!materialManagerRef.current) return

    const preset = materialManagerRef.current.getPreset(presetId)
    if (preset) {
      setMaterialProperties(preset.properties)

      // マテリアルを作成して通知
      const material = await materialManagerRef.current.createFromPreset(presetId)
      onMaterialChange?.(material)

      // プレビュー更新
      updatePreview(material)
    }
  }

  const handlePropertyChange = (property: keyof MaterialProperties, value: any) => {
    const newProperties = { ...materialProperties, [property]: value }
    setMaterialProperties(newProperties)

    if (!materialManagerRef.current) return

    // マテリアルを更新
    const material = materialManagerRef.current.createMaterial(newProperties)
    onMaterialChange?.(material)

    // プレビュー更新
    updatePreview(material)
  }

  const handleTextureUpload = async (type: TextureType, file: File) => {
    setTextures((prev) => ({ ...prev, [type]: file }))

    if (!textureManagerRef.current || !materialManagerRef.current) return

    // テクスチャを読み込み
    const url = URL.createObjectURL(file)
    const textureConfig = {
      url,
      type,
      anisotropy: 16,
    }

    try {
      const texture = await textureManagerRef.current.loadTexture(textureConfig)

      // テクスチャセットを作成
      const textureSet = { [type]: texture }

      // マテリアルを更新
      const material = materialManagerRef.current.createMaterial(
        materialProperties,
        textureSet as any
      )
      onMaterialChange?.(material)

      // プレビュー更新
      updatePreview(material)
    } catch (error) {
      console.error('Failed to load texture:', error)
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const updatePreview = (material: THREE.Material) => {
    // プレビュー生成（実際の実装では MaterialPreviewGenerator を使用）
    // ここでは簡略化
    setPreviewUrl('/api/preview/material') // 仮のURL
  }

  const renderPresets = () => {
    if (!materialManagerRef.current) return null

    const presets = materialManagerRef.current.getAllPresets()

    return (
      <div className="grid grid-cols-3 gap-3">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePresetSelect(preset.id)}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedPreset === preset.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded mb-2" />
            <div className="text-sm font-medium">{preset.name}</div>
            {preset.description && (
              <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
            )}
          </button>
        ))}
      </div>
    )
  }

  const renderProperties = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Palette className="inline w-4 h-4 mr-1" />色
        </label>
        <input
          type="color"
          value={materialProperties.color as string}
          onChange={(e) => handlePropertyChange('color', e.target.value)}
          className="w-full h-10 rounded cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Shield className="inline w-4 h-4 mr-1" />
          メタリック度
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={materialProperties.metalness}
          onChange={(e) => handlePropertyChange('metalness', parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="text-xs text-gray-500 mt-1">{materialProperties.metalness?.toFixed(2)}</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Grid3x3 className="inline w-4 h-4 mr-1" />
          粗さ
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={materialProperties.roughness}
          onChange={(e) => handlePropertyChange('roughness', parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="text-xs text-gray-500 mt-1">{materialProperties.roughness?.toFixed(2)}</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Droplets className="inline w-4 h-4 mr-1" />
          透明度
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={materialProperties.opacity}
          onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="text-xs text-gray-500 mt-1">{materialProperties.opacity?.toFixed(2)}</div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="transparent"
          checked={materialProperties.transparent}
          onChange={(e) => handlePropertyChange('transparent', e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="transparent" className="text-sm font-medium text-gray-700">
          透明マテリアル
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Zap className="inline w-4 h-4 mr-1" />
          発光色
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={materialProperties.emissive as string}
            onChange={(e) => handlePropertyChange('emissive', e.target.value)}
            className="flex-1 h-10 rounded cursor-pointer"
          />
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={materialProperties.emissiveIntensity}
            onChange={(e) => handlePropertyChange('emissiveIntensity', parseFloat(e.target.value))}
            className="flex-1"
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          強度: {materialProperties.emissiveIntensity?.toFixed(1)}
        </div>
      </div>
    </div>
  )

  const renderTextures = () => {
    const textureTypes: { type: TextureType; label: string; icon: React.ReactNode }[] = [
      { type: 'diffuse', label: 'ディフューズ', icon: <ImageIcon className="w-4 h-4" /> },
      { type: 'normal', label: '法線', icon: <Package className="w-4 h-4" /> },
      { type: 'roughness', label: '粗さ', icon: <Grid3x3 className="w-4 h-4" /> },
      { type: 'metalness', label: 'メタリック', icon: <Shield className="w-4 h-4" /> },
      { type: 'emissive', label: '発光', icon: <Zap className="w-4 h-4" /> },
      { type: 'ao', label: 'AO', icon: <Sparkles className="w-4 h-4" /> },
      { type: 'displacement', label: '変位', icon: <Sliders className="w-4 h-4" /> },
      { type: 'alpha', label: 'アルファ', icon: <Droplets className="w-4 h-4" /> },
    ]

    return (
      <div className="space-y-3">
        {textureTypes.map(({ type, label, icon }) => (
          <div key={type} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                {icon}
                <span className="ml-2 text-sm font-medium">{label}マップ</span>
              </div>
              {textures[type] && (
                <button
                  onClick={() => setTextures((prev) => ({ ...prev, [type]: undefined }))}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="file"
                accept="image/*,.ktx2"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleTextureUpload(type, file)
                }}
                className="hidden"
                id={`texture-${type}`}
              />
              <label
                htmlFor={`texture-${type}`}
                className="flex items-center justify-center w-full p-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
              >
                {textures[type] ? (
                  <div className="flex items-center text-sm text-gray-600">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {textures[type]?.name}
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-gray-400">
                    <Upload className="w-4 h-4 mr-2" />
                    アップロード
                  </div>
                )}
              </label>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">マテリアルエディタ</h2>
        <p className="text-gray-600">3Dモデルのマテリアルをカスタマイズできます</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'presets'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              プリセット
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'properties'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              プロパティ
            </button>
            <button
              onClick={() => setActiveTab('textures')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'textures'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              テクスチャ
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
            {activeTab === 'presets' && renderPresets()}
            {activeTab === 'properties' && renderProperties()}
            {activeTab === 'textures' && renderTextures()}
          </div>
        </div>

        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">プレビュー</h3>
            <div className="flex gap-2">
              {(['sphere', 'cube', 'torus', 'cylinder'] as const).map((shape) => (
                <button
                  key={shape}
                  onClick={() => setPreviewGeometry(shape)}
                  className={`px-3 py-1 rounded text-sm ${
                    previewGeometry === shape
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {shape === 'sphere' && '球'}
                  {shape === 'cube' && '立方体'}
                  {shape === 'torus' && 'トーラス'}
                  {shape === 'cylinder' && '円柱'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center">
            {modelUrl ? (
              <ModelViewer modelUrl={modelUrl} />
            ) : (
              <div className="text-gray-400">
                <Eye className="w-16 h-16 mx-auto mb-2" />
                <p className="text-center">プレビューエリア</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center">
              <Download className="w-4 h-4 mr-2" />
              エクスポート
            </button>
            <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center">
              <Upload className="w-4 h-4 mr-2" />
              インポート
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

