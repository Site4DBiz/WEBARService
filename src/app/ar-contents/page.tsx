'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Search, Filter, Eye, Heart, Clock, User, ChevronLeft, ChevronRight } from 'lucide-react'

interface ARContent {
  id: string
  title: string
  description: string | null
  content_type: string | null
  target_file_url: string | null
  model_file_url: string | null
  is_public: boolean
  view_count: number
  created_at: string
  updated_at: string
  user_id: string
  profiles: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
  user_favorites: { id: string }[]
}

export default function ARContentsListPage() {
  const [contents, setContents] = useState<ARContent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'favorites'>('recent')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)
  const itemsPerPage = 12

  const supabase = createClient()

  useEffect(() => {
    checkUser()
    fetchContents()
  }, [contentTypeFilter, sortBy, currentPage])

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    setUserId(session?.user?.id || null)
  }

  const fetchContents = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('user_ar_contents')
        .select(
          `
          *,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          ),
          user_favorites (id)
        `,
          { count: 'exact' }
        )
        .eq('is_public', true)

      if (contentTypeFilter !== 'all') {
        query = query.eq('content_type', contentTypeFilter)
      }

      if (sortBy === 'recent') {
        query = query.order('created_at', { ascending: false })
      } else if (sortBy === 'popular') {
        query = query.order('view_count', { ascending: false })
      } else if (sortBy === 'favorites') {
        query = query.order('created_at', { ascending: false })
      }

      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await query.range(from, to)

      if (error) {
        console.error('Error fetching contents:', error)
        return
      }

      setContents(data || [])
      if (count) {
        setTotalPages(Math.ceil(count / itemsPerPage))
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = async (contentId: string, isFavorited: boolean) => {
    if (!userId) {
      alert('Please log in to favorite content')
      return
    }

    if (isFavorited) {
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('content_id', contentId)
    } else {
      await supabase.from('user_favorites').insert({ user_id: userId, content_id: contentId })
    }

    fetchContents()
  }

  const incrementViewCount = async (contentId: string) => {
    await supabase.rpc('increment_view_count', { content_id: contentId })
  }

  const filteredContents = contents.filter(
    (content) =>
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">AR Contents Gallery</h1>
          <p className="text-gray-600 text-lg">
            Explore public AR experiences created by our community
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search contents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-4">
              <select
                value={contentTypeFilter}
                onChange={(e) => setContentTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="image">Image AR</option>
                <option value="face">Face AR</option>
                <option value="3d_model">3D Model</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
                <option value="favorites">Most Favorited</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredContents.length} of {contents.length} contents
            </div>
            {userId && (
              <Link
                href="/ar-content/upload"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Content
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {filteredContents.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">No contents found</h2>
                <p className="text-gray-500">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredContents.map((content) => {
                  const isFavorited = userId
                    ? content.user_favorites.some((fav) => fav.id === userId)
                    : false

                  return (
                    <div
                      key={content.id}
                      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
                    >
                      <div className="aspect-video bg-gradient-to-br from-blue-400 to-purple-600 relative">
                        {content.target_file_url && (
                          <img
                            src={content.target_file_url}
                            alt={content.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <div className="absolute top-2 right-2 flex gap-2">
                          {content.content_type && (
                            <span className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                              {content.content_type.replace('_', ' ').toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="font-semibold text-lg text-gray-900 mb-2 truncate">
                          {content.title}
                        </h3>

                        {content.description && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {content.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{content.view_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(content.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {content.profiles && (
                          <div className="flex items-center gap-2 mb-3">
                            {content.profiles.avatar_url ? (
                              <img
                                src={content.profiles.avatar_url}
                                alt={content.profiles.username || 'User'}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <User className="w-6 h-6 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-600">
                              {content.profiles.username ||
                                content.profiles.full_name ||
                                'Anonymous'}
                            </span>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {content.target_file_url && content.model_file_url && (
                            <Link
                              href={`/ar/view/${content.id}`}
                              onClick={() => incrementViewCount(content.id)}
                              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center text-sm"
                            >
                              View AR
                            </Link>
                          )}
                          <button
                            onClick={() => toggleFavorite(content.id, isFavorited)}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              isFavorited
                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      const distance = Math.abs(page - currentPage)
                      return distance === 0 || distance === 1 || page === 1 || page === totalPages
                    })
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center gap-1">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-2 rounded-lg ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    ))}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
