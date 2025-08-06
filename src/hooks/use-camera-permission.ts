'use client'

import { useEffect, useState, useCallback } from 'react'

export type CameraPermissionState = 'prompt' | 'granted' | 'denied' | 'checking' | 'not-supported'

export interface UseCameraPermissionReturn {
  permissionState: CameraPermissionState
  error: string | null
  requestPermission: () => Promise<void>
  checkPermission: () => Promise<void>
  isSupported: boolean
}

export const useCameraPermission = (): UseCameraPermissionReturn => {
  const [permissionState, setPermissionState] = useState<CameraPermissionState>('checking')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)

  // ブラウザがカメラAPIをサポートしているかチェック
  const checkSupport = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsSupported(false)
      setPermissionState('not-supported')
      setError('Your browser does not support camera access.')
      return false
    }
    return true
  }, [])

  // パーミッションの状態をチェック
  const checkPermission = useCallback(async () => {
    if (!checkSupport()) return

    try {
      setPermissionState('checking')
      setError(null)

      // Permissions APIを使用してカメラのパーミッション状態を確認
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
          setPermissionState(result.state as CameraPermissionState)

          // パーミッション状態の変更を監視
          result.addEventListener('change', () => {
            setPermissionState(result.state as CameraPermissionState)
          })
        } catch (err) {
          // Permissions APIがcameraをサポートしていない場合
          // デフォルトでprompt状態とする
          setPermissionState('prompt')
        }
      } else {
        // Permissions APIがサポートされていない場合
        setPermissionState('prompt')
      }
    } catch (err) {
      console.error('Error checking camera permission:', err)
      setError('Failed to check camera permission')
      setPermissionState('prompt')
    }
  }, [checkSupport])

  // カメラのパーミッションをリクエスト
  const requestPermission = useCallback(async () => {
    if (!checkSupport()) return

    try {
      setError(null)
      setPermissionState('checking')

      // getUserMediaを呼び出してカメラアクセスをリクエスト
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment', // 背面カメラを優先
        },
        audio: false,
      })

      // ストリームを停止（パーミッションの確認のみが目的）
      stream.getTracks().forEach((track) => track.stop())

      setPermissionState('granted')
    } catch (err) {
      console.error('Error requesting camera permission:', err)

      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
          case 'PermissionDeniedError':
            setPermissionState('denied')
            setError(
              'Camera access was denied. Please enable camera permissions in your browser settings.'
            )
            break
          case 'NotFoundError':
          case 'DevicesNotFoundError':
            setError('No camera device was found on your device.')
            break
          case 'NotReadableError':
          case 'TrackStartError':
            setError('Camera is already in use by another application.')
            break
          case 'OverconstrainedError':
          case 'ConstraintNotSatisfiedError':
            setError('Camera does not meet the required specifications.')
            break
          case 'TypeError':
            setError('Invalid camera configuration.')
            break
          default:
            setError(`Camera access failed: ${err.message}`)
        }
      } else {
        setError('An unexpected error occurred while accessing the camera.')
      }
    }
  }, [checkSupport])

  // 初回マウント時にパーミッション状態をチェック
  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  return {
    permissionState,
    error,
    requestPermission,
    checkPermission,
    isSupported,
  }
}
