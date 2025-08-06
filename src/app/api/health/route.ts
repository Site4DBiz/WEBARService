import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Check environment variables
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Try to create a Supabase client
    let supabaseStatus = 'not_configured'
    let databaseConnected = false
    
    if (hasSupabaseUrl && hasSupabaseKey) {
      try {
        const supabase = await createClient()
        // Try a simple query to check database connection
        const { error } = await supabase.from('profiles').select('count').limit(0)
        
        if (!error) {
          supabaseStatus = 'connected'
          databaseConnected = true
        } else if (error.code === '42P01') {
          // Table doesn't exist yet - database is accessible but not initialized
          supabaseStatus = 'connected_not_initialized'
          databaseConnected = true
        } else {
          supabaseStatus = 'error'
          console.error('Supabase connection error:', error)
        }
      } catch (err) {
        supabaseStatus = 'error'
        console.error('Failed to create Supabase client:', err)
      }
    }
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
      supabase: {
        status: supabaseStatus,
        hasUrl: hasSupabaseUrl,
        hasKey: hasSupabaseKey,
        databaseConnected,
        message: supabaseStatus === 'not_configured' 
          ? 'Please configure your Supabase environment variables in .env.local'
          : supabaseStatus === 'connected_not_initialized'
          ? 'Supabase is connected but database tables are not initialized. Run the migration script.'
          : supabaseStatus === 'connected'
          ? 'Supabase is properly configured and connected'
          : 'There was an error connecting to Supabase. Check your configuration.'
      }
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}