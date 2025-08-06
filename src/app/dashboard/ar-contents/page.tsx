'use client'

import { Suspense } from 'react'
import { LazyARContentsList } from '@/components/ar/lazy/LazyARForms'
import { PageLoader } from '@/components/ui/LoadingSpinner'

export default function ARContentsPage() {
  return (
    <Suspense fallback={<PageLoader message="Loading AR contents..." />}>
      <LazyARContentsList />
    </Suspense>
  )
}
