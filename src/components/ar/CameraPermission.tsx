'use client'

import React from 'react'
import { useCameraPermission } from '@/hooks/use-camera-permission'

interface CameraPermissionProps {
  onPermissionGranted?: () => void
  children?: React.ReactNode
}

export const CameraPermission: React.FC<CameraPermissionProps> = ({
  onPermissionGranted,
  children,
}) => {
  const { permissionState, error, requestPermission, isSupported } = useCameraPermission()

  React.useEffect(() => {
    if (permissionState === 'granted' && onPermissionGranted) {
      onPermissionGranted()
    }
  }, [permissionState, onPermissionGranted])

  // カメラがサポートされていない場合
  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Camera Not Supported</h2>
            <p className="text-gray-600">
              Your browser does not support camera access. Please use a modern browser to experience
              AR features.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // パーミッションをチェック中
  if (permissionState === 'checking') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900">Checking Camera Permissions...</h2>
          </div>
        </div>
      </div>
    )
  }

  // パーミッションが拒否された場合
  if (permissionState === 'denied') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Camera Access Denied</h2>
            <p className="text-gray-600 mb-6">
              Camera access is required for AR features. Please enable camera permissions in your
              browser settings and refresh the page.
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">How to enable camera access:</h3>
              <ol className="text-left text-sm text-gray-600 space-y-2">
                <li>1. Click the camera icon in your browser&apos;s address bar</li>
                <li>2. Select &quot;Allow&quot; for camera permissions</li>
                <li>3. Refresh this page</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // パーミッションがまだ与えられていない場合（prompt状態）
  if (permissionState === 'prompt') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Camera Permission Required</h2>
            <p className="text-gray-600 mb-6">
              To experience AR features, we need access to your camera. Your privacy is important to
              us, and camera data is processed locally on your device.
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <button
              onClick={requestPermission}
              className="w-full bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-lg"
            >
              Enable Camera Access
            </button>
            <p className="mt-4 text-xs text-gray-500">
              We only use your camera for AR tracking. No data is stored or transmitted.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // パーミッションが許可された場合、子コンポーネントをレンダリング
  if (permissionState === 'granted') {
    return <>{children}</>
  }

  return null
}
