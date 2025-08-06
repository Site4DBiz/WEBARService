import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Database } from '@/types/database.types'

export default async function ARContentPage() {
  const supabase = createServerComponentClient<Database>({ cookies })
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/auth/login')
  }

  // Fetch user's AR contents
  const { data: arContents, error } = await supabase
    .from('ar_contents')
    .select('*, ar_markers(*)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My AR Contents</h1>
          <Link
            href="/ar-content/upload"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Upload New Content
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            Failed to load AR contents: {error.message}
          </div>
        )}

        {!error && arContents && arContents.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No AR contents yet</h2>
            <p className="text-gray-500 mb-4">Start by uploading your first AR content</p>
            <Link
              href="/ar-content/upload"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Upload Content
            </Link>
          </div>
        )}

        {!error && arContents && arContents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {arContents.map((content) => (
              <div key={content.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{content.title}</h3>
                  {content.description && (
                    <p className="text-gray-600 mb-4">{content.description}</p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        content.is_public
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {content.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Views:</span>
                      <span className="text-gray-900 font-medium">{content.view_count || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Created:</span>
                      <span className="text-gray-900">
                        {new Date(content.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                    {content.marker_url && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Has Marker
                      </span>
                    )}
                    {content.model_url && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Has 3D Model
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    {content.marker_url && content.model_url && (
                      <Link
                        href={`/ar/view/${content.id}`}
                        className="flex-1 text-center bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        View AR
                      </Link>
                    )}
                    <Link
                      href={`/ar-content/${content.id}/edit`}
                      className="flex-1 text-center bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}