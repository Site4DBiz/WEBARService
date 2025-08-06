'use client'

import dynamic from 'next/dynamic'
import { ComponentLoader } from '@/components/ui/LoadingSpinner'

export const LazyModelViewer = dynamic(
  () => import('../ModelViewer').then(mod => ({ default: mod.ModelViewer })),
  {
    loading: () => <ComponentLoader message="Loading 3D model viewer..." />,
    ssr: false
  }
)

export const LazyModelController = dynamic(
  () => import('@/components/ar/ModelController').then(mod => ({ default: mod.ModelController })),
  {
    loading: () => <ComponentLoader message="Loading model controller..." />,
    ssr: false
  }
)

export const LazyModelLoader = dynamic(
  () => import('@/components/ar/ModelLoader'),
  {
    loading: () => <ComponentLoader message="Loading model loader..." />,
    ssr: false
  }
)