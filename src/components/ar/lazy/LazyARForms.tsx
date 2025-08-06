'use client'

import dynamic from 'next/dynamic'
import { ComponentLoader } from '@/components/ui/LoadingSpinner'

export const LazyARMarkerForm = dynamic(
  () => import('../ARMarkerForm').then((mod) => ({ default: mod.ARMarkerForm })),
  {
    loading: () => <ComponentLoader message="Loading AR marker form..." />,
    ssr: false,
  }
)

export const LazyARContentForm = dynamic(
  () => import('../ARContentForm').then((mod) => ({ default: mod.ARContentForm })),
  {
    loading: () => <ComponentLoader message="Loading AR content form..." />,
    ssr: false,
  }
)

export const LazyARContentDetail = dynamic(
  () => import('../ARContentDetail').then((mod) => ({ default: mod.ARContentDetail })),
  {
    loading: () => <ComponentLoader message="Loading AR content details..." />,
    ssr: false,
  }
)

export const LazyARContentsList = dynamic(
  () => import('../ARContentsList').then((mod) => ({ default: mod.ARContentsList })),
  {
    loading: () => <ComponentLoader message="Loading AR contents list..." />,
    ssr: false,
  }
)

export const LazyARMarkerList = dynamic(
  () => import('../ARMarkerList').then((mod) => ({ default: mod.ARMarkerList })),
  {
    loading: () => <ComponentLoader message="Loading AR markers..." />,
    ssr: false,
  }
)

export const LazyARContentUpload = dynamic(
  () => import('../ARContentUpload').then((mod) => ({ default: mod.ARContentUpload })),
  {
    loading: () => <ComponentLoader message="Loading upload component..." />,
    ssr: false,
  }
)
