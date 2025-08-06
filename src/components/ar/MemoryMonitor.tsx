'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  Activity, 
  Trash2, 
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react'
import { MemoryProfiler } from '@/lib/ar/MemoryProfiler'
import { ObjectPoolManager } from '@/lib/ar/ObjectPool'
import { ModelMemoryManager } from '@/lib/ar/ModelMemoryManager'
import { GarbageCollectionManager } from '@/lib/ar/GarbageCollectionManager'
import { TextureCache } from '@/lib/ar/TextureOptimizer'
import * as THREE from 'three'

interface MemoryMonitorProps {
  renderer?: THREE.WebGLRenderer
  autoRefresh?: boolean
  refreshInterval?: number
  compact?: boolean
}

interface MemoryMetrics {
  heap: {
    used: number
    total: number
    limit: number
    percentage: number
  }
  resources: {
    geometries: number
    textures: number
    materials: number
    programs: number
  }
  cache: {
    textures: {
      count: number
      size: number
      maxSize: number
      usageRatio: number
    }
    models: {
      count: number
      size: number
      activeCount: number
      usageRatio: number
    }
  }
  pools: {
    vectors: { total: number; active: number; available: number }
    quaternions: { total: number; active: number; available: number }
    matrices: { total: number; active: number; available: number }
  }
  gc: {
    lastGCTime: Date | null
    resourceCounts: {
      geometries: number
      textures: number
      materials: number
      renderTargets: number
    }
    performanceMode: string
  }
}

export function MemoryMonitor({ 
  renderer, 
  autoRefresh = true, 
  refreshInterval = 1000,
  compact = false 
}: MemoryMonitorProps) {
  const [metrics, setMetrics] = useState<MemoryMetrics | null>(null)
  const [isExpanded, setIsExpanded] = useState(!compact)
  const [showDetails, setShowDetails] = useState(false)
  const [memoryWarning, setMemoryWarning] = useState(false)
  const [memoryCritical, setMemoryCritical] = useState(false)
  const [recommendations, setRecommendations] = useState<string[]>([])

  const profilerRef = useRef<MemoryProfiler | null>(null)
  const textureCache = useRef<TextureCache | null>(null)
  const modelManager = useRef<ModelMemoryManager | null>(null)
  const gcManager = useRef<GarbageCollectionManager | null>(null)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Initialize managers
    profilerRef.current = new MemoryProfiler()
    textureCache.current = new TextureCache(100) // 100MB cache
    modelManager.current = new ModelMemoryManager({ maxCacheSizeMB: 200 })
    gcManager.current = new GarbageCollectionManager({ performanceMode: 'balanced' })

    if (renderer) {
      profilerRef.current.setRenderer(renderer)
      gcManager.current.setRenderer(renderer)
    }

    // Setup memory warning listeners
    const handleMemoryWarning = () => {
      setMemoryWarning(true)
      setTimeout(() => setMemoryWarning(false), 5000)
    }

    const handleMemoryCritical = () => {
      setMemoryCritical(true)
      setTimeout(() => setMemoryCritical(false), 5000)
    }

    window.addEventListener('memoryWarning', handleMemoryWarning)
    window.addEventListener('memoryCritical', handleMemoryCritical)

    // Start monitoring
    if (profilerRef.current) {
      profilerRef.current.startMonitoring(refreshInterval)
    }

    return () => {
      window.removeEventListener('memoryWarning', handleMemoryWarning)
      window.removeEventListener('memoryCritical', handleMemoryCritical)

      if (profilerRef.current) {
        profilerRef.current.stopMonitoring()
        profilerRef.current.cleanup()
      }

      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }

      textureCache.current?.clear()
      modelManager.current?.dispose()
      gcManager.current?.dispose()
    }
  }, [renderer, refreshInterval])

  useEffect(() => {
    if (!autoRefresh) {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      return
    }

    const updateMetrics = () => {
      if (!profilerRef.current) return

      const memoryStats = profilerRef.current.getMemoryStats()
      const resourceStats = profilerRef.current.getResourceStats()
      const poolManager = ObjectPoolManager.getInstance()
      const poolStats = poolManager.getAllStats()

      const newMetrics: MemoryMetrics = {
        heap: memoryStats ? {
          used: memoryStats.usedJSHeapSize,
          total: memoryStats.totalJSHeapSize,
          limit: memoryStats.jsHeapSizeLimit,
          percentage: memoryStats.percentageUsed
        } : {
          used: 0,
          total: 0,
          limit: 0,
          percentage: 0
        },
        resources: resourceStats,
        cache: {
          textures: textureCache.current?.getInfo() || {
            count: 0,
            size: 0,
            maxSize: 0,
            usageRatio: 0
          },
          models: modelManager.current?.getStats() || {
            count: 0,
            size: 0,
            activeCount: 0,
            usageRatio: 0
          }
        },
        pools: {
          vectors: poolStats.vectors || { total: 0, active: 0, available: 0 },
          quaternions: poolStats.quaternions || { total: 0, active: 0, available: 0 },
          matrices: poolStats.matrices || { total: 0, active: 0, available: 0 }
        },
        gc: gcManager.current?.getStats() || {
          lastGCTime: null,
          resourceCounts: {
            geometries: 0,
            textures: 0,
            materials: 0,
            renderTargets: 0
          },
          performanceMode: 'balanced'
        }
      }

      setMetrics(newMetrics)

      // Update recommendations
      const newRecommendations = profilerRef.current.generateOptimizationRecommendations()
      setRecommendations(newRecommendations)
    }

    updateMetrics()
    refreshTimerRef.current = setInterval(updateMetrics, refreshInterval)

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [autoRefresh, refreshInterval])

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getMemoryStatusColor = (percentage: number): string => {
    if (percentage > 90) return 'text-red-500'
    if (percentage > 70) return 'text-yellow-500'
    return 'text-green-500'
  }

  const handleManualGC = () => {
    gcManager.current?.performGC()
    profilerRef.current?.takeSnapshot()
  }

  const handleClearCache = () => {
    textureCache.current?.clear()
    modelManager.current?.clear()
    ObjectPoolManager.getInstance().clearAll()
  }

  const handleForceRelease = () => {
    gcManager.current?.forceReleaseAll()
  }

  if (!metrics) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="text-center text-gray-500">Loading memory metrics...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Memory Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            {memoryWarning && (
              <Badge variant="warning" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Memory Warning
              </Badge>
            )}
            {memoryCritical && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Critical
              </Badge>
            )}
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp /> : <ChevronDown />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {(!compact || isExpanded) && (
        <CardContent className="space-y-4">
          {/* Heap Memory */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Heap Memory</span>
              <span className={getMemoryStatusColor(metrics.heap.percentage)}>
                {formatBytes(metrics.heap.used)} / {formatBytes(metrics.heap.limit)}
              </span>
            </div>
            <Progress value={metrics.heap.percentage} className="h-2" />
            <div className="text-xs text-gray-500">
              {metrics.heap.percentage.toFixed(1)}% used
            </div>
          </div>

          {/* Resource Counts */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Geometries:</span>
              <span className="font-mono">{metrics.resources.geometries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Textures:</span>
              <span className="font-mono">{metrics.resources.textures}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Materials:</span>
              <span className="font-mono">{metrics.resources.materials}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Programs:</span>
              <span className="font-mono">{metrics.resources.programs}</span>
            </div>
          </div>

          {/* Cache Stats */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Cache Usage</div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Texture Cache ({metrics.cache.textures.count} items)</span>
                <span>{formatBytes(metrics.cache.textures.size)}</span>
              </div>
              <Progress value={metrics.cache.textures.usageRatio * 100} className="h-1" />
              
              <div className="flex justify-between text-xs mt-2">
                <span>Model Cache ({metrics.cache.models.count} items)</span>
                <span>{formatBytes(metrics.cache.models.size)}</span>
              </div>
              <Progress value={metrics.cache.models.usageRatio * 100} className="h-1" />
            </div>
          </div>

          {/* Object Pools */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Object Pools</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-mono">{metrics.pools.vectors.active}/{metrics.pools.vectors.total}</div>
                <div className="text-gray-500">Vectors</div>
              </div>
              <div className="text-center">
                <div className="font-mono">{metrics.pools.quaternions.active}/{metrics.pools.quaternions.total}</div>
                <div className="text-gray-500">Quaternions</div>
              </div>
              <div className="text-center">
                <div className="font-mono">{metrics.pools.matrices.active}/{metrics.pools.matrices.total}</div>
                <div className="text-gray-500">Matrices</div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="text-xs space-y-1">
                  {recommendations.slice(0, 3).map((rec, idx) => (
                    <div key={idx}>• {rec}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualGC}
              className="flex-1"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Run GC
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearCache}
              className="flex-1"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear Cache
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>

          {/* Detailed View */}
          {showDetails && (
            <div className="border-t pt-3 space-y-2">
              <div className="text-xs space-y-1">
                <div className="font-medium">GC Stats</div>
                <div>Last GC: {metrics.gc.lastGCTime ? new Date(metrics.gc.lastGCTime).toLocaleTimeString() : 'Never'}</div>
                <div>Mode: {metrics.gc.performanceMode}</div>
                <div>Tracked Resources:</div>
                <div className="pl-2">
                  • Geometries: {metrics.gc.resourceCounts.geometries}<br/>
                  • Textures: {metrics.gc.resourceCounts.textures}<br/>
                  • Materials: {metrics.gc.resourceCounts.materials}<br/>
                  • Render Targets: {metrics.gc.resourceCounts.renderTargets}
                </div>
              </div>
              
              <Button
                size="sm"
                variant="destructive"
                onClick={handleForceRelease}
                className="w-full"
              >
                Force Release All Resources
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}