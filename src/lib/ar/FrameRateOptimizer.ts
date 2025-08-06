import * as THREE from 'three'

export interface FrameRateConfig {
  targetFPS: number
  minFPS: number
  maxFPS: number
  adaptiveQuality: boolean
  frameSkipping: boolean
  smoothing: boolean
  monitoring: boolean
}

export interface FrameStatistics {
  currentFPS: number
  averageFPS: number
  minFPS: number
  maxFPS: number
  frameTime: number
  frameCount: number
  droppedFrames: number
  renderTime: number
  updateTime: number
  idleTime: number
  jitter: number
  stability: number
}

export interface QualitySettings {
  renderScale: number
  shadowQuality: 'high' | 'medium' | 'low' | 'none'
  antialias: boolean
  postProcessing: boolean
  particleCount: number
  drawDistance: number
  textureQuality: number
  geometryDetail: number
}

export class FrameRateOptimizer {
  private config: FrameRateConfig
  private statistics: FrameStatistics
  private qualitySettings: QualitySettings
  private frameHistory: number[]
  private lastFrameTime: number
  private accumulatedTime: number
  private frameSkipThreshold: number
  private adaptiveQualityEnabled: boolean
  private renderer?: THREE.WebGLRenderer
  private scene?: THREE.Scene
  private camera?: THREE.Camera
  private rafId: number | null
  private updateCallbacks: Set<(delta: number) => void>
  private renderCallbacks: Set<() => void>
  private performanceObserver?: PerformanceObserver

  constructor(config: Partial<FrameRateConfig> = {}) {
    this.config = {
      targetFPS: 60,
      minFPS: 30,
      maxFPS: 120,
      adaptiveQuality: true,
      frameSkipping: true,
      smoothing: true,
      monitoring: true,
      ...config
    }

    this.statistics = {
      currentFPS: 0,
      averageFPS: 0,
      minFPS: Infinity,
      maxFPS: 0,
      frameTime: 0,
      frameCount: 0,
      droppedFrames: 0,
      renderTime: 0,
      updateTime: 0,
      idleTime: 0,
      jitter: 0,
      stability: 100
    }

    this.qualitySettings = {
      renderScale: 1.0,
      shadowQuality: 'high',
      antialias: true,
      postProcessing: true,
      particleCount: 1000,
      drawDistance: 1000,
      textureQuality: 1.0,
      geometryDetail: 1.0
    }

    this.frameHistory = []
    this.lastFrameTime = performance.now()
    this.accumulatedTime = 0
    this.frameSkipThreshold = 1000 / this.config.minFPS
    this.adaptiveQualityEnabled = this.config.adaptiveQuality
    this.rafId = null
    this.updateCallbacks = new Set()
    this.renderCallbacks = new Set()

    if (this.config.monitoring) {
      this.initializePerformanceMonitoring()
    }
  }

  private initializePerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure') {
              if (entry.name === 'render-frame') {
                this.statistics.renderTime = entry.duration
              } else if (entry.name === 'update-frame') {
                this.statistics.updateTime = entry.duration
              }
            }
          }
        })
        this.performanceObserver.observe({ entryTypes: ['measure'] })
      } catch (error) {
        console.warn('Performance monitoring not available:', error)
      }
    }
  }

  public initialize(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ): void {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera

    // Configure renderer for optimal performance
    if (this.renderer) {
      this.renderer.powerPreference = 'high-performance'
      this.renderer.antialias = this.qualitySettings.antialias
      this.renderer.shadowMap.enabled = this.qualitySettings.shadowQuality !== 'none'
      
      if (this.qualitySettings.shadowQuality !== 'none') {
        this.renderer.shadowMap.type = this.getShadowMapType()
      }
    }
  }

  private getShadowMapType(): THREE.ShadowMapType {
    switch (this.qualitySettings.shadowQuality) {
      case 'high':
        return THREE.PCFSoftShadowMap
      case 'medium':
        return THREE.PCFShadowMap
      case 'low':
        return THREE.BasicShadowMap
      default:
        return THREE.BasicShadowMap
    }
  }

  public start(): void {
    if (this.rafId !== null) {
      return
    }
    this.lastFrameTime = performance.now()
    this.animate()
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate)

    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastFrameTime
    
    // Update statistics
    this.updateStatistics(deltaTime)

    // Check if we should skip this frame
    if (this.config.frameSkipping && this.shouldSkipFrame(deltaTime)) {
      this.statistics.droppedFrames++
      return
    }

    // Adaptive quality adjustment
    if (this.adaptiveQualityEnabled) {
      this.adjustQuality()
    }

    // Smooth frame timing
    const smoothedDelta = this.config.smoothing ? 
      this.smoothDeltaTime(deltaTime) : deltaTime

    // Update phase
    performance.mark('update-start')
    this.updateCallbacks.forEach(callback => callback(smoothedDelta / 1000))
    performance.mark('update-end')
    performance.measure('update-frame', 'update-start', 'update-end')

    // Render phase
    performance.mark('render-start')
    if (this.renderer && this.scene && this.camera) {
      this.optimizeRenderState()
      this.renderer.render(this.scene, this.camera)
    }
    this.renderCallbacks.forEach(callback => callback())
    performance.mark('render-end')
    performance.measure('render-frame', 'render-start', 'render-end')

    // Calculate idle time
    const frameEndTime = performance.now()
    const totalFrameTime = frameEndTime - currentTime
    const targetFrameTime = 1000 / this.config.targetFPS
    this.statistics.idleTime = Math.max(0, targetFrameTime - totalFrameTime)

    this.lastFrameTime = currentTime
    this.statistics.frameCount++
  }

  private shouldSkipFrame(deltaTime: number): boolean {
    // Skip frame if delta time exceeds threshold
    return deltaTime > this.frameSkipThreshold
  }

  private smoothDeltaTime(deltaTime: number): number {
    const targetDelta = 1000 / this.config.targetFPS
    const alpha = 0.2 // Smoothing factor
    return deltaTime * alpha + targetDelta * (1 - alpha)
  }

  private updateStatistics(deltaTime: number): void {
    const fps = 1000 / deltaTime
    
    // Update frame history
    this.frameHistory.push(fps)
    if (this.frameHistory.length > 60) {
      this.frameHistory.shift()
    }

    // Calculate statistics
    this.statistics.currentFPS = fps
    this.statistics.frameTime = deltaTime
    this.statistics.averageFPS = this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length
    this.statistics.minFPS = Math.min(this.statistics.minFPS, fps)
    this.statistics.maxFPS = Math.max(this.statistics.maxFPS, fps)

    // Calculate jitter (frame time variance)
    if (this.frameHistory.length > 1) {
      const variance = this.calculateVariance(this.frameHistory)
      this.statistics.jitter = Math.sqrt(variance)
    }

    // Calculate stability (percentage of frames within target range)
    const targetMin = this.config.targetFPS * 0.9
    const targetMax = this.config.targetFPS * 1.1
    const stableFrames = this.frameHistory.filter(f => f >= targetMin && f <= targetMax).length
    this.statistics.stability = (stableFrames / this.frameHistory.length) * 100
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  }

  private adjustQuality(): void {
    const fps = this.statistics.averageFPS
    const targetFPS = this.config.targetFPS

    if (fps < this.config.minFPS) {
      // Decrease quality
      this.decreaseQuality()
    } else if (fps > targetFPS * 1.2 && this.qualitySettings.renderScale < 1.0) {
      // Increase quality if we have headroom
      this.increaseQuality()
    }
  }

  private decreaseQuality(): void {
    // Reduce render scale
    if (this.qualitySettings.renderScale > 0.5) {
      this.qualitySettings.renderScale -= 0.1
      this.applyRenderScale()
    }

    // Reduce shadow quality
    if (this.qualitySettings.shadowQuality === 'high') {
      this.qualitySettings.shadowQuality = 'medium'
    } else if (this.qualitySettings.shadowQuality === 'medium') {
      this.qualitySettings.shadowQuality = 'low'
    } else if (this.qualitySettings.shadowQuality === 'low') {
      this.qualitySettings.shadowQuality = 'none'
    }

    // Disable expensive features
    if (this.qualitySettings.antialias) {
      this.qualitySettings.antialias = false
    }
    if (this.qualitySettings.postProcessing) {
      this.qualitySettings.postProcessing = false
    }

    // Reduce detail levels
    this.qualitySettings.particleCount = Math.max(100, this.qualitySettings.particleCount * 0.8)
    this.qualitySettings.drawDistance = Math.max(100, this.qualitySettings.drawDistance * 0.9)
    this.qualitySettings.textureQuality = Math.max(0.25, this.qualitySettings.textureQuality - 0.1)
    this.qualitySettings.geometryDetail = Math.max(0.25, this.qualitySettings.geometryDetail - 0.1)

    this.applyQualitySettings()
  }

  private increaseQuality(): void {
    // Increase render scale
    if (this.qualitySettings.renderScale < 1.0) {
      this.qualitySettings.renderScale = Math.min(1.0, this.qualitySettings.renderScale + 0.1)
      this.applyRenderScale()
    }

    // Increase shadow quality
    if (this.qualitySettings.shadowQuality === 'none') {
      this.qualitySettings.shadowQuality = 'low'
    } else if (this.qualitySettings.shadowQuality === 'low') {
      this.qualitySettings.shadowQuality = 'medium'
    } else if (this.qualitySettings.shadowQuality === 'medium') {
      this.qualitySettings.shadowQuality = 'high'
    }

    // Enable features
    if (!this.qualitySettings.antialias && this.statistics.averageFPS > this.config.targetFPS * 1.5) {
      this.qualitySettings.antialias = true
    }
    if (!this.qualitySettings.postProcessing && this.statistics.averageFPS > this.config.targetFPS * 1.3) {
      this.qualitySettings.postProcessing = true
    }

    // Increase detail levels
    this.qualitySettings.particleCount = Math.min(10000, this.qualitySettings.particleCount * 1.2)
    this.qualitySettings.drawDistance = Math.min(10000, this.qualitySettings.drawDistance * 1.1)
    this.qualitySettings.textureQuality = Math.min(1.0, this.qualitySettings.textureQuality + 0.1)
    this.qualitySettings.geometryDetail = Math.min(1.0, this.qualitySettings.geometryDetail + 0.1)

    this.applyQualitySettings()
  }

  private applyRenderScale(): void {
    if (!this.renderer) return

    const canvas = this.renderer.domElement
    const width = canvas.clientWidth * this.qualitySettings.renderScale
    const height = canvas.clientHeight * this.qualitySettings.renderScale
    
    this.renderer.setSize(width, height, false)
    canvas.style.width = '100%'
    canvas.style.height = '100%'
  }

  private applyQualitySettings(): void {
    if (!this.renderer) return

    // Apply shadow settings
    this.renderer.shadowMap.enabled = this.qualitySettings.shadowQuality !== 'none'
    if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.type = this.getShadowMapType()
    }

    // Apply antialiasing
    this.renderer.antialias = this.qualitySettings.antialias

    // Apply to scene objects
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          // Apply geometry detail
          if (object.geometry && 'setDrawRange' in object.geometry) {
            const vertexCount = object.geometry.attributes.position?.count || 0
            const detailVertexCount = Math.floor(vertexCount * this.qualitySettings.geometryDetail)
            object.geometry.setDrawRange(0, detailVertexCount)
          }

          // Apply texture quality
          if (object.material) {
            const material = object.material as THREE.MeshStandardMaterial
            if (material.map) {
              material.map.minFilter = this.qualitySettings.textureQuality > 0.5 ? 
                THREE.LinearMipmapLinearFilter : THREE.NearestFilter
            }
          }
        }

        // Apply draw distance (frustum culling is handled separately)
        if (object instanceof THREE.Object3D) {
          object.visible = true // Reset visibility, actual culling in optimizeRenderState
        }
      })
    }
  }

  private optimizeRenderState(): void {
    if (!this.scene || !this.camera) return

    // Frustum culling
    const frustum = new THREE.Frustum()
    const cameraMatrix = new THREE.Matrix4().multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    )
    frustum.setFromProjectionMatrix(cameraMatrix)

    // Apply culling and LOD
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Group) {
        const box = new THREE.Box3().setFromObject(object)
        object.visible = frustum.intersectsBox(box)

        // Distance culling
        if (object.visible) {
          const distance = object.position.distanceTo(this.camera.position)
          object.visible = distance <= this.qualitySettings.drawDistance
        }
      }
    })

    // Sort transparent objects for correct rendering
    if (this.renderer) {
      this.renderer.sortObjects = true
    }
  }

  public onUpdate(callback: (delta: number) => void): void {
    this.updateCallbacks.add(callback)
  }

  public offUpdate(callback: (delta: number) => void): void {
    this.updateCallbacks.delete(callback)
  }

  public onRender(callback: () => void): void {
    this.renderCallbacks.add(callback)
  }

  public offRender(callback: () => void): void {
    this.renderCallbacks.delete(callback)
  }

  public getStatistics(): FrameStatistics {
    return { ...this.statistics }
  }

  public getQualitySettings(): QualitySettings {
    return { ...this.qualitySettings }
  }

  public setTargetFPS(fps: number): void {
    this.config.targetFPS = Math.max(15, Math.min(120, fps))
    this.frameSkipThreshold = 1000 / this.config.minFPS
  }

  public setAdaptiveQuality(enabled: boolean): void {
    this.adaptiveQualityEnabled = enabled
    if (!enabled) {
      // Reset to default quality
      this.qualitySettings = {
        renderScale: 1.0,
        shadowQuality: 'high',
        antialias: true,
        postProcessing: true,
        particleCount: 1000,
        drawDistance: 1000,
        textureQuality: 1.0,
        geometryDetail: 1.0
      }
      this.applyQualitySettings()
      this.applyRenderScale()
    }
  }

  public reset(): void {
    this.statistics = {
      currentFPS: 0,
      averageFPS: 0,
      minFPS: Infinity,
      maxFPS: 0,
      frameTime: 0,
      frameCount: 0,
      droppedFrames: 0,
      renderTime: 0,
      updateTime: 0,
      idleTime: 0,
      jitter: 0,
      stability: 100
    }
    this.frameHistory = []
  }

  public dispose(): void {
    this.stop()
    this.updateCallbacks.clear()
    this.renderCallbacks.clear()
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }
  }
}