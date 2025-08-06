'use client'

import dynamic from 'next/dynamic'
import { ComponentLoader } from '@/components/ui/LoadingSpinner'

export const LazyAnalyticsOverview = dynamic(
  () => import('../AnalyticsOverview').then((mod) => ({ default: mod.AnalyticsOverview })),
  {
    loading: () => <ComponentLoader message="Loading analytics..." />,
    ssr: false,
  }
)

export const LazyTimeSeriesChart = dynamic(
  () => import('../TimeSeriesChart').then((mod) => ({ default: mod.TimeSeriesChart })),
  {
    loading: () => <ComponentLoader message="Loading charts..." />,
    ssr: false,
  }
)

export const LazyDeviceAnalytics = dynamic(
  () => import('../DeviceAnalytics').then((mod) => ({ default: mod.DeviceAnalytics })),
  {
    loading: () => <ComponentLoader message="Loading device analytics..." />,
    ssr: false,
  }
)

export const LazyGeographicAnalytics = dynamic(
  () => import('../GeographicAnalytics').then((mod) => ({ default: mod.GeographicAnalytics })),
  {
    loading: () => <ComponentLoader message="Loading geographic data..." />,
    ssr: false,
  }
)

export const LazyContentPerformance = dynamic(
  () => import('../ContentPerformance').then((mod) => ({ default: mod.ContentPerformance })),
  {
    loading: () => <ComponentLoader message="Loading performance metrics..." />,
    ssr: false,
  }
)

export const LazyEngagementMetrics = dynamic(
  () => import('../EngagementMetrics').then((mod) => ({ default: mod.EngagementMetrics })),
  {
    loading: () => <ComponentLoader message="Loading engagement data..." />,
    ssr: false,
  }
)

export const LazyUserGrowthChart = dynamic(
  () => import('../UserGrowthChart').then((mod) => ({ default: mod.UserGrowthChart })),
  {
    loading: () => <ComponentLoader message="Loading user growth data..." />,
    ssr: false,
  }
)
