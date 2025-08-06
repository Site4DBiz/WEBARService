import * as THREE from 'three'

export interface AnimationConfig {
  loop?: THREE.LoopRepeat | THREE.LoopOnce | THREE.LoopPingPong
  speed?: number
  startTime?: number
  endTime?: number
  fadeInDuration?: number
  fadeOutDuration?: number
  weight?: number
}

export interface AnimationState {
  name: string
  clip: THREE.AnimationClip
  action: THREE.AnimationAction
  isPlaying: boolean
  isPaused: boolean
  config: AnimationConfig
}

export interface AnimationEvent {
  type: 'start' | 'end' | 'loop' | 'pause' | 'resume'
  animation: string
  timestamp: number
}

type AnimationEventCallback = (event: AnimationEvent) => void

export class AnimationManager {
  private mixer: THREE.AnimationMixer | null = null
  private animations: Map<string, AnimationState> = new Map()
  private clock: THREE.Clock = new THREE.Clock()
  private eventListeners: Map<string, AnimationEventCallback[]> = new Map()
  private activeAnimations: Set<string> = new Set()
  private defaultConfig: AnimationConfig = {
    loop: THREE.LoopRepeat,
    speed: 1.0,
    weight: 1.0,
    fadeInDuration: 0.5,
    fadeOutDuration: 0.5,
  }

  constructor(model?: THREE.Object3D) {
    if (model) {
      this.initialize(model)
    }
  }

  /**
   * Initialize animation manager with a 3D model
   */
  initialize(model: THREE.Object3D): void {
    this.mixer = new THREE.AnimationMixer(model)
    this.mixer.addEventListener('finished', this.handleAnimationFinished.bind(this))
    this.mixer.addEventListener('loop', this.handleAnimationLoop.bind(this))
  }

  /**
   * Load animations from a GLTF result
   */
  loadAnimations(gltf: any): void {
    if (!this.mixer) {
      throw new Error('AnimationManager not initialized. Call initialize() first.')
    }

    gltf.animations.forEach((clip: THREE.AnimationClip) => {
      const action = this.mixer!.clipAction(clip)
      
      // Configure action with default settings
      action.setLoop(this.defaultConfig.loop!, Infinity)
      action.setEffectiveWeight(this.defaultConfig.weight!)
      action.setEffectiveTimeScale(this.defaultConfig.speed!)

      const state: AnimationState = {
        name: clip.name,
        clip,
        action,
        isPlaying: false,
        isPaused: false,
        config: { ...this.defaultConfig },
      }

      this.animations.set(clip.name, state)
    })
  }

  /**
   * Play an animation by name
   */
  play(name: string, config?: AnimationConfig): void {
    const state = this.animations.get(name)
    if (!state) {
      console.warn(`Animation "${name}" not found`)
      return
    }

    // Update configuration if provided
    if (config) {
      this.updateAnimationConfig(name, config)
    }

    // Fade in animation
    if (state.config.fadeInDuration && state.config.fadeInDuration > 0) {
      state.action.fadeIn(state.config.fadeInDuration)
    }

    state.action.play()
    state.isPlaying = true
    state.isPaused = false
    this.activeAnimations.add(name)

    this.emitEvent({
      type: 'start',
      animation: name,
      timestamp: Date.now(),
    })
  }

  /**
   * Play multiple animations simultaneously
   */
  playMultiple(names: string[], config?: AnimationConfig): void {
    names.forEach(name => this.play(name, config))
  }

  /**
   * Stop an animation
   */
  stop(name: string, fadeOut: boolean = true): void {
    const state = this.animations.get(name)
    if (!state || !state.isPlaying) return

    if (fadeOut && state.config.fadeOutDuration && state.config.fadeOutDuration > 0) {
      state.action.fadeOut(state.config.fadeOutDuration)
      // Schedule stop after fade out
      setTimeout(() => {
        state.action.stop()
        state.isPlaying = false
        state.isPaused = false
        this.activeAnimations.delete(name)
      }, state.config.fadeOutDuration * 1000)
    } else {
      state.action.stop()
      state.isPlaying = false
      state.isPaused = false
      this.activeAnimations.delete(name)
    }

    this.emitEvent({
      type: 'end',
      animation: name,
      timestamp: Date.now(),
    })
  }

  /**
   * Stop all animations
   */
  stopAll(fadeOut: boolean = true): void {
    Array.from(this.activeAnimations).forEach(name => this.stop(name, fadeOut))
  }

  /**
   * Pause an animation
   */
  pause(name: string): void {
    const state = this.animations.get(name)
    if (!state || !state.isPlaying || state.isPaused) return

    state.action.paused = true
    state.isPaused = true

    this.emitEvent({
      type: 'pause',
      animation: name,
      timestamp: Date.now(),
    })
  }

  /**
   * Resume a paused animation
   */
  resume(name: string): void {
    const state = this.animations.get(name)
    if (!state || !state.isPaused) return

    state.action.paused = false
    state.isPaused = false

    this.emitEvent({
      type: 'resume',
      animation: name,
      timestamp: Date.now(),
    })
  }

  /**
   * Set animation speed
   */
  setSpeed(name: string, speed: number): void {
    const state = this.animations.get(name)
    if (!state) return

    state.action.setEffectiveTimeScale(speed)
    state.config.speed = speed
  }

  /**
   * Set global speed for all animations
   */
  setGlobalSpeed(speed: number): void {
    this.animations.forEach((state) => {
      state.action.setEffectiveTimeScale(speed)
      state.config.speed = speed
    })
  }

  /**
   * Set animation weight (for blending)
   */
  setWeight(name: string, weight: number): void {
    const state = this.animations.get(name)
    if (!state) return

    state.action.setEffectiveWeight(weight)
    state.config.weight = weight
  }

  /**
   * Cross fade between two animations
   */
  crossFade(from: string, to: string, duration: number = 1.0): void {
    const fromState = this.animations.get(from)
    const toState = this.animations.get(to)

    if (!fromState || !toState) {
      console.warn('Cannot cross fade: one or both animations not found')
      return
    }

    // Start the target animation
    this.play(to)

    // Cross fade
    fromState.action.crossFadeTo(toState.action, duration, true)

    // Clean up after fade
    setTimeout(() => {
      this.stop(from, false)
    }, duration * 1000)
  }

  /**
   * Update animation configuration
   */
  updateAnimationConfig(name: string, config: AnimationConfig): void {
    const state = this.animations.get(name)
    if (!state) return

    // Update loop mode
    if (config.loop !== undefined) {
      state.action.setLoop(config.loop, config.loop === THREE.LoopOnce ? 1 : Infinity)
      state.config.loop = config.loop
    }

    // Update speed
    if (config.speed !== undefined) {
      state.action.setEffectiveTimeScale(config.speed)
      state.config.speed = config.speed
    }

    // Update weight
    if (config.weight !== undefined) {
      state.action.setEffectiveWeight(config.weight)
      state.config.weight = config.weight
    }

    // Update time range
    if (config.startTime !== undefined || config.endTime !== undefined) {
      const clip = state.clip
      const startTime = config.startTime || 0
      const endTime = config.endTime || clip.duration

      state.action.time = startTime
      state.action.setDuration(endTime - startTime)
    }

    // Store config updates
    state.config = { ...state.config, ...config }
  }

  /**
   * Get animation progress (0-1)
   */
  getProgress(name: string): number {
    const state = this.animations.get(name)
    if (!state || !state.isPlaying) return 0

    const duration = state.action.getClip().duration
    const currentTime = state.action.time % duration
    return currentTime / duration
  }

  /**
   * Set animation progress (0-1)
   */
  setProgress(name: string, progress: number): void {
    const state = this.animations.get(name)
    if (!state) return

    const duration = state.action.getClip().duration
    state.action.time = duration * Math.max(0, Math.min(1, progress))
  }

  /**
   * Get list of available animations
   */
  getAnimationNames(): string[] {
    return Array.from(this.animations.keys())
  }

  /**
   * Get animation state
   */
  getAnimationState(name: string): AnimationState | undefined {
    return this.animations.get(name)
  }

  /**
   * Check if animation is playing
   */
  isPlaying(name: string): boolean {
    const state = this.animations.get(name)
    return state ? state.isPlaying : false
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, callback: AnimationEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: AnimationEventCallback): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Update animation mixer
   */
  update(deltaTime?: number): void {
    if (!this.mixer) return

    const delta = deltaTime !== undefined ? deltaTime : this.clock.getDelta()
    this.mixer.update(delta)
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stopAll(false)
    this.animations.clear()
    this.eventListeners.clear()
    this.activeAnimations.clear()
    
    if (this.mixer) {
      this.mixer.stopAllAction()
      this.mixer.uncacheRoot(this.mixer.getRoot())
      this.mixer = null
    }
  }

  // Private methods
  private handleAnimationFinished(event: any): void {
    const action = event.action
    const animationName = action.getClip().name

    this.activeAnimations.delete(animationName)
    const state = this.animations.get(animationName)
    if (state) {
      state.isPlaying = false
      state.isPaused = false
    }

    this.emitEvent({
      type: 'end',
      animation: animationName,
      timestamp: Date.now(),
    })
  }

  private handleAnimationLoop(event: any): void {
    const action = event.action
    const animationName = action.getClip().name

    this.emitEvent({
      type: 'loop',
      animation: animationName,
      timestamp: Date.now(),
    })
  }

  private emitEvent(event: AnimationEvent): void {
    const listeners = this.eventListeners.get(event.animation) || []
    const globalListeners = this.eventListeners.get('*') || []
    
    const allListeners = [...listeners, ...globalListeners]
    allListeners.forEach(callback => {
      callback(event)
    })
  }
}

export default AnimationManager