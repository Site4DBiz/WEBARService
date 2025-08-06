'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { 
  Activity, 
  BarChart3, 
  Cpu, 
  Eye, 
  EyeOff,
  Gauge,
  Maximize2,
  Minimize2,
  Settings,
  TrendingDown,
  TrendingUp,
  Zap
} from 'lucide-react'
import { FrameRateOptimizer, FrameStatistics, QualitySettings } from '@/lib/ar/FrameRateOptimizer'
import { RenderingOptimizer, RenderingStatistics } from '@/lib/ar/RenderingOptimizer'

interface PerformanceMonitorProps {
  frameOptimizer?: FrameRateOptimizer
  renderOptimizer?: RenderingOptimizer
  className?: string
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  expanded?: boolean
}

export function PerformanceMonitor({
  frameOptimizer,
  renderOptimizer,
  className = '',
  position = 'top-right',
  expanded: initialExpanded = false
}: PerformanceMonitorProps) {
  const [frameStats, setFrameStats] = useState<FrameStatistics | null>(null)
  const [renderStats, setRenderStats] = useState<RenderingStatistics | null>(null)
  const [qualitySettings, setQualitySettings] = useState<QualitySettings | null>(null)
  const [expanded, setExpanded] = useState(initialExpanded)
  const [visible, setVisible] = useState(true)
  const [showGraph, setShowGraph] = useState(true)
  const [adaptiveQuality, setAdaptiveQuality] = useState(true)
  const [targetFPS, setTargetFPS] = useState(60)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fpsHistory = useRef<number[]>([])
  const animationRef = useRef<number>()

  useEffect(() => {
    const updateStats = () => {
      if (frameOptimizer) {
        const stats = frameOptimizer.getStatistics()
        setFrameStats(stats)
        setQualitySettings(frameOptimizer.getQualitySettings())
        
        // Update FPS history for graph
        fpsHistory.current.push(stats.currentFPS)
        if (fpsHistory.current.length > 60) {
          fpsHistory.current.shift()
        }
      }

      if (renderOptimizer) {
        setRenderStats(renderOptimizer.getStatistics())
      }

      // Draw graph
      if (showGraph && canvasRef.current) {
        drawGraph()
      }

      animationRef.current = requestAnimationFrame(updateStats)
    }

    updateStats()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [frameOptimizer, renderOptimizer, showGraph])

  const drawGraph = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const history = fpsHistory.current

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(0, 0, width, height)

    if (history.length < 2) return

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    
    // Horizontal lines
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Draw target FPS line
    const targetY = height - (targetFPS / 120) * height
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(0, targetY)
    ctx.lineTo(width, targetY)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw FPS curve
    ctx.strokeStyle = getFPSColor(history[history.length - 1])
    ctx.lineWidth = 2
    ctx.beginPath()

    history.forEach((fps, index) => {
      const x = (index / (history.length - 1)) * width
      const y = height - (Math.min(fps, 120) / 120) * height
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw current FPS text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 12px monospace'
    ctx.fillText(`${Math.round(history[history.length - 1])} FPS`, 5, 15)
  }

  const getFPSColor = (fps: number): string => {
    if (fps >= 55) return '#10b981' // Green
    if (fps >= 30) return '#f59e0b' // Yellow
    return '#ef4444' // Red
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'top-right':
        return 'top-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      default:
        return 'top-4 right-4'
    }
  }

  const handleAdaptiveQualityToggle = (checked: boolean) => {
    setAdaptiveQuality(checked)
    frameOptimizer?.setAdaptiveQuality(checked)
  }

  const handleTargetFPSChange = (value: number[]) => {
    const fps = value[0]
    setTargetFPS(fps)
    frameOptimizer?.setTargetFPS(fps)
  }

  if (!visible) {
    return (
      <Button
        onClick={() => setVisible(true)}
        className={`fixed ${getPositionClasses()} z-50`}
        size="icon"
        variant="secondary"
      >
        <Activity className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Card className={`fixed ${getPositionClasses()} z-50 bg-black/90 text-white border-gray-700 ${className}`}>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-semibold">Performance Monitor</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setShowGraph(!showGraph)}
              size="icon"
              variant="ghost"
              className="h-6 w-6"
            >
              <BarChart3 className="h-3 w-3" />
            </Button>
            <Button
              onClick={() => setExpanded(!expanded)}
              size="icon"
              variant="ghost"
              className="h-6 w-6"
            >
              {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
            <Button
              onClick={() => setVisible(false)}
              size="icon"
              variant="ghost"
              className="h-6 w-6"
            >
              <EyeOff className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* FPS Graph */}
        {showGraph && (
          <canvas
            ref={canvasRef}
            width={300}
            height={100}
            className="w-full h-24 mb-2 rounded bg-black/50"
          />
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col">
            <span className="text-gray-400">FPS</span>
            <span className={`font-bold ${
              frameStats?.currentFPS ? getFPSColor(frameStats.currentFPS) : 'text-white'
            }`}>
              {frameStats?.currentFPS.toFixed(0) || '--'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400">Frame Time</span>
            <span className="font-bold">
              {frameStats?.frameTime.toFixed(1) || '--'}ms
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400">Draw Calls</span>
            <span className="font-bold">
              {renderStats?.drawCalls || '--'}
            </span>
          </div>
        </div>

        {/* Expanded View */}
        {expanded && (
          <>
            <div className="border-t border-gray-700 mt-3 pt-3">
              {/* Frame Statistics */}
              <div className="mb-3">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <Gauge className="h-3 w-3" />
                  Frame Statistics
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Average FPS: </span>
                    <span>{frameStats?.averageFPS.toFixed(1) || '--'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Stability: </span>
                    <span>{frameStats?.stability.toFixed(0) || '--'}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Jitter: </span>
                    <span>{frameStats?.jitter.toFixed(1) || '--'}ms</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Dropped: </span>
                    <span>{frameStats?.droppedFrames || '0'}</span>
                  </div>
                </div>
              </div>

              {/* Rendering Statistics */}
              <div className="mb-3">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Rendering Statistics
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Triangles: </span>
                    <span>{renderStats?.triangles.toLocaleString() || '--'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Vertices: </span>
                    <span>{renderStats?.vertices.toLocaleString() || '--'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Textures: </span>
                    <span>{renderStats?.textures || '--'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Programs: </span>
                    <span>{renderStats?.programs || '--'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Visible: </span>
                    <span>{renderStats?.visibleObjects || '--'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Culled: </span>
                    <span>{renderStats?.culledObjects || '--'}</span>
                  </div>
                </div>
              </div>

              {/* Quality Settings */}
              <div className="mb-3">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <Settings className="h-3 w-3" />
                  Quality Settings
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="adaptive" className="text-xs">Adaptive Quality</Label>
                    <Switch
                      id="adaptive"
                      checked={adaptiveQuality}
                      onCheckedChange={handleAdaptiveQualityToggle}
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetFPS" className="text-xs">
                      Target FPS: {targetFPS}
                    </Label>
                    <Slider
                      id="targetFPS"
                      min={15}
                      max={120}
                      step={5}
                      value={[targetFPS]}
                      onValueChange={handleTargetFPSChange}
                      className="mt-1"
                    />
                  </div>
                  {qualitySettings && (
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div>
                        <span className="text-gray-400">Render Scale: </span>
                        <span>{(qualitySettings.renderScale * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Shadows: </span>
                        <span>{qualitySettings.shadowQuality}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Draw Distance: </span>
                        <span>{qualitySettings.drawDistance.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Antialiasing: </span>
                        <span>{qualitySettings.antialias ? 'On' : 'Off'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Indicators */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {frameStats && frameStats.currentFPS < 30 && (
                    <div className="flex items-center gap-1 text-red-400">
                      <TrendingDown className="h-3 w-3" />
                      <span>Low FPS</span>
                    </div>
                  )}
                  {frameStats && frameStats.jitter > 10 && (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Zap className="h-3 w-3" />
                      <span>High Jitter</span>
                    </div>
                  )}
                  {renderStats && renderStats.drawCalls > 100 && (
                    <div className="flex items-center gap-1 text-orange-400">
                      <Cpu className="h-3 w-3" />
                      <span>High Draw Calls</span>
                    </div>
                  )}
                  {frameStats && frameStats.currentFPS >= 55 && frameStats.stability > 90 && (
                    <div className="flex items-center gap-1 text-green-400">
                      <TrendingUp className="h-3 w-3" />
                      <span>Optimal</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}