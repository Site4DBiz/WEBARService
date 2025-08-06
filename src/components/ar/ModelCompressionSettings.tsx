'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Package,
  Zap,
  Image as ImageIcon,
  Settings,
  Download,
  Upload,
  FileDown,
  Activity,
} from 'lucide-react'
import type { CompressionOptions, CompressionResult } from '@/lib/ar/ModelCompressor'

interface ModelCompressionSettingsProps {
  onCompress?: (options: CompressionOptions) => void
  compressionResult?: CompressionResult | null
  isCompressing?: boolean
}

export function ModelCompressionSettings({
  onCompress,
  compressionResult,
  isCompressing = false,
}: ModelCompressionSettingsProps) {
  const [targetRatio, setTargetRatio] = useState(0.5)
  const [preserveTextures, setPreserveTextures] = useState(true)
  const [optimizeMaterials, setOptimizeMaterials] = useState(true)
  const [useDraco, setUseDraco] = useState(true)
  const [textureFormat, setTextureFormat] = useState<'webp' | 'basis' | 'original'>('webp')
  const [textureQuality, setTextureQuality] = useState(85)
  const [quantization, setQuantization] = useState({
    position: 14,
    normal: 10,
    color: 8,
    texCoord: 12,
  })

  const handleCompress = useCallback(() => {
    if (onCompress) {
      const options: CompressionOptions = {
        targetRatio,
        preserveTextures,
        optimizeMaterials,
        useDraco,
        quantization,
        textureFormat,
        textureQuality,
      }
      onCompress(options)
    }
  }, [
    targetRatio,
    preserveTextures,
    optimizeMaterials,
    useDraco,
    quantization,
    textureFormat,
    textureQuality,
    onCompress,
  ])

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const compressionPercentage = compressionResult
    ? Math.round((1 - compressionResult.compressionRatio) * 100)
    : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Model Compression Settings
          </CardTitle>
          <CardDescription>
            Optimize 3D models for better performance and faster loading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Compression Ratio */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="target-ratio">Target Compression Ratio</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(targetRatio * 100)}%
              </span>
            </div>
            <Slider
              id="target-ratio"
              min={0.1}
              max={1}
              step={0.05}
              value={[targetRatio]}
              onValueChange={(value) => setTargetRatio(value[0])}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Lower values result in smaller file sizes but reduced quality
            </p>
          </div>

          {/* Texture Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="preserve-textures" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Preserve Original Textures
                </Label>
                <p className="text-xs text-muted-foreground">Keep textures at original quality</p>
              </div>
              <Switch
                id="preserve-textures"
                checked={preserveTextures}
                onCheckedChange={setPreserveTextures}
              />
            </div>

            {!preserveTextures && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="texture-format">Texture Format</Label>
                  <Select
                    value={textureFormat}
                    onValueChange={(value: any) => setTextureFormat(value)}
                  >
                    <SelectTrigger id="texture-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="webp">WebP (Recommended)</SelectItem>
                      <SelectItem value="basis">Basis Universal</SelectItem>
                      <SelectItem value="original">Original Format</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="texture-quality">Texture Quality</Label>
                    <span className="text-sm text-muted-foreground">{textureQuality}%</span>
                  </div>
                  <Slider
                    id="texture-quality"
                    min={30}
                    max={100}
                    step={5}
                    value={[textureQuality]}
                    onValueChange={(value) => setTextureQuality(value[0])}
                    disabled={preserveTextures}
                  />
                </div>
              </>
            )}
          </div>

          {/* Material Optimization */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="optimize-materials" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Optimize Materials
              </Label>
              <p className="text-xs text-muted-foreground">Remove unused material properties</p>
            </div>
            <Switch
              id="optimize-materials"
              checked={optimizeMaterials}
              onCheckedChange={setOptimizeMaterials}
            />
          </div>

          {/* DRACO Compression */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-draco" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Use DRACO Compression
                </Label>
                <p className="text-xs text-muted-foreground">Advanced geometry compression</p>
              </div>
              <Switch id="use-draco" checked={useDraco} onCheckedChange={setUseDraco} />
            </div>

            {useDraco && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <Label className="text-sm">Quantization Bits</Label>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Position</span>
                    <Badge variant="outline">{quantization.position} bits</Badge>
                  </div>
                  <Slider
                    min={8}
                    max={16}
                    step={1}
                    value={[quantization.position]}
                    onValueChange={(value) =>
                      setQuantization({ ...quantization, position: value[0] })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Normal</span>
                    <Badge variant="outline">{quantization.normal} bits</Badge>
                  </div>
                  <Slider
                    min={8}
                    max={14}
                    step={1}
                    value={[quantization.normal]}
                    onValueChange={(value) =>
                      setQuantization({ ...quantization, normal: value[0] })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Texture Coordinates</span>
                    <Badge variant="outline">{quantization.texCoord} bits</Badge>
                  </div>
                  <Slider
                    min={8}
                    max={16}
                    step={1}
                    value={[quantization.texCoord]}
                    onValueChange={(value) =>
                      setQuantization({ ...quantization, texCoord: value[0] })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Compress Button */}
          <Button onClick={handleCompress} className="w-full" disabled={isCompressing}>
            {isCompressing ? (
              <>
                <Activity className="mr-2 h-4 w-4 animate-spin" />
                Compressing...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Compress Model
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Compression Results */}
      {compressionResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compression Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Size Reduction</span>
                <Badge variant={compressionPercentage > 50 ? 'default' : 'secondary'}>
                  {compressionPercentage}% smaller
                </Badge>
              </div>
              <Progress value={compressionPercentage} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Original Size</p>
                <p className="font-semibold">{formatBytes(compressionResult.originalSize)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Compressed Size</p>
                <p className="font-semibold">{formatBytes(compressionResult.compressedSize)}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Model Statistics</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Vertices</p>
                  <p>
                    {compressionResult.statistics.vertices.before.toLocaleString()} →{' '}
                    {compressionResult.statistics.vertices.after.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Faces</p>
                  <p>
                    {compressionResult.statistics.faces.before.toLocaleString()} →{' '}
                    {compressionResult.statistics.faces.after.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Materials</p>
                  <p>
                    {compressionResult.statistics.materials.before} →{' '}
                    {compressionResult.statistics.materials.after}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Textures</p>
                  <p>
                    {compressionResult.statistics.textures.before} →{' '}
                    {compressionResult.statistics.textures.after}
                  </p>
                </div>
              </div>
            </div>

            <Alert>
              <Activity className="h-4 w-4" />
              <AlertDescription>
                Processing completed in {Math.round(compressionResult.processingTime)}ms
              </AlertDescription>
            </Alert>

            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download Compressed Model
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
