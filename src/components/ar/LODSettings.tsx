'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Layers,
  Eye,
  Zap,
  Plus,
  Trash2,
  Settings2,
  Smartphone,
  Monitor,
  Activity,
  Info,
} from 'lucide-react'
import type { LODLevel, LODConfiguration, LODStatistics } from '@/lib/ar/LODManager'

interface LODSettingsProps {
  onConfigurationChange?: (config: LODConfiguration) => void
  statistics?: LODStatistics | null
  onGenerateLOD?: () => void
  isGenerating?: boolean
}

export function LODSettings({
  onConfigurationChange,
  statistics,
  onGenerateLOD,
  isGenerating = false,
}: LODSettingsProps) {
  const [levels, setLevels] = useState<LODLevel[]>([
    { distance: 10, targetRatio: 1.0 },
    { distance: 30, targetRatio: 0.5 },
    { distance: 60, targetRatio: 0.25 },
    { distance: 100, targetRatio: 0.1 },
  ])
  const [autoGenerate, setAutoGenerate] = useState(true)
  const [dynamicAdjustment, setDynamicAdjustment] = useState(false)
  const [targetFPS, setTargetFPS] = useState(60)
  const [smoothTransition, setSmoothTransition] = useState(false)
  const [cullingDistance, setCullingDistance] = useState(150)
  const [devicePreset, setDevicePreset] = useState<'desktop' | 'mobile' | 'custom'>('custom')

  const handleAddLevel = useCallback(() => {
    const newLevel: LODLevel = {
      distance: levels.length > 0 ? levels[levels.length - 1].distance + 20 : 10,
      targetRatio: levels.length > 0 ? levels[levels.length - 1].targetRatio * 0.5 : 0.5,
    }
    setLevels([...levels, newLevel])
  }, [levels])

  const handleRemoveLevel = useCallback(
    (index: number) => {
      setLevels(levels.filter((_, i) => i !== index))
    },
    [levels]
  )

  const handleLevelChange = useCallback(
    (index: number, field: keyof LODLevel, value: number) => {
      const newLevels = [...levels]
      newLevels[index] = { ...newLevels[index], [field]: value }
      setLevels(newLevels)
    },
    [levels]
  )

  const applyPreset = useCallback((preset: 'desktop' | 'mobile') => {
    setDevicePreset(preset)

    if (preset === 'desktop') {
      setLevels([
        { distance: 10, targetRatio: 1.0 },
        { distance: 30, targetRatio: 0.7 },
        { distance: 60, targetRatio: 0.4 },
        { distance: 100, targetRatio: 0.2 },
      ])
      setTargetFPS(60)
      setCullingDistance(200)
      setDynamicAdjustment(false)
    } else if (preset === 'mobile') {
      setLevels([
        { distance: 5, targetRatio: 0.8 },
        { distance: 15, targetRatio: 0.4 },
        { distance: 30, targetRatio: 0.2 },
        { distance: 50, targetRatio: 0.05 },
      ])
      setTargetFPS(30)
      setCullingDistance(60)
      setDynamicAdjustment(true)
    }
  }, [])

  const handleApplyConfiguration = useCallback(() => {
    if (onConfigurationChange) {
      const config: LODConfiguration = {
        levels,
        autoGenerate,
        dynamicAdjustment,
        targetFPS,
        smoothTransition,
        cullingDistance,
      }
      onConfigurationChange(config)
    }
  }, [
    levels,
    autoGenerate,
    dynamicAdjustment,
    targetFPS,
    smoothTransition,
    cullingDistance,
    onConfigurationChange,
  ])

  const formatNumber = (num: number): string => {
    return num.toLocaleString()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Level of Detail (LOD) Settings
          </CardTitle>
          <CardDescription>
            Configure automatic model quality adjustment based on distance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Device Presets */}
          <div className="space-y-3">
            <Label>Device Presets</Label>
            <div className="flex gap-2">
              <Button
                variant={devicePreset === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('desktop')}
              >
                <Monitor className="mr-2 h-4 w-4" />
                Desktop
              </Button>
              <Button
                variant={devicePreset === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset('mobile')}
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Mobile
              </Button>
              <Button
                variant={devicePreset === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDevicePreset('custom')}
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Custom
              </Button>
            </div>
          </div>

          {/* LOD Levels */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>LOD Levels</Label>
              <Button size="sm" variant="outline" onClick={handleAddLevel}>
                <Plus className="mr-1 h-3 w-3" />
                Add Level
              </Button>
            </div>

            <div className="space-y-3">
              {levels.map((level, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">Level {index + 1}</Badge>
                    {levels.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveLevel(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs">Distance (m)</Label>
                        <span className="text-xs text-muted-foreground">{level.distance}m</span>
                      </div>
                      <Slider
                        min={1}
                        max={200}
                        step={5}
                        value={[level.distance]}
                        onValueChange={(value) => handleLevelChange(index, 'distance', value[0])}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs">Quality</Label>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(level.targetRatio * 100)}%
                        </span>
                      </div>
                      <Slider
                        min={0.05}
                        max={1}
                        step={0.05}
                        value={[level.targetRatio]}
                        onValueChange={(value) => handleLevelChange(index, 'targetRatio', value[0])}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auto Generation */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-generate" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Auto-Generate LOD Levels
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically create optimized models for each level
              </p>
            </div>
            <Switch id="auto-generate" checked={autoGenerate} onCheckedChange={setAutoGenerate} />
          </div>

          {/* Dynamic Adjustment */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dynamic-adjustment" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Dynamic Performance Adjustment
                </Label>
                <p className="text-xs text-muted-foreground">Adjust LOD distances based on FPS</p>
              </div>
              <Switch
                id="dynamic-adjustment"
                checked={dynamicAdjustment}
                onCheckedChange={setDynamicAdjustment}
              />
            </div>

            {dynamicAdjustment && (
              <div className="space-y-2 pl-6">
                <div className="flex justify-between items-center">
                  <Label htmlFor="target-fps" className="text-sm">
                    Target FPS
                  </Label>
                  <span className="text-sm text-muted-foreground">{targetFPS}</span>
                </div>
                <Slider
                  id="target-fps"
                  min={15}
                  max={120}
                  step={15}
                  value={[targetFPS]}
                  onValueChange={(value) => setTargetFPS(value[0])}
                />
              </div>
            )}
          </div>

          {/* Smooth Transitions */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="smooth-transition" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Smooth Transitions
              </Label>
              <p className="text-xs text-muted-foreground">Fade between LOD levels</p>
            </div>
            <Switch
              id="smooth-transition"
              checked={smoothTransition}
              onCheckedChange={setSmoothTransition}
            />
          </div>

          {/* Culling Distance */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="culling-distance">Culling Distance</Label>
              <span className="text-sm text-muted-foreground">{cullingDistance}m</span>
            </div>
            <Slider
              id="culling-distance"
              min={20}
              max={500}
              step={10}
              value={[cullingDistance]}
              onValueChange={(value) => setCullingDistance(value[0])}
            />
            <p className="text-xs text-muted-foreground">
              Hide models beyond this distance to improve performance
            </p>
          </div>

          {/* Apply Button */}
          <div className="flex gap-2">
            <Button onClick={handleApplyConfiguration} className="flex-1">
              Apply Configuration
            </Button>
            {onGenerateLOD && (
              <Button onClick={onGenerateLOD} variant="outline" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Activity className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Layers className="mr-2 h-4 w-4" />
                    Generate LOD
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Statistics */}
      {statistics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Current LOD Level</p>
                <p className="text-2xl font-semibold">Level {statistics.currentLevel + 1}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">FPS</p>
                <p className="text-2xl font-semibold">{statistics.fps}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Active Vertices</p>
                <p className="font-medium">{formatNumber(statistics.activeVertices)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Active Faces</p>
                <p className="font-medium">{formatNumber(statistics.activeFaces)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Memory Usage</p>
                <p className="font-medium">{statistics.memoryUsage.toFixed(1)} MB</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Render Time</p>
                <p className="font-medium">{statistics.renderTime.toFixed(2)} ms</p>
              </div>
            </div>

            {statistics.fps < 30 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Low FPS detected. Consider enabling dynamic adjustment or reducing quality
                  settings.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
