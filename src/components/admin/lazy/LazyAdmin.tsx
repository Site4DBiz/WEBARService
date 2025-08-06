'use client'

import dynamic from 'next/dynamic'
import { ComponentLoader } from '@/components/ui/LoadingSpinner'

export const LazySystemStatus = dynamic(
  () => import('../SystemStatus').then((mod) => ({ default: mod.SystemStatus })),
  {
    loading: () => <ComponentLoader message="Loading system status..." />,
    ssr: false,
  }
)

export const LazyUsersList = dynamic(
  () => import('../UsersList').then((mod) => ({ default: mod.UsersList })),
  {
    loading: () => <ComponentLoader message="Loading users list..." />,
    ssr: false,
  }
)

export const LazyUserDetail = dynamic(
  () => import('../UserDetail').then((mod) => ({ default: mod.UserDetail })),
  {
    loading: () => <ComponentLoader message="Loading user details..." />,
    ssr: false,
  }
)

export const LazyTagCategoryManager = dynamic(
  () => import('../TagCategoryManager').then((mod) => ({ default: mod.TagCategoryManager })),
  {
    loading: () => <ComponentLoader message="Loading tag manager..." />,
    ssr: false,
  }
)
