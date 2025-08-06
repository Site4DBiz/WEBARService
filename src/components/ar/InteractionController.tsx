'use client'

import React, { useState, useEffect } from 'react'
import { InteractionConfig } from '@/lib/ar/InteractionManager'
import { 
  MousePointer, 
  Hand, 
  Move3d, 
  ZoomIn, 
  RotateCw,
  Volume2,
  Link,
  Palette,
  Maximize2,
  Play
} from 'lucide-react'

export interface InteractionSettings {
  enableClick: boolean
  enableHover: boolean
  enableDrag: boolean
  enablePinch: boolean
  enableRotate: boolean
  actions: {
    url?: string
    sound?: string
    colorChange?: string
    scaleChange?: number
    animationTrigger?: string
  }
  animations: {
    onClick?: string
    onHover?: string
  }
}

interface InteractionControllerProps {
  onSettingsChange: (settings: InteractionSettings) => void
  availableAnimations?: string[]
  className?: string
}

export const InteractionController: React.FC<InteractionControllerProps> = ({
  onSettingsChange,
  availableAnimations = [],
  className = ''
}) => {
  const [settings, setSettings] = useState<InteractionSettings>({
    enableClick: true,
    enableHover: true,
    enableDrag: false,
    enablePinch: false,
    enableRotate: false,
    actions: {},
    animations: {}
  })

  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    onSettingsChange(settings)
  }, [settings, onSettingsChange])

  const updateSetting = (key: keyof InteractionSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updateAction = (key: keyof InteractionSettings['actions'], value: any) => {
    setSettings(prev => ({
      ...prev,
      actions: {
        ...prev.actions,
        [key]: value || undefined
      }
    }))
  }

  const updateAnimation = (key: keyof InteractionSettings['animations'], value: string) => {
    setSettings(prev => ({
      ...prev,
      animations: {
        ...prev.animations,
        [key]: value || undefined
      }
    }))
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-900">インタラクション設定</h3>
      
      {/* Basic Interactions */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableClick}
              onChange={(e) => updateSetting('enableClick', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <MousePointer className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">クリック</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableHover}
              onChange={(e) => updateSetting('enableHover', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Hand className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">ホバー</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableDrag}
              onChange={(e) => updateSetting('enableDrag', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Move3d className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">ドラッグ</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enablePinch}
              onChange={(e) => updateSetting('enablePinch', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <ZoomIn className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">ピンチ</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableRotate}
              onChange={(e) => updateSetting('enableRotate', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <RotateCw className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">回転</span>
          </label>
        </div>

        {/* Advanced Settings Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-4"
        >
          {showAdvanced ? '詳細設定を隠す' : '詳細設定を表示'}
        </button>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="mt-4 space-y-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700">アクション設定</h4>
            
            {/* URL Link */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Link className="w-4 h-4" />
                <span>URLリンク</span>
              </label>
              <input
                type="url"
                value={settings.actions.url || ''}
                onChange={(e) => updateAction('url', e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sound */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Volume2 className="w-4 h-4" />
                <span>効果音URL</span>
              </label>
              <input
                type="url"
                value={settings.actions.sound || ''}
                onChange={(e) => updateAction('sound', e.target.value)}
                placeholder="https://example.com/sound.mp3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Color Change */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Palette className="w-4 h-4" />
                <span>クリック時の色変更</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="color"
                  value={settings.actions.colorChange || '#ffffff'}
                  onChange={(e) => updateAction('colorChange', e.target.value)}
                  className="h-10 w-20"
                />
                <input
                  type="text"
                  value={settings.actions.colorChange || ''}
                  onChange={(e) => updateAction('colorChange', e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Scale Change */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Maximize2 className="w-4 h-4" />
                <span>クリック時のスケール変更</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={settings.actions.scaleChange || 1}
                  onChange={(e) => updateAction('scaleChange', parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-12 text-right">
                  {(settings.actions.scaleChange || 1).toFixed(1)}x
                </span>
              </div>
            </div>

            {/* Animation Triggers */}
            {availableAnimations.length > 0 && (
              <>
                <h4 className="text-sm font-semibold text-gray-700 mt-6">アニメーショントリガー</h4>
                
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <Play className="w-4 h-4" />
                    <span>クリック時のアニメーション</span>
                  </label>
                  <select
                    value={settings.animations.onClick || ''}
                    onChange={(e) => updateAnimation('onClick', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">なし</option>
                    {availableAnimations.map(anim => (
                      <option key={anim} value={anim}>{anim}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <Play className="w-4 h-4" />
                    <span>ホバー時のアニメーション</span>
                  </label>
                  <select
                    value={settings.animations.onHover || ''}
                    onChange={(e) => updateAnimation('onHover', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">なし</option>
                    {availableAnimations.map(anim => (
                      <option key={anim} value={anim}>{anim}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Interaction Preview Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">有効なインタラクション</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          {settings.enableClick && <li>• クリック/タップで反応</li>}
          {settings.enableHover && <li>• マウスオーバーで反応</li>}
          {settings.enableDrag && <li>• ドラッグで移動可能</li>}
          {settings.enablePinch && <li>• ピンチで拡大縮小</li>}
          {settings.enableRotate && <li>• 2本指で回転</li>}
          {settings.actions.url && <li>• クリックでURL開く</li>}
          {settings.actions.sound && <li>• クリックで音声再生</li>}
          {settings.actions.colorChange && <li>• クリックで色変更</li>}
          {settings.actions.scaleChange && settings.actions.scaleChange !== 1 && 
            <li>• クリックでサイズ変更</li>}
        </ul>
      </div>
    </div>
  )
}