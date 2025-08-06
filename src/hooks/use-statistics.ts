import { useEffect, useState, useCallback } from 'react'

interface UseStatisticsOptions {
  type: string
  params?: Record<string, any>
  refreshInterval?: number
  enabled?: boolean
}

export function useStatistics<T = any>({
  type,
  params = {},
  refreshInterval = 0,
  enabled = true,
}: UseStatisticsOptions) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams({
        type,
        ...params,
      })

      const response = await fetch(`/api/statistics?${queryParams}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics')
      console.error('Statistics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [type, params, enabled])

  useEffect(() => {
    fetchData()

    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchData, refreshInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}

// ARセッション管理用フック
export function useARSession() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionActive, setSessionActive] = useState(false)

  const startSession = useCallback(
    async (data: {
      contentId?: string
      markerId?: string
      deviceType?: string
      browser?: string
      location?: any
    }) => {
      try {
        const newSessionId = crypto.randomUUID()

        const response = await fetch('/api/statistics/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'start',
            sessionData: {
              ...data,
              sessionId: newSessionId,
            },
          }),
        })

        if (response.ok) {
          const result = await response.json()
          setSessionId(newSessionId)
          setSessionActive(true)
          return result.session
        }
      } catch (error) {
        console.error('Failed to start session:', error)
        return null
      }
    },
    []
  )

  const updateSession = useCallback(
    async (data: { detectionSuccess?: boolean; detectionTime?: number; qualityMetrics?: any }) => {
      if (!sessionId || !sessionActive) return

      try {
        await fetch('/api/statistics/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            sessionData: {
              ...data,
              sessionId,
            },
          }),
        })
      } catch (error) {
        console.error('Failed to update session:', error)
      }
    },
    [sessionId, sessionActive]
  )

  const endSession = useCallback(async () => {
    if (!sessionId || !sessionActive) return

    try {
      await fetch('/api/statistics/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end',
          sessionData: { sessionId },
        }),
      })

      setSessionActive(false)
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }, [sessionId, sessionActive])

  // ページアンロード時にセッションを終了
  useEffect(() => {
    const handleUnload = () => {
      if (sessionActive) {
        navigator.sendBeacon(
          '/api/statistics/session',
          JSON.stringify({
            action: 'end',
            sessionData: { sessionId },
          })
        )
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      if (sessionActive) {
        endSession()
      }
    }
  }, [sessionActive, sessionId, endSession])

  return {
    sessionId,
    sessionActive,
    startSession,
    updateSession,
    endSession,
  }
}

// メトリクス記録用フック
export function useMetrics() {
  const recordMetric = useCallback(async (type: string, value: number, metadata?: any) => {
    try {
      await fetch('/api/statistics/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [
            {
              type,
              value,
              metadata,
            },
          ],
        }),
      })
    } catch (error) {
      console.error('Failed to record metric:', error)
    }
  }, [])

  const recordMetrics = useCallback(
    async (
      metrics: Array<{
        type: string
        value: number
        metadata?: any
      }>
    ) => {
      try {
        await fetch('/api/statistics/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics }),
        })
      } catch (error) {
        console.error('Failed to record metrics:', error)
      }
    },
    []
  )

  return {
    recordMetric,
    recordMetrics,
  }
}
