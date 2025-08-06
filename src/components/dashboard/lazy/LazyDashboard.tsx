'use client'

import dynamic from 'next/dynamic'
import { ComponentLoader } from '@/components/ui/LoadingSpinner'

export const LazyAnimatedStatCard = dynamic(
  () => import('../AnimatedStatCard').then(mod => ({ default: mod.AnimatedStatCard })),
  {
    loading: () => <ComponentLoader />,
    ssr: false
  }
)

export const LazyComparisonChart = dynamic(
  () => import('../ComparisonChart').then(mod => ({ default: mod.ComparisonChart })),
  {
    loading: () => <ComponentLoader message="Loading comparison chart..." />,
    ssr: false
  }
)

export const LazyActivityChart = dynamic(
  () => import('../ActivityChart').then(mod => ({ default: mod.ActivityChart })),
  {
    loading: () => <ComponentLoader message="Loading activity chart..." />,
    ssr: false
  }
)

export const LazyRealtimeMetrics = dynamic(
  () => import('../RealtimeMetrics').then(mod => ({ default: mod.RealtimeMetrics })),
  {
    loading: () => <ComponentLoader message="Loading realtime metrics..." />,
    ssr: false
  }
)

export const LazyInteractiveFilters = dynamic(
  () => import('../InteractiveFilters').then(mod => ({ default: mod.InteractiveFilters })),
  {
    loading: () => <ComponentLoader />,
    ssr: false
  }
)

export const LazyDrilldownModal = dynamic(
  () => import('../DrilldownModal').then(mod => ({ default: mod.DrilldownModal })),
  {
    loading: () => <ComponentLoader />,
    ssr: false
  }
)