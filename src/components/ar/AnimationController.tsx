'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { AnimationManager, AnimationConfig, AnimationEvent } from '@/lib/ar/AnimationManager'
import * as THREE from 'three'
import {
  Play,
  Pause,
  Square,
  RotateCw,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
} from 'lucide-react'

interface AnimationControllerProps {
  animationManager: AnimationManager | null
  className?: string
  showTimeline?: boolean
  showSpeedControl?: boolean
  showLoopControl?: boolean
  showBlendControl?: boolean
  onAnimationChange?: (animationName: string) => void
}

interface AnimationInfo {
  name: string
  duration: number
  isPlaying: boolean
  isPaused: boolean
  progress: number
}

export const AnimationController: React.FC<AnimationControllerProps> = ({
  animationManager,
  className = '',
  showTimeline = true,
  showSpeedControl = true,
  showLoopControl = true,
  showBlendControl = false,
  onAnimationChange,
}) => {
  const [animations, setAnimations] = useState<AnimationInfo[]>([])
  const [selectedAnimation, setSelectedAnimation] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState(1.0)
  const [progress, setProgress] = useState(0)
  const [loopMode, setLoopMode] = useState<THREE.LoopRepeat | THREE.LoopOnce | THREE.LoopPingPong>(
    THREE.LoopRepeat
  )
  const [weight, setWeight] = useState(1.0)
  const [isMuted, setIsMuted] = useState(false)
  const animationFrameRef = useRef<number>()

  // Initialize animations list
  useEffect(() => {
    if (!animationManager) return

    const animationNames = animationManager.getAnimationNames()
    const animationInfos: AnimationInfo[] = animationNames.map((name) => {
      const state = animationManager.getAnimationState(name)
      return {
        name,
        duration: state?.clip.duration || 0,
        isPlaying: state?.isPlaying || false,
        isPaused: state?.isPaused || false,
        progress: 0,
      }
    })

    setAnimations(animationInfos)
    if (animationInfos.length > 0 && !selectedAnimation) {
      setSelectedAnimation(animationInfos[0].name)
    }
  }, [animationManager, selectedAnimation])

  // Update animation progress
  useEffect(() => {
    if (!animationManager || !selectedAnimation || !isPlaying) return

    const updateProgress = () => {
      const currentProgress = animationManager.getProgress(selectedAnimation)
      setProgress(currentProgress)
      animationFrameRef.current = requestAnimationFrame(updateProgress)
    }

    updateProgress()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [animationManager, selectedAnimation, isPlaying])

  // Animation event handlers
  useEffect(() => {
    if (!animationManager) return

    const handleAnimationEvent = (event: AnimationEvent) => {
      if (event.animation === selectedAnimation) {
        switch (event.type) {
          case 'start':
            setIsPlaying(true)
            setIsPaused(false)
            break
          case 'end':
            setIsPlaying(false)
            setIsPaused(false)
            setProgress(0)
            break
          case 'pause':
            setIsPaused(true)
            break
          case 'resume':
            setIsPaused(false)
            break
        }
      }
    }

    animationManager.addEventListener('*', handleAnimationEvent)

    return () => {
      animationManager.removeEventListener('*', handleAnimationEvent)
    }
  }, [animationManager, selectedAnimation])

  const handlePlay = useCallback(() => {
    if (!animationManager || !selectedAnimation) return

    if (isPaused) {
      animationManager.resume(selectedAnimation)
    } else {
      const config: AnimationConfig = {
        loop: loopMode,
        speed,
        weight,
      }
      animationManager.play(selectedAnimation, config)
    }
    setIsPlaying(true)
    setIsPaused(false)
  }, [animationManager, selectedAnimation, isPaused, loopMode, speed, weight])

  const handlePause = useCallback(() => {
    if (!animationManager || !selectedAnimation) return
    animationManager.pause(selectedAnimation)
    setIsPaused(true)
  }, [animationManager, selectedAnimation])

  const handleStop = useCallback(() => {
    if (!animationManager || !selectedAnimation) return
    animationManager.stop(selectedAnimation)
    setIsPlaying(false)
    setIsPaused(false)
    setProgress(0)
  }, [animationManager, selectedAnimation])

  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      setSpeed(newSpeed)
      if (animationManager && selectedAnimation) {
        animationManager.setSpeed(selectedAnimation, newSpeed)
      }
    },
    [animationManager, selectedAnimation]
  )

  const handleProgressChange = useCallback(
    (newProgress: number) => {
      setProgress(newProgress)
      if (animationManager && selectedAnimation) {
        animationManager.setProgress(selectedAnimation, newProgress)
      }
    },
    [animationManager, selectedAnimation]
  )

  const handleLoopModeChange = useCallback(
    (mode: string) => {
      let loopType: THREE.LoopRepeat | THREE.LoopOnce | THREE.LoopPingPong
      switch (mode) {
        case 'once':
          loopType = THREE.LoopOnce
          break
        case 'pingpong':
          loopType = THREE.LoopPingPong
          break
        default:
          loopType = THREE.LoopRepeat
      }
      setLoopMode(loopType)

      if (animationManager && selectedAnimation) {
        animationManager.updateAnimationConfig(selectedAnimation, { loop: loopType })
      }
    },
    [animationManager, selectedAnimation]
  )

  const handleWeightChange = useCallback(
    (newWeight: number) => {
      setWeight(newWeight)
      if (animationManager && selectedAnimation) {
        animationManager.setWeight(selectedAnimation, newWeight)
      }
    },
    [animationManager, selectedAnimation]
  )

  const handleAnimationSelect = useCallback(
    (animationName: string) => {
      if (selectedAnimation && isPlaying && animationManager) {
        animationManager.stop(selectedAnimation)
      }
      setSelectedAnimation(animationName)
      setIsPlaying(false)
      setIsPaused(false)
      setProgress(0)
      onAnimationChange?.(animationName)
    },
    [selectedAnimation, isPlaying, animationManager, onAnimationChange]
  )

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!animationManager || animations.length === 0) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 p-4 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400 text-center">No animations available</p>
      </div>
    )
  }

  const currentAnimation = animations.find((a) => a.name === selectedAnimation)
  const currentTime = currentAnimation ? currentAnimation.duration * progress : 0
  const totalTime = currentAnimation?.duration || 0

  return (
    <div className={`bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md ${className}`}>
      {/* Animation Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Animation
        </label>
        <select
          value={selectedAnimation}
          onChange={(e) => handleAnimationSelect(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {animations.map((anim) => (
            <option key={anim.name} value={anim.name}>
              {anim.name} ({formatTime(anim.duration)})
            </option>
          ))}
        </select>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={handleStop}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          title="Stop"
        >
          <Square className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        <button
          onClick={handlePlay}
          disabled={isPlaying && !isPaused}
          className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 transition-colors text-white"
          title={isPaused ? 'Resume' : 'Play'}
        >
          <Play className="w-6 h-6" />
        </button>

        <button
          onClick={handlePause}
          disabled={!isPlaying || isPaused}
          className="p-3 rounded-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 transition-colors text-white"
          title="Pause"
        >
          <Pause className="w-6 h-6" />
        </button>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          ) : (
            <Volume2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          )}
        </button>
      </div>

      {/* Timeline */}
      {showTimeline && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalTime)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={progress}
            onChange={(e) => handleProgressChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      )}

      {/* Speed Control */}
      {showSpeedControl && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Speed: {speed.toFixed(1)}x
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => handleSpeedChange(0.5)}
                className={`px-2 py-1 text-xs rounded ${
                  speed === 0.5
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                0.5x
              </button>
              <button
                onClick={() => handleSpeedChange(1.0)}
                className={`px-2 py-1 text-xs rounded ${
                  speed === 1.0
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                1x
              </button>
              <button
                onClick={() => handleSpeedChange(2.0)}
                className={`px-2 py-1 text-xs rounded ${
                  speed === 2.0
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                2x
              </button>
            </div>
          </div>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={speed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {/* Loop Control */}
      {showLoopControl && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Loop Mode
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleLoopModeChange('once')}
              className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                loopMode === THREE.LoopOnce
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Once
            </button>
            <button
              onClick={() => handleLoopModeChange('repeat')}
              className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                loopMode === THREE.LoopRepeat
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <RotateCw className="w-4 h-4 inline mr-1" />
              Repeat
            </button>
            <button
              onClick={() => handleLoopModeChange('pingpong')}
              className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                loopMode === THREE.LoopPingPong
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              PingPong
            </button>
          </div>
        </div>
      )}

      {/* Blend Control */}
      {showBlendControl && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Blend Weight: {weight.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={weight}
            onChange={(e) => handleWeightChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}

export default AnimationController
