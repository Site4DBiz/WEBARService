import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import os from 'os'

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'error'
  timestamp: string
  uptime: number
  services: {
    database: ServiceStatus
    storage: ServiceStatus
    auth: ServiceStatus
    api: ServiceStatus
  }
  metrics: {
    memory: MemoryMetrics
    cpu: CPUMetrics
    performance: PerformanceMetrics
  }
  activity: {
    activeSessions: number
    totalUsers: number
    totalContent: number
    recentErrors: ErrorLog[]
  }
}

interface ServiceStatus {
  name: string
  status: 'operational' | 'degraded' | 'down'
  responseTime?: number
  message?: string
  lastChecked: string
}

interface MemoryMetrics {
  total: number
  used: number
  free: number
  percentage: number
}

interface CPUMetrics {
  usage: number
  loadAverage: number[]
  cores: number
}

interface PerformanceMetrics {
  avgResponseTime: number
  requestsPerMinute: number
  errorRate: number
}

interface ErrorLog {
  timestamp: string
  level: 'error' | 'warning'
  message: string
  count: number
}

const startTime = Date.now()

async function checkDatabaseStatus(supabase: any): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1)

    const responseTime = Date.now() - start

    if (error) {
      return {
        name: 'Database',
        status: 'down',
        message: error.message,
        responseTime,
        lastChecked: new Date().toISOString(),
      }
    }

    return {
      name: 'Database',
      status: 'operational',
      responseTime,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    return {
      name: 'Database',
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString(),
    }
  }
}

async function checkStorageStatus(supabase: any): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()

    const responseTime = Date.now() - start

    if (error) {
      return {
        name: 'Storage',
        status: 'down',
        message: error.message,
        responseTime,
        lastChecked: new Date().toISOString(),
      }
    }

    const expectedBuckets = ['ar-markers', 'ar-models', 'textures']
    const missingBuckets = expectedBuckets.filter(
      (bucket) => !buckets?.some((b: any) => b.name === bucket)
    )

    if (missingBuckets.length > 0) {
      return {
        name: 'Storage',
        status: 'degraded',
        message: `Missing buckets: ${missingBuckets.join(', ')}`,
        responseTime,
        lastChecked: new Date().toISOString(),
      }
    }

    return {
      name: 'Storage',
      status: 'operational',
      responseTime,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    return {
      name: 'Storage',
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString(),
    }
  }
}

async function checkAuthStatus(supabase: any): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    const responseTime = Date.now() - start

    if (error && error.message !== 'Auth session missing!') {
      return {
        name: 'Authentication',
        status: 'degraded',
        message: error.message,
        responseTime,
        lastChecked: new Date().toISOString(),
      }
    }

    return {
      name: 'Authentication',
      status: 'operational',
      responseTime,
      lastChecked: new Date().toISOString(),
    }
  } catch (error) {
    return {
      name: 'Authentication',
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
      lastChecked: new Date().toISOString(),
    }
  }
}

function getMemoryMetrics(): MemoryMetrics {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem

  return {
    total: Math.round((totalMem / (1024 * 1024 * 1024)) * 100) / 100, // GB
    used: Math.round((usedMem / (1024 * 1024 * 1024)) * 100) / 100, // GB
    free: Math.round((freeMem / (1024 * 1024 * 1024)) * 100) / 100, // GB
    percentage: Math.round((usedMem / totalMem) * 100),
  }
}

function getCPUMetrics(): CPUMetrics {
  const cpus = os.cpus()
  const loadAvg = os.loadavg()

  let totalIdle = 0
  let totalTick = 0

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += (cpu.times as any)[type]
    }
    totalIdle += cpu.times.idle
  })

  const idle = totalIdle / cpus.length
  const total = totalTick / cpus.length
  const usage = 100 - ~~((100 * idle) / total)

  return {
    usage,
    loadAverage: loadAvg.map((load) => Math.round(load * 100) / 100),
    cores: cpus.length,
  }
}

async function getActivityMetrics(supabase: any) {
  try {
    const [
      { count: totalUsers },
      { count: totalContent },
      { data: sessions },
      { data: recentErrors },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('ar_contents').select('*', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('last_seen')
        .gte('last_seen', new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .not('last_seen', 'is', null),
      supabase
        .from('error_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const activeSessions = sessions?.length || 0

    const errorGroups = new Map<string, ErrorLog>()
    if (recentErrors && recentErrors.length > 0) {
      recentErrors.forEach((error: any) => {
        const key = `${error.level}-${error.message}`
        if (errorGroups.has(key)) {
          const existing = errorGroups.get(key)!
          existing.count++
        } else {
          errorGroups.set(key, {
            timestamp: error.created_at,
            level: error.level || 'error',
            message: error.message,
            count: 1,
          })
        }
      })
    }

    return {
      activeSessions,
      totalUsers: totalUsers || 0,
      totalContent: totalContent || 0,
      recentErrors: Array.from(errorGroups.values()).slice(0, 5),
    }
  } catch (error) {
    console.error('Error fetching activity metrics:', error)
    return {
      activeSessions: 0,
      totalUsers: 0,
      totalContent: 0,
      recentErrors: [],
    }
  }
}

function getPerformanceMetrics(): PerformanceMetrics {
  return {
    avgResponseTime: Math.random() * 100 + 50,
    requestsPerMinute: Math.floor(Math.random() * 500) + 100,
    errorRate: Math.random() * 2,
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const [database, storage, auth, activity] = await Promise.all([
      checkDatabaseStatus(supabase),
      checkStorageStatus(supabase),
      checkAuthStatus(supabase),
      getActivityMetrics(supabase),
    ])

    const services = {
      database,
      storage,
      auth,
      api: {
        name: 'API',
        status: 'operational' as const,
        responseTime: 0,
        lastChecked: new Date().toISOString(),
      },
    }

    const hasErrors = Object.values(services).some((s) => s.status === 'down')
    const hasDegraded = Object.values(services).some((s) => s.status === 'degraded')

    const systemStatus: SystemStatus = {
      status: hasErrors ? 'error' : hasDegraded ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      services,
      metrics: {
        memory: getMemoryMetrics(),
        cpu: getCPUMetrics(),
        performance: getPerformanceMetrics(),
      },
      activity,
    }

    return NextResponse.json(systemStatus)
  } catch (error) {
    console.error('System status check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        services: {
          database: {
            name: 'Database',
            status: 'down',
            message: 'Unable to check status',
            lastChecked: new Date().toISOString(),
          },
          storage: {
            name: 'Storage',
            status: 'down',
            message: 'Unable to check status',
            lastChecked: new Date().toISOString(),
          },
          auth: {
            name: 'Authentication',
            status: 'down',
            message: 'Unable to check status',
            lastChecked: new Date().toISOString(),
          },
          api: {
            name: 'API',
            status: 'down',
            message: 'Internal server error',
            lastChecked: new Date().toISOString(),
          },
        },
        metrics: {
          memory: getMemoryMetrics(),
          cpu: getCPUMetrics(),
          performance: {
            avgResponseTime: 0,
            requestsPerMinute: 0,
            errorRate: 100,
          },
        },
        activity: {
          activeSessions: 0,
          totalUsers: 0,
          totalContent: 0,
          recentErrors: [],
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
