export interface AudioConfig {
  url: string
  volume?: number
  loop?: boolean
  autoplay?: boolean
}

export class AudioManager {
  private audioContext: AudioContext | null = null
  private audioBuffers: Map<string, AudioBuffer> = new Map()
  private sources: Map<string, AudioBufferSourceNode> = new Map()
  private gainNodes: Map<string, GainNode> = new Map()
  private isInitialized = false

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error)
      throw new Error('Audio not supported in this browser')
    }
  }

  public async loadAudio(id: string, url: string): Promise<void> {
    await this.initialize()

    if (!this.audioContext) {
      throw new Error('AudioContext not initialized')
    }

    try {
      // Check if already loaded
      if (this.audioBuffers.has(id)) {
        return
      }

      // Fetch audio file
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      
      this.audioBuffers.set(id, audioBuffer)
    } catch (error) {
      console.error(`Failed to load audio ${id}:`, error)
      throw error
    }
  }

  public async playAudio(
    id: string,
    config?: Partial<AudioConfig>
  ): Promise<void> {
    await this.initialize()

    if (!this.audioContext) {
      throw new Error('AudioContext not initialized')
    }

    // If URL is provided, load the audio first
    if (config?.url) {
      await this.loadAudio(id, config.url)
    }

    const buffer = this.audioBuffers.get(id)
    if (!buffer) {
      throw new Error(`Audio ${id} not loaded`)
    }

    // Stop existing sound if playing
    this.stopAudio(id)

    // Create new source
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = config?.loop || false

    // Create gain node for volume control
    const gainNode = this.audioContext.createGain()
    gainNode.gain.value = config?.volume ?? 1.0

    // Connect nodes
    source.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    // Store references
    this.sources.set(id, source)
    this.gainNodes.set(id, gainNode)

    // Handle end event
    source.onended = () => {
      this.sources.delete(id)
      this.gainNodes.delete(id)
    }

    // Start playback
    source.start(0)
  }

  public stopAudio(id: string): void {
    const source = this.sources.get(id)
    if (source) {
      try {
        source.stop()
      } catch (error) {
        // Source may have already stopped
      }
      this.sources.delete(id)
      this.gainNodes.delete(id)
    }
  }

  public setVolume(id: string, volume: number): void {
    const gainNode = this.gainNodes.get(id)
    if (gainNode) {
      gainNode.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  public fadeIn(id: string, duration: number = 1): void {
    const gainNode = this.gainNodes.get(id)
    if (gainNode && this.audioContext) {
      const currentTime = this.audioContext.currentTime
      gainNode.gain.cancelScheduledValues(currentTime)
      gainNode.gain.setValueAtTime(0, currentTime)
      gainNode.gain.linearRampToValueAtTime(1, currentTime + duration)
    }
  }

  public fadeOut(id: string, duration: number = 1): void {
    const gainNode = this.gainNodes.get(id)
    if (gainNode && this.audioContext) {
      const currentTime = this.audioContext.currentTime
      gainNode.gain.cancelScheduledValues(currentTime)
      gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime)
      gainNode.gain.linearRampToValueAtTime(0, currentTime + duration)
      
      // Stop after fade out
      setTimeout(() => {
        this.stopAudio(id)
      }, duration * 1000)
    }
  }

  public isPlaying(id: string): boolean {
    return this.sources.has(id)
  }

  public async preloadAudios(configs: Array<{ id: string; url: string }>): Promise<void> {
    const loadPromises = configs.map(config => 
      this.loadAudio(config.id, config.url).catch(error => {
        console.warn(`Failed to preload audio ${config.id}:`, error)
      })
    )
    await Promise.all(loadPromises)
  }

  public dispose(): void {
    // Stop all playing sounds
    this.sources.forEach((_, id) => this.stopAudio(id))
    
    // Clear buffers
    this.audioBuffers.clear()
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.isInitialized = false
  }

  // Helper method for playing sound effects
  public async playSoundEffect(
    url: string,
    volume: number = 1.0
  ): Promise<void> {
    const id = `effect-${Date.now()}-${Math.random()}`
    await this.playAudio(id, { url, volume, loop: false })
  }

  // Helper method for playing background music
  public async playBackgroundMusic(
    url: string,
    volume: number = 0.5
  ): Promise<void> {
    const id = 'background-music'
    await this.playAudio(id, { url, volume, loop: true })
  }

  public stopBackgroundMusic(): void {
    this.fadeOut('background-music', 2)
  }
}