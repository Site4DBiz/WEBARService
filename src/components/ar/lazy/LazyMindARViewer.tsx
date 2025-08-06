'use client'

import dynamic from 'next/dynamic'
import { ComponentLoader } from '@/components/ui/LoadingSpinner'

export const LazyMindARViewer = dynamic(
  () => import('../MindARViewer').then(mod => ({ default: mod.MindARViewer })),
  {
    loading: () => <ComponentLoader message="Loading AR viewer..." />,
    ssr: false
  }
)

export const LazyEnhancedMindARViewer = dynamic(
  () => import('../EnhancedMindARViewer').then(mod => ({ default: mod.EnhancedMindARViewer })),
  {
    loading: () => <ComponentLoader message="Loading enhanced AR viewer..." />,
    ssr: false
  }
)

export const LazyARScene = dynamic(
  () => import('../ARScene'),
  {
    loading: () => <ComponentLoader message="Loading AR scene..." />,
    ssr: false
  }
)

export const LazyARSceneViewer = dynamic(
  () => import('../ARSceneViewer'),
  {
    loading: () => <ComponentLoader message="Loading AR scene viewer..." />,
    ssr: false
  }
)